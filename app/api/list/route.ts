import { NextResponse } from "next/server";
import { catalogSource } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    kind?: string;
    production_id?: string;
    action?: string;
  };
  if (body.kind !== "favorite" && body.kind !== "watch-later") {
    return NextResponse.json({ error: "kind must be favorite or watch-later" }, { status: 400, headers });
  }
  if (catalogSource() !== "bridge") return NextResponse.json({ ok: true, source: "fixture" }, { headers });
  const base = process.env.MOVIESDO_BRIDGE_URL?.replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: "MOVIESDO_BRIDGE_URL is not set" }, { status: 502, headers });
  const response = await fetch(`${base}/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: body.kind,
      production_id: body.production_id ?? "",
      action: body.action === "delete" ? "delete" : "add",
    }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ ok: response.ok }));
  return NextResponse.json(data, { status: response.status, headers });
}
