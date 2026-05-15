import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "i9.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "*.ytimg.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  serverExternalPackages: ["@choewy/yt-dlp", "ffmpeg-static"],
};

export default nextConfig;
