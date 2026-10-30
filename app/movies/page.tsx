import type { Metadata } from "next";
import { HomeScreen } from "@/components/HomeScreen";
import { getBrowse } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Movies" };

export default async function MoviesPage() {
  const data = await getBrowse("movies");
  return <HomeScreen data={data} eyebrow="Movies" compact />;
}
