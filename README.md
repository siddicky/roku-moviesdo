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
