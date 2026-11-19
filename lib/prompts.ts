import { TRANSCRIPT_CHAR_LIMIT } from "@/lib/constants";
import { formatTimestamp, taipeiDateInput } from "@/lib/format";
import { displaySpeaker } from "@/lib/speakers";
import type { Meeting } from "@/lib/types";

export const MINUTES_SYSTEM_PROMPT = `你是台灣企業的會議紀錄助理。請根據逐字稿整理會議紀錄，並且只輸出一個 JSON 物件，不要加前言或 Markdown。

規則：
- 所有敘述使用繁體中文。專有名詞、產品名與英文縮寫維持原文。
- 只能使用逐字稿裡有依據的內容。沒有提到的出席者、決議、負責人、期限不要臆測，留空字串或空陣列。
- 會議日期若逐字稿沒有明講，使用提供的台北日期。
- 待辦要具體、可以執行。

JSON 欄位：
{
  "title": "簡短會議標題",
  "date": "YYYY-MM-DD",
  "attendees": ["姓名"],
  "summary": "三段以內的摘要",
  "discussionPoints": ["討論重點"],
  "decisions": ["決議"],
  "actionItems": [{ "task": "事項", "owner": "負責人，沒有就空字串", "dueDate": "YYYY-MM-DD，沒有就空字串" }]
}`;

export function buildMinutesMessages(meeting: Meeting): { role: "system" | "user"; content: string }[] {
  const date = taipeiDateInput(meeting.createdAt);
  let transcript = meeting.segments
    .map((segment) => {
      const who = displaySpeaker(segment.speaker, meeting.speakerNames);
      const prefix = who ? `${who}：` : "";
      return `[${formatTimestamp(segment.startMs)}] ${prefix}${segment.text}`;
    })
    .join("\n");
  if (transcript.length > TRANSCRIPT_CHAR_LIMIT) {
    transcript = `${transcript.slice(0, TRANSCRIPT_CHAR_LIMIT)}\n（逐字稿過長，已截斷尾端）`;
  }
  return [
    { role: "system", content: MINUTES_SYSTEM_PROMPT },
    {
      role: "user",
      content: `會議建立時間（台北）：${date}\n暫定標題：${meeting.title}\n\n逐字稿：\n${transcript || "（沒有逐字稿）"}`,
    },
  ];
}
