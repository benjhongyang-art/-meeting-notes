import { MAX_UPLOAD_BYTES } from "@/lib/constants";

const ALLOWED_EXTENSIONS = new Set(["mp3", "m4a", "wav", "webm", "mp4", "mpeg", "mpga", "ogg"]);

export function fileExtension(name: string): string {
  const index = name.lastIndexOf(".");
  if (index < 0) return "";
  return name.slice(index + 1).toLowerCase();
}

export function audioFileError(file: { name: string; type: string; size: number }): string | null {
  if (file.size <= 0) return "這個音檔是空的。";
  if (file.size > MAX_UPLOAD_BYTES) return "檔案超過 200MB。請先剪短或壓縮後再上傳。";
  const extension = fileExtension(file.name);
  const typeOk =
    file.type.startsWith("audio/") || file.type === "video/webm" || file.type === "video/mp4";
  if (!ALLOWED_EXTENSIONS.has(extension) && !typeOk) {
    return "只支援 mp3、m4a、wav、webm 音檔。";
  }
  return null;
}

export function extensionForMime(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

export function preferredRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}
