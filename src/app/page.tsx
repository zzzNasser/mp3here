"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Clock3,
  Disc3,
  Download,
  FileArchive,
  ImageDown,
  Link2,
  Loader2,
  Music2,
  Play,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import { AdUnit } from "@/components/ad-unit";
import type { HistoryItem, MediaPreview, PublicDownloadJob } from "@/lib/types";

const emptyJob: PublicDownloadJob | null = null;
const topAdSlot = process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT;
const sidebarAdSlot = process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT;
const bottomAdSlot = process.env.NEXT_PUBLIC_ADSENSE_BOTTOM_SLOT;

function formatBytes(bytes: number) {
  if (!bytes) {
    return "0 MB";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function downloadFromHref(href: string, filename?: string) {
  const link = document.createElement("a");
  link.href = href;
  if (filename) {
    link.download = filename;
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function PaperButton({
  children,
  disabled,
  onClick,
  type = "button",
  variant = "primary",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
}) {
  const classes =
    variant === "primary"
      ? "border-neutral-950 bg-neutral-950 text-white hover:bg-neutral-800"
      : "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-500";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${classes} inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-45`}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  children,
  disabled,
  onClick,
  variant = "neutral",
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "neutral" | "danger";
  className?: string;
}) {
  const classes =
    variant === "danger"
      ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500 hover:bg-neutral-50";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`${classes} grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition disabled:pointer-events-none disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  );
}

function Artwork({ src, title, size = "large" }: { src: string | null; title: string; size?: "large" | "small" }) {
  const sizeClass = size === "large" ? "aspect-video w-full" : "h-14 w-14";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = src && src !== failedSrc ? src : null;

  if (!imageSrc) {
    return (
      <div className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-lg border bg-neutral-50`}>
        <Disc3 className="h-7 w-7 text-neutral-500" />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} relative shrink-0 overflow-hidden rounded-lg border bg-neutral-50`}>
      <Image
        src={imageSrc}
        alt={`${title} cover`}
        fill
        sizes={size === "large" ? "(min-width: 1024px) 40vw, 92vw" : "56px"}
        className="object-cover"
        onError={() => setFailedSrc(imageSrc)}
      />
    </div>
  );
}

function Detail({ icon: Icon, children }: { icon: typeof Music2; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-sm text-neutral-600">
      <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function PreviewPanel({
  preview,
  onDownload,
  onCover,
  downloading,
}: {
  preview: MediaPreview | null;
  onDownload: () => void;
  onCover: () => void;
  downloading: boolean;
}) {
  if (!preview) {
    return (
      <section className="paper-section">
        <h2 className="paper-heading">Preview</h2>
        <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
          <div>
            <Disc3 className="mx-auto h-10 w-10 text-neutral-400" />
            <p className="mt-3 text-sm font-medium text-neutral-500">No preview yet.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="paper-section">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="paper-heading">Preview</h2>
        <span className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold uppercase text-neutral-600">
          {preview.kind}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.92fr_1fr]">
        <Artwork src={preview.thumbnail} title={preview.title} />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-neutral-500">{preview.quality}</p>
          <h3 className="mt-2 line-clamp-3 text-2xl font-bold leading-tight text-neutral-950">{preview.title}</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <Detail icon={Music2}>{preview.channel}</Detail>
            <Detail icon={Clock3}>{preview.duration}</Detail>
            <Detail icon={FileArchive}>
              {preview.itemCount} item{preview.itemCount === 1 ? "" : "s"}
            </Detail>
          </div>

          {preview.kind === "playlist" && (
            <div className="mt-5 max-h-44 space-y-2 overflow-y-auto pr-1">
              {preview.items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center gap-3 border-t border-neutral-200 pt-2">
                  <Artwork src={item.thumbnail} title={item.title} size="small" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-950">{item.title}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {item.channel} / {item.duration}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <PaperButton disabled={downloading} onClick={onDownload}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download MP3
            </PaperButton>
            <PaperButton disabled={!preview.thumbnail} onClick={onCover} variant="secondary">
              <ImageDown className="h-4 w-4" />
              Download Cover
            </PaperButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressPanel({
  job,
  removing,
  onRemove,
}: {
  job: PublicDownloadJob | null;
  removing?: boolean;
  onRemove?: () => void;
}) {
  const completed = job?.status === "completed";
  const failed = job?.status === "failed";
  const removable = Boolean(job?.files.length && onRemove);

  return (
    <section className="paper-section">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="paper-heading">{job?.stage ?? "Ready"}</h2>
          <p className="mt-1 truncate text-sm text-neutral-500">{job?.message ?? "Paste a YouTube URL to begin."}</p>
        </div>
        <div className="mt-0.5 flex shrink-0 items-center gap-2">
          {removable ? (
            <IconButton label="Remove current download" disabled={removing} onClick={onRemove} variant="danger">
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </IconButton>
          ) : null}
          {failed ? (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          ) : completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          ) : (
            <Disc3 className="h-5 w-5 text-neutral-500" />
          )}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full rounded-full bg-neutral-950 transition-[width]" style={{ width: `${job?.progress ?? 0}%` }} />
      </div>

      {job?.error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {job.error}
        </p>
      )}

      {job?.files.length ? (
        <div className="mt-4 divide-y divide-neutral-200 rounded-lg border">
          {job.files
            .filter((file) => file.type === "audio")
            .map((file) => (
              <button
                key={file.href}
                onClick={() => downloadFromHref(file.href, file.name)}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm transition hover:bg-neutral-50"
              >
                <span className="truncate font-semibold text-neutral-950">{file.name}</span>
                <span className="shrink-0 text-neutral-500">{formatBytes(file.size)}</span>
              </button>
            ))}
        </div>
      ) : null}
    </section>
  );
}

function HistoryList({
  history,
  deletingId,
  onDelete,
  onUseAgain,
}: {
  history: HistoryItem[];
  deletingId: string | null;
  onDelete: (item: HistoryItem) => void;
  onUseAgain: (item: HistoryItem) => void;
}) {
  return (
    <section className="paper-section">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="paper-heading">Recent</h2>
        <span className="text-xs font-medium text-neutral-500">{history.length} saved</span>
      </div>

      {history.length ? (
        <div className="divide-y divide-neutral-200">
          {history.slice(0, 6).map((item) => {
            const firstAudio = item.files.find((file) => file.type === "audio");
            const deleting = deletingId === item.id;

            return (
              <article
                key={item.id}
                className="group flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Artwork src={item.thumbnail} title={item.title} size="small" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-950">{item.title}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {item.fileCount} MP3 / {item.channel}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <IconButton label={`Use ${item.title} again`} onClick={() => onUseAgain(item)}>
                    <RotateCcw className="h-4 w-4" />
                  </IconButton>

                  {firstAudio ? (
                    <IconButton
                      label={`Download ${item.title}`}
                      onClick={() => downloadFromHref(firstAudio.href, firstAudio.name)}
                    >
                      <Download className="h-4 w-4" />
                    </IconButton>
                  ) : null}

                  <IconButton
                    label={`Delete ${item.title}`}
                    disabled={deleting}
                    onClick={() => onDelete(item)}
                    variant="danger"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </IconButton>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
          Nothing downloaded yet.
        </p>
      )}
    </section>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const [job, setJob] = useState<PublicDownloadJob | null>(emptyJob);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [inspecting, setInspecting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const activeDownload = job?.status === "queued" || job?.status === "running";
  const canScan = useMemo(() => url.trim().length > 8 && !inspecting, [url, inspecting]);

  async function refreshHistory() {
    const response = await fetch("/api/history", { cache: "no-store" });
    const data = (await response.json()) as { history: HistoryItem[] };
    setHistory(data.history ?? []);
  }

  useEffect(() => {
    let mounted = true;

    fetch("/api/history", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ history: HistoryItem[] }>)
      .then((data) => {
        if (mounted) {
          setHistory(data.history ?? []);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      eventSourceRef.current?.close();
    };
  }, []);

  async function scanLink(event?: FormEvent) {
    event?.preventDefault();

    if (!url.trim()) {
      toast.error("Paste a YouTube URL first.");
      return;
    }

    setInspecting(true);
    setPreview(null);

    try {
      const response = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as { preview?: MediaPreview; error?: string };

      if (!response.ok || !data.preview) {
        throw new Error(data.error ?? "Scan failed.");
      }

      setPreview(data.preview);
      toast.success(data.preview.kind === "playlist" ? "Playlist ready." : "Video ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to scan that link.");
    } finally {
      setInspecting(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setPreview(null);
      toast.success("Link pasted.");
    } catch {
      toast.error("Clipboard permission was blocked.");
    }
  }

  function clearLink() {
    setUrl("");
    setPreview(null);
  }

  function useHistoryItem(item: HistoryItem) {
    setUrl(item.url);
    setPreview(null);
    setJob(null);
    toast.success("Link loaded. Scan when ready.");
  }

  async function deleteDownload(item: Pick<HistoryItem, "id" | "title">) {
    const confirmed = window.confirm(`Delete "${item.title}" and its saved files?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);

    try {
      const response = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = (await response.json()) as { history?: HistoryItem[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete that download.");
      }

      if (data.history) {
        setHistory(data.history);
      } else {
        setHistory((current) => current.filter((entry) => entry.id !== item.id));
      }
      if (job?.id === item.id) {
        setJob(null);
      }
      toast.success("Download removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete that download.");
    } finally {
      setDeletingId(null);
    }
  }

  async function startDownload() {
    const targetUrl = preview?.url ?? url;
    if (!targetUrl.trim()) {
      toast.error("Paste a YouTube URL first.");
      return;
    }

    eventSourceRef.current?.close();

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, playlist: preview?.kind === "playlist" }),
      });
      const data = (await response.json()) as { job?: PublicDownloadJob; error?: string };

      if (!response.ok || !data.job) {
        throw new Error(data.error ?? "Download could not start.");
      }

      setJob(data.job);
      toast.success("Download started.");

      const events = new EventSource(`/api/download/${data.job.id}/events`);
      eventSourceRef.current = events;

      events.onmessage = async (message) => {
        const nextJob = JSON.parse(message.data) as PublicDownloadJob;
        setJob(nextJob);

        if (nextJob.status === "completed") {
          toast.success("MP3 ready.");
          events.close();
          await refreshHistory();
        }

        if (nextJob.status === "failed") {
          toast.error(nextJob.error ?? "Download failed.");
          events.close();
        }
      };

      events.onerror = () => {
        events.close();
      };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed to start.");
    }
  }

  function downloadCover() {
    if (!preview?.thumbnail) {
      toast.error("No cover image available.");
      return;
    }

    const coverUrl = `/api/cover?src=${encodeURIComponent(preview.thumbnail)}&title=${encodeURIComponent(
      preview.title,
    )}`;
    downloadFromHref(coverUrl, `${preview.title}.jpg`);
    toast.success("Cover download started.");
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 text-neutral-950 sm:px-6 lg:py-10">
      <Toaster
        position="top-right"
        toastOptions={{
          className: "mp3here-toast",
          duration: 3200,
        }}
      />

      <div className="mx-auto max-w-5xl rounded-lg border border-neutral-300 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-neutral-300 bg-neutral-50">
              <Disc3 className="h-5 w-5 text-neutral-700" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Mp3Here</h1>
          </div>
          <p className="text-sm font-medium text-neutral-500">Simple MP3 download</p>
        </header>

        <AdUnit slot={topAdSlot} format="horizontal" minHeight={90} className="border-t-0 border-b border-neutral-200" />

        <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="border-b border-neutral-200 lg:border-b-0 lg:border-r">
            <section className="paper-section border-t-0">
              <form onSubmit={scanLink} className="space-y-3">
                <div className="flex min-h-12 items-center gap-3 rounded-lg border border-neutral-300 bg-white px-3 focus-within:border-neutral-950">
                  <Link2 className="h-4 w-4 shrink-0 text-neutral-500" />
                  <input
                    aria-label="YouTube URL"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="min-w-0 flex-1 bg-transparent text-base text-neutral-950 outline-none placeholder:text-neutral-400"
                  />
                  {url ? (
                    <button
                      type="button"
                      aria-label="Clear link"
                      title="Clear link"
                      onClick={clearLink}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PaperButton onClick={pasteFromClipboard} variant="secondary">
                    <Clipboard className="h-4 w-4" />
                    Paste
                  </PaperButton>
                  <PaperButton type="submit" disabled={!canScan}>
                    {inspecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Scan
                  </PaperButton>
                </div>
              </form>
            </section>

            <ProgressPanel
              job={job}
              removing={deletingId === job?.id}
              onRemove={job ? () => deleteDownload({ id: job.id, title: job.title }) : undefined}
            />
            <AdUnit slot={sidebarAdSlot} format="rectangle" minHeight={250} />
            <HistoryList
              history={history}
              deletingId={deletingId}
              onDelete={deleteDownload}
              onUseAgain={useHistoryItem}
            />
          </div>

          <PreviewPanel
            preview={preview}
            onDownload={startDownload}
            onCover={downloadCover}
            downloading={Boolean(activeDownload)}
          />
        </div>

        <AdUnit slot={bottomAdSlot} format="horizontal" minHeight={90} className="border-t border-neutral-200" />

        <footer className="flex flex-col gap-2 border-t border-neutral-200 px-5 py-4 text-xs font-medium text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Only download media you own, have permission to use, or are legally allowed to archive.</p>
          <Link className="text-neutral-700 underline-offset-4 hover:underline" href="/privacy">
            Privacy
          </Link>
        </footer>
      </div>
    </main>
  );
}
