import { NextResponse } from "next/server";
import { CatalogError, getTitle } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const headers = { "Access-Control-Allow-Origin": "*" };

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() || "";
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400, headers });
  try {
    const detail = await getTitle(code);
    if (!detail) return NextResponse.json({ error: "Title not found" }, { status: 404, headers });
    return NextResponse.json(detail, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Title error";
    const status = error instanceof CatalogError ? error.status : 502;
    return NextResponse.json({ error: message }, { status, headers });
  }
}
