import type { TimelineAreaDef, TimelineEvent } from "./types";

export const TIMELINE_START = { year: 2025, month: 1 }; // January 2025

/** Seed areas — users can rename, recolor, add, or remove. */
export const DEFAULT_TIMELINE_AREAS: TimelineAreaDef[] = [
  { id: "love", label: "Love / want", color: "#0d5c63" },
  { id: "goodAt", label: "Good at", color: "#256378" },
  { id: "need", label: "World needs", color: "#475569" },
  { id: "reward", label: "Paid for", color: "#0f766e" },
  { id: "offer", label: "Deliver", color: "#b45309" },
  { id: "skills", label: "Skills", color: "#7c3aed" },
  { id: "values", label: "Values", color: "#be123c" },
  { id: "other", label: "Other", color: "#78716c" },
];

export const AREA_COLOR_PRESETS = [
  "#0d5c63",
  "#256378",
  "#475569",
  "#0f766e",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#78716c",
  "#0369a1",
  "#15803d",
  "#a16207",
  "#c2410c",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DATE_FULL = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MONTH = /^\d{4}-\d{2}$/;

export function normalizeTimelineAreas(
  raw: Partial<TimelineAreaDef>[] | undefined | null
): TimelineAreaDef[] {
  if (!raw || raw.length === 0) {
    return DEFAULT_TIMELINE_AREAS.map((a) => ({ ...a }));
  }
  const cleaned = raw
    .filter((a) => a && a.id)
    .map((a) => ({
      id: String(a.id),
      label: (a.label ?? "Untitled").trim() || "Untitled",
      color: a.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(a.color)
        ? a.color
        : "#78716c",
    }));
  return cleaned.length > 0
    ? cleaned
    : DEFAULT_TIMELINE_AREAS.map((a) => ({ ...a }));
}

/** Normalize stored date to YYYY-MM-DD, YYYY-MM, or null. */
export function normalizeEventDate(
  raw: string | null | undefined
): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const s = raw.trim();
  if (DATE_FULL.test(s)) {
    const { year, month, day } = parseISODate(s);
    return toISODate(year, month, day);
  }
  if (DATE_MONTH.test(s)) {
    const { year, month } = parseISODate(`${s}-01`);
    return toMonthDate(year, month);
  }
  return null;
}

export function normalizeTimelineEvent(
  raw: Partial<TimelineEvent> & { id: string } & { area?: string },
  areas: TimelineAreaDef[],
  orderFallback = 0
): TimelineEvent {
  const areaIds = new Set(areas.map((a) => a.id));
  const legacy = (raw as { area?: string }).area;
  let areaId = raw.areaId || legacy || "other";
  if (!areaIds.has(areaId)) {
    areaId = areas[0]?.id ?? "other";
  }
  const order =
    typeof raw.order === "number" && Number.isFinite(raw.order)
      ? raw.order
      : orderFallback;
  return {
    id: raw.id,
    date: normalizeEventDate(raw.date),
    title: raw.title ?? "",
    areaId,
    note: raw.note ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    order,
  };
}

export function findArea(
  areas: TimelineAreaDef[],
  areaId: string
): TimelineAreaDef {
  return (
    areas.find((a) => a.id === areaId) ?? {
      id: areaId,
      label: "Unknown",
      color: "#78716c",
    }
  );
}

export type DatePrecision = "none" | "month" | "day";

export function datePrecision(iso: string | null | undefined): DatePrecision {
  if (!iso) return "none";
  if (DATE_FULL.test(iso)) return "day";
  if (DATE_MONTH.test(iso)) return "month";
  return "none";
}

/** Parse YYYY-MM or YYYY-MM-DD into parts (local-safe). */
export function parseISODate(iso: string): {
  year: number;
  month: number;
  day: number;
} {
  const [y, m, d] = (iso || "").split("-").map(Number);
  return {
    year: y || TIMELINE_START.year,
    month: m || 1,
    day: d || 1,
  };
}

