"""HTML parsers for movies.do pages, calibrated against live markup.

Card markup (regular posters, used on home sections / catalog / search):
    <a href="/open/{id}" class="poster-img-theme poster-img lazyload ..."
       data-name=".." data-type=".." data-qual=".." data-release=".."
       data-imdb=".." data-rating=".." data-genre=".." data-country=".."
       data-duration=".." data-description=".." data-original-bg="{poster}">

Continue-watching cards:
    <a href="/watch/{slug}/{videoId}/{ep}" class="poster-item..." data-original-bg="..">
      .poster-time / .poster-progress / .poster-lang
    followed by <div class="poster-title">..

Sections on /home:
    <div class="type-poster-block"> <a class="type-title df">Title</a> ...

Hero slider on /home:
    <a href="/open/{id}" data-identy=".." class="link-bkg-wrapper" data-original-bg="..">
    + .slider-name / .quality / .year / .imdb / .slider-genres / .slider-description

Watch page:
    MoviesPortalPlayer.playlist = "<base64 json>"   (seasons/episodes/subtitles)
"""
from __future__ import annotations

import base64
import html as html_lib
import json
import re

# --- regular poster cards -------------------------------------------------

POSTER_ANCHOR_RE = re.compile(
    r'<a\s+href="([^"]+)"(?![^>]*link-bkg)[^>]*class="poster-img-theme[^"]*"[^>]*>',
    re.S,
)

# /open/{id} and /general-search/show-redirect?1={id} both end in the id token
HREF_ID_RE = re.compile(r"([A-Za-z0-9]+)$")

DATA_ATTR_RE = re.compile(r'data-([a-z-]+)=(?:"([^"]*)"|\'([^\']*)\')')

CONTINUE_ANCHOR_RE = re.compile(
    r'<a\s+href="(/watch/[^"]+)"[^>]*class="poster-item[^"]*"([^>]*)>(.*?)</a>'
    r'.*?<div class="poster-title">\s*(.*?)\s*</div>',
    re.S,
)

POSTER_TIME_RE = re.compile(r'class="poster-time">\s*([^<]*?)\s*<')
POSTER_PROGRESS_RE = re.compile(r'class="poster-progress-value"[^>]*width:\s*([\d.]+)%')

SECTION_SPLIT_RE = re.compile(r'<div class="type-poster-block')
SECTION_TITLE_RE = re.compile(r'class="type-title[^"]*"[^>]*>\s*(.*?)\s*<', re.S)

HERO_ANCHOR_RE = re.compile(
    r'<a\s+href="/open/([A-Za-z0-9]+)"(?=[^>]*class="link-bkg-wrapper)'
    r'[^>]*data-original-bg="([^"]+)"',
    re.S,
)

TAG_RE = re.compile(r"<[^>]+>")

# watch page config
PLAYLIST_RE = re.compile(r'MoviesPortalPlayer\.playlist\s*=\s*"([^"]+)"')
VIDEO_ID_RE = re.compile(r'MoviesPortalPlayer\.videoId\s*=\s*"([^"]+)"')
VIDEO_NAME_RE = re.compile(r'MoviesPortalPlayer\.videoName\s*=\s*"([^"]*)"')
IS_MOVIE_RE = re.compile(r'MoviesPortalPlayer\.isMovie\s*=\s*(true|false)')
USER_ID_RE = re.compile(r'MoviesPortalPlayer\.user\s*=\s*\{\s*id:\s*"(\d+)"')
STREAM_ID_RE = re.compile(r"getStreamFunc\('([^']+)'\)")
SUBTITLE_PAIR_RE = re.compile(r"\[([^\]]+)\](https?://[^,\[]+)")

NEXT_PAGE_RE_tmpl = r'href="[^"]*/{n}"'


def _clean(text: str) -> str:
    return html_lib.unescape(TAG_RE.sub("", text)).strip()


def _sharp_poster(url: str) -> str:
    """Bump grid thumbnails to a size that looks good on a TV."""
    return url.replace("width=160", "width=320").replace("width=300", "width=480")


def parse_posters(page_html: str) -> list[dict]:
    """All regular poster cards (data-* metadata) on any page."""
    cards = []
    seen = set()
    for m in POSTER_ANCHOR_RE.finditer(page_html):
        vid = HREF_ID_RE.search(m.group(1).rstrip("/")).group(1)
        attrs = {}
        for am in DATA_ATTR_RE.finditer(m.group(0)):
            attrs[am.group(1)] = html_lib.unescape(am.group(2) or am.group(3) or "")
        name = attrs.get("name", "").strip()
        poster = attrs.get("original-bg", "").strip()
        if not name or vid in seen:
            continue
        seen.add(vid)
        cards.append({
            "id": vid,
            "title": _clean(name),
            "poster": _sharp_poster(poster),
            "quality": attrs.get("qual", ""),
            "year": attrs.get("release", ""),
            "imdb": attrs.get("imdb", ""),
            "rating": attrs.get("rating", ""),
            "genres": attrs.get("genre", ""),
            "country": attrs.get("country", ""),
            "duration": attrs.get("duration", ""),
            "description": _clean(attrs.get("description", "")),
            "type": attrs.get("type", ""),
            "trailer": attrs.get("trailer", ""),
            "url": f"/open/{vid}",
        })
    return cards


