import { spawn } from "child_process";
import { mkdir, readdir, rename, stat } from "fs/promises";
import path from "path";

import sanitize from "sanitize-filename";

import { appendHistory } from "./history";
import {
  assertYouTubeUrl,
  inspectMedia,
  resolveFfmpegLocation,
  resolveYtDlpPath,
} from "./media";
import type { DownloadFile, PublicDownloadJob } from "./types";

type JobListener = (job: DownloadJob) => void;

type DownloadJob = PublicDownloadJob & {
  listeners: Set<JobListener>;
  logs: string[];
  itemIndex: number;
  itemTotal: number;
};

const globalJobs = globalThis as typeof globalThis & {
  mp3HereJobs?: Map<string, DownloadJob>;
};

const jobs = globalJobs.mp3HereJobs ?? new Map<string, DownloadJob>();
globalJobs.mp3HereJobs = jobs;

export function publicJob(job: DownloadJob): PublicDownloadJob {
  return {
    id: job.id,
    url: job.url,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    message: job.message,
    title: job.title,
    channel: job.channel,
    thumbnail: job.thumbnail,
    files: job.files,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function notify(job: DownloadJob) {
  job.updatedAt = new Date().toISOString();
  job.listeners.forEach((listener) => listener(job));
}

function patchJob(job: DownloadJob, patch: Partial<DownloadJob>) {
  Object.assign(job, patch);
  notify(job);
}

function createJob(url: string): DownloadJob {
  const now = new Date().toISOString();
  const job: DownloadJob = {
    id: crypto.randomUUID(),
    url,
    status: "queued",
    progress: 0,
    stage: "Queued",
    message: "Media engine warming up",
    title: "Queued track",
    channel: "Unknown channel",
    thumbnail: null,
    files: [],
    error: null,
    createdAt: now,
    updatedAt: now,
    listeners: new Set(),
    logs: [],
    itemIndex: 1,
    itemTotal: 1,
  };

  jobs.set(job.id, job);
  return job;
}

export function getJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}

export function getPublicJob(jobId: string) {
  const job = getJob(jobId);
  return job ? publicJob(job) : null;
}

export function subscribeToJob(jobId: string, listener: JobListener) {
  const job = getJob(jobId);

  if (!job) {
    return () => undefined;
  }

  job.listeners.add(listener);
  return () => {
    job.listeners.delete(listener);
  };
}

function parseProgressLine(job: DownloadJob, line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  job.logs.push(trimmed);
  if (job.logs.length > 80) {
    job.logs.shift();
  }

  const playlistMatch = trimmed.match(/Downloading item\s+(\d+)\s+of\s+(\d+)/i);
  if (playlistMatch) {
    job.itemIndex = Number(playlistMatch[1]);
    job.itemTotal = Number(playlistMatch[2]);
    patchJob(job, {
      stage: "Playlist",
      message: `Track ${job.itemIndex} of ${job.itemTotal}`,
    });
    return;
  }

  const progressMatch = trimmed.match(/\[download]\s+([\d.]+)%/i);
  if (progressMatch) {
    const itemProgress = Number(progressMatch[1]);
    const total = Math.max(job.itemTotal, 1);
    const overall = ((Math.max(job.itemIndex, 1) - 1 + itemProgress / 100) / total) * 100;
    patchJob(job, {
      status: "running",
      progress: Math.min(96, Math.max(job.progress, overall)),
      stage: "Downloading",
      message: total > 1 ? `Track ${job.itemIndex} of ${total}` : "Pulling source audio",
    });
    return;
  }

  if (trimmed.includes("[ExtractAudio]")) {
    patchJob(job, {
      progress: Math.max(job.progress, 94),
      stage: "Converting",
      message: "Encoding MP3 with ffmpeg",
    });
    return;
  }

  if (trimmed.includes("[EmbedThumbnail]") || trimmed.includes("[Metadata]")) {
    patchJob(job, {
      progress: Math.max(job.progress, 97),
      stage: "Artwork",
      message: "Embedding cover image and metadata",
    });
  }
}

function createLineCollector(job: DownloadJob) {
  let pending = "";

  return (chunk: Buffer) => {
    pending += chunk.toString("utf8");
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";
    lines.forEach((line) => parseProgressLine(job, line));
  };
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(dir, entry.name);
      return entry.isDirectory() ? walkFiles(resolved) : [resolved];
    }),
  );

  return files.flat();
}

function publicHref(jobId: string, filename: string) {
  return `/downloads/${jobId}/${encodeURIComponent(filename).replaceAll("%2F", "/")}`;
}