export function toISODate(year: number, month: number, day: number): string {
  const dim = daysInMonth(year, month);
  const safeDay = Math.min(Math.max(1, day), dim);
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function toMonthDate(year: number, month: number): string {
  const m = Math.min(Math.max(1, month), 12);
  return `${year}-${String(m).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Clear human date — supports day, month-only, or unknown. */
export function formatDisplayDate(iso: string | null | undefined): string {
  const precision = datePrecision(iso);
  if (precision === "none" || !iso) return "Date unknown";
  const { year, month, day } = parseISODate(
    precision === "month" ? `${iso}-01` : iso
  );
  if (precision === "month") return `${MONTH_NAMES[month - 1]} ${year}`;
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/** Shorter label for list rows. */
export function formatShortDate(iso: string | null | undefined): string {
  const precision = datePrecision(iso);
  if (precision === "none" || !iso) return "Date unknown";
  const { year, month, day } = parseISODate(
    precision === "month" ? `${iso}-01` : iso
  );
  const short = MONTH_NAMES[month - 1].slice(0, 3);
  if (precision === "month") return `${short} ${year}`;
  return `${day} ${short} ${year}`;
}

export function monthOptions() {
  return MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name }));
}

export function yearOptions(from = TIMELINE_START.year, ahead = 3): number[] {
  const now = new Date().getFullYear();
  const end = Math.max(now + ahead, from);
  const years: number[] = [];
  for (let y = from; y <= end; y++) years.push(y);
  return years;
}

/** Months from Jan 2025 through current month (+ optional buffer ahead). */
export function buildMonthSpine(bufferMonths = 2): {
  key: string;
  year: number;
  month: number;
  label: string;
}[] {
  const start = new Date(TIMELINE_START.year, TIMELINE_START.month - 1, 1);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + bufferMonths, 1);
  const months: {
    key: string;
    year: number;
    month: number;
    label: string;
  }[] = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    months.push({
      key: `${year}-${String(month).padStart(2, "0")}`,
      year,
      month,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export function monthKeyFromDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "unknown";
  return isoDate.slice(0, 7);
}

/** Sort by manual order on the arrow (then date / created). */
export function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.date && b.date) {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
    } else if (a.date && !b.date) return -1;
    else if (!a.date && b.date) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/**
 * Assign order 0..n-1 from the current array positions.
 * Important: do NOT sort here — callers pass the desired visual order.
 * (Sorting by the old `order` field would undo swaps.)
 */
export function reindexOrders(events: TimelineEvent[]): TimelineEvent[] {
  return events.map((e, i) => ({ ...e, order: i }));
}

export function moveEventOrder(
  events: TimelineEvent[],
  id: string,
  direction: -1 | 1
): TimelineEvent[] {
  const sorted = sortTimeline(events);
  const index = sorted.findIndex((e) => e.id === id);
  if (index < 0) return events;
  const target = index + direction;
  if (target < 0 || target >= sorted.length) return events;
  const next = [...sorted];
  const tmp = next[index];
  next[index] = next[target];
  next[target] = tmp;
  return reindexOrders(next);
}

/**
 * Apply a new order of a subset (e.g. filtered list) back onto the full
 * timeline, preserving relative positions of untouched events.
 */
export function applySubsetOrder(
  all: TimelineEvent[],
  orderedSubset: TimelineEvent[]
): TimelineEvent[] {
  return applySubsetOrderByIds(
    all,
    orderedSubset.map((e) => e.id)
  );
}

/** Same as applySubsetOrder, but takes ids (stable for drag-and-drop). */
export function applySubsetOrderByIds(
  all: TimelineEvent[],
  orderedIds: string[]
): TimelineEvent[] {
  const sorted = sortTimeline(all);
  const byId = new Map(sorted.map((e) => [e.id, e]));
  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((e): e is TimelineEvent => Boolean(e));
  const idSet = new Set(ordered.map((e) => e.id));
  let i = 0;
  const merged = sorted.map((e) => (idSet.has(e.id) ? ordered[i++]! : e));
  return reindexOrders(merged);
}
