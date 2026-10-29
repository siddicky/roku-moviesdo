import "server-only";

import { bridgeGet, normalizeCard, normalizeRow } from "@/lib/bridge";
import {
  fixtureBrowse,
  fixtureCatalog,
  fixtureDefaults,
  fixtureHome,
  fixtureSearch,
  fixtureStream,
  fixtureTitle,
} from "@/lib/fixture";
import type {
  CatalogSource,
  HomePayload,
  LibraryDefaults,
  MediaCard,
  StreamPayload,
  TitleDetail,
} from "@/lib/types";

export function catalogSource(): CatalogSource {
  const mode = process.env.CATALOG_SOURCE?.trim().toLowerCase();
  if (mode === "fixture") return "fixture";
  if (mode === "bridge" || mode === "live") return "bridge";
  if (process.env.MOVIESDO_BRIDGE_URL?.trim()) return "bridge";
  return "fixture";
}

function useBridge(): boolean {
  return catalogSource() === "bridge";
}

export function credentialsConfigured(): boolean {
  return Boolean(process.env.MOVIESDO_EMAIL?.trim() && process.env.MOVIESDO_PASSWORD?.trim());
}

export async function getHome(): Promise<HomePayload> {
  if (!useBridge()) return fixtureHome();
  const data = await bridgeGet<{ hero?: Record<string, unknown>[]; rows?: { title?: string; items?: Record<string, unknown>[] }[] }>(
    "/home",
  );
  const hero = (data.hero ?? []).map(normalizeCard);
  const rows = (data.rows ?? [])
    .map((entry) => normalizeRow(entry.title || "Row", entry.items ?? []))
    .filter((entry) => entry.items.length > 0);
  return { hero, rows, source: "bridge" };
}

export async function getBrowse(kind: "movies" | "tv"): Promise<HomePayload> {
  if (!useBridge()) return fixtureBrowse(kind);
  const path = kind === "movies" ? "movies" : "tv-shows";
  const [catalog, home] = await Promise.all([
    getCatalog(path, 1),
    getHome().catch(() => null),
  ]);
  const featured = (home?.hero ?? []).filter((item) =>
    kind === "movies" ? item.kind !== "series" : item.kind === "series",
  );
  const hero = featured.length ? featured : catalog.items.slice(0, 5);
  return {
    hero,
    rows: [{ title: kind === "movies" ? "Movies" : "TV Shows", variant: "poster", items: catalog.items }],
    source: "bridge",
  };
}

export async function getCatalog(path: string, page = 1) {
  if (!useBridge()) return { ...fixtureCatalog(path, page), source: "fixture" as const };
  const data = await bridgeGet<{ items?: Record<string, unknown>[]; page?: number; has_more?: boolean }>(
    `/catalog?path=${encodeURIComponent(path)}&page=${page}`,
  );
  return {
    items: (data.items ?? []).map(normalizeCard),
    page: data.page ?? page,
    has_more: Boolean(data.has_more),
    source: "bridge" as const,
  };
}

export async function searchCatalog(query: string): Promise<{ items: MediaCard[]; source: CatalogSource }> {
  if (!useBridge()) return { items: fixtureSearch(query), source: "fixture" };
  const data = await bridgeGet<{ items?: Record<string, unknown>[] }>(
    `/search?q=${encodeURIComponent(query)}`,
  );
  return { items: (data.items ?? []).map(normalizeCard), source: "bridge" };
}

export async function getTitle(code: string): Promise<TitleDetail | null> {
  if (!useBridge()) return fixtureTitle(code);
  const [payload, home] = await Promise.all([
    bridgeGet<Record<string, unknown>>(`/title?code=${encodeURIComponent(code)}`),
    getHome().catch(() => null),
  ]);
  const pool = [
    ...(home?.hero ?? []),
    ...(home?.rows ?? []).flatMap((entry) => entry.items),
  ];
  const known = pool.find((item) => item.id === code);
  const seasons = Array.isArray(payload.seasons) ? payload.seasons : [];
  const firstPoster = seasons
    .flatMap((season) => (season && typeof season === "object" && Array.isArray((season as { episodes?: unknown }).episodes)
      ? (season as { episodes: { poster?: string }[] }).episodes
      : []))
    .map((episode) => episode.poster)
    .find(Boolean);
  const card: MediaCard = known ?? {
    id: code,
    title: typeof payload.name === "string" && payload.name ? payload.name : "Untitled",
    poster: firstPoster || "",
    backdrop: firstPoster || "",
    description: "",
    logline: "",
    year: "",
    genres: [],
    duration: "",
    score: "",
    quality: "",
    rating: "",
    kind: payload.is_movie === false ? "series" : "movie",
    country: "",
    watchUrl: typeof payload.watch_url === "string" ? payload.watch_url : undefined,
  };
  const normalizedSeasons = seasons.map((season) => {
    const record = season as { title?: string; episodes?: Record<string, unknown>[] };
    return {
      title: record.title || "",
      episodes: (record.episodes ?? []).map((episode, index) => ({
        id: String(episode.id || `${code}-${index}`),
        title: String(episode.title || `Episode ${index + 1}`),
        synopsis: "",
        duration: card.duration,
        poster: String(episode.poster || card.backdrop || card.poster),
      })),
    };
  });
  const related = pool.filter((item) => item.id && item.id !== code).slice(0, 12);
  return { card, seasons: normalizedSeasons, related, source: "bridge" };
}

export async function getStream(videoId: string, referer = ""): Promise<StreamPayload> {
  if (!useBridge()) {
    const preview = fixtureStream(videoId);
    if (!preview) {
      return {
        preview: true,
        title: "Preview",
        subtitle: "",
        backdrop: "",
        watched_seconds: 0,
        duration_seconds: 3600,
        streams: [],
      };
    }
    return preview;
  }
  const data = await bridgeGet<{
    streams?: { label?: string; url?: string }[];
    watched_seconds?: number;
    title?: string;
  }>(`/stream?video_id=${encodeURIComponent(videoId)}&referer=${encodeURIComponent(referer)}`);
  return {
    preview: !data.streams?.length,
    title: data.title || "",
    subtitle: "",
    backdrop: "",
    watched_seconds: data.watched_seconds ?? 0,
    duration_seconds: 0,
    streams: (data.streams ?? [])
      .filter((stream) => stream.url)
      .map((stream) => ({ label: stream.label || "HD", url: stream.url || "" })),
  };
}

export async function getLibraryRows() {
  if (!useBridge()) return { source: "fixture" as const, rows: [] };
  const paths = [
    ["Continue Watching", "my-list/continue-watching"],
    ["My List", "my-list/favorites"],
    ["Watch Later", "my-list/watch-later"],
    ["Watched", "my-list/watched"],
  ] as const;
  const loaded = await Promise.all(
    paths.map(async ([title, path]) => {
      const catalog = await getCatalog(path, 1);
      return { title, items: catalog.items };
    }),
  );
  return {
    source: "bridge" as const,
    rows: loaded
      .filter((entry) => entry.items.length)
      .map((entry) => ({
        title: entry.title,
        variant: entry.title === "Continue Watching" ? ("landscape" as const) : ("poster" as const),
        items: entry.items,
      })),
  };
}

export function libraryDefaults(): LibraryDefaults {
  if (useBridge()) return { continue: [], list: [], later: [] };
  return fixtureDefaults();
}

export { CatalogError } from "@/lib/bridge";
