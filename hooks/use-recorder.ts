"use client";

import { useEffect, useRef, useState } from "react";
import { RECORD_ROTATE_BYTES, RECORD_ROTATE_MS } from "@/lib/constants";
import { extensionForMime, preferredRecorderMime } from "@/lib/files";
import { micErrorMessage } from "@/lib/errors";
import type { StoredAudioChunk } from "@/lib/types";

export type RecorderPhase = "idle" | "recording" | "paused";

export function useRecorder(onChunk?: (chunks: StoredAudioChunk[]) => void) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const phaseRef = useRef<RecorderPhase>("idle");
  const elapsedRef = useRef(0);
  const chunksRef = useRef<StoredAudioChunk[]>([]);
  const partsRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const segmentStartedRef = useRef(0);
  const accumulatedRef = useRef(0);
  const runningSinceRef = useRef<number | null>(null);
  const mimeRef = useRef("");
  const lockRef = useRef<Promise<void>>(Promise.resolve());
  const tickRef = useRef<number | null>(null);
  const rotatingRef = useRef(false);
  const onChunkRef = useRef(onChunk);

  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  function enqueue(task: () => Promise<void>) {
    const run = lockRef.current.then(task, task);
    lockRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function stopTick() {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function publishElapsed() {
    const extra = runningSinceRef.current ? performance.now() - runningSinceRef.current : 0;
    const elapsed = accumulatedRef.current + extra;
    elapsedRef.current = elapsed;
    setElapsedMs(elapsed);
  }

  function pushChunk(blob: Blob, durationSec: number) {
    if (blob.size <= 0) return;
    const mime = blob.type || mimeRef.current || "audio/webm";
    const index = chunksRef.current.length + 1;
    chunksRef.current = [
      ...chunksRef.current,
      {
        blob,
        mime,
        fileName: `recording-${String(index).padStart(2, "0")}.${extensionForMime(mime)}`,
        durationSec,
      },
    ];
    setChunkCount(chunksRef.current.length);
    onChunkRef.current?.(chunksRef.current);
  }

  async function finalizeSegment() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeRef.current || "audio/webm";
        resolve(new Blob(partsRef.current, { type }));
      };
      recorder.stop();
    });
    const durationSec = Math.max(0, (performance.now() - segmentStartedRef.current) / 1000);
    pushChunk(blob, durationSec);
    recorderRef.current = null;
    partsRef.current = [];
  }

  function startSegment() {
    const stream = streamRef.current;
    if (!stream) throw new Error("找不到錄音串流。");
    const mime = mimeRef.current;
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    partsRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) partsRef.current.push(event.data);
    };
    recorderRef.current = recorder;
    segmentStartedRef.current = performance.now();
    recorder.start(1000);
  }

  function startTick() {
    stopTick();
    tickRef.current = window.setInterval(() => {
      publishElapsed();
      if (phaseRef.current !== "recording" || !recorderRef.current || rotatingRef.current) return;
      const bytes = partsRef.current.reduce((sum, part) => sum + part.size, 0);
      const segmentMs = performance.now() - segmentStartedRef.current;
      if (bytes < RECORD_ROTATE_BYTES && segmentMs < RECORD_ROTATE_MS) return;
      rotatingRef.current = true;
      void enqueue(async () => {
        try {
          if (phaseRef.current !== "recording") return;
          await finalizeSegment();
          if (phaseRef.current === "recording" && streamRef.current) startSegment();
        } finally {
          rotatingRef.current = false;
        }
      });
    }, 250);
  }

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("這個瀏覽器不能錄音。請改用 Chrome、Edge 或 Safari，或直接上傳音檔。");
    }
    chunksRef.current = [];
    setChunkCount(0);
    accumulatedRef.current = 0;
    elapsedRef.current = 0;
    setElapsedMs(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      mimeRef.current = preferredRecorderMime();
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const node = context.createAnalyser();
      node.fftSize = 256;
      source.connect(node);
      setAnalyser(node);
      startSegment();
      runningSinceRef.current = performance.now();
      setPhase("recording");
      startTick();
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      await audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
      setAnalyser(null);
      const message = micErrorMessage(error);
      setError(message);
      throw new Error(message);
    }
  }

  function pause() {
    return enqueue(async () => {
      if (phaseRef.current !== "recording") return;
      if (runningSinceRef.current !== null) {
        accumulatedRef.current += performance.now() - runningSinceRef.current;
        runningSinceRef.current = null;
      }
      publishElapsed();
      await finalizeSegment();
      setPhase("paused");
    });
  }

  function resume() {
    return enqueue(async () => {
      if (phaseRef.current !== "paused" || !streamRef.current) return;
      startSegment();
      runningSinceRef.current = performance.now();
      setPhase("recording");
    });
  }

  async function stop(): Promise<StoredAudioChunk[]> {
    let result: StoredAudioChunk[] = [];
    await enqueue(async () => {
      if (phaseRef.current === "recording" && runningSinceRef.current !== null) {
        accumulatedRef.current += performance.now() - runningSinceRef.current;
        runningSinceRef.current = null;
      }
      if (phaseRef.current === "recording") await finalizeSegment();
      stopTick();
      publishElapsed();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      await audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
      setAnalyser(null);
      setPhase("idle");
      result = chunksRef.current;
    });
    return result;
  }

  useEffect(() => {
    return () => {
      stopTick();
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
    };
  }, []);

  return {
    phase,
    elapsedMs,
    elapsedRef,
    chunkCount,
    error,
    analyser,
    start,
    pause,
    resume,
    stop,
  };
}
