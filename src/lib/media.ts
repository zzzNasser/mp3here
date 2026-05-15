import { spawn } from "child_process";
import { createRequire } from "module";
import { existsSync } from "fs";
import path from "path";

import type { MediaPreview, MediaPreviewItem } from "./types";

const require = createRequire(import.meta.url);
const TOOL_CHECK_ARGS = {
  ytdlp: ["--version"],
  ffmpeg: ["-version"],
} as const;
const PREVIEW_CACHE_MS = 10 * 60 * 1000;

const globalMediaState = globalThis as typeof globalThis & {
  mp3HereToolCheck?: Promise<void> | null;
  mp3HerePreviewCache?: Map<string, { preview: MediaPreview; expiresAt: number }>;
};

const previewCache = globalMediaState.mp3HerePreviewCache ?? new Map<string, { preview: MediaPreview; expiresAt: number }>();
globalMediaState.mp3HerePreviewCache = previewCache;

type RawThumbnail = {
  url?: string;
  width?: number;
  height?: number;
  preference?: number;
};

type RawYtDlpInfo = {
  id?: string;
  _type?: string;
  webpage_url?: string;
  original_url?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  thumbnail?: string;
  thumbnails?: RawThumbnail[];
  entries?: RawYtDlpInfo[];
  playlist_count?: number;
  n_entries?: number;
  requested_downloads?: unknown[];
};

type CommandResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

function unwrapModulePath(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      unwrapModulePath(record.default) ??
      unwrapModulePath(record.path) ??
      unwrapModulePath(record.binaryPath) ??
      unwrapModulePath(record.YT_DLP_BIN_PATH) ??
      unwrapModulePath(record.FFMPEG_PATH)
    );
  }

  return null;
}

function resolvePackagePath(packageName: string): string | null {
  try {
    return unwrapModulePath(require(packageName));
  } catch {
    return null;
  }
}

function cleanPath(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function existingPath(value?: string | null) {
  const candidate = cleanPath(value);
  return candidate && existsSync(candidate) ? candidate : null;
}

export function resolveYtDlpPath() {
  const envPath = cleanPath(process.env.YTDLP_PATH);
  const choewyPath = path.join(
    process.cwd(),
    "node_modules",
    "@choewy",
    "yt-dlp",
    "bin",
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp",
  );
  const staticPath = path.join(
    process.cwd(),
    "node_modules",
    "yt-dlp-static",
    "bin",
    process.platform === "win32" ? "win/yt-dlp.exe" : "mac/yt-dlp",
  );

  return (
    existingPath(envPath) ??
    existingPath(resolvePackagePath("@choewy/yt-dlp")) ??
    existingPath(choewyPath) ??
    existingPath(resolvePackagePath("yt-dlp-static")) ??
    existingPath(staticPath) ??
    envPath ??
    "yt-dlp"
  );
}

export function resolveFfmpegPath() {
  const envPath = cleanPath(process.env.FFMPEG_PATH);
  const localPath = path.join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
  );

  return (
    existingPath(envPath) ??
    existingPath(resolvePackagePath("ffmpeg-static")) ??
    existingPath(localPath) ??
    envPath ??
    "ffmpeg"
  );
}

export function resolveFfmpegLocation() {
  const ffmpegPath = resolveFfmpegPath();
  return path.basename(ffmpegPath).toLowerCase().startsWith("ffmpeg")
    ? ffmpegPath
    : path.dirname(ffmpegPath);
}

export function assertYouTubeUrl(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Paste a valid YouTube video or playlist URL.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    throw new Error("Mp3Here accepts YouTube and YouTube Music links.");
  }

  return parsed.toString();
}

function runCommand(command: string, args: string[], timeoutMs = 120000) {
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      env: process.env,
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("The media engine timed out before responding."));
    }, timeoutMs);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function commandIsBundledFile(command: string) {
  return path.isAbsolute(command) && existsSync(command);
}

async function assertCommandReady(
  command: string,
  args: readonly string[],
  missingMessage: string,
) {
  if (commandIsBundledFile(command)) {
    return;
  }

  try {
    await runCommand(command, [...args], 20000);
  } catch {
    throw new Error(missingMessage);
  }
}

