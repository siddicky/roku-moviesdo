import { NextResponse } from "next/server";
import { CatalogError, getHome } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const headers = { "Access-Control-Allow-Origin": "*" };

export async function GET() {
  try {
    return NextResponse.json(await getHome(), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Catalog error";
    const status = error instanceof CatalogError ? error.status : 502;
    return NextResponse.json({ error: message }, { status, headers });
  }
}
