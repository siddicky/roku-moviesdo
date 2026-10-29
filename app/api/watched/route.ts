import { NextResponse } from "next/server";
import { catalogSource } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    video_id?: string;
    watched_seconds?: number;
    duration_seconds?: number;
  };
  if (catalogSource() !== "bridge") return NextResponse.json({ ok: true, source: "fixture" }, { headers });
  const base = process.env.MOVIESDO_BRIDGE_URL?.replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: "MOVIESDO_BRIDGE_URL is not set" }, { status: 502, headers });
  const response = await fetch(`${base}/watched`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_id: body.video_id ?? "",
      watched_seconds: body.watched_seconds ?? 0,
      duration_seconds: body.duration_seconds ?? 0,
    }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ ok: response.ok }));
  return NextResponse.json(data, { status: response.status, headers });
}
