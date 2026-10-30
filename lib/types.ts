export type MediaKind = "movie" | "series";

export type MediaCard = {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  description: string;
  logline: string;
  year: string;
  genres: string[];
  duration: string;
  score: string;
  quality: string;
  rating: string;
  kind: MediaKind;
  country: string;
  progress?: number;
  timeLabel?: string;
  watchUrl?: string;
};

export type RowVariant = "poster" | "landscape" | "rank";

export type MediaRow = {
  title: string;
  variant: RowVariant;
  items: MediaCard[];
};

export type HomePayload = {
  hero: MediaCard[];
  rows: MediaRow[];
  source: CatalogSource;
};

export type Episode = {
  id: string;
  title: string;
  synopsis: string;
  duration: string;
  poster: string;
};

export type Season = {
  title: string;
  episodes: Episode[];
};

export type TitleDetail = {
  card: MediaCard;
  seasons: Season[];
  related: MediaCard[];
  source: CatalogSource;
};

export type StreamPayload = {
  preview: boolean;
  title: string;
  subtitle: string;
  backdrop: string;
  watched_seconds: number;
  duration_seconds: number;
  streams: { label: string; url: string }[];
};

export type CatalogSource = "fixture" | "bridge";

export type LibraryDefaults = {
  continue: { id: string; progress: number; timeLabel: string }[];
  list: string[];
  later: string[];
};
