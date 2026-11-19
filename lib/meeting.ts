import { defaultTitle } from "@/lib/format";
import { createId } from "@/lib/id";
import type { Meeting, TranscriptSegment } from "@/lib/types";

export function createMeeting(partial: Partial<Meeting> & Pick<Meeting, "source">): Meeting {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? createId(),
    title: partial.title?.trim() || defaultTitle(),
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    durationSec: partial.durationSec ?? 0,
    source: partial.source,
    fileName: partial.fileName,
    transcriptSource: partial.transcriptSource ?? null,
    segments: partial.segments ?? [],
    speakerNames: partial.speakerNames ?? {},
    minutes: partial.minutes ?? null,
  };
}

export function meetingStatus(meeting: Meeting): string {
  if (meeting.minutes) return "已有會議紀錄";
  if (meeting.segments.length > 0 && meeting.transcriptSource === "live") return "即時字幕";
  if (meeting.segments.length > 0) return "已有逐字稿";
  return "尚未轉寫";
}

export function sourceLabel(meeting: Meeting): string {
  if (meeting.source === "upload") return meeting.fileName ? `上傳：${meeting.fileName}` : "上傳音檔";
  if (meeting.source === "demo") return "示範會議";
  return "瀏覽器錄音";
}

export function liveLinesToSegments(
  lines: { text: string; atMs: number }[],
  nextId: () => string = createId,
): TranscriptSegment[] {
  return lines
    .filter((line) => line.text.trim())
    .map((line, index, all) => ({
      id: nextId(),
      startMs: Math.max(0, Math.round(line.atMs)),
      endMs: Math.max(0, Math.round(all[index + 1]?.atMs ?? line.atMs)),
      speaker: "",
      text: line.text.trim(),
    }));
}
