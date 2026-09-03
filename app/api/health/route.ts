import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const baseResponse = {
    service: "merishop-flow",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    timestamp: new Date().toISOString(),
  };

  if (!url || !key) {
    return NextResponse.json(
      {
        ...baseResponse,
        status: "degraded",
        checks: { database: "configuration_error" },
      },
      { status: 503, headers: responseHeaders }
    );
  }

  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  let databaseAvailable = false;
  try {
    const { error } = await supabase
      .rpc("health_check")
      .abortSignal(AbortSignal.timeout(4_000));
    databaseAvailable = !error;
  } catch {
    databaseAvailable = false;
  }

  if (!databaseAvailable) {
    return NextResponse.json(
      {
        ...baseResponse,
        status: "degraded",
        checks: { database: "error" },
      },
      { status: 503, headers: responseHeaders }
    );
  }

  return NextResponse.json(
    {
      ...baseResponse,
      status: "ok",
      checks: { database: "ok" },
    },
    { headers: responseHeaders }
  );
}
