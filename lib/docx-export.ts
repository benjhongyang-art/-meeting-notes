import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { formatDuration, formatTaipei, formatTimestamp, taipeiDateInput } from "@/lib/format";
import { displaySpeaker } from "@/lib/speakers";
import type { ActionItem, Meeting } from "@/lib/types";

const FONT = "Microsoft JhengHei";

export async function meetingToDocx(meeting: Meeting): Promise<Blob> {
  const minutes = meeting.minutes;
  const title = minutes?.title.trim() || meeting.title;
  const children: (Paragraph | Table)[] = [
    heading(title, HeadingLevel.HEADING_1),
    text(`日期：${minutes?.date || taipeiDateInput(meeting.createdAt) || "未記載"}`),
    text(`建立時間：${formatTaipei(meeting.createdAt)}`),
  ];
  if (meeting.durationSec > 0) children.push(text(`長度：${formatDuration(meeting.durationSec)}`));
  if (minutes && minutes.attendees.length > 0) {
    children.push(text(`出席者：${minutes.attendees.join("、")}`));
  }

  if (!minutes) {
    children.push(heading("會議紀錄", HeadingLevel.HEADING_2), text("尚未產生會議紀錄。"));
  } else {
    children.push(heading("摘要", HeadingLevel.HEADING_2), text(minutes.summary.trim() || "（無）"));
    children.push(heading("討論重點", HeadingLevel.HEADING_2), ...bulletParagraphs(minutes.discussionPoints));
    children.push(heading("決議", HeadingLevel.HEADING_2), ...bulletParagraphs(minutes.decisions));
    children.push(heading("待辦事項", HeadingLevel.HEADING_2));
    if (minutes.actionItems.length === 0) {
      children.push(text("（無）"));
    } else {
      children.push(actionTable(minutes.actionItems));
    }
  }

  children.push(heading("逐字稿", HeadingLevel.HEADING_2));
  if (meeting.segments.length === 0) {
    children.push(text("（沒有逐字稿）"));
  } else {
    for (const segment of meeting.segments) {
      const who = displaySpeaker(segment.speaker, meeting.speakerNames);
      const label = `[${formatTimestamp(segment.startMs)}]${who ? ` ${who}` : ""}`;
      children.push(
        new Paragraph({
          spacing: { before: 160 },
          children: [run(label, true)],
        }),
        text(segment.text.trim() || "（空白）"),
      );
    }
  }

  const document = new Document({
    sections: [{ children }],
  });
  return Packer.toBlob(document);
}

function heading(value: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 80 },
    children: [run(value, true)],
  });
}

function text(value: string) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [run(value)],
  });
}

function bulletParagraphs(items: string[]) {
  const filled = items.map((item) => item.trim()).filter(Boolean);
  if (filled.length === 0) return [text("（無）")];
  return filled.map(
    (item) =>
      new Paragraph({
        bullet: { level: 0 },
        children: [run(item)],
      }),
  );
}

function actionTable(items: ActionItem[]) {
  const header = new TableRow({
    children: ["事項", "負責人", "期限"].map((label) => cell(label, true)),
  });
  const rows = items.map(
    (item) =>
      new TableRow({
        children: [cell(item.task), cell(item.owner || "未指定"), cell(item.dueDate || "未定")],
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows],
  });
}

function cell(value: string, header = false) {
  return new TableCell({
    width: { size: 33, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [run(value, header)] })],
  });
}

function run(value: string, bold = false) {
  return new TextRun({ text: value, font: FONT, bold, size: bold ? 24 : 22 });
}
