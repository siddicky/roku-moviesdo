import type { Metadata } from "next";
import { LibraryScreen } from "@/components/LibraryScreen";
import { catalogSource, getLibraryRows } from "@/lib/catalog";
import { allCards } from "@/lib/fixture";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  if (catalogSource() === "bridge") {
    const remote = await getLibraryRows();
    return <LibraryScreen titles={[]} remoteRows={remote.rows} />;
  }
  return <LibraryScreen titles={allCards()} />;
}