def parse_continue(page_html: str) -> list[dict]:
    """Continue-watching episode cards."""
    cards = []
    seen = set()
    for m in CONTINUE_ANCHOR_RE.finditer(page_html):
        href, attrs_html, inner, title = m.groups()
        attrs = {}
        for am in DATA_ATTR_RE.finditer(attrs_html + " " + inner):
            attrs[am.group(1)] = html_lib.unescape(am.group(2) or am.group(3) or "")
        poster = attrs.get("original-bg", "")
        vid = href.rstrip("/").split("/")[-2] if href.count("/") >= 3 else ""
        m_time = POSTER_TIME_RE.search(inner)
        m_prog = POSTER_PROGRESS_RE.search(inner)
        if not poster or vid in seen:
            continue
        seen.add(vid)
        cards.append({
            "id": vid,
            "title": _clean(title),
            "poster": _sharp_poster(poster),
            "watch_url": href,
            "time_label": _clean(m_time.group(1)) if m_time else "",
            "progress": float(m_prog.group(1)) if m_prog else 0.0,
        })
    return cards


def parse_hero(page_html: str) -> list[dict]:
    """Home hero slider cards."""
    cards = []
    seen = set()
    for m in HERO_ANCHOR_RE.finditer(page_html):
        vid, poster = m.group(1), html_lib.unescape(m.group(2))
        if vid in seen:
            continue
        seen.add(vid)
        # metadata follows the anchor inside the same slider item
        region = page_html[m.end(): m.end() + 2500]
        stop = region.find('class="link-bkg-wrapper')
        if stop != -1:
            region = region[:stop]
        def grab(cls):
            mm = re.search(r'class="' + cls + r'"[^>]*>\s*(.*?)\s*<', region, re.S)
            return _clean(mm.group(1)) if mm else ""
        cards.append({
            "id": vid,
            "title": grab("slider-name"),
            "poster": poster,
            "quality": grab("quality"),
            "year": re.search(r'class="year"[^>]*>\s*(\d{4})', region).group(1)
                     if re.search(r'class="year"', region) else "",
            "imdb": (re.search(r'class="imdb"[^>]*>\s*IMDb:\s*([\d.]+)', region) or [None, ""])[1]
                    if re.search(r'class="imdb"', region) else "",
            "genres": grab("slider-genres"),
            "description": grab("slider-description"),
            "url": f"/open/{vid}",
        })
    return cards


def parse_home(page_html: str) -> dict:
    """Home page: hero slider + titled rows."""
    hero = parse_hero(page_html)
    rows = []
    chunks = SECTION_SPLIT_RE.split(page_html)
    for chunk in chunks[1:]:
        tm = SECTION_TITLE_RE.search(chunk[:2000])
        title = _clean(tm.group(1)) if tm else "Row"
        items = parse_continue(chunk) + parse_posters(chunk)
        if title.lower().startswith("continue"):
            items = parse_continue(chunk) or parse_posters(chunk)
        if items:
            rows.append({"title": title, "items": items})
    return {"hero": hero, "rows": rows}


def has_next_page(page_html: str, page: int) -> bool:
    """True if the pagination list links to page+1 (hrefs look like /movies/2)."""
    start = page_html.find('class="pagination"')
    if start < 0:
        return False
    end = page_html.find("</ul>", start)
    pager = page_html[start:end if end > 0 else len(page_html)]
    return re.search(NEXT_PAGE_RE_tmpl.format(n=page + 1), pager) is not None


def parse_cards(page_html: str) -> list[dict]:
    """Generic card list for catalog/search/list pages."""
    return parse_continue(page_html) + parse_posters(page_html)


# --- watch page ------------------------------------------------------------

def _parse_subtitles(spec: str) -> list[dict]:
    subs = []
    for m in SUBTITLE_PAIR_RE.finditer(spec or ""):
        subs.append({"label": _clean(m.group(1)), "url": m.group(2)})
    return subs


def parse_title_page(page_html: str, watch_url: str = "") -> dict:
    """Watch page -> episode/season structure plus player config."""
    out = {
        "video_id": "",
        "name": "",
        "is_movie": False,
        "user_id": "",
        "watch_url": watch_url,
        "seasons": [],
    }
    m = VIDEO_ID_RE.search(page_html)
    out["video_id"] = m.group(1) if m else ""
    m = VIDEO_NAME_RE.search(page_html)
    out["name"] = html_lib.unescape(m.group(1)) if m else ""
    m = IS_MOVIE_RE.search(page_html)
    out["is_movie"] = (m.group(1) == "true") if m else False
    m = USER_ID_RE.search(page_html)
    out["user_id"] = m.group(1) if m else ""

    m = PLAYLIST_RE.search(page_html)
    if not m:
        return out
    try:
        data = json.loads(base64.b64decode(m.group(1)))
    except ValueError:
        return out

    def episode(entry: dict) -> dict:
        file = entry.get("file", "")
        em = STREAM_ID_RE.search(file)
        return {
            "id": entry.get("id") or (em.group(1) if em else out["video_id"]),
            "title": _clean(entry.get("title", "")),
            "poster": html_lib.unescape(entry.get("poster", "")),
            "subtitles": _parse_subtitles(entry.get("subtitle", "")),
            "thumbnails": entry.get("thumbnails", ""),
        }

    file = data.get("file")
    if isinstance(file, list):  # series: seasons -> folders -> episodes
        seen_seasons = set()
        for season in file:
            title = _clean(season.get("title", ""))
            eps = [episode(e) for e in season.get("folder", []) if isinstance(e, dict)]
            # the playlist repeats seasons per language dub; keep the first
            # (stream requests pin language=en server-side anyway)
            if eps and title not in seen_seasons:
                seen_seasons.add(title)
                out["seasons"].append({"title": title, "episodes": eps})
    elif isinstance(file, str):  # single video
        m2 = STREAM_ID_RE.search(file)
        single = {
            "id": m2.group(1) if m2 else out["video_id"],
            "title": out["name"],
            "poster": "",
            "subtitles": [],
            "thumbnails": "",
        }
        out["seasons"].append({"title": "", "episodes": [single]})
    return out
