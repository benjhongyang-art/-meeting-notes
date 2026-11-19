import { createId } from "@/lib/id";
import type { ActionItem, MeetingMinutes, TranscriptSegment } from "@/lib/types";

type RawSegment = {
  start: number;
  end: number;
  text: string;
  speaker: string;
};

export function parseTranscriptionPayload(
  payload: unknown,
  offsetSec: number,
  nextId: () => string = createId,
): TranscriptSegment[] {
  if (!payload || typeof payload !== "object") {
    throw new Error("轉寫服務回傳的格式無法讀取。");
  }
  const data = payload as Record<string, unknown>;
  const raw = readSegments(data);
  if (raw.length === 0 && Array.isArray(data.words)) {
    return segmentsFromWords(data.words, offsetSec, nextId);
  }
  if (raw.length === 0) {
    const text = typeof data.text === "string" ? data.text.trim() : "";
    if (!text) return [];
    const startMs = Math.round(offsetSec * 1000);
    return [
      {
        id: nextId(),
        startMs,
        endMs: startMs,
        speaker: "",
        text,
      },
    ];
  }
  return raw.map((segment) => ({
    id: nextId(),
    startMs: Math.round((segment.start + offsetSec) * 1000),
    endMs: Math.round((Math.max(segment.end, segment.start) + offsetSec) * 1000),
    speaker: segment.speaker,
    text: segment.text,
  }));
}

function readSegments(data: Record<string, unknown>): RawSegment[] {
  const lists = [data.segments, data.utterances];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    const segments = list
      .map((item) => normalizeSegment(item))
      .filter((item): item is RawSegment => item !== null);
    if (segments.length > 0) return segments;
  }
  return [];
}

function normalizeSegment(item: unknown): RawSegment | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const text = stringField(record, ["text", "transcript", "content"]);
  if (!text) return null;
  const start = numberField(record, ["start", "start_time", "from"]);
  const end = numberField(record, ["end", "end_time", "to"]);
  return {
    start,
    end: end || start,
    text,
    speaker: speakerField(record.speaker ?? record.speaker_label ?? record.speaker_id),
  };
}

function segmentsFromWords(
  words: unknown[],
  offsetSec: number,
  nextId: () => string,
): TranscriptSegment[] {
  const parsed = words
    .map((word) => {
      if (!word || typeof word !== "object") return null;
      const record = word as Record<string, unknown>;
      const text = stringField(record, ["word", "text"]);
      if (!text) return null;
      return {
        text,
        start: numberField(record, ["start", "start_time"]),
        end: numberField(record, ["end", "end_time"]),
        speaker: speakerField(record.speaker ?? record.speaker_label),
      };
    })
    .filter((word): word is { text: string; start: number; end: number; speaker: string } => word !== null);

  if (parsed.length === 0) return [];

  const groups: { text: string; start: number; end: number; speaker: string }[] = [];
  for (const word of parsed) {
    const current = groups[groups.length - 1];
    const gap = current ? word.start - current.end : 0;
    const speakerChanged = current ? word.speaker !== current.speaker : false;
    if (!current || gap > 1.2 || speakerChanged || current.text.length > 90) {
      groups.push({ ...word });
      continue;
    }
    current.end = Math.max(current.end, word.end);
    current.text = joinWord(current.text, word.text);
  }

  return groups.map((group) => ({
    id: nextId(),
    startMs: Math.round((group.start + offsetSec) * 1000),
    endMs: Math.round((Math.max(group.end, group.start) + offsetSec) * 1000),
    speaker: group.speaker,
    text: group.text.trim(),
  }));
}

function joinWord(previous: string, word: string): string {
  if (!previous) return word;
  const cjk = /[\u3400-\u9fff]/;
  if (cjk.test(word) || cjk.test(previous.slice(-1))) return previous + word;
  if (/^[,.!?，。！？、；：)）]/.test(word)) return previous + word;
  if (/\s$/.test(previous) || word.startsWith(" ")) return previous + word.trimStart();
  return `${previous} ${word}`;
}

function stringField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberField(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function speakerField(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string" && record.name.trim()) return record.name.trim();
    if (typeof record.id === "string" && record.id.trim()) return record.id.trim();
  }
  return "";
}

export function extractChatContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("模型沒有回傳會議紀錄。");
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("模型沒有回傳會議紀錄。");
  }
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  const content = message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("");
    if (text.trim()) return text;
  }
  throw new Error("模型沒有回傳會議紀錄。");
}

export function parseMinutesContent(content: string, nextId: () => string = createId): MeetingMinutes {
  const parsed = extractJsonObject(content);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("模型回傳的內容不是會議紀錄格式。請再試一次。");
  }
  const record = parsed as Record<string, unknown>;
  return {
    title: asString(record.title),
    date: asDate(record.date),
    attendees: asStringList(record.attendees ?? record.participants),
    summary: asString(record.summary),
    discussionPoints: asStringList(
      record.discussionPoints ?? record.discussion_points ?? record.keyPoints ?? record.key_points,
    ),
    decisions: asStringList(record.decisions),
    actionItems: asActionItems(record.actionItems ?? record.action_items, nextId),
  };
}

export function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced ? fenced[1] : trimmed).trim();
  try {
    return JSON.parse(source);
  } catch {
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(source.slice(start, end + 1));
      } catch {
        // Fall through to the user-facing error.
      }
    }
  }
  throw new Error("模型回傳的內容不是會議紀錄格式。請再試一次。");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function asDate(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function asActionItems(value: unknown, nextId: () => string): ActionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const task = asString(record.task ?? record.action ?? record.item ?? record.content);
      if (!task) return null;
      return {
        id: nextId(),
        task,
        owner: asString(record.owner ?? record.assignee ?? record.speaker),
        dueDate: asDate(record.dueDate ?? record.due_date ?? record.due ?? record.deadline),
      };
    })
    .filter((item): item is ActionItem => item !== null);
}
