"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/lib/settings";
import type { Settings } from "@/lib/types";

let current = DEFAULT_SETTINGS;
let loaded = false;
const listeners = new Set<() => void>();

function snapshot(): Settings {
  if (!loaded && typeof window !== "undefined") {
    current = loadSettings();
    loaded = true;
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStoredSettings(): Settings {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_SETTINGS);
}

export function writeSettings(next: Settings) {
  current = next;
  loaded = true;
  saveSettings(next);
  for (const listener of listeners) listener();
}