async function uniqueSafePath(dir: string, filename: string, currentPath: string) {
  const ext = path.extname(filename);
  const base = sanitize(path.basename(filename, ext)) || "mp3here-download";
  let candidate = `${base}${ext}`;
  let counter = 2;

  while (true) {
    const resolved = path.join(dir, candidate);
    if (path.normalize(resolved) === path.normalize(currentPath)) {
      return { name: candidate, path: resolved };
    }

    try {
      await stat(resolved);
      candidate = `${base}-${counter}${ext}`;
      counter += 1;
    } catch {
      return { name: candidate, path: resolved };
    }
  }
}

async function collectOutputFiles(jobId: string, outputDir: string): Promise<DownloadFile[]> {
  const allFiles = await walkFiles(outputDir);
  const selected = allFiles.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return [".mp3", ".jpg", ".jpeg", ".png", ".webp"].includes(ext);
  });

  const output: DownloadFile[] = [];

  for (const file of selected) {
    const ext = path.extname(file).toLowerCase();
    const type: DownloadFile["type"] = ext === ".mp3" ? "audio" : "cover";
    const dir = path.dirname(file);
    const safe = await uniqueSafePath(dir, path.basename(file), file);

    if (safe.path !== file) {
      await rename(file, safe.path);
    }

    const size = (await stat(safe.path)).size;
    output.push({
      name: safe.name,
      href: publicHref(jobId, safe.name),
      type,
      size,
    });
  }

  return output.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "audio" ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

async function runDownload(job: DownloadJob, playlist: boolean) {
  try {
    patchJob(job, {
      status: "running",
      progress: 4,
      stage: "Scanning",
      message: "Reading YouTube metadata",
    });

    const preview = await inspectMedia(job.url);
    patchJob(job, {
      title: preview.title,
      channel: preview.channel,
      thumbnail: preview.thumbnail,
      itemTotal: playlist ? Math.max(preview.itemCount, 1) : 1,
      progress: 8,
      stage: "Ready",
      message: playlist ? `${preview.itemCount} tracks detected` : "Track detected",
    });

    const outputDir = path.join(process.cwd(), "public", "downloads", job.id);
    await mkdir(outputDir, { recursive: true });

    const outputTemplate = playlist
      ? path.join(outputDir, "%(playlist_index)03d - %(title).160B.%(ext)s")
      : path.join(outputDir, "%(title).180B.%(ext)s");

    const args = [
      "--newline",
      "--no-color",
      "--no-warnings",
      "--windows-filenames",
      "--restrict-filenames",
      playlist ? "--yes-playlist" : "--no-playlist",
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "--embed-thumbnail",
      "--add-metadata",
      "--write-thumbnail",
      "--convert-thumbnails",
      "jpg",
      "--ffmpeg-location",
      resolveFfmpegLocation(),
      "--output",
      outputTemplate,
      job.url,
    ];

    const ytDlp = spawn(resolveYtDlpPath(), args, {
      windowsHide: true,
      env: process.env,
    });

    const collect = createLineCollector(job);
    ytDlp.stdout.on("data", collect);
    ytDlp.stderr.on("data", collect);

    await new Promise<void>((resolve, reject) => {
      ytDlp.on("error", reject);
      ytDlp.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(job.logs.at(-1) ?? "yt-dlp could not finish the download."));
        }
      });
    });

    const files = await collectOutputFiles(job.id, outputDir);
    if (!files.some((file) => file.type === "audio")) {
      throw new Error("No MP3 files were produced by the media engine.");
    }

    patchJob(job, {
      status: "completed",
      progress: 100,
      stage: "Complete",
      message: playlist ? "Playlist ready" : "MP3 ready",
      files,
    });

    await appendHistory({
      id: job.id,
      url: job.url,
      title: job.title,
      channel: job.channel,
      thumbnail: job.thumbnail,
      fileCount: files.filter((file) => file.type === "audio").length,
      files,
      createdAt: job.createdAt,
    });
  } catch (error) {
    patchJob(job, {
      status: "failed",
      error: error instanceof Error ? error.message : "The download failed.",
      stage: "Error",
      message: "Media engine stopped",
    });
  }
}

export function startDownload(url: string, playlist: boolean) {
  const normalizedUrl = assertYouTubeUrl(url);
  const job = createJob(normalizedUrl);

  setTimeout(() => {
    void runDownload(job, playlist);
  }, 0);

  return publicJob(job);
}
