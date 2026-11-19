import { describe, expect, test } from "vitest";
import { generateMinutes, transcribeChunks } from "@/lib/api-client";
import { demoMeeting } from "@/lib/demo";
import { meetingToDocx } from "@/lib/docx-export";
import { forwardToOpenAI } from "@/lib/proxy";
import type { Settings, StoredAudioChunk } from "@/lib/types";
import { encodeWav } from "@/lib/wav";

const settings: Settings = {
  apiKey: "sk-test-secret",
  baseUrl: "",
  transcribeModel: "whisper-1",
  minutesModel: "gpt-4o-mini",
};

function sampleChunk(durationSec: number): StoredAudioChunk {
  return {
    blob: encodeWav(new Float32Array(8).fill(0.2), 16_000),
    mime: "audio/wav",
    fileName: "sample.wav",
    durationSec,
  };
}

describe("模擬 API 的轉寫與會議紀錄", () => {
  test("用範例 WAV 分段轉寫並接上時間", async () => {
    const calls: { model: FormDataEntryValue | null; fileName: string }[] = [];
    const segments = await transcribeChunks({
      chunks: [sampleChunk(10), { ...sampleChunk(5), fileName: "sample-part-02.wav" }],
      settings,
      createId: (() => {
        let n = 0;
        return () => `seg-${n++}`;
      })(),
      fetchImpl: async (_url, init) => {
        const form = init?.body as FormData;
        const file = form.get("file") as File;
        calls.push({ model: form.get("model"), fileName: file.name });
        const start = file.name.includes("02") ? 0.5 : 1;
        return Response.json({
          text: "你好",
          segments: [{ start, end: start + 1, text: file.name.includes("02") ? "第二段" : "第一段" }],
        });
      },
    });
    expect(calls.map((call) => call.fileName)).toEqual(["sample.wav", "sample-part-02.wav"]);
    expect(calls[0]?.model).toBe("whisper-1");
    expect(segments.map((segment) => [segment.text, segment.startMs])).toEqual([
      ["第一段", 1_000],
      ["第二段", 10_500],
    ]);
  });

  test("沒有金鑰時不送出請求", async () => {
    let called = false;
    await expect(
      transcribeChunks({
        chunks: [sampleChunk(1)],
        settings: { ...settings, apiKey: "  " },
        fetchImpl: async () => {
          called = true;
          return Response.json({});
        },
      }),
    ).rejects.toThrow(/API 金鑰/);
    expect(called).toBe(false);
  });

  test("由逐字稿產生會議紀錄", async () => {
    const minutes = await generateMinutes({
      meeting: demoMeeting(),
      settings,
      fetchImpl: async (url, init) => {
        expect(url).toBe("/api/chat");
        const body = JSON.parse(String(init?.body)) as {
          model: string;
          messages: { content: string }[];
        };
        expect(body.model).toBe("gpt-4o-mini");
        expect(body.messages[0]?.content).toContain("繁體中文");
        expect(new Headers(init?.headers).get("x-api-key")).toBe("sk-test-secret");
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "客服知識庫上線會議",
                  date: "2026-11-18",
                  attendees: ["陳品妤"],
                  summary: "確認下週上線。",
                  discussionPoints: ["SLA"],
                  decisions: ["下週二上線"],
                  actionItems: [{ task: "補完 onboarding", owner: "Kevin Chen", dueDate: "2026-11-21" }],
                }),
              },
            },
          ],
        });
      },
    });
    expect(minutes.summary).toContain("上線");
    expect(minutes.actionItems[0]?.owner).toBe("Kevin Chen");
  });

  test("上游失敗會翻成看得懂的訊息", async () => {
    await expect(
      transcribeChunks({
        chunks: [sampleChunk(1)],
        settings,
        fetchImpl: async () => new Response(JSON.stringify({ error: { message: "invalid_api_key" } }), { status: 401 }),
      }),
    ).rejects.toThrow(/金鑰無效/);
  });
});

describe("轉送層", () => {
  test("轉送金鑰但不把金鑰放進回應", async () => {
    const request = new Request("http://localhost/api/transcribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "sk-test-secret",
      },
      body: JSON.stringify({ ping: true }),
    });
    let seenUrl = "";
    let seenAuth = "";
    const response = await forwardToOpenAI(request, "audio/transcriptions", async (url, init) => {
      seenUrl = String(url);
      seenAuth = new Headers(init?.headers).get("authorization") ?? "";
      return Response.json({ text: "你好" });
    });
    expect(seenUrl).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(seenAuth).toBe("Bearer sk-test-secret");
    const payload = await response.json();
    expect(JSON.stringify(payload)).not.toContain("sk-test-secret");
    expect(payload).toEqual({ text: "你好" });
  });

  test("缺少金鑰、私有網址與重新導向都會擋下", async () => {
    const missing = await forwardToOpenAI(
      new Request("http://localhost/api/chat", { method: "POST" }),
      "chat/completions",
    );
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "缺少 API 金鑰。請在設定中輸入。" });

    const blocked = await forwardToOpenAI(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "x-api-key": "sk", "x-openai-base": "https://10.0.0.5/v1" },
      }),
      "chat/completions",
      async () => {
        throw new Error("不該連出去");
      },
    );
    expect(blocked.status).toBe(400);

    const redirected = await forwardToOpenAI(
      new Request("http://localhost/api/models", {
        method: "POST",
        headers: { "x-api-key": "sk" },
      }),
      "models",
      async () => Response.redirect("https://api.openai.com/v1/models", 302),
      "GET",
    );
    expect(redirected.status).toBe(502);
    expect(JSON.stringify(await redirected.json())).not.toContain("sk");
  });
});

describe("Word 匯出", () => {
  test("示範會議可產生 docx", async () => {
    const blob = await meetingToDocx(demoMeeting());
    expect(blob.size).toBeGreaterThan(1000);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
