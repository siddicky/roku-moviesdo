"""LAN bridge server: Roku channel <-> movies.do.

The Roku channel talks JSON to this server; the server holds the movies.do
web session and resolves streams (CDN URLs are handed to the Roku directly).

Run:
  MOVIESDO_EMAIL=you@example.com MOVIESDO_PASSWORD=secret \
      python server.py [--port 8766] [--host 0.0.0.0]
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import urllib.parse

from aiohttp import web

from moviesdo_client import ApiError, LoginError, MoviesDoClient

log = logging.getLogger("bridge")

CORS = {"Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"}


def json_response(data, status=200):
    return web.json_response(data, status=status, headers=CORS)


def ok_wrap(fn):
    async def handler(request):
        try:
            return json_response(await fn(request))
        except (ApiError, LoginError, ValueError) as e:
            return json_response({"error": str(e)}, status=502)
    return handler


async def ping(request):
    c: MoviesDoClient = request.app["client"]
    return json_response({"ok": True, "email": c.email, "user_id": c.user_id})


@ok_wrap
async def home(request):
    return await request.app["client"].home()


@ok_wrap
async def catalog(request):
    path = request.query.get("path", "movies")
    page = int(request.query.get("page", "1"))
    return await request.app["client"].catalog(path, page)


@ok_wrap
async def search(request):
    q = request.query.get("q", "").strip()
    if not q:
        return {"items": []}
    return await request.app["client"].search(q)


@ok_wrap
async def title(request):
    code = request.query.get("code", "")
    if not code:
        raise ValueError("code required")
    return await request.app["client"].title(code)


@ok_wrap
async def stream(request):
    video_id = request.query.get("video_id", "")
    referer = request.query.get("referer", "")
    if not video_id:
        raise ValueError("video_id required")
    return await request.app["client"].stream(video_id, referer)


async def subtitles(request):
    try:
        sub_url = request.query.get("u", "")
        if not sub_url.startswith("https://"):
            raise ValueError("u must be a subtitle URL")
        text = await request.app["client"].subtitle_text(sub_url)
        return web.Response(text=text, content_type="text/vtt", headers=CORS)
    except (ApiError, LoginError, ValueError) as e:
        return json_response({"error": str(e)}, status=502)


@ok_wrap
async def watched(request):
    body = await request.json() if request.can_read_body else {}
    await request.app["client"].save_watched(
        body.get("video_id", ""),
        int(body.get("watched_seconds", 0)),
        int(body.get("duration_seconds", 0)),
    )
    return {"ok": True}


@ok_wrap
async def list_action(request):
    body = await request.json() if request.can_read_body else {}
    await request.app["client"].set_list(
        body.get("kind", ""),
        body.get("production_id", ""),
        body.get("action", "add") == "add",
    )
    return {"ok": True}


@ok_wrap
async def user_storage(request):
    return await request.app["client"].user_storage()


async def on_start(app):
    client = MoviesDoClient(app["email"], app["password"])
    await client.start()
    app["client"] = client
    log.info("bridge ready for %s", app["email"])


async def on_cleanup(app):
    await app["client"].close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8766)
    ap.add_argument("--email", default=os.environ.get("MOVIESDO_EMAIL", ""))
    ap.add_argument("--password", default=os.environ.get("MOVIESDO_PASSWORD", ""))
    args = ap.parse_args()
    if not args.email or not args.password:
        ap.error("set --email/--password or MOVIESDO_EMAIL/MOVIESDO_PASSWORD")

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(name)s %(levelname)s %(message)s")
    app = web.Application()
    app["email"] = args.email
    app["password"] = args.password
    app.on_startup.append(on_start)
    app.on_cleanup.append(on_cleanup)
    app.router.add_get("/ping", ping)
    app.router.add_get("/home", home)
    app.router.add_get("/catalog", catalog)
    app.router.add_get("/search", search)
    app.router.add_get("/title", title)
    app.router.add_get("/stream", stream)
    app.router.add_get("/subtitles", subtitles)
    app.router.add_post("/watched", watched)
    app.router.add_post("/list", list_action)
    app.router.add_get("/storage", user_storage)
    try:
        web.run_app(app, host=args.host, port=args.port)
    except LoginError as e:
        log.error("login failed: %s", e)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
