import { NextResponse } from "next/server";
import { catalogSource, credentialsConfigured } from "@/lib/catalog";
import { bridgeGet } from "@/lib/bridge";

export const dynamic = "force-dynamic";

const headers = { "Access-Control-Allow-Origin": "*" };

export async function GET() {
  const source = catalogSource();
  if (source === "fixture") {
    return NextResponse.json(
      {
        ok: true,
        source,
        email: null,
        credentialsConfigured: credentialsConfigured(),
      },
      { headers },
    );
  }
  try {
    const ping = await bridgeGet<{ ok?: boolean; email?: string; user_id?: string }>("/ping");
    return NextResponse.json({ ...ping, source, credentialsConfigured: credentialsConfigured() }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bridge unreachable";
    return NextResponse.json(
      { ok: false, source, error: message, credentialsConfigured: credentialsConfigured() },
      { status: 502, headers },
    );
  }
}