async function checkMediaToolsReady() {
  const ytDlp = resolveYtDlpPath();
  const ffmpeg = resolveFfmpegPath();

  await assertCommandReady(
    ytDlp,
    TOOL_CHECK_ARGS.ytdlp,
    "yt-dlp is not available. Install it or set YTDLP_PATH to a yt-dlp executable.",
  );

  await assertCommandReady(
    ffmpeg,
    TOOL_CHECK_ARGS.ffmpeg,
    "ffmpeg is not available. Install it or set FFMPEG_PATH to an ffmpeg executable.",
  );
}

export async function assertMediaToolsReady() {
  globalMediaState.mp3HereToolCheck ??= checkMediaToolsReady().catch((error) => {
    globalMediaState.mp3HereToolCheck = null;
    throw error;
  });

  await globalMediaState.mp3HereToolCheck;
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds < 1) {
    return "Live";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function bestThumbnail(info?: RawYtDlpInfo) {
  if (!info) {
    return null;
  }

  const thumbnails = [...(info.thumbnails ?? [])]
    .filter((thumbnail) => thumbnail.url)
    .sort((a, b) => {
      const aScore = (a.preference ?? 0) * 10000000 + (a.width ?? 0) * (a.height ?? 0);
      const bScore = (b.preference ?? 0) * 10000000 + (b.width ?? 0) * (b.height ?? 0);
      return bScore - aScore;
    });

  return thumbnails[0]?.url ?? info.thumbnail ?? null;
}

function mediaTitle(info?: RawYtDlpInfo) {
  return info?.title?.trim() || "Untitled audio";
}

function mediaChannel(info?: RawYtDlpInfo) {
  return info?.channel?.trim() || info?.uploader?.trim() || "Unknown channel";
}

function toPreviewItem(info: RawYtDlpInfo, index: number): MediaPreviewItem {
  return {
    id: info.id ?? String(index),
    title: mediaTitle(info),
    channel: mediaChannel(info),
    duration: formatDuration(info.duration),
    thumbnail: bestThumbnail(info),
  };
}

export async function inspectMedia(url: string): Promise<MediaPreview> {
  const normalizedUrl = assertYouTubeUrl(url);
  const cached = previewCache.get(normalizedUrl);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.preview;
  }

  await assertMediaToolsReady();

  const args = [
    "--dump-single-json",
    "--no-warnings",
    "--skip-download",
    "--playlist-end",
    "24",
    normalizedUrl,
  ];

  const result = await runCommand(resolveYtDlpPath(), args, 120000);

  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || "yt-dlp could not inspect that link.");
  }

  let info: RawYtDlpInfo;
  try {
    info = JSON.parse(result.stdout) as RawYtDlpInfo;
  } catch {
    throw new Error("yt-dlp returned metadata in an unexpected format.");
  }

  const entries = (info.entries ?? []).filter(Boolean);
  const isPlaylist = info._type === "playlist" || entries.length > 0;
  const lead = isPlaylist ? entries[0] ?? info : info;
  const items = isPlaylist ? entries.slice(0, 12).map(toPreviewItem) : [toPreviewItem(info, 0)];
  const itemCount = (info.playlist_count ?? info.n_entries ?? entries.length) || items.length;

  const preview: MediaPreview = {
    kind: isPlaylist ? "playlist" : "video",
    url: normalizedUrl,
    title: isPlaylist ? mediaTitle(info) : mediaTitle(lead),
    channel: mediaChannel(lead),
    duration: isPlaylist ? `${itemCount} tracks` : formatDuration(lead.duration),
    quality: "MP3 320 kbps VBR",
    thumbnail: bestThumbnail(lead) ?? bestThumbnail(info),
    itemCount,
    items,
  };

  previewCache.set(normalizedUrl, {
    preview,
    expiresAt: Date.now() + PREVIEW_CACHE_MS,
  });

  return preview;
}

export function allowedThumbnailUrl(src: string) {
  let parsed: URL;

  try {
    parsed = new URL(src);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  return (
    host.endsWith("ytimg.com") ||
    host.endsWith("googleusercontent.com") ||
    host === "i.ytimg.com" ||
    host === "img.youtube.com"
  );
}
