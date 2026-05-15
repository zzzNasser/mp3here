import { NextResponse } from "next/server";

import { inspectMedia } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };

    if (!body.url) {
      return NextResponse.json({ error: "Paste a YouTube link first." }, { status: 400 });
    }

    const preview = await inspectMedia(body.url);
    return NextResponse.json({ preview });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to inspect that link." },
      { status: 400 },
    );
  }
}
