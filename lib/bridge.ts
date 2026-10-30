import "server-only";

import type { MediaCard, MediaKind, MediaRow, RowVariant } from "@/lib/types";

export class CatalogError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "CatalogError";
    this.status = status;
  }
}

export function bridgeBase(): string | null {
  const raw = process.env.MOVIESDO_BRIDGE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export async function bridgeGet<T>(path: string): Promise<T> {
  const base = bridgeBase();
  if (!base) {
    throw new CatalogError(
      "CATALOG_SOURCE is bridge, but MOVIESDO_BRIDGE_URL is empty. Point it at the Python server in server/server.py.",
    );
  }
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "bridge unreachable";
    throw new CatalogError(`Could not reach the movies.do bridge at ${base}: ${message}`);
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new CatalogError(`Bridge returned a non-JSON response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Bridge HTTP ${response.status}`;
    throw new CatalogError(message, response.status);
  }
  return data as T;
}

type RawCard = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function kindFrom(raw: RawCard): MediaKind {
  const hint = `${asString(raw.kind)} ${asString(raw.type)}`.toLowerCase();
  if (hint.includes("series") || hint.includes("tv") || hint.includes("show")) return "series";
  return "movie";
}

export function normalizeCard(raw: RawCard): MediaCard {
  const genres = asString(raw.genres)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const poster = asString(raw.poster);
  const backdrop = asString(raw.backdrop) || poster;
  const progress = typeof raw.progress === "number" ? raw.progress : undefined;
  const score = asString(raw.score || raw.imdb);
  return {
    id: asString(raw.id),
    title: asString(raw.title) || "Untitled",
    poster,
    backdrop,
    description: asString(raw.description),
    logline: asString(raw.logline) || asString(raw.description),
    year: asString(raw.year),
    genres,
    duration: asString(raw.duration),
    score,
    quality: asString(raw.quality),
    rating: asString(raw.contentRating),
    kind: kindFrom(raw),
    country: asString(raw.country),
    progress,
    timeLabel: asString(raw.timeLabel || raw.time_label) || undefined,
    watchUrl: asString(raw.watchUrl || raw.watch_url) || undefined,
  };
}

export function rowVariant(title: string, items: MediaCard[]): RowVariant {
  if (items.some((item) => item.progress != null || item.timeLabel || item.watchUrl)) return "landscape";
  if (/top/i.test(title) && items.length >= 5) return "rank";
  return "poster";
}

export function normalizeRow(title: string, items: RawCard[]): MediaRow {
  const cards = items.map(normalizeCard).filter((item) => item.id && item.title);
  return { title, variant: rowVariant(title, cards), items: cards };
}
