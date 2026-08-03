/**
 * Persistence:
 * 1) Disk file via /api/data → data/ikigai-store.json (survives reboot)
 * 2) localStorage cache + snapshot (fast UI, offline buffer)
 *
 * Disk is the source of truth on your computer when the Next.js app is running.
 */

import type {
  AiReflection,
  AppData,
  DayHabits,
  InsightIdea,
  Note,
  NoteTag,
  PurposeMap,
  Quote,
  TimelineAreaDef,
  TimelineEvent,
} from "./types";
import { NOTE_TAGS } from "./types";
import { createEmptyMap, normalizeMap } from "./synthesis";
import { isNoteTag } from "./note-tags";
import { normalizeInsights } from "./insights";
import {
  DEFAULT_TIMELINE_AREAS,
  normalizeTimelineAreas,
  normalizeTimelineEvent,
} from "./timeline";
import {
  mergeQuotes,
  normalizeDayHabits,
  normalizeHabitsLog,
  normalizeQuotes,
  readLegacyVibeTrackHabits,
  readLegacyVibeTrackQuotes,
  SEED_QUOTES,
} from "./daily";

const STORAGE_KEY = "ikigai:v2";
const SNAPSHOT_KEY = "ikigai:v2:snapshot";
const BACKUP_KEY = "ikigai:v2:backup";
const LEGACY_KEY = "ikigai:v1";
const VIBETRACK_MIGRATED_KEY = "ikigai:vibetrack-migrated";

const DEFAULT_DATA: AppData = {
  map: null,
  notes: [],
  insights: [],
  timeline: [],
  timelineAreas: DEFAULT_TIMELINE_AREAS.map((a) => ({ ...a })),
  quotes: SEED_QUOTES.map((q) => ({ ...q })),
  habits: {},
  aiReflection: null,
};

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeNote(
  raw: Partial<Note> & { id: string; content: string }
): Note {
  const tags = Array.isArray(raw.tags)
    ? (raw.tags.filter((t) => isNoteTag(String(t))) as NoteTag[])
    : [];
  return {
    id: raw.id,
    content: raw.content ?? "",
    tags: NOTE_TAGS.filter((t) => tags.includes(t)),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
  };
}

export function normalizeAppData(raw: Partial<AppData> | null): AppData {
  if (!raw) return structuredClone(DEFAULT_DATA);
  const timelineAreas = normalizeTimelineAreas(raw.timelineAreas);
  return {
    ...structuredClone(DEFAULT_DATA),
    ...raw,
    map: raw.map ? normalizeMap(raw.map) : null,
    notes: (raw.notes ?? []).map((n) => normalizeNote(n)),
    insights: normalizeInsights(raw.insights),
    timelineAreas,
    timeline: (raw.timeline ?? []).map((e, i) =>
      normalizeTimelineEvent(
        e as TimelineEvent & { area?: string },
        timelineAreas,
        i
      )
    ),
    quotes: normalizeQuotes(raw.quotes),
    habits: normalizeHabitsLog(raw.habits),
    aiReflection: normalizeAiReflection(raw.aiReflection),
  };
}

function normalizeAiReflection(raw: unknown): AiReflection | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<AiReflection>;
  if (typeof value.id !== "string" || typeof value.createdAt !== "string") {
    return null;
  }
  if (typeof value.mirror !== "string" || !Array.isArray(value.pursuits)) {
    return null;
  }
  const pursuits = value.pursuits
    .filter((p): p is NonNullable<typeof p> => Boolean(p && typeof p === "object"))
    .map((p) => {
      const item = p as Partial<AiReflection["pursuits"][number]>;
      return {
        id: typeof item.id === "string" ? item.id : `pursuit-${Math.random().toString(36).slice(2, 8)}`,
        title: typeof item.title === "string" ? item.title : "Untitled direction",
        summary: typeof item.summary === "string" ? item.summary : "",
        why: Array.isArray(item.why)
          ? item.why.filter((x): x is string => typeof x === "string")
          : [],
        intersections: Array.isArray(item.intersections)
          ? item.intersections.filter(
              (x): x is AiReflection["pursuits"][number]["intersections"][number] =>
                typeof x === "string"
            )
          : [],
        questions: Array.isArray(item.questions)
          ? item.questions.filter((x): x is string => typeof x === "string")
          : [],
      };
    });
  return {
    id: value.id,
    createdAt: value.createdAt,
    mirror: value.mirror,
    pursuits,
    tensions: Array.isArray(value.tensions)
      ? value.tensions.filter((t): t is string => typeof t === "string")
      : [],
    source: value.source === "openai" ? "openai" : "local",
  };
}

