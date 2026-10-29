import { NextResponse } from "next/server";
import { CatalogError, getCatalog } from "@/lib/catalog";
import { allowedCatalogPaths } from "@/lib/fixture";

export const dynamic = "force-dynamic";

const headers = { "Access-Control-Allow-Origin": "*" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "movies";
  const page = Number(url.searchParams.get("page") || "1");
  if (!allowedCatalogPaths().includes(path)) {
    return NextResponse.json({ error: "Unknown catalog path" }, { status: 400, headers });
  }
  try {
    return NextResponse.json(await getCatalog(path, Number.isFinite(page) && page > 0 ? page : 1), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Catalog error";
    const status = error instanceof CatalogError ? error.status : 502;
    return NextResponse.json({ error: message }, { status, headers });
  }
}
