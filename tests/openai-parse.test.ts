import { describe, expect, test } from "vitest";
import { demoMeeting } from "@/lib/demo";
import { meetingToMarkdown } from "@/lib/markdown";
import {
  extractChatContent,
  parseMinutesContent,
  parseTranscriptionPayload,
} from "@/lib/openai-parse";
import { MINUTES_SYSTEM_PROMPT, buildMinutesMessages } from "@/lib/prompts";
import { encodeWav, planRanges, downsample } from "@/lib/wav";

let sequence = 0;
const nextId = () => `id-${sequence++}`;

describe("轉寫結果", () => {
  test("whisper 段落會加上分段偏移", () => {
    sequence = 0;
    const segments = parseTranscriptionPayload(
      {
        text: "你好",
        segments: [
          { start: 1.2, end: 2.4, text: " 你好，今天討論 API " },
          { start: 2.5, end: 4, text: "下週上線" },
        ],
      },
      10,
      nextId,
    );
    expect(segments[0]).toMatchObject({ startMs: 11_200, endMs: 12_400, text: "你好，今天討論 API" });
    expect(segments[1]?.startMs).toBe(12_500);
  });

  test("講者分離與純文字", () => {
    sequence = 0;
    const diarized = parseTranscriptionPayload(
      {
        text: "好",
        segments: [{ speaker: "A", text: "我們先確認 SLA", start: 0, end: 1.5 }],
      },
      0,
      nextId,
    );
    expect(diarized[0]?.speaker).toBe("A");

    const plain = parseTranscriptionPayload({ text: "只有整段文字" }, 3, nextId);
    expect(plain).toHaveLength(1);
    expect(plain[0]?.startMs).toBe(3000);
  });

  test("沒有段落時用單字組成句子", () => {
    sequence = 0;
    const segments = parseTranscriptionPayload(
      {
        words: [
          { word: "今天", start: 0, end: 0.4 },
          { word: "開會", start: 0.4, end: 0.8 },
          { word: "launch", start: 2.2, end: 2.6, speaker: "B" },
        ],
      },
      0,
      nextId,
    );
    expect(segments.map((segment) => segment.text)).toEqual(["今天開會", "launch"]);
    expect(segments[1]?.speaker).toBe("B");
  });
});

describe("會議紀錄", () => {
  test("讀取包在 Markdown 裡的 JSON，並補上待辦", () => {
    sequence = 0;
    const minutes = parseMinutesContent(
      "```json\n" +
        JSON.stringify({
          title: "週會",
          date: "2026/11/18",
          attendees: ["陳品妤", ""],
          summary: "確認上線。",
          discussion_points: ["時程"],
          decisions: ["下週二上線"],
          action_items: [{ action: "補文件", assignee: "Kevin", deadline: "2026-11-21" }],
        }) +
        "\n```",
      nextId,
    );
    expect(minutes.date).toBe("2026-11-18");
    expect(minutes.attendees).toEqual(["陳品妤"]);
    expect(minutes.discussionPoints).toEqual(["時程"]);
    expect(minutes.actionItems[0]).toMatchObject({
      task: "補文件",
      owner: "Kevin",
      dueDate: "2026-11-21",
    });
  });

  test("聊天回傳與提示詞使用繁體中文", () => {
    const content = extractChatContent({
      choices: [{ message: { content: [{ type: "text", text: "{\"title\":\"週會\"}" }] } }],
    });
    expect(content).toContain("週會");
    expect(MINUTES_SYSTEM_PROMPT).toContain("繁體中文");
    expect(MINUTES_SYSTEM_PROMPT).toContain("不要臆測");
    const messages = buildMinutesMessages(demoMeeting());
    expect(messages[1]?.content).toContain("陳品妤");
    expect(messages[1]?.content).toContain("Onboarding");
  });

  test("示範會議可匯出 Markdown", () => {
    const markdown = meetingToMarkdown(demoMeeting());
    expect(markdown).toContain("# 客服知識庫上線會議");
    expect(markdown).toContain("## 待辦事項");
    expect(markdown).toContain("Kevin Chen");
    expect(markdown).toContain("## 逐字稿");
    expect(markdown).toContain("[00:00:03]");
  });
});

describe("WAV 分段", () => {
  test("產生可辨識的 WAV，並把長音檔切成八分鐘", () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 0.25]), 16_000);
    expect(wav.type).toBe("audio/wav");
    expect(wav.size).toBe(44 + 8);
    const ranges = planRanges(20 * 60, 8 * 60);
    expect(ranges.map((range) => range.durationSec)).toEqual([480, 480, 240]);
    const down = downsample(new Float32Array([0, 1, 0, 1]), 4, 2);
    expect(Array.from(down)).toEqual([0.5, 0.5]);
  });
});
