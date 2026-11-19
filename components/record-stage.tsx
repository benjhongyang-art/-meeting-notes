"use client";

import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { formatClock, formatTimestamp } from "@/lib/format";
import type { LiveLine } from "@/hooks/use-live-speech";
import type { RecorderPhase } from "@/hooks/use-recorder";

export function RecordStage({
  phase,
  elapsedMs,
  chunkCount,
  analyser,
  finals,
  interim,
  speechSupported,
  speechError,
  onPause,
  onResume,
  onStop,
}: {
  phase: Exclude<RecorderPhase, "idle">;
  elapsedMs: number;
  chunkCount: number;
  analyser: AnalyserNode | null;
  finals: LiveLine[];
  interim: string;
  speechSupported: boolean;
  speechError: string | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const recent = finals.slice(-4);

  return (
    <section className="rounded-[28px] bg-card px-5 py-6 shadow-[0_24px_60px_-36px_rgba(70,48,16,0.55)] ring-1 ring-foreground/10 sm:px-8">
      <p className="text-sm text-primary">{phase === "paused" ? "已暫停" : "錄音中"}</p>
      <p
        className="mt-2 font-mono text-5xl tabular-nums tracking-tight sm:text-6xl"
        aria-live="polite"
      >
        {formatClock(elapsedMs)}
      </p>
      <div className="mt-5">
        <Waveform analyser={analyser} active={phase === "recording"} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {phase === "recording" ? (
          <Button variant="outline" className="h-12 px-5" onClick={onPause}>
            <Pause />
            暫停
          </Button>
        ) : (
          <Button variant="outline" className="h-12 px-5" onClick={onResume}>
            <Play />
            繼續錄音
          </Button>
        )}
        <Button
          className="h-12 bg-[oklch(0.58_0.18_32)] px-5 text-white hover:bg-[oklch(0.52_0.17_32)]"
          onClick={onStop}
        >
          <Square />
          停止錄音
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {chunkCount > 1
          ? `已分段保存 ${chunkCount} 段，避免單檔超過 API 上限。`
          : "長錄音會每 8 分鐘或接近 18MB 自動分段。"}
      </p>

      <div className="mt-6 rounded-2xl bg-muted/70 p-4">
        <h2 className="text-sm font-medium">即時字幕</h2>
        {!speechSupported ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            這個瀏覽器沒有即時字幕。錄音結束後仍可用 API 金鑰轉寫。
          </p>
        ) : null}
        {speechError ? <p className="mt-2 text-sm leading-6 text-destructive">{speechError}</p> : null}
        <div className="mt-3 space-y-3" aria-live="polite">
          {recent.length === 0 && !interim ? (
            <p className="text-sm text-muted-foreground">開始說話後，字幕會出現在這裡。</p>
          ) : null}
          {recent.map((line) => (
            <p key={`${line.atMs}-${line.text}`} className="text-sm leading-6">
              <span className="mr-2 font-mono text-xs text-muted-foreground">{formatTimestamp(line.atMs)}</span>
              {line.text}
            </p>
          ))}
          {interim ? <p className="text-sm leading-6 text-muted-foreground">{interim}</p> : null}
        </div>
      </div>
    </section>
  );
}
