import type { Metadata } from "next";
import { SearchScreen } from "@/components/SearchScreen";
import { catalogSource, getHome, searchCatalog } from "@/lib/catalog";
import { allCards } from "@/lib/fixture";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const [home, result] = await Promise.all([getHome(), query ? searchCatalog(query) : Promise.resolve(null)]);
  const suggestions = home.rows.filter((row) => ["Trending", "Top Charts", "TV Shows", "Movies"].includes(row.title)).slice(0, 3);
  const catalog = catalogSource() === "fixture" ? allCards() : undefined;
  return (
    <SearchScreen
      initialQuery={query}
      initialResults={result?.items ?? []}
      suggestions={suggestions}
      catalog={catalog}
    />
  );
}
