export type TranscriptionSpec = {
  responseFormat: string;
  timestampGranularities: string[];
  chunkingStrategy?: string;
  sendLanguage: boolean;
};

export function transcriptionSpec(model: string): TranscriptionSpec {
  const name = model.trim();
  if (name === "whisper-1") {
    return {
      responseFormat: "verbose_json",
      timestampGranularities: [],
      sendLanguage: true,
    };
  }
  if (name.includes("diarize")) {
    return {
      responseFormat: "diarized_json",
      timestampGranularities: [],
      chunkingStrategy: "auto",
      sendLanguage: true,
    };
  }
  return {
    responseFormat: "json",
    timestampGranularities: ["segment"],
    sendLanguage: true,
  };
}

export function relaxSpec(spec: TranscriptionSpec, errorText: string): TranscriptionSpec | null {
  const lower = errorText.toLowerCase();
  if (spec.timestampGranularities.length > 0 && lower.includes("timestamp")) {
    return { ...spec, timestampGranularities: [] };
  }
  if (spec.responseFormat !== "json" && lower.includes("response_format")) {
    return {
      ...spec,
      responseFormat: "json",
      timestampGranularities: [],
      chunkingStrategy: undefined,
    };
  }
  if (spec.chunkingStrategy && lower.includes("chunking")) {
    return { ...spec, chunkingStrategy: undefined };
  }
  if (spec.sendLanguage && (lower.includes("language") || lower.includes("unknown parameter"))) {
    return { ...spec, sendLanguage: false };
  }
  return null;
}

export function isAudioFormatError(errorText: string): boolean {
  const lower = errorText.toLowerCase();
  return (
    lower.includes("format") ||
    lower.includes("unsupported") ||
    lower.includes("invalid file") ||
    lower.includes("could not process") ||
    lower.includes("audio file")
  );
}
