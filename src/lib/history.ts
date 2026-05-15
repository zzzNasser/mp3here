import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

import type { HistoryItem } from "./types";

const historyPath = path.join(process.cwd(), "data", "history.json");
const downloadsRoot = path.join(process.cwd(), "public", "downloads");
const trashRoot = path.join(process.cwd(), "data", "trash", "downloads");

async function ensureHistoryFile() {
  await mkdir(path.dirname(historyPath), { recursive: true });
}

export async function readHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await readFile(historyPath, "utf8");
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendHistory(item: HistoryItem) {
  await ensureHistoryFile();
  const history = await readHistory();
  const next = [item, ...history.filter((entry) => entry.id !== item.id)].slice(0, 24);
  await writeFile(historyPath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function safeDownloadDir(itemId: string) {
  const root = path.resolve(downloadsRoot);
  const target = path.resolve(root, itemId);
  const relative = path.relative(root, target);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid download folder.");
  }

  return target;
}

export async function deleteHistoryItem(itemId: string) {
  await ensureHistoryFile();

  const history = await readHistory();
  const item = history.find((entry) => entry.id === itemId);
  const next = history.filter((entry) => entry.id !== itemId);

  if (next.length !== history.length) {
    await writeFile(historyPath, JSON.stringify(next, null, 2), "utf8");
  }

  if (item) {
    await mkdir(trashRoot, { recursive: true });

    try {
      await rename(safeDownloadDir(item.id), path.join(trashRoot, `${item.id}-${Date.now()}`));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }

  return {
    deleted: Boolean(item),
    history: next,
  };
}
