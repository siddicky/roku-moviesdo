import { MediaCard } from "@/components/MediaCard";
import type { MediaRow as RowModel } from "@/lib/types";

export function MediaRow({ row }: { row: RowModel }) {
  return (
    <section className="row" aria-label={row.title}>
      <h2 className="row-title">{row.title}</h2>
      <div className="row-scroller" data-tv-row="">
        {row.items.map((card, index) => (
          <MediaCard key={`${row.title}-${card.id}`} card={card} variant={row.variant} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}
