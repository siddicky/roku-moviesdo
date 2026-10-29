"""movies.do web-session client.

Implements the contract verified by reverse engineering the Android APK
(v3.1, evdoo.mdotv) and the live web player:

  POST /login                       form login (CSRF + LoginForm[...])
  GET  /home, /movies, /tv-shows, /anime, /popular, /top-imdb, /last-added,
       /my-list/{favorites,watch-later,continue-watching,watched}, /search
  GET  /open/{code}                 302 -> /watch/{slug}/{videoId}/{episode}
  GET  /player/stream?video_id=..&server=mp4&language=en&u={uid}&rand=..
                                    -> {data:{streams:["[1080p]url",..],
                                              watchedSeconds,..}}
  GET  /player/watched?video_id=&watched_seconds=&duration_seconds=
  GET  /ajax/favorite?production_id=&action=add|delete
  GET  /ajax/watch-later?production_id=&action=add|delete
  GET  /ajax/user-storage           -> {data:{favorite:"[..]", watchLater:"[..]"}}
  GET  /player/subtitle-vtt?...     -> WebVTT text (session required)
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import re
import urllib.parse

import aiohttp

from parsers import (USER_ID_RE, has_next_page, parse_cards, parse_home,
                     parse_title_page)

log = logging.getLogger("moviesdo")

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36")

CSRF_RE = re.compile(r'name="_csrf-frontend" value="([^"]+)"')


class LoginError(Exception):
    """Credentials rejected by movies.do."""


class ApiError(Exception):
    """Unexpected upstream response."""


class MoviesDoClient:
    """Cookie-session client for the movies.do web app."""

    def __init__(self, email: str, password: str, base_url: str = "https://movies.do"):
        self.email = email
        self.password = password
        self.base_url = base_url.rstrip("/")
        self.user_id: str | None = None
        self._http: aiohttp.ClientSession | None = None
        self._login_lock = asyncio.Lock()

    async def start(self):
        self._http = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=45, connect=15, sock_read=30),
            headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"},
        )
        await self.login()

    async def close(self):
        if self._http:
            await self._http.close()
            self._http = None

    # ------------------------------------------------------------- transport

    async def _request(self, method: str, path: str, **kw) -> tuple[int, str, str]:
        url = path if path.startswith("http") else self.base_url + path
        async with self._http.request(method, url, allow_redirects=True, **kw) as resp:
            return resp.status, await resp.text(), str(resp.url)

    async def login(self) -> None:
        async with self._login_lock:
            status, body, _ = await self._request("GET", "/login")
            if status != 200:
                raise LoginError(f"login page HTTP {status}")
            m = CSRF_RE.search(body)
            if not m:
                raise LoginError("no CSRF token on login page")
            form = {
                "_csrf-frontend": m.group(1),
                "LoginForm[usernameOrEmail]": self.email,
                "LoginForm[password]": self.password,
                "LoginForm[rememberMe]": "1",
                "login-button": "",
            }
            status, body, final = await self._request(
                "POST", "/login", data=form,
                headers={"Referer": self.base_url + "/login"},
            )
            if status != 200 or final.endswith("/login"):
                raise LoginError("movies.do rejected the credentials")
            log.info("logged in as %s (final: %s)", self.email, final)

    def _session_lost(self, status: int, final_url: str, body: str) -> bool:
        return status in (401, 403) or final_url.rstrip("/").endswith("/login")

    async def _authed(self, method: str, path: str, **kw) -> tuple[int, str]:
        kw.setdefault("headers", {})
        kw["headers"] = {"X-Requested-With": "XMLHttpRequest", **kw["headers"]}
        status, body, final = await self._request(method, path, **kw)
        if self._session_lost(status, final, body):
            log.info("session lost on %s; re-logging in", path)
            await self.login()
            status, body, final = await self._request(method, path, **kw)
        return status, body

    async def _authed_html(self, path: str, referer: str | None = None) -> str:
        headers = {"Accept": "text/html"}
        if referer:
            headers["Referer"] = self.base_url + referer
        status, body = await self._authed("GET", path, headers=headers)
        if status != 200:
            raise ApiError(f"{path} HTTP {status}")
        return body

    # -------------------------------------------------------------- catalog

    async def home(self) -> dict:
        return parse_home(await self._authed_html("/home"))

    async def catalog(self, path: str, page: int = 1) -> dict:
        path = "/" + path.strip("/")
        url = f"{path}?page={page}" if page > 1 else path
        body = await self._authed_html(url)
        # page 1 is a full HTML page; later pages come back (because of the
        # XHR header) as JSON {"pagination": "<ul..>", "items": ["<div..>", ..]}
        if body.lstrip().startswith("{"):
            data = json.loads(body)
            items = parse_cards("".join(data.get("items") or []))
            pager = data.get("pagination") or ""
        else:
            items = parse_cards(body)
            pager = body
        return {"items": items, "page": page, "has_more": has_next_page(pager, page)}

    async def search(self, query: str) -> dict:
        url = "/search?query=" + urllib.parse.quote_plus(query)
        body = await self._authed_html(url)
        return {"items": parse_cards(body)}

    async def title(self, code: str) -> dict:
        """Resolve /open/{code} and parse the watch page."""
        status, body, final = await self._request("GET", f"/open/{code}",
                                                  headers={"Accept": "text/html"})
        if self._session_lost(status, final, body):
            await self.login()
            status, body, final = await self._request("GET", f"/open/{code}",
                                                      headers={"Accept": "text/html"})
        if status != 200:
            raise ApiError(f"/open/{code} HTTP {status}")
        if "/watch/" not in final:
            raise ApiError(f"/open/{code} did not reach a watch page: {final}")
        info = parse_title_page(body, final)
        if info.get("user_id"):
            self.user_id = info["user_id"]
        return info

    # -------------------------------------------------------------- playback

    async def stream(self, video_id: str, referer: str, language: str = "en",
                     server: str = "mp4") -> dict:
        """Resolve playable CDN URLs for one episode/movie."""
        # the channel sends the full watch URL; keep only the path
        if referer.startswith("http"):
            referer = urllib.parse.urlsplit(referer).path
        if not self.user_id and referer.startswith("/watch/"):
            # fresh bridge (e.g. Continue Watching played without /title):
            # the watch page carries the account's player user id
            m = USER_ID_RE.search(await self._authed_html(referer))
            if m:
                self.user_id = m.group(1)
        if not self.user_id:
            raise ApiError("user_id unknown; open a title first")
        url = (f"/player/stream?video_id={video_id}&server={server}"
               f"&language={language}&u={self.user_id}&rand={random.random():.17f}")
        status, body = await self._authed(
            "GET", url, headers={"Referer": self.base_url + referer,
                                 "Accept": "application/json"})
        try:
            data = json.loads(body)
        except ValueError:
            raise ApiError(f"/player/stream non-JSON (HTTP {status})")
        if status != 200 or not data.get("success"):
            msg = data.get("message", f"HTTP {status}")
            raise ApiError(f"stream error for {video_id}: {msg}")
        d = data.get("data", {})
        streams = []
        for item in d.get("streams", []):
            m = re.match(r"\[([^\]]+)\](.+)", item)
            if m:
                streams.append({"label": m.group(1), "url": m.group(2)})
        return {
            "streams": streams,
            "watched_seconds": d.get("watchedSeconds", 0) or 0,
            "title": d.get("title", ""),
            "max_quality": data.get("maxQuality", ""),
        }

    async def save_watched(self, video_id: str, watched: int, duration: int) -> bool:
        """Report progress (mirrors player.js saveWatchedSecondsFunc)."""
        if watched <= 0 or duration <= 0:
            return True
        url = (f"/player/watched?video_id={video_id}"
               f"&watched_seconds={int(watched)}&duration_seconds={int(duration)}")
        status, body = await self._authed("GET", url)
        return status == 200

    async def set_list(self, kind: str, production_id: str, add: bool) -> bool:
        if kind not in ("favorite", "watch-later"):
            raise ValueError("kind must be favorite or watch-later")
        action = "add" if add else "delete"
        url = f"/ajax/{kind}?production_id={production_id}&action={action}"
        status, _ = await self._authed("GET", url)
        return status == 200

    async def user_storage(self) -> dict:
        status, body = await self._authed("GET", "/ajax/user-storage")
        data = json.loads(body).get("data", {}) if status == 200 else {}
        def ids(key):
            try:
                return json.loads(data.get(key, "[]"))
            except ValueError:
                return []
        return {"favorite": ids("favorite"), "watch_later": ids("watchLater")}

    async def subtitle_text(self, subtitle_url: str) -> str:
        """Fetch a /player/subtitle-vtt URL with the session (Roku cannot)."""
        status, body, final = await self._request(
            "GET", subtitle_url,
            headers={"Referer": self.base_url + "/watch", "Accept": "*/*"},
        )
        if status != 200 or not body.lstrip().startswith("WEBVTT"):
            raise ApiError(f"subtitle HTTP {status} (not VTT)")
        return body
