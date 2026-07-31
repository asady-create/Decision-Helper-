"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  DayHabits,
  InsightIdea,
  Note,
  PurposeMap,
  Quote,
  TimelineAreaDef,
  TimelineEvent,
} from "@/lib/types";
import {
  deleteNote as storageDeleteNote,
  flushAppData,
  hydrateAppData,
  saveDayHabits as storageSaveDayHabits,
  saveInsights as storageSaveInsights,
  saveMap as storageSaveMap,
  saveNote as storageSaveNote,
  saveQuotes as storageSaveQuotes,
  saveTimeline as storageSaveTimeline,
  saveTimelineAreas as storageSaveTimelineAreas,
} from "@/lib/storage";
import { DEFAULT_TIMELINE_AREAS } from "@/lib/timeline";
import { SEED_QUOTES } from "@/lib/daily";

const EMPTY: AppData = {
  map: null,
  notes: [],
  insights: [],
  timeline: [],
  timelineAreas: DEFAULT_TIMELINE_AREAS.map((a) => ({ ...a })),
  quotes: SEED_QUOTES.map((q) => ({ ...q })),
  habits: {},
};

interface IkigaiStore {
  ready: boolean;
  data: AppData;
  notes: Note[];
  insights: InsightIdea[];
  timeline: TimelineEvent[];
  timelineAreas: TimelineAreaDef[];
  quotes: Quote[];
  habits: Record<string, DayHabits>;
  diskPath: string | null;
  refresh: () => Promise<void>;
  upsertMap: (map: PurposeMap) => void;
  upsertNote: (note: Note) => void;
  removeNote: (id: string) => void;
  setInsights: (insights: InsightIdea[]) => void;
  setTimeline: (timeline: TimelineEvent[]) => void;
  setTimelineAreas: (areas: TimelineAreaDef[]) => void;
  setQuotes: (quotes: Quote[]) => void;
  setDayHabits: (dateKey: string, day: DayHabits) => void;
}

const IkigaiContext = createContext<IkigaiStore | null>(null);

export function IkigaiProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(EMPTY);
  const [diskPath, setDiskPath] = useState<string | null>(null);
  const dataRef = useRef(data);
  const readyRef = useRef(false);
  dataRef.current = data;

  const refresh = useCallback(async () => {
    const loaded = await hydrateAppData();
    setData(loaded);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meta = await fetch("/api/data", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null);
        if (!cancelled && meta?.path) setDiskPath(meta.path as string);
      } catch {
        /* ignore */
      }
      const loaded = await hydrateAppData();
      if (cancelled) return;
      setData(loaded);
      readyRef.current = true;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const flush = () => {
      if (!readyRef.current) return;
      flushAppData(dataRef.current);
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, []);

  const upsertMap = useCallback((map: PurposeMap) => {
    if (!readyRef.current) return;
    const next = storageSaveMap(map);
    setData({ ...next });
  }, []);

  const upsertNote = useCallback((note: Note) => {
    if (!readyRef.current) return;
    const next = storageSaveNote(note);
    setData({ ...next });
  }, []);

  const removeNote = useCallback((id: string) => {
    if (!readyRef.current) return;
    const next = storageDeleteNote(id);
    setData({ ...next });
  }, []);

  const setInsights = useCallback((insights: InsightIdea[]) => {
    if (!readyRef.current) return;
    const next = storageSaveInsights(insights);
    setData({ ...next });
  }, []);

  const setTimeline = useCallback((timeline: TimelineEvent[]) => {
    if (!readyRef.current) return;
    const next = storageSaveTimeline(timeline);
    setData({ ...next });
  }, []);

  const setTimelineAreas = useCallback((areas: TimelineAreaDef[]) => {
    if (!readyRef.current) return;
    const next = storageSaveTimelineAreas(areas);
    setData({ ...next });
  }, []);

  const setQuotes = useCallback((quotes: Quote[]) => {
    if (!readyRef.current) return;
    const next = storageSaveQuotes(quotes);
    setData({ ...next });
  }, []);

  const setDayHabits = useCallback((dateKey: string, day: DayHabits) => {
    if (!readyRef.current) return;
    const next = storageSaveDayHabits(dateKey, day);
    setData({ ...next });
  }, []);

  const notes = [...data.notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const insights = [...(data.insights ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const timeline = [...(data.timeline ?? [])];
  const timelineAreas = [...(data.timelineAreas ?? [])];
  const quotes = [...(data.quotes ?? [])];
  const habits = { ...(data.habits ?? {}) };

  return (
    <IkigaiContext.Provider
      value={{
        ready,
        data,
        notes,
        insights,
        timeline,
        timelineAreas,
        quotes,
        habits,
        diskPath,
        refresh,
        upsertMap,
        upsertNote,
        removeNote,
        setInsights,
        setTimeline,
        setTimelineAreas,
        setQuotes,
        setDayHabits,
      }}
    >
      {children}
    </IkigaiContext.Provider>
  );
}

export function useIkigai() {
  const ctx = useContext(IkigaiContext);
  if (!ctx) throw new Error("useIkigai must be used within IkigaiProvider");
  return ctx;
}
