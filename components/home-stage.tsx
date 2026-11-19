"use client";

import { FileAudio, Mic, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDuration, formatTaipei } from "@/lib/format";
import { meetingStatus } from "@/lib/meeting";
import type { Meeting } from "@/lib/types";

const ACCEPT = ".mp3,.m4a,.wav,.webm,.mp4,.mpeg,.mpga,.ogg,audio/*";

export function HomeStage({
  meetings,
  busy,
  onRecord,
  onUpload,
  onOpen,
  onDemo,
}: {
  meetings: Meeting[];
  busy: boolean;
  onRecord: () => void;
  onUpload: (file: File) => void;
  onOpen: (id: string) => void;
  onDemo: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const recent = meetings.slice(0, 4);

  function takeFile(file: File | undefined) {
    if (!file || busy) return;
    onUpload(file);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
        <section
          className={`rounded-[28px] bg-card px-5 py-6 shadow-[0_24px_60px_-36px_rgba(70,48,16,0.55)] ring-1 ring-foreground/10 sm:px-8 sm:py-8 ${dragging ? "ring-2 ring-primary" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            takeFile(event.dataTransfer.files[0]);
          }}
        >
          <p className="text-sm text-primary">繁體中文 · 中英夾雜也可以</p>
          <h1 className="mt-2 max-w-xl text-3xl leading-tight font-medium sm:text-4xl">
            把說出來的會議，收成可以帶走的紀錄。
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            在瀏覽器錄音，或上傳 mp3、m4a、wav、webm。錄音當下先看即時字幕，再用你自己的 API 金鑰做高品質轉寫與會議紀錄。音檔與文字只存在這台裝置。
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              className="record-pulse h-12 bg-[oklch(0.58_0.18_32)] px-5 text-white hover:bg-[oklch(0.52_0.17_32)]"
              onClick={onRecord}
              disabled={busy}
            >
              <Mic />
              開始錄音
            </Button>
            <Button
              variant="outline"
              className="h-12 px-5"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <FileAudio />
              上傳音檔
            </Button>
          </div>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept={ACCEPT}
            aria-label="上傳音檔"
            onChange={(event) => {
              takeFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            {dragging ? "放開即可上傳。" : "也可以把音檔拖到這個區塊。超過 20MB 會在瀏覽器裡分段後再送出。"}
          </p>
        </section>

        <section className="rounded-[28px] bg-card px-5 py-6 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-medium">最近的會議</h2>
            <span className="text-xs text-muted-foreground">{meetings.length} 場</span>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              還沒有會議。錄一段、上傳音檔，或先看一場示範。
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recent.map((meeting) => (
                <li key={meeting.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(meeting.id)}
                    className="w-full rounded-2xl bg-muted/70 px-3 py-3 text-left hover:bg-accent"
                  >
                    <span className="block truncate text-sm font-medium">{meeting.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatTaipei(meeting.createdAt)} · {meetingStatus(meeting)}
                      {meeting.durationSec > 0 ? ` · ${formatDuration(meeting.durationSec)}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" className="mt-3 h-10 px-2" onClick={onDemo}>
            <Sparkles />
            載入示範會議
          </Button>
        </section>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        {[
          ["錄音或上傳", "開始、暫停、停止，並看得到計時。既有音檔直接拖進來。"],
          ["轉成逐字稿", "Chrome 可顯示繁中即時字幕。高品質轉寫會帶時間戳，支援的模型也會標講者。"],
          ["整理會議紀錄", "摘要、討論、決議、待辦都可以改，再複製或匯出 Markdown、Word、PDF。"],
        ].map(([title, body], index) => (
          <li key={title} className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/8">
            <p className="font-mono text-xs text-primary">0{index + 1}</p>
            <h3 className="mt-1 text-sm font-medium">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
