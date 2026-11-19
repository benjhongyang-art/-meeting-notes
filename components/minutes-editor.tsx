"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createId } from "@/lib/id";
import type { MeetingMinutes } from "@/lib/types";

export function MinutesEditor({
  minutes,
  onChange,
}: {
  minutes: MeetingMinutes;
  onChange: (minutes: MeetingMinutes) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          會議標題
          <Input
            className="mt-1 h-10"
            value={minutes.title}
            onChange={(event) => onChange({ ...minutes, title: event.target.value })}
          />
        </label>
        <label className="text-sm">
          會議日期
          <Input
            className="mt-1 h-10"
            type="date"
            value={minutes.date}
            onChange={(event) => onChange({ ...minutes, date: event.target.value })}
          />
        </label>
      </div>

      <div>
        <p className="text-sm">出席者</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {minutes.attendees.map((name) => (
            <Badge key={name} variant="secondary" className="h-7 gap-1 pr-1">
              {name}
              <button
                type="button"
                className="rounded-full px-1"
                aria-label={`移除 ${name}`}
                onClick={() =>
                  onChange({ ...minutes, attendees: minutes.attendees.filter((item) => item !== name) })
                }
              >
                ×
              </button>
            </Badge>
          ))}
          {minutes.attendees.length === 0 ? (
            <span className="text-sm text-muted-foreground">逐字稿沒有提到出席者。</span>
          ) : null}
        </div>
        <Input
          className="mt-2 h-10"
          placeholder="輸入姓名後按 Enter"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const value = event.currentTarget.value.trim();
            if (!value || minutes.attendees.includes(value)) return;
            onChange({ ...minutes, attendees: [...minutes.attendees, value] });
            event.currentTarget.value = "";
          }}
        />
      </div>

      <label className="block text-sm">
        摘要
        <Textarea
          className="mt-1 min-h-28"
          value={minutes.summary}
          onChange={(event) => onChange({ ...minutes, summary: event.target.value })}
        />
      </label>

      <StringList
        label="討論重點"
        items={minutes.discussionPoints}
        empty="還沒有討論重點。"
        onChange={(discussionPoints) => onChange({ ...minutes, discussionPoints })}
      />
      <StringList
        label="決議"
        items={minutes.decisions}
        empty="還沒有決議。"
        onChange={(decisions) => onChange({ ...minutes, decisions })}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm">待辦事項</legend>
        {minutes.actionItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">還沒有待辦。</p>
        ) : null}
        {minutes.actionItems.map((item) => (
          <div key={item.id} className="grid gap-2 rounded-2xl bg-muted/50 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_140px_auto]">
            <Input
              className="h-10 bg-card"
              aria-label="待辦事項"
              value={item.task}
              placeholder="事項"
              onChange={(event) =>
                onChange({
                  ...minutes,
                  actionItems: minutes.actionItems.map((row) =>
                    row.id === item.id ? { ...row, task: event.target.value } : row,
                  ),
                })
              }
            />
            <Input
              className="h-10 bg-card"
              aria-label="負責人"
              value={item.owner}
              placeholder="負責人"
              onChange={(event) =>
                onChange({
                  ...minutes,
                  actionItems: minutes.actionItems.map((row) =>
                    row.id === item.id ? { ...row, owner: event.target.value } : row,
                  ),
                })
              }
            />
            <Input
              className="h-10 bg-card"
              aria-label="期限"
              type="date"
              value={item.dueDate}
              onChange={(event) =>
                onChange({
                  ...minutes,
                  actionItems: minutes.actionItems.map((row) =>
                    row.id === item.id ? { ...row, dueDate: event.target.value } : row,
                  ),
                })
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              aria-label="移除此待辦"
              onClick={() =>
                onChange({ ...minutes, actionItems: minutes.actionItems.filter((row) => row.id !== item.id) })
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          className="h-10"
          onClick={() =>
            onChange({
              ...minutes,
              actionItems: [...minutes.actionItems, { id: createId(), task: "", owner: "", dueDate: "" }],
            })
          }
        >
          <Plus />
          新增待辦
        </Button>
      </fieldset>
    </div>
  );
}

function StringList({
  label,
  items,
  empty,
  onChange,
}: {
  label: string;
  items: string[];
  empty: string;
  onChange: (items: string[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm">{label}</legend>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
      {items.map((item, index) => (
        <div key={`${label}-${index}`} className="flex gap-2">
          <Textarea
            className="min-h-16"
            aria-label={`${label} ${index + 1}`}
            value={item}
            onChange={(event) =>
              onChange(items.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)))
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-10 shrink-0"
            aria-label={`移除${label} ${index + 1}`}
            onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button variant="outline" className="h-10" onClick={() => onChange([...items, ""])}>
        <Plus />
        新增
      </Button>
    </fieldset>
  );
}
