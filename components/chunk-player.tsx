"use client";

import { useEffect, useRef, useState } from "react";
import type { StoredAudioChunk } from "@/lib/types";

export function ChunkPlayer({ chunks }: { chunks: StoredAudioChunk[] }) {
  const [index, setIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const safeIndex = chunks.length === 0 ? 0 : Math.min(index, chunks.length - 1);
  const chunk = chunks[safeIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !chunk) return;
    const objectUrl = URL.createObjectURL(chunk.blob);
    audio.src = objectUrl;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      URL.revokeObjectURL(objectUrl);
    };
  }, [chunk]);

  if (!chunk) return null;

  return (
    <div className="rounded-2xl bg-muted/70 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>播放音檔</span>
        {chunks.length > 1 ? (
          <span>
            第 {safeIndex + 1} / {chunks.length} 段
          </span>
        ) : null}
      </div>
      <audio
        ref={audioRef}
        className="w-full"
        controls
        onEnded={() => {
          if (safeIndex < chunks.length - 1) setIndex(safeIndex + 1);
        }}
      />
    </div>
  );
}
