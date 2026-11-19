import { formatDuration, formatTaipei, formatTimestamp, taipeiDateInput } from "@/lib/format";
import { displaySpeaker } from "@/lib/speakers";
import type { Meeting } from "@/lib/types";

export function meetingToMarkdown(meeting: Meeting): string {
  const minutes = meeting.minutes;
  const title = minutes?.title.trim() || meeting.title;
  const lines: string[] = [`# ${title}`, ""];
  const date = minutes?.date || taipeiDateInput(meeting.createdAt);
  lines.push(`- 日期：${date || "未記載"}`);
  lines.push(`- 建立時間：${formatTaipei(meeting.createdAt)}`);
  if (meeting.durationSec > 0) lines.push(`- 長度：${formatDuration(meeting.durationSec)}`);
  if (minutes && minutes.attendees.length > 0) {
    lines.push(`- 出席者：${minutes.attendees.join("、")}`);
  }
  lines.push("");

  if (!minutes) {
    lines.push("尚未產生會議紀錄。", "");
  } else {
    lines.push("## 摘要", "", minutes.summary.trim() || "（無）", "");
    lines.push("## 討論重點", "");
    lines.push(...bulletList(minutes.discussionPoints));
    lines.push("", "## 決議", "");
    lines.push(...bulletList(minutes.decisions));
    lines.push("", "## 待辦事項", "");
    if (minutes.actionItems.length === 0) {
      lines.push("（無）");
    } else {
      lines.push("| 事項 | 負責人 | 期限 |", "| --- | --- | --- |");
      for (const item of minutes.actionItems) {
        lines.push(
          `| ${escapeCell(item.task)} | ${escapeCell(item.owner || "未指定")} | ${escapeCell(item.dueDate || "未定")} |`,
        );
      }
    }
    lines.push("");
  }

  lines.push("## 逐字稿", "");
  if (meeting.segments.length === 0) {
    lines.push("（沒有逐字稿）");
  } else {
    for (const segment of meeting.segments) {
      const who = displaySpeaker(segment.speaker, meeting.speakerNames);
      const speaker = who ? ` ${who}` : "";
      lines.push(`**[${formatTimestamp(segment.startMs)}]${speaker}**`, "", segment.text.trim() || "（空白）", "");
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

function bulletList(items: string[]): string[] {
  const filled = items.map((item) => item.trim()).filter(Boolean);
  if (filled.length === 0) return ["（無）"];
  return filled.map((item) => `- ${item}`);
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