function parsePayload(raw: string): AppData | null {
  try {
    return normalizeAppData(JSON.parse(raw) as Partial<AppData>);
  } catch {
    return null;
  }
}

/** How much real content is in this payload — used to block empty overwrites. */
export function contentScore(data: AppData): number {
  let score = 0;
  const m = data.map;
  if (m) {
    for (const s of [
      m.want,
      m.goodAt,
      m.need,
      m.reward,
      m.offer,
      m.synthesis,
    ]) {
      if (s?.trim()) score += Math.min(s.trim().length, 200);
    }
    score += m.skillsHave.length * 20;
    score += m.skillsLack.length * 20;
    score += (m.values?.length ?? 0) * 10;
    for (const sk of [...m.skillsHave, ...m.skillsLack]) {
      if (sk.note?.trim()) score += Math.min(sk.note.trim().length, 80);
    }
  }
  for (const n of data.notes) {
    if (n.content?.trim()) score += Math.min(n.content.trim().length, 200);
  }
  score += data.insights.length * 15;
  for (const e of data.timeline ?? []) {
    if (e.title?.trim()) score += Math.min(e.title.trim().length, 80) + 10;
  }
  for (const q of data.quotes ?? []) {
    if (q.text?.trim()) score += Math.min(q.text.trim().length, 120) + 5;
  }
  score += Object.keys(data.habits ?? {}).length * 8;
  if (data.aiReflection?.mirror?.trim()) {
    score += Math.min(data.aiReflection.mirror.trim().length, 160) + 20;
    score += (data.aiReflection.pursuits?.length ?? 0) * 12;
  }
  return score;
}

export function isEffectivelyEmpty(data: AppData): boolean {
  return contentScore(data) === 0;
}

function migrateLegacy(): AppData | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      canvas?: {
        ikigai?: {
          love?: string;
          goodAt?: string;
          worldNeeds?: string;
          paidFor?: string;
        };
        visionStatement?: string;
      };
      reflections?: {
        id: string;
        content: string;
        createdAt: string;
        updatedAt: string;
      }[];
    };

    const map = createEmptyMap();
    const ik = parsed.canvas?.ikigai;
    if (ik) {
      map.want = ik.love ?? "";
      map.goodAt = ik.goodAt ?? "";
      map.offer = ik.worldNeeds ?? "";
      map.need = ik.worldNeeds ?? "";
      map.reward = ik.paidFor ?? "";
      if (ik.goodAt?.trim()) {
        map.skillsHave = ik.goodAt
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name, i) => ({
            id: `migrated-have-${i}`,
            name,
            note: "",
          }));
      }
      map.synthesis = parsed.canvas?.visionStatement ?? "";
    }

    const notes: Note[] = (parsed.reflections ?? [])
      .filter((r) => r.content?.trim())
      .map((r) =>
        normalizeNote({
          id: r.id,
          content: r.content,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          tags: [],
        })
      );

    const data: AppData = {
      map: parsed.canvas ? map : null,
      notes,
      insights: [],
      timeline: [],
      timelineAreas: DEFAULT_TIMELINE_AREAS.map((a) => ({ ...a })),
      quotes: SEED_QUOTES.map((q) => ({ ...q })),
      habits: {},
      aiReflection: null,
    };
    saveAppDataLocal(data, { force: true });
    window.localStorage.removeItem(LEGACY_KEY);
    return data;
  } catch {
    return null;
  }
}

