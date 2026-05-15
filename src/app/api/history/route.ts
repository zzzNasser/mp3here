import { NextResponse } from "next/server";

import { deleteHistoryItem, readHistory } from "@/lib/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const history = await readHistory();
  return NextResponse.json({ history });
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { id?: unknown };

    if (typeof body.id !== "string" || !body.id.trim()) {
      return NextResponse.json({ error: "Download id is required." }, { status: 400 });
    }

    const result = await deleteHistoryItem(body.id);

    if (!result.deleted) {
      return NextResponse.json({ error: "Download was not found.", history: result.history }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to delete that download." }, { status: 500 });
  }
}
