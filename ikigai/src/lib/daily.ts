import type { DayHabits, HabitId, Quote } from "./types";

export type HabitCategory = "body" | "mind" | "soul";

export const HABIT_CATEGORIES = [
  { id: "body", label: "Body" },
  { id: "mind", label: "Mind" },
  { id: "soul", label: "Soul" },
] as const satisfies ReadonlyArray<{ id: HabitCategory; label: string }>;

export const HABITS = [
  { id: "gym", label: "Gym", category: "body" },
  { id: "running", label: "Running", category: "body" },
  { id: "cycling", label: "Cycling", category: "body" },
  { id: "swimming", label: "Swimming", category: "body" },
  { id: "squash", label: "Squash", category: "body" },
  { id: "reading", label: "Reading", category: "mind" },
  { id: "learning", label: "Learning", category: "mind" },
  { id: "investing", label: "Investing", category: "mind" },
  { id: "meditation", label: "Meditation", category: "soul" },
  { id: "praying", label: "Praying", category: "soul" },
] as const satisfies ReadonlyArray<{
  id: HabitId;
  label: string;
  category: HabitCategory;
}>;

export function habitsInCategory(category: HabitCategory) {
  return HABITS.filter((habit) => habit.category === category);
}

export const SEED_QUOTES: Quote[] = [
  {
    id: "seed-1",
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "seed-2",
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "seed-3",
    text: "Small disciplines repeated with consistency every day lead to great achievements.",
    author: "John C. Maxwell",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export function emptyChecks(): Record<HabitId, boolean> {
  return {
    gym: false,
    running: false,
    cycling: false,
    swimming: false,
    squash: false,
    meditation: false,
    reading: false,
    learning: false,
    investing: false,
    praying: false,
  };
}

export function emptyDayHabits(): DayHabits {
  return {
    checks: emptyChecks(),
    readingBooks: "",
  };
}

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isQuote(value: unknown): value is Quote {
  if (!value || typeof value !== "object") return false;
  const quote = value as Record<string, unknown>;
  return (
    typeof quote.id === "string" &&
    typeof quote.text === "string" &&
    typeof quote.author === "string" &&
    typeof quote.createdAt === "string"
  );
}

export function normalizeQuotes(raw: unknown): Quote[] {
  if (!Array.isArray(raw)) return SEED_QUOTES.map((q) => ({ ...q }));
  const quotes = raw.filter(isQuote).map((q) => ({
    id: q.id,
    text: q.text,
    author: q.author.trim() || "Anonymous",
    createdAt: q.createdAt,
  }));
  return quotes.length > 0 ? quotes : SEED_QUOTES.map((q) => ({ ...q }));
}

export function normalizeDayHabits(raw: unknown): DayHabits {
  const base = emptyDayHabits();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Record<string, unknown>;

  if ("checks" in value && value.checks && typeof value.checks === "object") {
    return {
      checks: {
        ...base.checks,
        ...(value.checks as Partial<Record<HabitId, boolean>>),
      },
      readingBooks:
        typeof value.readingBooks === "string" ? value.readingBooks : "",
    };
  }

  const checks = { ...base.checks };
  for (const habit of HABITS) {
    if (typeof value[habit.id] === "boolean") {
      checks[habit.id] = value[habit.id] as boolean;
    }
  }
  return {
    checks,
    readingBooks:
      typeof value.readingBooks === "string" ? value.readingBooks : "",
  };
}

export function normalizeHabitsLog(
  raw: unknown
): Record<string, DayHabits> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, DayHabits> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    out[key] = normalizeDayHabits(value);
  }
  return out;
}

export function quoteOfTheDay(quotes: Quote[], dateKey: string): Quote | null {
  if (quotes.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return quotes[hash % quotes.length] ?? null;
}

export function filterQuotes(quotes: Quote[], query: string): Quote[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return quotes;
  return quotes.filter((quote) =>
    `${quote.text} ${quote.author}`.toLowerCase().includes(needle)
  );
}

export type QuoteGroup = { author: string; quotes: Quote[] };

export function groupQuotesByAuthor(quotes: Quote[]): QuoteGroup[] {
  const groups = new Map<string, Quote[]>();
  for (const quote of quotes) {
    const key = quote.author.trim() || "Anonymous";
    const bucket = groups.get(key);
    if (bucket) bucket.push(quote);
    else groups.set(key, [quote]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([author, grouped]) => ({ author, quotes: grouped }));
}

export function mergeQuotes(current: Quote[], incoming: Quote[]): Quote[] {
  const byId = new Map<string, Quote>();
  for (const quote of [...incoming, ...current]) {
    byId.set(quote.id, quote);
  }
  return [...byId.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

/** One-time pull from standalone VibeTrack localStorage. */
export function readLegacyVibeTrackQuotes(): Quote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("vibetrack:quotes");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter(isQuote);
    if (parsed && typeof parsed === "object") {
      const quotes = (parsed as { quotes?: unknown }).quotes;
      if (Array.isArray(quotes)) return quotes.filter(isQuote);
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function readLegacyVibeTrackHabits(): Record<string, DayHabits> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("vibetrack:habits");
    if (!raw) return {};
    return normalizeHabitsLog(JSON.parse(raw));
  } catch {
    return {};
  }
}
