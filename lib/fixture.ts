import "server-only";

import { librarySeed, titles, type TitleSeed } from "@/lib/seed";
import { durationSeconds } from "@/lib/time";
import type {
  HomePayload,
  LibraryDefaults,
  MediaCard,
  MediaRow,
  Season,
  StreamPayload,
  TitleDetail,
} from "@/lib/types";

const art = (id: string, kind: "poster" | "backdrop") => `/art/${id}-${kind}.svg`;

function seasonLabel(seed: TitleSeed): string {
  const count = seed.seasons?.length ?? 0;
  if (seed.kind === "series" && count > 1) return `${count} Seasons`;
  if (seed.kind === "series" && count === 1) {
    const eps = seed.seasons?.[0]?.episodes.length ?? 0;
    return eps ? `${eps} Episodes` : seed.duration;
  }
  return seed.duration;
}

export function toCard(seed: TitleSeed, extra: Partial<MediaCard> = {}): MediaCard {
  return {
    id: seed.id,
    title: seed.title,
    poster: art(seed.id, "poster"),
    backdrop: art(seed.id, "backdrop"),
    description: seed.description,
    logline: seed.logline,
    year: seed.year,
    genres: seed.genres,
    duration: seasonLabel(seed),
    score: seed.score,
    quality: seed.quality,
    rating: seed.rating,
    kind: seed.kind,
    country: seed.country,
    ...extra,
  };
}

function byId(id: string): TitleSeed | undefined {
  return titles.find((title) => title.id === id);
}

export function allCards(): MediaCard[] {
  return titles.map((title) => toCard(title));
}

function row(title: string, items: MediaCard[], variant: MediaRow["variant"]): MediaRow | null {
  if (items.length === 0) return null;
  return { title, variant, items };
}

function genreRow(genre: string): MediaRow | null {
  const items = titles.filter((title) => title.genres.includes(genre)).map((title) => toCard(title));
  return row(genre, items, "poster");
}

export function fixtureHome(): HomePayload {
  const continueItems = librarySeed.continue
    .map((entry) => {
      const seed = byId(entry.id);
      if (!seed) return null;
      return toCard(seed, {
        poster: art(seed.id, "backdrop"),
        progress: entry.progress,
        timeLabel: entry.timeLabel,
        watchUrl: `/title/${seed.id}`,
      });
    })
    .filter((item): item is MediaCard => Boolean(item));

  const hero = titles.filter((title) => title.featured).map((title) => toCard(title));
  const trending = titles.filter((title) => title.trending).map((title) => toCard(title));
  const top = titles
    .filter((title) => title.topRank)
    .sort((a, b) => (a.topRank ?? 0) - (b.topRank ?? 0))
    .map((title) => toCard(title));
  const movies = titles.filter((title) => title.kind === "movie").map((title) => toCard(title));
  const shows = titles.filter((title) => title.kind === "series").map((title) => toCard(title));
  const fresh = titles.filter((title) => title.fresh).map((title) => toCard(title));

  const keepShort = new Set(["Continue Watching", "Trending", "Top Charts", "New This Week"]);
  const rows = [
    row("Continue Watching", continueItems, "landscape"),
    row("Trending", trending, "poster"),
    row("Top Charts", top, "rank"),
    row("Movies", movies.slice(0, 16), "poster"),
    row("TV Shows", shows, "poster"),
    genreRow("Sci-Fi"),
    genreRow("Drama"),
    genreRow("Thriller"),
    genreRow("Animation"),
    genreRow("Comedy"),
    genreRow("Mystery"),
    row(
      "New This Week",
      fresh.map((card) => ({ ...card, poster: card.backdrop || card.poster })),
      "landscape",
    ),
  ].filter((entry): entry is MediaRow => {
    if (!entry) return false;
    if (keepShort.has(entry.title)) return entry.items.length > 0;
    return entry.items.length >= 4;
  });

  return { hero, rows, source: "fixture" };
}

const CATALOGS: Record<string, (page: number) => { items: MediaCard[]; hasMore: boolean }> = {
  movies: (page) => pageOf(titles.filter((title) => title.kind === "movie"), page),
  "tv-shows": (page) => pageOf(titles.filter((title) => title.kind === "series"), page),
  anime: (page) =>
    pageOf(
      titles.filter((title) => title.genres.includes("Animation")),
      page,
    ),
  popular: (page) => pageOf(titles.filter((title) => title.trending || title.featured), page),
  "top-imdb": (page) =>
    pageOf(
      [...titles].sort((a, b) => Number(b.score) - Number(a.score)),
      page,
    ),
  "last-added": (page) =>
    pageOf(
      [...titles].sort((a, b) => Number(b.year) - Number(a.year)),
      page,
    ),
  "my-list/favorites": (page) => pageOf(idsToSeeds(librarySeed.list), page),
  "my-list/watch-later": (page) => pageOf(idsToSeeds(librarySeed.later), page),
  "my-list/continue-watching": (page) =>
    pageOf(
      librarySeed.continue.map((entry) => byId(entry.id)).filter((item): item is TitleSeed => Boolean(item)),
      page,
    ),
  "my-list/watched": () => ({ items: [], hasMore: false }),
};

