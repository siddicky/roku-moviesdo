import { NextResponse } from "next/server";
import { CatalogError, searchCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const headers = { "Access-Control-Allow-Origin": "*" };

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  try {
    if (!query) return NextResponse.json({ items: [] }, { headers });
    return NextResponse.json(await searchCatalog(query), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search error";
    const status = error instanceof CatalogError ? error.status : 502;
    return NextResponse.json({ error: message }, { status, headers });
  }
}
