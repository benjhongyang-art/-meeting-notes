"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, X } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { HistoryView } from "@/components/history-view";
import { HomeStage } from "@/components/home-stage";
import { MeetingWorkspace, type WorkspaceTab } from "@/components/meeting-workspace";
import { RecordStage } from "@/components/record-stage";
import { SettingsDialog } from "@/components/settings-dialog";
import { Shell } from "@/components/shell";
import { useLiveSpeech } from "@/hooks/use-live-speech";
import { useMeetings } from "@/hooks/use-meetings";
import { useRecorder } from "@/hooks/use-recorder";
import { useStoredSettings, writeSettings } from "@/hooks/use-settings";
import { prepareAudioChunks } from "@/lib/audio-chunks";
import { ApiError, generateMinutes, transcribeChunks } from "@/lib/api-client";
import { getAudio, saveAudio } from "@/lib/db";
import { demoMeeting } from "@/lib/demo";
import { audioFileError } from "@/lib/files";
import { createMeeting, liveLinesToSegments } from "@/lib/meeting";
import type { Meeting, MeetingMinutes, StoredAudioChunk, TranscriptSegment } from "@/lib/types";

type Busy = "preparing" | "transcribing" | "minutes" | null;
type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function HuiJiApp() {
  const store = useMeetings();
  const [view, setView] = useState<"workspace" | "history">("workspace");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settings = useStoredSettings();
  const [busy, setBusy] = useState<Busy>(null);
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("transcript");
  const [audio, setAudio] = useState<StoredAudioChunk[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const recordingId = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const onChunk = useCallback((chunks: StoredAudioChunk[]) => {
    const id = recordingId.current;
    if (!id) return;
    setAudio(chunks);
    void saveAudio(id, chunks).catch(() => {
      setBanner("音檔無法完整存在這台裝置。逐字稿仍會保留，但稍後可能無法重新轉寫。");
    });
  }, []);

  const recorder = useRecorder(onChunk);
  const speech = useLiveSpeech(recorder.phase === "recording", recorder.elapsedRef);

  useEffect(() => {
    if (!store.activeId || recorder.phase !== "idle") return;
    let cancelled = false;
    getAudio(store.activeId)
      .then((chunks) => {
        if (!cancelled) setAudio(chunks);
      })
      .catch(() => {
        if (!cancelled) setAudio([]);
      });
    return () => {
      cancelled = true;
    };
  }, [recorder.phase, store.activeId]);

  function openMeeting(id: string) {
    store.setActiveId(id);
    setView("workspace");
    setTab("transcript");
  }

  async function startRecording() {
    if (recorder.phase !== "idle" || busy) return;
    setBanner(null);
    try {
      await recorder.start();
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "無法開始錄音。");
      return;
    }
    const meeting = createMeeting({ source: "recording" });
    recordingId.current = meeting.id;
    store.persist(meeting);
    store.setActiveId(meeting.id);
    setView("workspace");
    setAudio([]);
    speech.reset();
  }

  async function stopRecording() {
    const id = recordingId.current;
    const lines = speech.finalsRef.current;
    const chunks = await recorder.stop();
    speech.reset();
    recordingId.current = null;
    if (!id) return;
    const durationSec = chunks.reduce((sum, chunk) => sum + chunk.durationSec, 0);
    const segments = liveLinesToSegments(lines);
    store.update(id, (meeting) => ({
      ...meeting,
      durationSec,
      segments: segments.length > 0 ? segments : meeting.segments,
      transcriptSource: segments.length > 0 ? "live" : meeting.transcriptSource,
    }));
    setAudio(chunks);
    try {
      await saveAudio(id, chunks);
    } catch {
      setBanner("錄音已停止，但音檔沒有完整保存。若需要高品質轉寫，請再錄一次或改上傳檔案。");
    }
    if (chunks.length === 0 || chunks.every((chunk) => chunk.blob.size < 800)) {
      setBanner("沒有收到足夠的聲音。請確認麥克風沒有靜音，再錄一次。");
    }
    setTab("transcript");
  }

  async function upload(file: File) {
    if (recorder.phase !== "idle") {
      setBanner("請先停止錄音，再上傳音檔。");
      return;
    }
    const problem = audioFileError(file);
    if (problem) {
      setBanner(problem);
      return;
    }
    setBanner(null);
    setBusy("preparing");
    try {
      const chunks = await prepareAudioChunks(file);
      const durationSec = chunks.reduce((sum, chunk) => sum + chunk.durationSec, 0);
      const meeting = createMeeting({
        source: "upload",
        fileName: file.name,
        durationSec,
        title: file.name.replace(/\.[^.]+$/, "") || undefined,
      });
      store.persist(meeting);
      store.setActiveId(meeting.id);
      setView("workspace");
      setAudio(chunks);
      setTab("transcript");
      await saveAudio(meeting.id, chunks);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "無法讀取這個音檔。");
    } finally {
      setBusy(null);
    }
  }

  function loadDemo() {
    const meeting = demoMeeting();
    store.persist(meeting);
    store.setActiveId(meeting.id);
    setAudio([]);
    setView("workspace");
    setTab("minutes");
    setBanner(null);
  }

  function askTranscribe() {
    const meeting = store.active;
    if (!meeting) return;
    if (!settings.apiKey.trim()) {
      setBanner("請先在設定中輸入 OpenAI API 金鑰。金鑰只會存在這台瀏覽器。");
      setSettingsOpen(true);
      return;
    }
    if (meeting.source === "demo" || audio.length === 0) {
      setBanner("這場會議沒有音檔，無法轉寫。請錄音或上傳。");
      return;
    }
    const run = () => void transcribe(meeting);
    if (meeting.segments.length > 0 && meeting.transcriptSource !== "live") {
      setConfirm({
        title: "重新轉寫？",
        description: "新的逐字稿會取代目前內容，你改過的文字會消失。",
        confirmLabel: "重新轉寫",
        destructive: true,
        onConfirm: run,
      });
      return;
    }
    run();
  }

  async function transcribe(meeting: Meeting) {
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy("transcribing");
    setProgress(null);
    setBanner(null);
    try {
      const segments = await transcribeChunks({
        chunks: audio,
        settings,
        signal: controller.signal,
        onProgress: (info) => setProgress({ index: info.index, total: info.total }),
      });
      if (segments.length === 0) {
        setBanner("沒有辨識到語音。請確認音檔有聲音，或靠近麥克風再錄一次。");
        return;
      }
      store.update(meeting.id, (current) => ({
        ...current,
        segments,
        transcriptSource: "api",
      }));
      setTab("transcript");
    } catch (error) {
      setBanner(error instanceof ApiError ? error.message : "轉寫失敗。請稍後再試。");
    } finally {
      setBusy(null);
      setProgress(null);
      abortRef.current = null;
    }
  }

  function askMinutes() {
    const meeting = store.active;
    if (!meeting) return;
    if (meeting.segments.length === 0) {
      setBanner("還沒有逐字稿，無法產生會議紀錄。");
      return;
    }
    if (!settings.apiKey.trim()) {
      setBanner("請先在設定中輸入 OpenAI API 金鑰。金鑰只會存在這台瀏覽器。");
      setSettingsOpen(true);
      return;
    }
    const run = () => void minutes(meeting);
    if (meeting.minutes) {
      setConfirm({
        title: "重新產生會議紀錄？",
        description: "新的紀錄會覆蓋你編輯過的摘要、決議與待辦。",
        confirmLabel: "重新產生",
        destructive: true,
        onConfirm: run,
      });
      return;
    }
    run();
  }

  async function minutes(meeting: Meeting) {
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy("minutes");
    setBanner(null);
    try {
      const result = await generateMinutes({ meeting, settings, signal: controller.signal });
      store.update(meeting.id, (current) => ({
        ...current,
        title: result.title.trim() || current.title,
        minutes: result,
      }));
      setTab("minutes");
    } catch (error) {
      setBanner(error instanceof ApiError ? error.message : "無法產生會議紀錄。請稍後再試。");
    } finally {
      setBusy(null);
      abortRef.current = null;
    }
  }

  function updateSegments(segments: TranscriptSegment[]) {
    if (!store.activeId) return;
    store.update(store.activeId, (meeting) => ({ ...meeting, segments }));
  }

  function updateMinutes(minutesValue: MeetingMinutes) {
    if (!store.activeId) return;
    store.update(store.activeId, (meeting) => ({
      ...meeting,
      title: minutesValue.title.trim() || meeting.title,
      minutes: minutesValue,
    }));
  }

  const recording = recorder.phase !== "idle";
  const showRecordStage = recording && view === "workspace";
  const showMeeting = !recording && view === "workspace" && store.active;
  const showHome = !recording && view === "workspace" && !store.active;

  return (
    <TooltipProvider>
      <Shell
        view={view}
        onView={setView}
        onNew={() => {
          if (recorder.phase !== "idle") return;
          store.setActiveId(null);
          setView("workspace");
          setBanner(null);
        }}
        onSettings={() => setSettingsOpen(true)}
        hasKey={Boolean(settings.apiKey.trim())}
        recording={recorder.phase !== "idle"}
        newDisabled={recorder.phase !== "idle"}
      >
        {!store.ready ? <p className="text-sm text-muted-foreground">正在讀取這台裝置上的會議…</p> : null}
        {store.storageError ? <Alert text={store.storageError} onClose={() => store.setStorageError(null)} /> : null}
        {banner ? <Alert text={banner} onClose={() => setBanner(null)} /> : null}
        {recording && view !== "workspace" ? (
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[oklch(0.93_0.03_168)] px-4 py-3 text-sm">
            <p>錄音進行中，計時不會中斷。</p>
            <button type="button" className="font-medium text-primary" onClick={() => setView("workspace")}>
              回到錄音
            </button>
          </div>
        ) : null}
        {showRecordStage && recorder.phase !== "idle" ? (
          <RecordStage
            phase={recorder.phase}
            elapsedMs={recorder.elapsedMs}
            chunkCount={recorder.chunkCount}
            analyser={recorder.analyser}
            finals={speech.finals}
            interim={speech.interim}
            speechSupported={speech.supported}
            speechError={speech.error}
            onPause={() => void recorder.pause()}
            onResume={() => void recorder.resume()}
            onStop={() => void stopRecording()}
          />
        ) : null}
        {store.ready && showHome ? (
          <HomeStage
            meetings={store.meetings}
            busy={busy !== null}
            onRecord={() => void startRecording()}
            onUpload={(file) => void upload(file)}
            onOpen={openMeeting}
            onDemo={loadDemo}
          />
        ) : null}
        {showMeeting ? (
          <MeetingWorkspace
            meeting={store.active as Meeting}
            audio={audio}
            busy={busy}
            progress={progress}
            hasKey={Boolean(settings.apiKey.trim())}
            tab={tab}
            onTab={setTab}
            onTitle={(title) => store.update(store.active!.id, (meeting) => ({ ...meeting, title }))}
            onSegments={updateSegments}
            onSpeakerNames={(speakerNames) =>
              store.update(store.active!.id, (meeting) => ({ ...meeting, speakerNames }))
            }
            onMinutes={updateMinutes}
            onTranscribe={askTranscribe}
            onGenerate={askMinutes}
            onCancel={() => abortRef.current?.abort()}
          />
        ) : null}
        {view === "history" ? (
          <HistoryView
            meetings={store.meetings}
            activeId={store.activeId}
            onOpen={openMeeting}
            onDelete={(meeting) =>
              setConfirm({
                title: "刪除這場會議？",
                description: `「${meeting.title}」的逐字稿、紀錄與音檔會從這台裝置移除。`,
                confirmLabel: "刪除",
                destructive: true,
                onConfirm: () => void store.remove(meeting.id),
              })
            }
          />
        ) : null}
      </Shell>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={writeSettings}
      />
      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "確定"}
        destructive={confirm?.destructive}
        onConfirm={() => confirm?.onConfirm()}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}

function Alert({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div
      role="alert"
      className="no-print mb-4 flex items-start gap-3 rounded-2xl bg-[oklch(0.95_0.03_70)] px-4 py-3 text-sm leading-6 text-[oklch(0.35_0.05_50)] ring-1 ring-[oklch(0.75_0.08_60)]"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1">{text}</p>
      <button type="button" className="shrink-0" aria-label="關閉提示" onClick={onClose}>
        <X className="size-4" />
      </button>
    </div>
  );
}
