"use client";

import { useEffect, useRef } from "react";

import { adsenseClientId } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

type AdUnitProps = {
  slot?: string;
  format?: "auto" | "horizontal" | "rectangle" | "vertical";
  minHeight?: number;
  className?: string;
};

export function AdUnit({ slot, format = "auto", minHeight = 96, className = "" }: AdUnitProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);
  const canServeAds = Boolean(adsenseClientId && slot);

  useEffect(() => {
    if (!canServeAds || pushedRef.current || !adRef.current) {
      return;
    }

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushedRef.current = true;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("AdSense could not render this slot.", error);
      }
    }
  }, [canServeAds, slot]);

  return (
    <aside className={`ad-unit paper-section ${className}`} aria-label="Advertisement">
      <p className="mb-2 text-center text-[0.68rem] font-semibold uppercase text-neutral-400">
        Advertisement
      </p>

      {canServeAds ? (
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", minHeight }}
          data-ad-client={adsenseClientId}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : (
        <div
          className="grid place-items-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 text-center text-xs font-medium text-neutral-400"
          style={{ minHeight }}
        >
          Ad slot ready
        </div>
      )}
    </aside>
  );
}
