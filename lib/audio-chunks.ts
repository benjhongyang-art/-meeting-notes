import { MAX_CHUNK_BYTES, TARGET_SAMPLE_RATE, WAV_CHUNK_SEC } from "@/lib/constants";
import { audioFileError, fileExtension } from "@/lib/files";
import type { StoredAudioChunk } from "@/lib/types";
import { downsample, encodeWav, planRanges } from "@/lib/wav";

export async function prepareAudioChunks(file: File): Promise<StoredAudioChunk[]> {
  const problem = audioFileError(file);
  if (problem) throw new Error(problem);
  if (file.size <= MAX_CHUNK_BYTES) {
    const durationSec = await readDuration(file);
    return [
      {
        blob: file,
        mime: file.type || guessMime(file.name),
        fileName: file.name || "audio",
        durationSec,
      },
    ];
  }
  const decoded = await decodeFile(file);
  return splitBuffer(decoded, file.name.replace(/\.[^.]+$/, "") || "audio");
}

export async function blobToWavChunk(chunk: StoredAudioChunk): Promise<StoredAudioChunk> {
  const file = new File([chunk.blob], chunk.fileName, { type: chunk.mime });
  const decoded = await decodeFile(file);
  const [first] = splitBuffer(decoded, chunk.fileName.replace(/\.[^.]+$/, "") || "audio");
  if (!first) throw new Error("無法把音檔轉成 WAV。");
  return first;
}

export function splitBuffer(buffer: AudioBuffer, baseName: string): StoredAudioChunk[] {
  const mono = mixToMono(buffer);
  const samples = downsample(mono, buffer.sampleRate, TARGET_SAMPLE_RATE);
  const totalSec = samples.length / TARGET_SAMPLE_RATE;
  const ranges = planRanges(totalSec, WAV_CHUNK_SEC);
  return ranges.map((range, index) => {
    const start = Math.floor(range.startSec * TARGET_SAMPLE_RATE);
    const end = Math.min(samples.length, Math.floor((range.startSec + range.durationSec) * TARGET_SAMPLE_RATE));
    const slice = samples.subarray(start, end);
    return {
      blob: encodeWav(slice, TARGET_SAMPLE_RATE),
      mime: "audio/wav",
      fileName: `${baseName}-part-${String(index + 1).padStart(2, "0")}.wav`,
      durationSec: slice.length / TARGET_SAMPLE_RATE,
    };
  });
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const output = new Float32Array(buffer.length);
  const channels = buffer.numberOfChannels;
  for (let channel = 0; channel < channels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      output[index] = (output[index] ?? 0) + data[index] / channels;
    }
  }
  return output;
}

async function decodeFile(file: File): Promise<AudioBuffer> {
  if (typeof AudioContext === "undefined") {
    throw new Error("這個瀏覽器無法解碼過長的音檔。請先轉成 20MB 以內的 mp3 或 wav。");
  }
  const context = new AudioContext();
  try {
    const copy = (await file.arrayBuffer()).slice(0);
    return await context.decodeAudioData(copy);
  } catch {
    throw new Error("這個檔案超過 20MB，瀏覽器也無法解碼來自動分段。請先轉成較小的 mp3 或 wav。");
  } finally {
    await context.close().catch(() => undefined);
  }
}

export function readDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(0);
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = document.createElement("audio");
    const finish = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? value : 0);
    };
    const timer = window.setTimeout(() => finish(0), 5000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      finish(audio.duration);
    };
    audio.onerror = () => {
      window.clearTimeout(timer);
      finish(0);
    };
    audio.src = url;
  });
}

function guessMime(name: string): string {
  const extension = fileExtension(name);
  if (extension === "mp3" || extension === "mpga" || extension === "mpeg") return "audio/mpeg";
  if (extension === "m4a" || extension === "mp4") return "audio/mp4";
  if (extension === "wav") return "audio/wav";
  if (extension === "ogg") return "audio/ogg";
  return "audio/webm";
}
