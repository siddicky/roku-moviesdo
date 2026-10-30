# Marquee

A cinematic streaming shelf for this project, named **Marquee**. It is an original interface inspired by modern living-room apps: a dark full-bleed hero, frosted navigation, and horizontal title rows. It is not affiliated with Apple and does not use Apple trademarks, wordmarks, or artwork.

Marquee sits on the existing catalog bridge. With no account configured it serves an original fixture catalog and generated artwork, so the site builds, previews, and demos without credentials. Point it at the Python bridge when you want the live movies.do session the Roku channel already uses.

```
browser  →  Next.js (Marquee)  →  fixture catalog
                              ↘  Python bridge  →  movies.do
Roku channel  →  Python bridge
```

## Web app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Home, Movies, TV Shows, Search, Library, and each title page work on the fixture catalog. Arrow keys move across the nav, the hero, and each row. Play opens an in-app preview (the fixture titles have no licensed video).

Production build:

```bash
npm run build
npm start
```

The app is a Next.js project at the repo root, so Vercel detects it with no extra config. Leave the catalog env unset on preview deployments and the fixture catalog is what visitors see.

### Environment

Copy `.env.example` if you want live data. The browser never receives the password.

| Variable | Used by | Purpose |
|---|---|---|
| `CATALOG_SOURCE` | Next.js | `fixture` (default) or `bridge`. `fixture` always wins when set explicitly. |
| `MOVIESDO_BRIDGE_URL` | Next.js | Base URL of the Python bridge, for example `http://127.0.0.1:8766`. If this is set and `CATALOG_SOURCE` is not `fixture`, Marquee proxies the bridge. |
| `MOVIESDO_EMAIL` | Python bridge | movies.do account email. Required only for a live session. |
| `MOVIESDO_PASSWORD` | Python bridge | movies.do account password. Required only for a live session. |

Live catalog:

```bash
cd server
python3 -m venv .venv && . .venv/bin/activate
pip install aiohttp
MOVIESDO_EMAIL=you@example.com MOVIESDO_PASSWORD='secret' python server.py --port 8766
```

In another shell, from the repo root:

```bash
CATALOG_SOURCE=bridge MOVIESDO_BRIDGE_URL=http://127.0.0.1:8766 npm run dev
```

`GET /api/ping` reports `source` (`fixture` or `bridge`) and `credentialsConfigured` (true when both email and password are present). It does not return the secret.

Artwork is generated with `npm run generate-art` from `lib/seed.ts` into `public/art/`. Those files are original geometric scenes, not studio key art.

### Web API

Same jobs as the bridge, shaped for the shelf UI:

| Route | Purpose |
|---|---|
| `GET /api/ping` | liveness and catalog source |
| `GET /api/home` | hero plus rows |
| `GET /api/catalog?path=movies&page=1` | movies, tv-shows, popular, top-imdb, last-added, my-list/* |
| `GET /api/search?q=` | search |
| `GET /api/title?code=` | detail, episodes, related |
| `GET /api/stream?video_id=` | preview payload, or bridge stream URLs |
| `POST /api/watched` | progress (bridge) or local acknowledgement (fixture) |
| `POST /api/list` | favorite / watch-later |

---

# Movies Portal TV — Linux bridge + Roku channel

An unofficial client for the **movies.do** streaming portal ("Movies Portal TV").

The service supports web browsers and Android/Apple TV apps but **not Roku**
(Roku OS has no browser and the site has no Roku channel). This project fills
that gap with two pieces:

```
[movies.do] <--(login + scraping + stream resolution)-- [bridge server] <--(plain JSON) -- [Roku channel]
                                                                             |
                                        direct HTTPS playback + poster CDN --+
```

* **`server/`** — a small Linux/macOS Python service (aiohttp). It logs into
  movies.do with your account, keeps the web session alive, parses the HTML
  catalog/search/watch pages, resolves playable CDN stream URLs, proxies
  subtitles, and reports watch progress back to the service so
  *Continue Watching* stays in sync everywhere.
* **`channel/`** — a native Roku SceneGraph channel (BrightScript). Proper
  10-foot UI: home rows, catalogs with infinite scroll, search, title screens
  with episode lists, hardware video playback with subtitles, resume,
  quality-stepdown on errors, and auto-play-next-episode.

## 1. Run the bridge server

Any Linux box (or Mac) on the same LAN as the TV:

```bash
cd server
python3 -m venv .venv && . .venv/bin/activate
pip install aiohttp
MOVIESDO_EMAIL=you@example.com MOVIESDO_PASSWORD='secret' python server.py --port 8766
```

(or `uv run --with aiohttp python server.py ...` if you use uv)

Smoke test from any LAN machine: `curl http://<server-ip>:8766/ping`

## 2. Point the channel at the server

Edit `channel/manifest`:

```
server_url=http://<server-ip>:8766
```

## 3. Sideload to the Roku

1. On the TV: Settings → System → Advanced system settings → **Developer
   options** → enable, set a password, let it reboot.
2. From this repo: `./tools/install.sh [ROKU_IP] [DEV_PASSWORD]`
   (IP defaults to `192.168.1.102`; the password can also come from
   `ROKU_DEV_PASSWORD`). The script packages
   `channel.zip` (manifest must sit at the zip root — done for you), installs,
   and launches.

Dev channels expire on TV reboot — just rerun the installer.

## Bridge API (used by the channel)

| Route | Purpose |
|---|---|
| `GET /ping` | liveness + logged-in account |
| `GET /home` | hero row + section rows (Continue Watching etc.) |
| `GET /catalog?path=movies&page=N` | movies, tv-shows, anime, popular, top-imdb, last-added, my-list/* |
| `GET /search?q=...` | search |
| `GET /title?code=ID` | seasons/episodes + subtitle tracks |
| `GET /stream?video_id=ID&referer=URL` | quality→URL map (360p…1080p), resume position |
| `GET /subtitles?u=<subtitle-vtt-url>` | WebVTT proxy (session-authenticated upstream) |
| `POST /watched` `{video_id, watched_seconds, duration_seconds}` | progress sync |
| `POST /list` `{kind, production_id, action}` | favorite / watch-later |

## Notes & limitations

* Derived from the Android APK (v3.1, `evdoo.mdotv`) and the live web app;
  the TV REST API in the APK (app-staging / mirrors) is currently dead —
  mirror domains NXDOMAIN — so the bridge rides the web session instead.
* Stream URLs are user-tokened CDN links; they play directly on the Roku from
  the same public IP (same household) — the bridge never proxies video.
* Personal-use only; respects the account's existing session, watch history
  and lists.
