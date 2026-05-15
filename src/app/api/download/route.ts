import { NextResponse } from "next/server";

import { startDownload } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; playlist?: boolean };

    if (!body.url) {
      return NextResponse.json({ error: "Paste a YouTube link first." }, { status: 400 });
    }

    const job = startDownload(body.url, Boolean(body.playlist));
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start the download." },
      { status: 400 },
    );
  }
}
