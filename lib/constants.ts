/** Stay under OpenAI's 25MB transcription limit, with room for multipart overhead. */
export const MAX_CHUNK_BYTES = 20 * 1024 * 1024;

/** Rotate a live recording so each piece can be sent, and re-encoded to WAV if needed. */
export const RECORD_ROTATE_MS = 8 * 60 * 1000;
export const RECORD_ROTATE_BYTES = 18 * 1024 * 1024;

export const WAV_CHUNK_SEC = 8 * 60;
export const TARGET_SAMPLE_RATE = 16_000;
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
export const TRANSCRIPT_CHAR_LIMIT = 120_000;

export const DEFAULT_OPENAI_BASE = "https://api.openai.com/v1";

export const TRANSCRIBE_MODEL_PRESETS = [
  "gpt-4o-mini-transcribe",
  "gpt-4o-transcribe",
  "gpt-4o-transcribe-diarize",
  "whisper-1",
] as const;

export const MINUTES_MODEL_PRESETS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
] as const;

export const DEFAULT_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
export const DEFAULT_MINUTES_MODEL = "gpt-4o-mini";
