# Mp3Here

Mp3Here is a dark cyberpunk Next.js app for turning YouTube video or playlist URLs into MP3 downloads with cover artwork.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Ads

Mp3Here includes Google AdSense-ready placements. Create an AdSense account, add your site, create display ad units, then
set these values in `.env.local`:

```bash
NEXT_PUBLIC_ADSENSE_CLIENT_ID="ca-pub-your-publisher-id"
NEXT_PUBLIC_ADSENSE_TOP_SLOT="your-top-banner-slot"
NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT="your-sidebar-slot"
NEXT_PUBLIC_ADSENSE_BOTTOM_SLOT="your-bottom-banner-slot"
```

The app shows development placeholders until those values are configured. Restart `npm run dev` after editing
`.env.local`.

## Media engine

The API uses the bundled `@choewy/yt-dlp` executable and `ffmpeg-static` by default. You can override either binary:

```bash
YTDLP_PATH="C:\\path\\to\\yt-dlp.exe"
FFMPEG_PATH="C:\\path\\to\\ffmpeg.exe"
npm run dev
```

Downloads are written under `public/downloads/`, and the recent-download history is stored in `data/history.json`.

Only download media that you own, have permission to use, or are legally allowed to archive.
