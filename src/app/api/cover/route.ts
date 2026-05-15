import { NextResponse } from "next/server";
import sanitize from "sanitize-filename";

import { allowedThumbnailUrl } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src");
  const title = searchParams.get("title") ?? "mp3here-cover";

  if (!src || !allowedThumbnailUrl(src)) {
    return NextResponse.json({ error: "Cover source is not allowed." }, { status: 400 });
  }

  const response = await fetch(src);

  if (!response.ok) {
    return NextResponse.json({ error: "Unable to fetch the cover image." }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const extension = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";
  const filename = `${sanitize(title) || "mp3here-cover"}.${extension}`;

  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
