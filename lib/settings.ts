import {
  DEFAULT_MINUTES_MODEL,
  DEFAULT_TRANSCRIBE_MODEL,
} from "@/lib/constants";
import type { Settings } from "@/lib/types";

export const SETTINGS_KEY = "huiji.settings.v1";
export const API_KEY_HEADER = "x-api-key";
export const API_BASE_HEADER = "x-openai-base";

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  baseUrl: "",
  transcribeModel: DEFAULT_TRANSCRIBE_MODEL,
  minutesModel: DEFAULT_MINUTES_MODEL,
};

export function loadSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
      transcribeModel:
        typeof parsed.transcribeModel === "string" && parsed.transcribeModel.trim()
          ? parsed.transcribeModel.trim()
          : DEFAULT_SETTINGS.transcribeModel,
      minutesModel:
        typeof parsed.minutesModel === "string" && parsed.minutesModel.trim()
          ? parsed.minutesModel.trim()
          : DEFAULT_SETTINGS.minutesModel,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function apiHeaders(settings: Pick<Settings, "apiKey" | "baseUrl">): Headers {
  const headers = new Headers();
  headers.set(API_KEY_HEADER, settings.apiKey.trim());
  if (settings.baseUrl.trim()) headers.set(API_BASE_HEADER, settings.baseUrl.trim());
  return headers;
}
