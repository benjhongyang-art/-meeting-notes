export type TranscriptSource = "live" | "api" | "demo";

export type TranscriptSegment = {
  id: string;
  startMs: number;
  endMs: number;
  speaker: string;
  text: string;
};

export type ActionItem = {
  id: string;
  task: string;
  owner: string;
  dueDate: string;
};

export type MeetingMinutes = {
  title: string;
  date: string;
  attendees: string[];
  summary: string;
  discussionPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
};

export type Meeting = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  durationSec: number;
  source: "recording" | "upload" | "demo";
  fileName?: string;
  transcriptSource: TranscriptSource | null;
  segments: TranscriptSegment[];
  speakerNames: Record<string, string>;
  minutes: MeetingMinutes | null;
};

export type StoredAudioChunk = {
  blob: Blob;
  mime: string;
  fileName: string;
  durationSec: number;
};

export type Settings = {
  apiKey: string;
  baseUrl: string;
  transcribeModel: string;
  minutesModel: string;
};
