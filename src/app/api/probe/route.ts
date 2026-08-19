import { NextResponse } from "next/server";

// Sonda de diagnóstico: mede a latência da function até o GoTrue hospedado.
// GET /api/probe?n=3 faz N chamadas seguidas e devolve os tempos.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const n = Math.min(
    Number(new URL(request.url).searchParams.get("n") ?? 3),
    5
  );
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const results: Array<Record<string, unknown>> = [];

  for (let i = 0; i < n; i++) {
    const t0 = Date.now();
    try {
      const r = await fetch(`${base}/auth/v1/health`, {
        headers: { apikey },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      results.push({ try: i + 1, status: r.status, ms: Date.now() - t0 });
    } catch (e) {
      results.push({
        try: i + 1,
        error: String(e).slice(0, 120),
        ms: Date.now() - t0,
      });
    }
  }

  return NextResponse.json({
    region: process.env.VERCEL_REGION ?? "?",
    node: process.version,
    results,
  });
}
