"use client";

import * as React from "react";
import Image from "next/image";
import type { Music } from "@/lib/music";

type MusicThumbnailProps = {
  track: Pick<Music, "title" | "thumbnail_url" | "thumbnail_status">;
  className?: string;
  showTitle?: boolean;
};

export default function MusicThumbnail({
  track,
  className = "h-11 w-11",
  showTitle = false,
}: MusicThumbnailProps) {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const canShowImage =
    Boolean(track.thumbnail_url) &&
    track.thumbnail_status !== "failed" &&
    failedUrl !== track.thumbnail_url;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 ${
        canShowImage
          ? "bg-black"
          : "bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-500"
      } ${className}`}
    >
      {canShowImage ? (
        <>
          <Image
            src={track.thumbnail_url ?? ""}
            alt=""
            fill
            unoptimized
            sizes="48px"
            onError={() => setFailedUrl(track.thumbnail_url)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {showTitle && (
            <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-0.5 text-[9px] font-medium leading-tight text-white/90">
              <span className="block truncate">{track.title}</span>
            </span>
          )}
        </>
      ) : (
        <>
          <div aria-hidden className="absolute inset-0 bg-white/[0.06]" />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="relative h-6 w-6 text-white"
          >
            <path
              d="M9 18V7l10-2v11"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
            <circle cx="16.5" cy="16" r="2.5" fill="currentColor" />
          </svg>
        </>
      )}
    </div>
  );
}
