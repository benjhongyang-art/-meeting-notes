import { TARGET_SAMPLE_RATE } from "@/lib/constants";

export function planRanges(
  totalSec: number,
  chunkSec: number,
): { startSec: number; durationSec: number }[] {
  if (totalSec <= 0 || chunkSec <= 0) return [{ startSec: 0, durationSec: Math.max(0, totalSec) }];
  const ranges: { startSec: number; durationSec: number }[] = [];
  let cursor = 0;
  while (cursor < totalSec - 0.01) {
    const durationSec = Math.min(chunkSec, totalSec - cursor);
    ranges.push({ startSec: cursor, durationSec });
    cursor += durationSec;
  }
  return ranges;
}

export function downsample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (outputRate <= 0 || inputRate <= outputRate) return input;
  const ratio = inputRate / outputRate;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(input.length, Math.floor((index + 1) * ratio));
    let sum = 0;
    for (let cursor = start; cursor < end; cursor += 1) sum += input[cursor] ?? 0;
    output[index] = sum / Math.max(1, end - start);
  }
  return output;
}

export function encodeWav(samples: Float32Array, sampleRate = TARGET_SAMPLE_RATE): Blob {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
