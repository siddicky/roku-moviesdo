import type { MediaCard } from "@/lib/types";

export function MetaLine({ card }: { card: MediaCard }) {
  const bits = [
    card.year,
    card.duration,
    card.country,
    card.quality,
    ...card.genres.slice(0, 3),
  ].filter(Boolean);
  return (
    <div className="meta">
      {card.rating ? <span className="rating-pill">{card.rating}</span> : null}
      {bits.map((bit) => (
        <span key={bit}>{bit}</span>
      ))}
      {card.score ? <span className="score">★ {card.score}</span> : null}
    </div>
  );
}
