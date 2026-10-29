import { NextResponse } from "next/server";
import { CatalogError, getStream } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const headers = { "Access-Control-Allow-Origin": "*" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const videoId = url.searchParams.get("video_id")?.trim() || "";
  const referer = url.searchParams.get("referer") || "";
  if (!videoId) return NextResponse.json({ error: "video_id required" }, { status: 400, headers });
  try {
    return NextResponse.json(await getStream(videoId, referer), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stream error";
    const status = error instanceof CatalogError ? error.status : 502;
    return NextResponse.json({ error: message }, { status, headers });
  }
}
