import Link from "next/link";
import type { MediaCard as Card } from "@/lib/types";

export function MediaCard({
  card,
  variant = "poster",
  rank,
}: {
  card: Card;
  variant?: "poster" | "landscape" | "rank";
  rank?: number;
}) {
  const className = variant === "landscape" ? "card landscape" : variant === "rank" ? "card rank" : "card";
  const poster = (
    <span className="card-poster">
      <img src={card.poster || card.backdrop} alt="" />
      {card.timeLabel ? <span className="card-badge">{card.timeLabel}</span> : null}
      {typeof card.progress === "number" ? (
        <span className="progress" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(100, card.progress))}%` }} />
        </span>
      ) : null}
    </span>
  );
  return (
    <Link href={`/title/${card.id}`} className={className} data-tv-item="" aria-label={card.title}>
      {variant === "rank" ? (
        <>
          <span className="rank-num" aria-hidden="true">
            {rank}
          </span>
          <span className="rank-body">
            {poster}
            <span className="card-caption">{card.title}</span>
          </span>
        </>
      ) : (
        <>
          {poster}
          <span className="card-caption">{card.title}</span>
        </>
      )}
    </Link>
  );
}