function readKey(key: string): AppData | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return parsePayload(raw);
  } catch {
    return null;
  }
}

/** Synchronous browser cache only. */
export function loadAppDataLocal(): AppData {
  if (!isBrowser()) return structuredClone(DEFAULT_DATA);

  const primary = readKey(STORAGE_KEY);
  const snapshot = readKey(SNAPSHOT_KEY);

  if (primary && snapshot) {
    if (contentScore(snapshot) > contentScore(primary)) {
      saveAppDataLocal(snapshot, { force: true });
      return snapshot;
    }
    return primary;
  }
  if (primary && !isEffectivelyEmpty(primary)) return primary;
  if (snapshot && !isEffectivelyEmpty(snapshot)) {
    saveAppDataLocal(snapshot, { force: true });
    return snapshot;
  }
  if (primary) return primary;

  try {
    const backup = window.sessionStorage.getItem(BACKUP_KEY);
    if (backup) {
      const parsed = parsePayload(backup);
      if (parsed && !isEffectivelyEmpty(parsed)) {
        saveAppDataLocal(parsed, { force: true });
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }

  return migrateLegacy() ?? structuredClone(DEFAULT_DATA);
}

/** @deprecated use loadAppDataLocal or hydrateAppData */
export function loadAppData(): AppData {
  return loadAppDataLocal();
}

function saveAppDataLocal(
  data: AppData,
  opts: { force?: boolean } = {}
): boolean {
  if (!isBrowser()) return false;

  if (!opts.force) {
    const existing = readKey(STORAGE_KEY) ?? readKey(SNAPSHOT_KEY);
    if (
      existing &&
      !isEffectivelyEmpty(existing) &&
      isEffectivelyEmpty(data)
    ) {
      console.warn(
        "[ikigai] Blocked empty overwrite — your saved data was kept."
      );
      return false;
    }
  }

  const json = JSON.stringify(data);
  try {
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch (err) {
    console.warn("[ikigai] localStorage write failed", err);
  }

  if (!isEffectivelyEmpty(data)) {
    try {
      window.localStorage.setItem(SNAPSHOT_KEY, json);
    } catch {
      /* ignore */
    }
  }

  try {
    window.sessionStorage.setItem(BACKUP_KEY, json);
  } catch {
    /* ignore */
  }
  return true;
}

let diskTimer: ReturnType<typeof setTimeout> | null = null;

/** Write to disk file via API (survives computer restart). */
export function syncToDisk(data: AppData, immediate = false): void {
  if (!isBrowser()) return;
  if (isEffectivelyEmpty(data)) return;

  const send = () => {
    const body = JSON.stringify(data);
    try {
      if (immediate && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const ok = navigator.sendBeacon(
          "/api/data",
          new Blob([body], { type: "application/json" })
        );
        if (ok) return;
      }
    } catch {
      /* fall through */
    }
    void fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch((err) => console.warn("[ikigai] disk sync failed", err));
  };

  if (immediate) {
    if (diskTimer) clearTimeout(diskTimer);
    send();
    return;
  }

  if (diskTimer) clearTimeout(diskTimer);
  diskTimer = setTimeout(send, 200);
}

export async function fetchDiskData(): Promise<AppData | null> {
  if (!isBrowser()) return null;
  try {
    const res = await fetch("/api/data", {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Partial<AppData> };
    if (!json.data) return null;
    return normalizeAppData(json.data);
  } catch {
    return null;
  }
}

function applyVibeTrackMigration(data: AppData): AppData {
  if (!isBrowser()) return data;
  try {
    if (window.localStorage.getItem(VIBETRACK_MIGRATED_KEY) === "1") {
      return data;
    }
  } catch {
    return data;
  }

  const legacyQuotes = readLegacyVibeTrackQuotes();
  const legacyHabits = readLegacyVibeTrackHabits();
  if (legacyQuotes.length === 0 && Object.keys(legacyHabits).length === 0) {
    try {
      window.localStorage.setItem(VIBETRACK_MIGRATED_KEY, "1");
    } catch {
      /* ignore */
    }
    return data;
  }

  const next: AppData = {
    ...data,
    quotes: mergeQuotes(data.quotes, legacyQuotes),
    habits: { ...legacyHabits, ...data.habits },
  };

  try {
    window.localStorage.setItem(VIBETRACK_MIGRATED_KEY, "1");
  } catch {
    /* ignore */
  }
  saveAppDataLocal(next, { force: true });
  syncToDisk(next, true);
  return next;
}

/**
 * Load from disk (source of truth) + merge with browser cache.
 * Call once on app start before marking ready.
 */
export async function hydrateAppData(): Promise<AppData> {
  const local = applyVibeTrackMigration(loadAppDataLocal());
  const disk = await fetchDiskData();

  if (!disk || isEffectivelyEmpty(disk)) {
    if (!isEffectivelyEmpty(local)) {
      // Migrate browser data onto disk
      syncToDisk(local, true);
    }
    return local;
  }

  if (contentScore(disk) >= contentScore(local)) {
    const merged = applyVibeTrackMigration(disk);
    saveAppDataLocal(merged, { force: true });
    return merged;
  }

  // Browser has newer/richer content — push up to disk
  syncToDisk(local, true);
  return local;
}

export function saveAppData(
  data: AppData,
  opts: { force?: boolean; skipDisk?: boolean } = {}
): void {
  const wrote = saveAppDataLocal(data, opts);
  if (wrote && !opts.skipDisk && !isEffectivelyEmpty(data)) {
    syncToDisk(data);
  }
}

/** Immediate flush to browser + disk. */
export function flushAppData(data: AppData): void {
  if (isEffectivelyEmpty(data)) return;
  saveAppDataLocal(data);
  syncToDisk(data, true);
}

export function getMap(): PurposeMap | null {
  return loadAppDataLocal().map;
}

export function saveMap(map: PurposeMap): AppData {
  const data = loadAppDataLocal();
  data.map = normalizeMap({ ...map, updatedAt: new Date().toISOString() });
  saveAppData(data);
  return data;
}

export function getNotes(): Note[] {
  return loadAppDataLocal().notes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function saveNote(note: Note): AppData {
  const data = loadAppDataLocal();
  const normalized = normalizeNote(note);
  const idx = data.notes.findIndex((n) => n.id === normalized.id);
  if (idx === -1) data.notes.push(normalized);
  else data.notes[idx] = normalized;
  saveAppData(data);
  return data;
}

export function deleteNote(id: string): AppData {
  const data = loadAppDataLocal();
  data.notes = data.notes.filter((n) => n.id !== id);
  saveAppData(data);
  return data;
}

export function saveInsights(insights: InsightIdea[]): AppData {
  const data = loadAppDataLocal();
  data.insights = normalizeInsights(insights);
  saveAppData(data);
  return data;
}

export function saveTimeline(timeline: TimelineEvent[]): AppData {
  const data = loadAppDataLocal();
  const areas = normalizeTimelineAreas(data.timelineAreas);
  data.timelineAreas = areas;
  data.timeline = timeline.map((e, i) =>
    normalizeTimelineEvent(e, areas, i)
  );
  saveAppData(data);
  return data;
}

export function saveTimelineAreas(areas: TimelineAreaDef[]): AppData {
  const data = loadAppDataLocal();
  const nextAreas = normalizeTimelineAreas(areas);
  data.timelineAreas = nextAreas;
  // Remap events whose area was deleted → first area
  const ids = new Set(nextAreas.map((a) => a.id));
  const fallback = nextAreas[0]?.id ?? "other";
  data.timeline = (data.timeline ?? []).map((e, i) =>
    normalizeTimelineEvent(
      { ...e, areaId: ids.has(e.areaId) ? e.areaId : fallback },
      nextAreas,
      i
    )
  );
  saveAppData(data);
  return data;
}

export function saveQuotes(quotes: Quote[]): AppData {
  const data = loadAppDataLocal();
  data.quotes = normalizeQuotes(quotes);
  saveAppData(data);
  return data;
}

export function saveHabitsLog(habits: Record<string, DayHabits>): AppData {
  const data = loadAppDataLocal();
  data.habits = normalizeHabitsLog(habits);
  saveAppData(data);
  return data;
}

export function saveDayHabits(dateKey: string, day: DayHabits): AppData {
  const data = loadAppDataLocal();
  data.habits = {
    ...normalizeHabitsLog(data.habits),
    [dateKey]: normalizeDayHabits(day),
  };
  saveAppData(data);
  return data;
}

export function saveAiReflection(reflection: AiReflection | null): AppData {
  const data = loadAppDataLocal();
  data.aiReflection = reflection;
  saveAppData(data);
  return data;
}

export function exportMapMarkdown(): string {
  const { map, notes, insights, timeline } = loadAppDataLocal();
  const lines = [
    "# Ikigai 2.0",
    "",
    `_Exported ${new Date().toLocaleString()}_`,
    "",
  ];

  if (map) {
    lines.push("## What you love", "", map.want || "—", "");
    lines.push("## What you’re good at", "", map.goodAt || "—", "");
    lines.push("## What the world needs", "", map.need || "—", "");
    lines.push("## What you can be paid for", "", map.reward || "—", "");
    lines.push("## What I deliver", "", map.offer || "—", "");
    lines.push("## Values", "");
    if (!map.values?.length) lines.push("—", "");
    else {
      for (const v of map.values) lines.push(`- ${v}`);
      lines.push("");
    }
    lines.push("## Skills I have", "");
    if (map.skillsHave.length === 0) lines.push("—", "");
    else {
      for (const s of map.skillsHave) {
        lines.push(`- ${s.name}${s.note ? ` — ${s.note}` : ""}`);
      }
      lines.push("");
    }
    lines.push("## Skills I lack", "");
    if (map.skillsLack.length === 0) lines.push("—", "");
    else {
      for (const s of map.skillsLack) {
        lines.push(`- ${s.name}${s.note ? ` — ${s.note}` : ""}`);
      }
      lines.push("");
    }
    if (map.synthesis.trim()) {
      lines.push("## Synthesis", "", map.synthesis, "");
    }
  }

  if (insights.length > 0) {
    lines.push("## Insights", "");
    for (const idea of insights) {
      lines.push(`- [${idea.connectionId}] ${idea.text}`);
    }
    lines.push("");
  }

  if (notes.length > 0) {
    lines.push("## Notes", "");
    for (const n of notes) {
      const tagStr =
        n.tags.length > 0 ? ` · ${n.tags.map((t) => `#${t}`).join(" ")}` : "";
      lines.push(
        `### ${new Date(n.createdAt).toLocaleString()}${tagStr}`,
        "",
        n.content,
        ""
      );
    }
  }

  if ((timeline ?? []).length > 0) {
    const areas = loadAppDataLocal().timelineAreas;
    lines.push("## Timeline", "");
    for (const e of [...timeline].sort((a, b) => a.order - b.order)) {
      const label =
        areas.find((a) => a.id === e.areaId)?.label ?? e.areaId;
      const when = e.date ?? "date unknown";
      lines.push(
        `- ${when} · [${label}] ${e.title}${e.note ? ` — ${e.note}` : ""}`
      ); // date may be YYYY-MM or YYYY-MM-DD
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadMarkdown(filename = "ikigai.md"): void {
  if (!isBrowser()) return;
  const md = exportMapMarkdown();
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function resetAllData(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SNAPSHOT_KEY);
  window.localStorage.removeItem(LEGACY_KEY);
  try {
    window.sessionStorage.removeItem(BACKUP_KEY);
  } catch {
    /* ignore */
  }
  void fetch("/api/data", { method: "DELETE" }).catch(() => {});
}
