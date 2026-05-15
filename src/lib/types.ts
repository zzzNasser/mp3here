export type MediaKind = "video" | "playlist";

export type MediaPreviewItem = {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string | null;
};

export type MediaPreview = {
  kind: MediaKind;
  url: string;
  title: string;
  channel: string;
  duration: string;
  quality: string;
  thumbnail: string | null;
  itemCount: number;
  items: MediaPreviewItem[];
};

export type DownloadFile = {
  name: string;
  href: string;
  type: "audio" | "cover";
  size: number;
};

export type PublicDownloadJob = {
  id: string;
  url: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  stage: string;
  message: string;
  title: string;
  channel: string;
  thumbnail: string | null;
  files: DownloadFile[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HistoryItem = {
  id: string;
  url: string;
  title: string;
  channel: string;
  thumbnail: string | null;
  fileCount: number;
  files: DownloadFile[];
  createdAt: string;
};
