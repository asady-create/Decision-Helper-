import type {
  InsightConnectionId,
  InsightIdea,
  PurposeMap,
} from "./types";
import { nanoid } from "nanoid";
import { INTERSECTION_PROMPTS } from "./reflection-prompts";

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function clip(s: string, max = 100): string {
  const c = clean(s);
  if (c.length <= max) return c;
  return `${c.slice(0, max - 1).trim()}…`;
}

export interface InsightConnection {
  id: InsightConnectionId;
  label: string;
  formula: string;
  prompt: string;
  ready: (map: PurposeMap | null) => boolean;
  generate: (map: PurposeMap) => string[];
}

const promptById = Object.fromEntries(
  INTERSECTION_PROMPTS.map((p) => [p.id, p])
) as Record<InsightConnectionId, (typeof INTERSECTION_PROMPTS)[number]>;

export const INSIGHT_CONNECTIONS: InsightConnection[] = [
  {
    id: "passion",
    label: promptById.passion.label,
    formula: promptById.passion.formula,
    prompt: promptById.passion.prompt,
    ready: (m) => Boolean(m && clean(m.want) && clean(m.goodAt ?? "")),
    generate: (m) => {
      const love = clip(m.want);
      const skill = clip(m.goodAt ?? "");
      return [
        `Passion lane: bring “${skill}” to “${love}” without waiting for permission.`,
        `Double down where love and skill already overlap: ${love} × ${skill}.`,
      ];
    },
  },
  {
    id: "mission",
    label: promptById.mission.label,
    formula: promptById.mission.formula,
    prompt: promptById.mission.prompt,
    ready: (m) => Boolean(m && clean(m.want) && clean(m.need)),
    generate: (m) => {
      const love = clip(m.want);
      const need = clip(m.need);
      return [
        `Mission: aim “${love}” at “${need}”.`,
        `Purpose area: serve “${need}” through what you love — ${love}.`,
      ];
    },
  },
  {
    id: "profession",
    label: promptById.profession.label,
    formula: promptById.profession.formula,
    prompt: promptById.profession.prompt,
    ready: (m) => Boolean(m && clean(m.goodAt ?? "") && clean(m.reward)),
    generate: (m) => {
      const skill = clip(m.goodAt ?? "");
      const reward = clip(m.reward);
      return [
        `Profession: trade “${skill}” for “${reward}”.`,
        `Proven exchange: ${skill} → ${reward}.`,
      ];
    },
  },
  {
    id: "vocation",
    label: promptById.vocation.label,
    formula: promptById.vocation.formula,
    prompt: promptById.vocation.prompt,
    ready: (m) => Boolean(m && clean(m.need) && clean(m.reward)),
    generate: (m) => {
      const need = clip(m.need);
      const reward = clip(m.reward);
      return [
        `Vocation: meet “${need}” in a form that yields “${reward}”.`,
        `Useful and paid: solve “${need}” → receive “${reward}”.`,
      ];
    },
  },
  {
    id: "ikigai",
    label: promptById.ikigai.label,
    formula: promptById.ikigai.formula,
    prompt: promptById.ikigai.prompt,
    ready: (m) =>
      Boolean(
        m &&
          clean(m.want) &&
          clean(m.goodAt ?? "") &&
          clean(m.need) &&
          clean(m.reward)
      ),
    generate: (m) => {
      const offer = clean(m.offer);
      const core = offer
        ? `Center: deliver “${clip(offer)}”.`
        : `Center: love (${clip(m.want, 40)}) × skill (${clip(m.goodAt ?? "", 40)}) × need (${clip(m.need, 40)}) × reward (${clip(m.reward, 40)}).`;
      return [
        core,
        `Smallest honest ikigai this month: one action that touches all four circles.`,
      ];
    },
  },
];

const VALID_IDS = new Set<string>(INSIGHT_CONNECTIONS.map((c) => c.id));

/** Drop legacy / unknown connection ids from stored insights. */
export function normalizeInsights(raw: InsightIdea[] | undefined): InsightIdea[] {
  if (!raw) return [];
  return raw.filter((i) => VALID_IDS.has(i.connectionId));
}

export function generateInsightIdeas(
  map: PurposeMap | null,
  maxIdeas = 5
): InsightIdea[] {
  if (!map) return [];
  const now = new Date().toISOString();
  const ideas: InsightIdea[] = [];

  for (const conn of INSIGHT_CONNECTIONS) {
    if (ideas.length >= maxIdeas) break;
    if (!conn.ready(map)) continue;
    for (const text of conn.generate(map)) {
      if (ideas.length >= maxIdeas) break;
      ideas.push({
        id: nanoid(10),
        connectionId: conn.id,
        text,
        source: "auto",
        createdAt: now,
      });
    }
  }

  return ideas.slice(0, maxIdeas);
}

export function mergeAutoInsights(
  existing: InsightIdea[],
  generated: InsightIdea[]
): InsightIdea[] {
  const manual = existing.filter((i) => i.source === "manual");
  return [...generated, ...manual];
}
