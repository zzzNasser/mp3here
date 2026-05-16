# Mp3Here

Mp3Here is a dark cyberpunk Next.js app for turning YouTube video or playlist URLs into MP3 downloads with cover artwork.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Ads

Mp3Here loads your AdSense publisher script by default:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4219612713826693" crossorigin="anonymous"></script>
```

To use manual display ad placements, create display ad units in AdSense, then set these slot values in `.env.local`:

```bash
NEXT_PUBLIC_ADSENSE_TOP_SLOT="your-top-banner-slot"
NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT="your-sidebar-slot"
NEXT_PUBLIC_ADSENSE_BOTTOM_SLOT="your-bottom-banner-slot"
```

You can still override the publisher ID with `NEXT_PUBLIC_ADSENSE_CLIENT_ID` if needed. The app shows placeholders until
manual slot IDs are configured. Restart `npm run dev` after editing `.env.local`.

## Media engine

The API uses the bundled `@choewy/yt-dlp` executable and `ffmpeg-static` by default. You can override either binary:

```bash
YTDLP_PATH="C:\\path\\to\\yt-dlp.exe"
FFMPEG_PATH="C:\\path\\to\\ffmpeg.exe"
npm run dev
```

Downloads are written under `public/downloads/`, and the recent-download history is stored in `data/history.json`.

Only download media that you own, have permission to use, or are legally allowed to archive.
