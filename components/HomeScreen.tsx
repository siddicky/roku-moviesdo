import { Hero } from "@/components/Hero";
import { MediaRow } from "@/components/MediaRow";
import type { HomePayload } from "@/lib/types";

export function HomeScreen({ data, eyebrow, compact = false }: { data: HomePayload; eyebrow?: string; compact?: boolean }) {
  return (
    <div className="screen">
      <Hero items={data.hero} eyebrow={eyebrow} compact={compact} />
      <div className="rows">
        {data.rows.map((row) => (
          <MediaRow key={row.title} row={row} />
        ))}
      </div>
    </div>
  );
}
