"use client";

import { Copy, Download, FileText, Loader2, Printer, Sparkles, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { ChunkPlayer } from "@/components/chunk-player";
import { MinutesEditor } from "@/components/minutes-editor";
import { Printable } from "@/components/printable";
import { TranscriptEditor } from "@/components/transcript-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copyText, downloadBlob } from "@/lib/download";
import { meetingToDocx } from "@/lib/docx-export";
import { formatDuration, formatTaipei, safeFileBase } from "@/lib/format";
import { meetingToMarkdown } from "@/lib/markdown";
import { meetingStatus, sourceLabel } from "@/lib/meeting";
import type { Meeting, MeetingMinutes, StoredAudioChunk, TranscriptSegment } from "@/lib/types";

export type WorkspaceTab = "transcript" | "minutes" | "preview";

export function MeetingWorkspace({
  meeting,
  audio,
  busy,
  progress,
  hasKey,
  tab,
  onTab,
  onTitle,
  onSegments,
  onSpeakerNames,
  onMinutes,
  onTranscribe,
  onGenerate,
  onCancel,
}: {
  meeting: Meeting;
  audio: StoredAudioChunk[];
  busy: "preparing" | "transcribing" | "minutes" | null;
  progress: { index: number; total: number } | null;
  hasKey: boolean;
  tab: WorkspaceTab;
  onTab: (tab: WorkspaceTab) => void;
  onTitle: (title: string) => void;
  onSegments: (segments: TranscriptSegment[]) => void;
  onSpeakerNames: (names: Record<string, string>) => void;
  onMinutes: (minutes: MeetingMinutes) => void;
  onTranscribe: () => void;
  onGenerate: () => void;
  onCancel: () => void;
}) {
  const working = busy !== null;

  async function copyMarkdown() {
    try {
      await copyText(meetingToMarkdown(meeting));
      toast.success("已複製會議紀錄");
    } catch {
      toast.error("無法複製。請改下載 Markdown。");
    }
  }

  function downloadMarkdown() {
    const name = `${safeFileBase(meeting.minutes?.title || meeting.title)}.md`;
    downloadBlob(new Blob([meetingToMarkdown(meeting)], { type: "text/markdown;charset=utf-8" }), name);
    toast.success("已下載 Markdown");
  }

  async function downloadWord() {
    const blob = await meetingToDocx(meeting);
    downloadBlob(blob, `${safeFileBase(meeting.minutes?.title || meeting.title)}.docx`);
    toast.success("已下載 Word");
  }

  return (
    <div className="space-y-4">
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{meetingStatus(meeting)}</Badge>
          <span className="text-xs text-muted-foreground">
            {sourceLabel(meeting)} · {formatTaipei(meeting.createdAt)}
            {meeting.durationSec > 0 ? ` · ${formatDuration(meeting.durationSec)}` : ""}
          </span>
        </div>
        <label className="block">
          <span className="sr-only">會議標題</span>
          <Input
            className="h-12 border-transparent bg-transparent px-0 text-2xl font-medium shadow-none focus-visible:ring-0"
            value={meeting.title}
            onChange={(event) => onTitle(event.target.value)}
          />
        </label>
        {audio.length > 0 ? <ChunkPlayer chunks={audio} /> : null}

        {meeting.transcriptSource === "live" ? (
          <p className="rounded-2xl bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground">
            這份是瀏覽器即時字幕，標點和專有名詞可能不準。按「高品質轉寫」用你的 API 金鑰再整理一次。
          </p>
        ) : null}
        {!hasKey ? (
          <p className="rounded-2xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
            還沒有 API 金鑰。可以先改即時字幕；高品質轉寫與會議紀錄需要在設定中輸入金鑰。
          </p>
        ) : null}
        {busy ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10" role="status">
            <p className="text-sm">
              {busy === "preparing"
                ? "正在整理音檔，較長的檔案會先分段。"
                : busy === "transcribing"
                  ? `正在轉寫${progress ? `第 ${progress.index} / ${progress.total} 段` : ""}`
                  : "正在產生會議紀錄"}
            </p>
            {busy !== "preparing" ? (
              <Button variant="outline" className="h-9" onClick={onCancel}>
                取消
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            className="h-10"
            onClick={onTranscribe}
            disabled={working || meeting.source === "demo" || audio.length === 0}
            title={
              meeting.source === "demo"
                ? "示範會議沒有音檔，無法轉寫"
                : audio.length === 0
                  ? "這場會議沒有可轉寫的音檔"
                  : undefined
            }
          >
            {busy === "transcribing" ? <Loader2 className="animate-spin" /> : <WandSparkles />}
            高品質轉寫
          </Button>
          <Button variant="outline" className="h-10" onClick={onGenerate} disabled={working || meeting.segments.length === 0}>
            {busy === "minutes" ? <Loader2 className="animate-spin" /> : <Sparkles />}
            產生會議紀錄
          </Button>
          <Button variant="outline" className="h-10" onClick={() => void copyMarkdown()}>
            <Copy />
            複製全文
          </Button>
          <Button variant="outline" className="h-10" onClick={downloadMarkdown}>
            <Download />
            下載 Markdown
          </Button>
          <Button variant="outline" className="h-10" onClick={() => void downloadWord()}>
            <FileText />
            下載 Word
          </Button>
          <Button variant="outline" className="h-10" onClick={() => window.print()}>
            <Printer />
            列印成 PDF
          </Button>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (value === "transcript" || value === "minutes" || value === "preview") onTab(value);
          }}
        >
          <TabsList className="h-10">
            <TabsTrigger value="transcript" className="px-3">
              逐字稿
            </TabsTrigger>
            <TabsTrigger value="minutes" className="px-3">
              會議紀錄
            </TabsTrigger>
            <TabsTrigger value="preview" className="px-3">
              預覽
            </TabsTrigger>
          </TabsList>
          {tab === "transcript" ? (
            <div className="mt-4">
              <TranscriptEditor
                segments={meeting.segments}
                speakerNames={meeting.speakerNames}
                onChange={onSegments}
                onSpeakerNames={onSpeakerNames}
              />
            </div>
          ) : null}
          {tab === "minutes" ? (
            <div className="mt-4">
              {meeting.minutes ? (
                <MinutesEditor minutes={meeting.minutes} onChange={onMinutes} />
              ) : (
                <div className="rounded-2xl bg-muted/60 px-4 py-8 text-sm leading-6 text-muted-foreground">
                  <p>還沒有會議紀錄。確認逐字稿後，按「產生會議紀錄」。</p>
                  <Button className="mt-4 h-10" onClick={onGenerate} disabled={working || meeting.segments.length === 0}>
                    <Sparkles />
                    產生會議紀錄
                  </Button>
                </div>
              )}
            </div>
          ) : null}
          {tab === "preview" ? (
            <div className="mt-4">
              <Printable meeting={meeting} />
            </div>
          ) : null}
        </Tabs>
      </div>
      <div className="huiji-print-copy">
        <Printable meeting={meeting} />
      </div>
    </div>
  );
}
