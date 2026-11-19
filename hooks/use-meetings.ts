"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteMeeting, listMeetings, saveMeeting } from "@/lib/db";
import type { Meeting } from "@/lib/types";

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const latest = useRef(new Map<string, Meeting>());
  const timers = useRef(new Map<string, number>());

  const remember = useCallback((meeting: Meeting) => {
    latest.current.set(meeting.id, meeting);
    const existing = timers.current.get(meeting.id);
    if (existing) window.clearTimeout(existing);
    const handle = window.setTimeout(() => {
      timers.current.delete(meeting.id);
      const current = latest.current.get(meeting.id);
      if (!current) return;
      void saveMeeting(current).catch(() => {
        setStorageError("會議內容沒有寫入這台裝置。瀏覽器儲存空間可能不足。");
      });
    }, 300);
    timers.current.set(meeting.id, handle);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listMeetings()
      .then((rows) => {
        if (cancelled) return;
        setMeetings(rows);
        for (const meeting of rows) latest.current.set(meeting.id, meeting);
      })
      .catch(() => {
        if (!cancelled) {
          setStorageError("無法讀取這台裝置上的會議。請確認瀏覽器沒有封鎖網站資料。");
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const flush = () => {
      for (const handle of timers.current.values()) window.clearTimeout(handle);
      timers.current.clear();
      for (const meeting of latest.current.values()) void saveMeeting(meeting);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const place = useCallback((list: Meeting[], meeting: Meeting) => {
    const next = [meeting, ...list.filter((item) => item.id !== meeting.id)];
    next.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return next;
  }, []);

  const persist = useCallback(
    (meeting: Meeting) => {
      remember(meeting);
      setMeetings((prev) => place(prev, meeting));
    },
    [place, remember],
  );

  const update = useCallback(
    (id: string, recipe: (meeting: Meeting) => Meeting) => {
      const current = latest.current.get(id);
      if (!current) return;
      const nextMeeting = recipe({ ...current, updatedAt: new Date().toISOString() });
      remember(nextMeeting);
      setMeetings((prev) => place(prev, nextMeeting));
    },
    [place, remember],
  );

  const remove = useCallback(async (id: string) => {
    const handle = timers.current.get(id);
    if (handle) window.clearTimeout(handle);
    timers.current.delete(id);
    latest.current.delete(id);
    setMeetings((prev) => prev.filter((item) => item.id !== id));
    setActiveId((current) => (current === id ? null : current));
    try {
      await deleteMeeting(id);
    } catch {
      setStorageError("沒有成功刪除這場會議。請再試一次。");
    }
  }, []);

  const active = meetings.find((meeting) => meeting.id === activeId) ?? null;

  return {
    meetings,
    active,
    activeId,
    setActiveId,
    ready,
    storageError,
    setStorageError,
    persist,
    update,
    remove,
  };
}
