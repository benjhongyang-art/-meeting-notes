import { blobToWavChunk } from "@/lib/audio-chunks";
import { humanizeApiError } from "@/lib/errors";
import { isAudioFormatError, relaxSpec, transcriptionSpec, type TranscriptionSpec } from "@/lib/models";
import { extractChatContent, parseMinutesContent, parseTranscriptionPayload } from "@/lib/openai-parse";
import { buildMinutesMessages } from "@/lib/prompts";
import { apiHeaders } from "@/lib/settings";
import type { Meeting, MeetingMinutes, Settings, StoredAudioChunk, TranscriptSegment } from "@/lib/types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type FetchLike = typeof fetch;

export type TranscribeProgress = {
  index: number;
  total: number;
  fileName: string;
};

export async function transcribeChunks(options: {
  chunks: StoredAudioChunk[];
  settings: Settings;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
  onProgress?: (progress: TranscribeProgress) => void;
  createId?: () => string;
}): Promise<TranscriptSegment[]> {
  assertKey(options.settings);
  if (options.chunks.length === 0) {
    throw new ApiError("沒有可轉寫的音檔。");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const segments: TranscriptSegment[] = [];
  let offsetSec = 0;
  for (let index = 0; index < options.chunks.length; index += 1) {
    throwIfAborted(options.signal);
    const chunk = options.chunks[index];
    options.onProgress?.({
      index: index + 1,
      total: options.chunks.length,
      fileName: chunk.fileName,
    });
    try {
      const payload = await transcribeOne(chunk, options.settings, fetchImpl, options.signal);
      segments.push(...parseTranscriptionPayload(payload, offsetSec, options.createId));
    } catch (error) {
      if (error instanceof ApiError) {
        throw new ApiError(`第 ${index + 1} 段轉寫失敗：${error.message}`, error.status);
      }
      throw error;
    }
    offsetSec += chunk.durationSec || 0;
  }
  return segments;
}

async function transcribeOne(
  chunk: StoredAudioChunk,
  settings: Settings,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<unknown> {
  try {
    return await sendTranscription(chunk, settings, transcriptionSpec(settings.transcribeModel), fetchImpl, signal);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 400 || chunk.mime === "audio/wav") throw error;
    if (!isAudioFormatError(error.message)) throw error;
    const wav = await blobToWavChunk(chunk);
    return sendTranscription(wav, settings, transcriptionSpec(settings.transcribeModel), fetchImpl, signal);
  }
}

async function sendTranscription(
  chunk: StoredAudioChunk,
  settings: Settings,
  spec: TranscriptionSpec,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
  attempts = 0,
): Promise<unknown> {
  const form = new FormData();
  form.append("file", chunk.blob, chunk.fileName);
  form.append("model", settings.transcribeModel.trim());
  form.append("response_format", spec.responseFormat);
  if (spec.sendLanguage) form.append("language", "zh");
  if (spec.chunkingStrategy) form.append("chunking_strategy", spec.chunkingStrategy);
  for (const granularity of spec.timestampGranularities) {
    form.append("timestamp_granularities[]", granularity);
  }
  const response = await fetchImpl("/api/transcribe", {
    method: "POST",
    headers: apiHeaders(settings),
    body: form,
    signal: withTimeout(signal, 180_000),
  }).catch((error: unknown) => {
    throw networkError(error);
  });
  if (!response.ok) {
    const text = await response.text();
    const next = attempts < 3 ? relaxSpec(spec, text) : null;
    if (next) return sendTranscription(chunk, settings, next, fetchImpl, signal, attempts + 1);
    throw new ApiError(humanizeApiError(response.status, text), response.status);
  }
  return response.json();
}

export async function generateMinutes(options: {
  meeting: Meeting;
  settings: Settings;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
  createId?: () => string;
}): Promise<MeetingMinutes> {
  assertKey(options.settings);
  if (options.meeting.segments.length === 0) {
    throw new ApiError("還沒有逐字稿，無法產生會議紀錄。");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const payload = await sendChat(options.meeting, options.settings, fetchImpl, options.signal, true);
  return parseMinutesContent(extractChatContent(payload), options.createId);
}

async function sendChat(
  meeting: Meeting,
  settings: Settings,
  fetchImpl: FetchLike,
  signal: AbortSignal | undefined,
  jsonMode: boolean,
): Promise<unknown> {
  const body: Record<string, unknown> = {
    model: settings.minutesModel.trim(),
    temperature: 0.2,
    messages: buildMinutesMessages(meeting),
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  const response = await fetchImpl("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(apiHeaders(settings).entries()),
    },
    body: JSON.stringify(body),
    signal: withTimeout(signal, 180_000),
  }).catch((error: unknown) => {
    throw networkError(error);
  });
  if (!response.ok) {
    const text = await response.text();
    if (jsonMode && response.status === 400 && text.toLowerCase().includes("response_format")) {
      return sendChat(meeting, settings, fetchImpl, signal, false);
    }
    throw new ApiError(humanizeApiError(response.status, text), response.status);
  }
  return response.json();
}

export async function testApiConnection(settings: Settings, fetchImpl: FetchLike = fetch): Promise<string> {
  assertKey(settings);
  const response = await fetchImpl("/api/models", {
    method: "POST",
    headers: apiHeaders(settings),
    signal: withTimeout(undefined, 30_000),
  }).catch((error: unknown) => {
    throw networkError(error);
  });
  if (!response.ok) {
    throw new ApiError(humanizeApiError(response.status, await response.text()), response.status);
  }
  return "已連上 API，金鑰可以使用。";
}

function assertKey(settings: Settings) {
  if (!settings.apiKey.trim()) {
    throw new ApiError("請先在設定中輸入 OpenAI API 金鑰。金鑰只會存在這台瀏覽器。");
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ApiError("已取消轉寫。");
}

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  if (!signal) return timeout;
  return AbortSignal.any([signal, timeout]);
}

function networkError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError("已取消。");
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return new ApiError("請求逾時。請稍後再試，或把音檔分成較短的段落。");
  }
  return new ApiError("連不到轉寫服務。請檢查網路，或確認這個網站能連上 API。");
}
