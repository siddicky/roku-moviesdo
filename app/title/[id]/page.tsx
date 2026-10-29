import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailScreen } from "@/components/DetailScreen";
import { getTitle } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await getTitle(id);
  return { title: detail?.card.title ?? "Title" };
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getTitle(id);
  if (!detail) notFound();
  return <DetailScreen detail={detail} />;
}
