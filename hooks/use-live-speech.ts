"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type SpeechResult = {
  isFinal: boolean;
  0?: { transcript?: string };
};

type SpeechEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
};

type SpeechErrorEvent = { error?: string };

type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionCtor = new () => BrowserRecognition;

export type LiveLine = { text: string; atMs: number };

function emptySubscribe() {
  return () => undefined;
}

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

function speechSupportedSnapshot() {
  return recognitionCtor() !== null;
}

export function useLiveSpeech(active: boolean, elapsedRef: { current: number }) {
  const [finals, setFinals] = useState<LiveLine[]>([]);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const finalsRef = useRef<LiveLine[]>([]);
  const supported = useSyncExternalStore(emptySubscribe, speechSupportedSnapshot, () => false);

  useEffect(() => {
    finalsRef.current = finals;
  }, [finals]);

  useEffect(() => {
    if (!active) return;
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "zh-TW";
    recognition.continuous = true;
    recognition.interimResults = true;
    let stopped = false;
    recognition.onresult = (event) => {
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript?.trim() ?? "";
        if (!text) continue;
        if (result.isFinal) {
          setFinals((prev) => {
            const next = [...prev, { text, atMs: elapsedRef.current }];
            finalsRef.current = next;
            return next;
          });
        } else {
          interimText = `${interimText} ${text}`.trim();
        }
      }
      setInterim(interimText);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setError("瀏覽器沒有開放語音辨識。錄音仍會繼續，可稍後再做高品質轉寫。");
      } else if (event.error === "network") {
        setError("即時字幕需要網路。錄音仍會繼續，可稍後再做高品質轉寫。");
      }
    };
    recognition.onend = () => {
      if (stopped) return;
      try {
        recognition.start();
      } catch {
        // Chrome throws if start() races with an existing session.
      }
    };
    try {
      recognition.start();
    } catch {
      // The browser exposed the API but refused to start it.
    }
    return () => {
      stopped = true;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
    };
  }, [active, elapsedRef]);

  function reset() {
    finalsRef.current = [];
    setFinals([]);
    setInterim("");
    setError(null);
  }

  return { finals, interim, supported, error, finalsRef, reset };
}
