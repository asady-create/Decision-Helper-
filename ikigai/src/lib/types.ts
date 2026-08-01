/**
 * Ikigai 2.0 — personal purpose map.
 */

export interface Skill {
  id: string;
  name: string;
  /** Optional one-line context. */
  note: string;
}

export interface PurposeMap {
  /** What you love / what you want. */
  want: string;
  /** What you’re good at (reflection). */
  goodAt: string;
  /** What the world needs / who needs it. */
  need: string;
  /** What you can be paid for / how you’re rewarded. */
  reward: string;
  /** What you will deliver (center / offer). */
  offer: string;
  skillsHave: Skill[];
  skillsLack: Skill[];
  /** Non-negotiable values that guide choices. */
  values: string[];
  /** Plain synthesis of the above. Editable. */
  synthesis: string;
  updatedAt: string;
}

/** Map-linked tags for notes. */
export const NOTE_TAGS = [
  "Want",
  "Offer",
  "Need",
  "Reward",
  "Have",
  "Gap",
  "Idea",
  "Value",
] as const;

export type NoteTag = (typeof NOTE_TAGS)[number];

export interface Note {
  id: string;
  content: string;
  tags: NoteTag[];
  createdAt: string;
  updatedAt: string;
}

/** Classic ikigai intersections for Insights. */
export type InsightConnectionId =
  | "passion"
  | "mission"
  | "profession"
  | "vocation"
  | "ikigai";

export interface InsightIdea {
  id: string;
  connectionId: InsightConnectionId;
  text: string;
  source: "auto" | "manual";
  createdAt: string;
}

/** User-defined (or default) timeline area with a color. */
export interface TimelineAreaDef {
  id: string;
  label: string;
  color: string;
}

export interface TimelineEvent {
  id: string;
  /**
   * Partial or full date, or null when unknown:
   * - `YYYY-MM-DD` — exact day
   * - `YYYY-MM` — month + year only (day unknown)
   * - `null` — no date
   */
  date: string | null;
  title: string;
  /** References TimelineAreaDef.id */
  areaId: string;
  note: string;
  createdAt: string;
  /** Manual position on the arrow (lower = higher / earlier) */
  order: number;
}

/** VibeTrack quote library entry. */
export interface Quote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export type HabitId =
  | "gym"
  | "running"
  | "cycling"
  | "swimming"
  | "squash"
  | "meditation"
  | "reading"
  | "learning"
  | "investing"
  | "praying";

export interface DayHabits {
  checks: Record<HabitId, boolean>;
  readingBooks: string;
}

export interface AppData {
  map: PurposeMap | null;
  notes: Note[];
  insights: InsightIdea[];
  timeline: TimelineEvent[];
  timelineAreas: TimelineAreaDef[];
  /** Quote library from VibeTrack Daily. */
  quotes: Quote[];
  /** Habit checks keyed by YYYY-MM-DD. */
  habits: Record<string, DayHabits>;
}
