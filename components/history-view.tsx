"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration, formatTaipei } from "@/lib/format";
import { meetingStatus, sourceLabel } from "@/lib/meeting";
import type { Meeting } from "@/lib/types";

export function HistoryView({
  meetings,
  activeId,
  onOpen,
  onDelete,
}: {
  meetings: Meeting[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (meeting: Meeting) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return meetings;
    return meetings.filter((meeting) => {
      const haystack = `${meeting.title} ${meeting.fileName ?? ""} ${meeting.minutes?.summary ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [meetings, query]);

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium">歷史會議</h1>
          <p className="mt-1 text-sm text-muted-foreground">存在這台瀏覽器，不會上傳到會記的伺服器。</p>
        </div>
        <Input
          className="h-10 sm:w-64"
          value={query}
          placeholder="搜尋標題或摘要"
          aria-label="搜尋會議"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {meetings.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-card px-4 py-8 text-sm leading-6 text-muted-foreground ring-1 ring-foreground/8">
          還沒有會議。錄一段或上傳音檔後，就會出現在這裡。
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">沒有符合「{query.trim()}」的會議。</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {filtered.map((meeting) => (
            <li
              key={meeting.id}
              className={`rounded-2xl bg-card px-4 py-4 ring-1 ${meeting.id === activeId ? "ring-primary" : "ring-foreground/8"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(meeting.id)}>
                  <span className="block truncate text-base font-medium">{meeting.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {formatTaipei(meeting.createdAt)}
                    {meeting.durationSec > 0 ? ` · ${formatDuration(meeting.durationSec)}` : ""}
                    {" · "}
                    {sourceLabel(meeting)}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0"
                  aria-label={`刪除 ${meeting.title}`}
                  onClick={() => onDelete(meeting)}
                >
                  <Trash2 />
                </Button>
              </div>
              <Badge variant="secondary" className="mt-3">
                {meetingStatus(meeting)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
