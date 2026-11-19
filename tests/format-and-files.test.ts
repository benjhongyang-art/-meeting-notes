import { describe, expect, test } from "vitest";
import { audioFileError } from "@/lib/files";
import {
  formatClock,
  formatDuration,
  formatTimestamp,
  taipeiDateInput,
} from "@/lib/format";
import { humanizeApiError } from "@/lib/errors";
import { relaxSpec, transcriptionSpec } from "@/lib/models";
import { resolveUpstream, upstreamUrl } from "@/lib/upstream";

describe("時間格式", () => {
  test("計時與時間戳", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65_000)).toBe("01:05");
    expect(formatClock(3_661_000)).toBe("1:01:01");
    expect(formatTimestamp(65_000)).toBe("00:01:05");
    expect(formatDuration(92)).toBe("1 分 32 秒");
    expect(formatDuration(3700)).toBe("1 小時 1 分");
  });

  test("台北日期", () => {
    expect(taipeiDateInput("2026-11-18T02:30:00.000Z")).toBe("2026-11-18");
    expect(taipeiDateInput("2026-11-18T16:30:00.000Z")).toBe("2026-11-19");
  });
});

describe("音檔檢查", () => {
  test("接受常見格式並拒絕空檔與過大檔", () => {
    expect(audioFileError({ name: "會議.mp3", type: "audio/mpeg", size: 1200 })).toBeNull();
    expect(audioFileError({ name: "notes.m4a", type: "", size: 10 })).toBeNull();
    expect(audioFileError({ name: "notes.txt", type: "text/plain", size: 10 })).toMatch(/mp3/);
    expect(audioFileError({ name: "empty.wav", type: "audio/wav", size: 0 })).toMatch(/空的/);
    expect(audioFileError({ name: "big.wav", type: "audio/wav", size: 201 * 1024 * 1024 })).toMatch(/200MB/);
  });
});

describe("API 錯誤與上游網址", () => {
  test("把狀態碼翻成繁體中文", () => {
    expect(humanizeApiError(401, "")).toMatch(/金鑰/);
    expect(humanizeApiError(429, '{"error":{"message":"rate"}}')).toMatch(/額度/);
    expect(humanizeApiError(400, '{"error":"缺少 API 金鑰。請在設定中輸入。"}')).toBe(
      "缺少 API 金鑰。請在設定中輸入。",
    );
  });

  test("只允許公開 HTTPS", () => {
    expect(resolveUpstream("").origin).toBe("https://api.openai.com");
    expect(upstreamUrl(resolveUpstream("https://api.openai.com/v1"), "audio/transcriptions")).toBe(
      "https://api.openai.com/v1/audio/transcriptions",
    );
    expect(() => resolveUpstream("http://api.openai.com/v1")).toThrow(/HTTPS/);
    expect(() => resolveUpstream("https://localhost/v1")).toThrow(/不允許/);
    expect(() => resolveUpstream("https://127.0.0.1/v1")).toThrow(/不允許/);
    expect(() => resolveUpstream("https://192.168.1.8/v1")).toThrow(/不允許/);
    expect(resolveUpstream("https://example.com/v1/custom").pathname).toBe("/v1/custom");
  });
});

describe("轉寫模型參數", () => {
  test("依模型選擇回應格式", () => {
    expect(transcriptionSpec("whisper-1").responseFormat).toBe("verbose_json");
    expect(transcriptionSpec("gpt-4o-transcribe-diarize").chunkingStrategy).toBe("auto");
    expect(transcriptionSpec("gpt-4o-mini-transcribe").timestampGranularities).toEqual(["segment"]);
  });

  test("遇到不支援的參數就放寬一次", () => {
    const spec = transcriptionSpec("gpt-4o-mini-transcribe");
    expect(relaxSpec(spec, "Unknown parameter: timestamp_granularities")?.timestampGranularities).toEqual([]);
    expect(relaxSpec(spec, "model not found")).toBeNull();
  });
});
