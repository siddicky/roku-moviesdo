import type { Metadata } from "next";
import { HomeScreen } from "@/components/HomeScreen";
import { getBrowse } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "TV Shows" };

export default async function TvPage() {
  const data = await getBrowse("tv");
  return <HomeScreen data={data} eyebrow="TV Shows" compact />;
}