function idsToSeeds(ids: string[]): TitleSeed[] {
  return ids.map((id) => byId(id)).filter((item): item is TitleSeed => Boolean(item));
}

function pageOf(list: TitleSeed[], page: number) {
  const size = 24;
  const start = (page - 1) * size;
  const slice = list.slice(start, start + size);
  return {
    items: slice.map((title) => toCard(title)),
    hasMore: start + size < list.length,
  };
}

export function fixtureCatalog(path: string, page: number) {
  const handler = CATALOGS[path];
  if (!handler) return { items: [] as MediaCard[], page, has_more: false };
  const result = handler(page);
  return { items: result.items, page, has_more: result.hasMore };
}

export function fixtureSearch(query: string): MediaCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return titles
    .filter((title) => {
      const hay = [title.title, title.logline, title.description, title.genres.join(" "), title.kind, title.year]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .map((title) => toCard(title));
}

function buildSeasons(seed: TitleSeed): Season[] {
  if (seed.kind === "movie" || !seed.seasons?.length) {
    return [
      {
        title: "",
        episodes: [
          {
            id: seed.id,
            title: seed.title,
            synopsis: seed.logline,
            duration: seed.duration,
            poster: art(seed.id, "backdrop"),
          },
        ],
      },
    ];
  }
  return seed.seasons.map((season, sIdx) => ({
    title: season.title,
    episodes: season.episodes.map((episode, eIdx) => ({
      id: `${seed.id}-s${sIdx + 1}e${eIdx + 1}`,
      title: episode.title,
      synopsis: episode.synopsis,
      duration: seed.duration,
      poster: art(seed.id, "backdrop"),
    })),
  }));
}

export function fixtureTitle(code: string): TitleDetail | null {
  const seed = byId(code);
  if (!seed) return null;
  const cont = librarySeed.continue.find((entry) => entry.id === code);
  const card = toCard(seed, cont ? { progress: cont.progress, timeLabel: cont.timeLabel } : {});
  const primary = seed.genres[0];
  const related = titles
    .filter((title) => title.id !== seed.id && title.genres.includes(primary))
    .slice(0, 12)
    .map((title) => toCard(title));
  const filler = titles
    .filter((title) => title.id !== seed.id && !related.some((item) => item.id === title.id))
    .slice(0, Math.max(0, 8 - related.length))
    .map((title) => toCard(title));
  return { card, seasons: buildSeasons(seed), related: [...related, ...filler], source: "fixture" };
}

export function fixtureStream(videoId: string): StreamPayload | null {
  for (const seed of titles) {
    const seasons = buildSeasons(seed);
    const episodes = seasons.flatMap((season) => season.episodes);
    const episode = episodes.find((item) => item.id === videoId) ?? (seed.id === videoId ? episodes[0] : undefined);
    if (!episode) continue;
    const cont = librarySeed.continue.find((entry) => entry.id === seed.id);
    const seconds = durationSeconds(episode.duration);
    const watched = cont ? Math.floor((seconds * cont.progress) / 100) : 0;
    return {
      preview: true,
      title: seed.title,
      subtitle: episode.title === seed.title ? "" : episode.title,
      backdrop: art(seed.id, "backdrop"),
      watched_seconds: watched,
      duration_seconds: seconds || 3600,
      streams: [],
    };
  }
  return null;
}

export function fixtureDefaults(): LibraryDefaults {
  return {
    continue: librarySeed.continue.map((entry) => ({ ...entry })),
    list: [...librarySeed.list],
    later: [...librarySeed.later],
  };
}

export function fixtureBrowse(kind: "movies" | "tv"): HomePayload {
  const selected = titles.filter((title) => (kind === "movies" ? title.kind === "movie" : title.kind === "series"));
  const hero = (selected.filter((title) => title.featured).length
    ? selected.filter((title) => title.featured)
    : selected.slice(0, 4)
  ).map((title) => toCard(title));
  const genres = [...new Set(selected.flatMap((title) => title.genres))];
  const rows = [
    row(kind === "movies" ? "Featured Films" : "Featured Shows", selected.filter((t) => t.trending || t.featured).map((t) => toCard(t)), "poster"),
    row("Top Charts", selected.filter((t) => t.topRank).sort((a, b) => (a.topRank ?? 0) - (b.topRank ?? 0)).map((t) => toCard(t)), "rank"),
    ...genres.map((genre) =>
      row(
        genre,
        selected.filter((title) => title.genres.includes(genre)).map((title) => toCard(title)),
        "poster",
      ),
    ),
  ].filter((entry): entry is MediaRow => Boolean(entry && entry.items.length > 1));
  return { hero, rows, source: "fixture" };
}

export function allowedCatalogPaths(): string[] {
  return Object.keys(CATALOGS);
}
