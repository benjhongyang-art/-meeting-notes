import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Meeting, StoredAudioChunk } from "@/lib/types";

interface HuiJiDB extends DBSchema {
  meetings: {
    key: string;
    value: Meeting;
    indexes: { "by-updated": string };
  };
  audio: {
    key: string;
    value: { meetingId: string; chunks: StoredAudioChunk[] };
  };
}

const DB_NAME = "huiji";
const DB_VERSION = 1;

let databasePromise: Promise<IDBPDatabase<HuiJiDB>> | null = null;

function getDb() {
  if (!databasePromise) {
    databasePromise = openDB<HuiJiDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const meetings = database.createObjectStore("meetings", { keyPath: "id" });
        meetings.createIndex("by-updated", "updatedAt");
        database.createObjectStore("audio", { keyPath: "meetingId" });
      },
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function listMeetings(): Promise<Meeting[]> {
  const database = await getDb();
  const rows = await database.getAllFromIndex("meetings", "by-updated");
  return rows.reverse();
}

export async function saveMeeting(meeting: Meeting): Promise<void> {
  const database = await getDb();
  await database.put("meetings", meeting);
}

export async function deleteMeeting(id: string): Promise<void> {
  const database = await getDb();
  const tx = database.transaction(["meetings", "audio"], "readwrite");
  await Promise.all([
    tx.objectStore("meetings").delete(id),
    tx.objectStore("audio").delete(id),
    tx.done,
  ]);
}

export async function saveAudio(meetingId: string, chunks: StoredAudioChunk[]): Promise<void> {
  const database = await getDb();
  await database.put("audio", { meetingId, chunks });
}

export async function getAudio(meetingId: string): Promise<StoredAudioChunk[]> {
  const database = await getDb();
  const row = await database.get("audio", meetingId);
  return row?.chunks ?? [];
}
