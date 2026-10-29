"use client";

import { useMemo } from "react";
import { useLibrary } from "@/components/LibraryProvider";
import { MediaRow } from "@/components/MediaRow";
import { durationSeconds } from "@/lib/time";
import type { MediaCard, MediaRow as Row } from "@/lib/types";

export function LibraryScreen({ titles, remoteRows }: { titles: MediaCard[]; remoteRows?: Row[] }) {
  const library = useLibrary();

  const rows = useMemo(() => {
    if (remoteRows && remoteRows.length) return remoteRows;
    const byId = new Map(titles.map((card) => [card.id, card]));
    const pick = (id: string) => byId.get(id);
    const continueItems: MediaCard[] = [];
    for (const [id, progress] of Object.entries(library.progress)) {
      if (progress <= 2 || progress >= 97) continue;
      const card = pick(id);
      if (!card) continue;
      const seconds = durationSeconds(card.duration);
      const left = seconds ? Math.max(1, Math.round((seconds * (100 - progress)) / 60 / 100)) : 0;
      continueItems.push({
        ...card,
        poster: card.backdrop || card.poster,
        progress,
        timeLabel: left ? `${left}m left` : card.timeLabel,
      });
    }
    const list = library.list.flatMap((id) => {
      const card = pick(id);
      return card ? [card] : [];
    });
    const later = library.later.flatMap((id) => {
      const card = pick(id);
      return card ? [card] : [];
    });
    const built: Row[] = [];
    if (continueItems.length) built.push({ title: "Continue Watching", variant: "landscape", items: continueItems });
    if (list.length) built.push({ title: "My List", variant: "poster", items: list });
    if (later.length) built.push({ title: "Watch Later", variant: "poster", items: later });
    return built;
  }, [titles, remoteRows, library.progress, library.list, library.later]);

  return (
    <div className="page">
      <h1 className="page-title">Library</h1>
      <p className="lede">Pick up where you left off, or revisit titles you saved.</p>
      {rows.length === 0 ? (
        <div className="empty">Your library is empty. Open a title and add it to My List.</div>
      ) : (
        <div className="rows">
          {rows.map((row) => (
            <MediaRow key={row.title} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
