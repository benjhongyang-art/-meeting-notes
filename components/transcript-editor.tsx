"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createId } from "@/lib/id";
import { displaySpeaker, speakerIds } from "@/lib/speakers";
import type { TranscriptSegment } from "@/lib/types";

export function TranscriptEditor({
  segments,
  speakerNames,
  onChange,
  onSpeakerNames,
}: {
  segments: TranscriptSegment[];
  speakerNames: Record<string, string>;
  onChange: (segments: TranscriptSegment[]) => void;
  onSpeakerNames: (names: Record<string, string>) => void;
}) {
  const ids = speakerIds(segments);

  function updateSegment(id: string, patch: Partial<TranscriptSegment>) {
    onChange(segments.map((segment) => (segment.id === id ? { ...segment, ...patch } : segment)));
  }

  return (
    <div className="space-y-4">
      {ids.length > 0 ? (
        <div className="rounded-2xl bg-muted/60 p-3">
          <p className="text-xs leading-5 text-muted-foreground">
            修改講者名稱會套用到同一位講者的所有段落。
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ids.map((id) => (
              <label key={id} className="block text-xs text-muted-foreground">
                {displaySpeaker(id, {})}
                <Input
                  className="mt-1 h-10 bg-card"
                  value={speakerNames[id] ?? ""}
                  placeholder={displaySpeaker(id, {})}
                  onChange={(event) => onSpeakerNames({ ...speakerNames, [id]: event.target.value })}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {segments.length === 0 ? (
        <p className="rounded-2xl bg-muted/60 px-4 py-6 text-sm leading-6 text-muted-foreground">
          這場會議還沒有逐字稿。可以錄音後使用即時字幕，或按「高品質轉寫」。
        </p>
      ) : (
        <ol className="space-y-3">
          {segments.map((segment, index) => (
            <li key={segment.id} className="rounded-2xl bg-card p-3 ring-1 ring-foreground/8">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">
                  開始（秒）
                  <Input
                    className="mt-1 h-9 w-24 font-mono"
                    type="number"
                    min={0}
                    step={0.1}
                    value={Math.round(segment.startMs / 100) / 10}
                    onChange={(event) =>
                      updateSegment(segment.id, { startMs: Math.max(0, Number(event.target.value) * 1000) })
                    }
                  />
                </label>
                <label className="min-w-36 flex-1 text-xs text-muted-foreground">
                  講者
                  <Input
                    className="mt-1 h-9"
                    value={segment.speaker}
                    placeholder="姓名或代號"
                    onChange={(event) => updateSegment(segment.id, { speaker: event.target.value })}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-4 size-9"
                  aria-label={`刪除第 ${index + 1} 段`}
                  onClick={() => onChange(segments.filter((item) => item.id !== segment.id))}
                >
                  <Trash2 />
                </Button>
              </div>
              <Textarea
                className="mt-2 min-h-20 bg-background"
                value={segment.text}
                aria-label={`第 ${index + 1} 段逐字稿`}
                onChange={(event) => updateSegment(segment.id, { text: event.target.value })}
              />
            </li>
          ))}
        </ol>
      )}

      <Button
        variant="outline"
        className="h-10"
        onClick={() => {
          const last = segments[segments.length - 1];
          onChange([
            ...segments,
            {
              id: createId(),
              startMs: last?.endMs || last?.startMs || 0,
              endMs: last?.endMs || last?.startMs || 0,
              speaker: "",
              text: "",
            },
          ]);
        }}
      >
        <Plus />
        新增一段
      </Button>
    </div>
  );
}
