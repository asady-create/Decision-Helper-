import type { PurposeMap, Skill } from "./types";

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function skillNames(skills: Skill[]): string {
  return skills
    .map((s) => s.name.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Build a plain, precise synthesis from the purpose map.
 */
export function generateSynthesis(map: PurposeMap): string {
  const parts: string[] = [];

  const want = clean(map.want);
  const goodAt = clean(map.goodAt);
  const need = clean(map.need);
  const reward = clean(map.reward);
  const offer = clean(map.offer);
  const have = skillNames(map.skillsHave);
  const lack = skillNames(map.skillsLack);

  if (want) parts.push(`I love / want: ${want}.`);
  if (goodAt) parts.push(`I’m good at: ${goodAt}.`);
  if (need) parts.push(`The world needs: ${need}.`);
  if (reward) parts.push(`I can be rewarded by: ${reward}.`);
  if (offer) parts.push(`I will deliver: ${offer}.`);
  if (have) parts.push(`Skills I have: ${have}.`);
  if (lack) parts.push(`Skills I still need: ${lack}.`);
  if (map.values.length > 0) {
    parts.push(`Values: ${map.values.join(", ")}.`);
  }

  if (parts.length === 0) return "";
  return parts.join(" ");
}

/** Section fill status for the overview. */
export function mapProgress(map: PurposeMap | null): {
  want: boolean;
  goodAt: boolean;
  need: boolean;
  reward: boolean;
  offer: boolean;
  values: boolean;
  skillsHave: boolean;
  skillsLack: boolean;
  filled: number;
  total: number;
} {
  const empty = {
    want: false,
    goodAt: false,
    need: false,
    reward: false,
    offer: false,
    values: false,
    skillsHave: false,
    skillsLack: false,
    filled: 0,
    total: 8,
  };
  if (!map) return empty;

  const want = Boolean(clean(map.want));
  const goodAt = Boolean(clean(map.goodAt ?? ""));
  const need = Boolean(clean(map.need));
  const reward = Boolean(clean(map.reward));
  const offer = Boolean(clean(map.offer));
  const values = (map.values ?? []).some((v) => v.trim());
  const skillsHave = map.skillsHave.some((s) => s.name.trim());
  const skillsLack = map.skillsLack.some((s) => s.name.trim());
  const flags = {
    want,
    goodAt,
    need,
    reward,
    offer,
    values,
    skillsHave,
    skillsLack,
  };
  const filled = Object.values(flags).filter(Boolean).length;

  return { ...flags, filled, total: 8 };
}

export function createEmptyMap(): PurposeMap {
  return {
    want: "",
    goodAt: "",
    reward: "",
    offer: "",
    need: "",
    skillsHave: [],
    skillsLack: [],
    values: [],
    synthesis: "",
    updatedAt: new Date().toISOString(),
  };
}

/** Normalize older maps missing fields. */
export function normalizeMap(raw: Partial<PurposeMap> | null): PurposeMap {
  const base = createEmptyMap();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    goodAt: raw.goodAt ?? "",
    skillsHave: raw.skillsHave ?? [],
    skillsLack: raw.skillsLack ?? [],
    values: raw.values ?? [],
  };
}
