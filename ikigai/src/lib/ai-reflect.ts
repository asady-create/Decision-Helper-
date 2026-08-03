import { nanoid } from "nanoid";
import type {
  AiReflection,
  AppData,
  IkigaiPursuit,
  InsightConnectionId,
  PurposeMap,
} from "./types";

function clean(s: string | undefined | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function clip(s: string, max = 120): string {
  const c = clean(s);
  if (c.length <= max) return c;
  return `${c.slice(0, max - 1).trim()}…`;
}

export function buildReflectionContext(data: AppData): string {
  const map = data.map;
  const lines: string[] = [];
  lines.push("Ikigai purpose map inputs:");
  if (!map) {
    lines.push("- (map is empty)");
  } else {
    lines.push(`- Love / want: ${clean(map.want) || "(empty)"}`);
    lines.push(`- Good at: ${clean(map.goodAt) || "(empty)"}`);
    lines.push(`- World needs: ${clean(map.need) || "(empty)"}`);
    lines.push(`- Reward / paid for: ${clean(map.reward) || "(empty)"}`);
    lines.push(`- What I deliver / offer: ${clean(map.offer) || "(empty)"}`);
    lines.push(
      `- Values: ${(map.values ?? []).filter((v) => v.trim()).join("; ") || "(empty)"}`
    );
    lines.push(
      `- Skills I have: ${
        (map.skillsHave ?? [])
          .map((s) =>
            s?.note ? `${clean(s.name)} (${clean(s.note)})` : clean(s?.name)
          )
          .filter((s) => s.trim())
          .join("; ") || "(empty)"
      }`
    );
    lines.push(
      `- Skills I lack: ${
        (map.skillsLack ?? [])
          .map((s) =>
            s?.note ? `${clean(s.name)} (${clean(s.note)})` : clean(s?.name)
          )
          .filter((s) => s.trim())
          .join("; ") || "(empty)"
      }`
    );
    if (clean(map.synthesis)) lines.push(`- Synthesis: ${clean(map.synthesis)}`);
  }

  const notes = (data.notes ?? [])
    .filter((n) => n && clean(n.content))
    .slice(0, 8)
    .map((n) => {
      const tags = Array.isArray(n.tags) ? n.tags.filter(Boolean) : [];
      return `- ${clip(n.content, 180)}${tags.length ? ` [${tags.join(", ")}]` : ""}`;
    });
  lines.push("Recent notes:");
  lines.push(...(notes.length ? notes : ["- (none)"]));

  const insights = (data.insights ?? [])
    .filter((i) => i && clean(i.text))
    .slice(0, 6)
    .map((i) => `- [${i.connectionId || "insight"}] ${clip(i.text, 140)}`);
  lines.push("Saved insights:");
  lines.push(...(insights.length ? insights : ["- (none)"]));

  const quotes = (data.quotes ?? [])
    .filter((q) => q && clean(q.text))
    .slice(0, 5)
    .map(
      (q) =>
        `- “${clip(q.text, 120)}”${q.author ? ` — ${clean(q.author)}` : ""}`
    );
  if (quotes.length) {
    lines.push("Quotes they keep:");
    lines.push(...quotes);
  }

  return lines.join("\n");
}

export const REFLECT_SYSTEM_PROMPT = `You are a calm Ikigai reflection guide.
Help the user contemplate possible life directions from their own words.
Do NOT give weekly experiments, task lists, hustle advice, or productivity coaching.
Speak as contemplative assistance: mirror, name possible pursuits, explain why using their inputs, and ask reflective questions.
Return ONLY valid JSON matching this schema:
{
  "mirror": string,
  "pursuits": [
    {
      "title": string,
      "summary": string,
      "why": string[],
      "intersections": ("passion"|"mission"|"profession"|"vocation"|"ikigai")[],
      "questions": string[]
    }
  ],
  "tensions": string[]
}
Rules:
- 3 to 5 pursuits maximum.
- Each why item must clearly reference something they wrote.
- Each pursuit needs 2-3 contemplation questions.
- tensions: 2-4 honest unresolved edges to sit with.
- No markdown. No weekly plan.`;

/**
 * Full copy-paste prompt for the user to run in ChatGPT / Claude / Gemini / etc.
 * Keeps Ikigai private to their chosen AI — no API key needed in this app.
 */
export function buildOutsourcedReflectPrompt(data: AppData): string {
  const context = buildReflectionContext(data);
  return `${REFLECT_SYSTEM_PROMPT}

---

Here are my Ikigai inputs. Reflect on them and return ONLY the JSON object described above:

${context}`;
}

/** Pull a JSON object out of raw model text (plain or fenced). */
export function extractJsonObject(raw: string): unknown {
  const text = (raw ?? "").trim();
  if (!text) throw new Error("Paste is empty");

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence?.[1] ?? text).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error(
      "Could not find JSON in the paste. Ask your AI to reply with only the JSON object."
    );
  }
}

export function parseOutsourcedAiReply(raw: string): AiReflection {
  return parseAiReflection(extractJsonObject(raw), "outsourced");
}

type RawPursuit = {
  title?: string;
  summary?: string;
  why?: string[];
  intersections?: string[];
  questions?: string[];
};

type RawReflection = {
  mirror?: string;
  pursuits?: RawPursuit[];
  tensions?: string[];
};

const VALID_INTERSECTIONS = new Set<InsightConnectionId>([
  "passion",
  "mission",
  "profession",
  "vocation",
  "ikigai",
]);

export function parseAiReflection(
  raw: unknown,
  source: AiReflection["source"]
): AiReflection {
  const data = (raw ?? {}) as RawReflection;
  const pursuits: IkigaiPursuit[] = (data.pursuits ?? [])
    .slice(0, 5)
    .map((p) => ({
      id: nanoid(10),
      title: clean(p.title) || "Untitled direction",
      summary: clean(p.summary) || "",
      why: (p.why ?? []).map(clean).filter(Boolean).slice(0, 4),
      intersections: (p.intersections ?? [])
        .map((x) => x as InsightConnectionId)
        .filter((x) => VALID_INTERSECTIONS.has(x))
        .slice(0, 3),
      questions: (p.questions ?? []).map(clean).filter(Boolean).slice(0, 3),
    }))
    .filter((p) => p.title && p.summary);

  return {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    mirror:
      clean(data.mirror) ||
      "Your map is still forming. Sit with what is already true before forcing a destination.",
    pursuits,
    tensions: (data.tensions ?? []).map(clean).filter(Boolean).slice(0, 4),
    source,
  };
}

function hasText(map: PurposeMap | null, key: keyof PurposeMap): boolean {
  if (!map) return false;
  const v = map[key];
  if (typeof v === "string") return Boolean(clean(v));
  return false;
}

/**
 * Local contemplative engine — works without an API key.
 * Grounds suggestions in the user’s actual map text.
 */
export function buildLocalReflection(data: AppData): AiReflection {
  const map = data.map;
  const want = clean(map?.want);
  const goodAt = clean(map?.goodAt);
  const need = clean(map?.need);
  const reward = clean(map?.reward);
  const offer = clean(map?.offer);
  const values = (map?.values ?? []).map(clean).filter(Boolean);
  const have = (map?.skillsHave ?? [])
    .map((s) => clean(s.name))
    .filter(Boolean);
  const lack = (map?.skillsLack ?? [])
    .map((s) => clean(s.name))
    .filter(Boolean);
  const noteBits = (data.notes ?? [])
    .map((n) => clean(n.content))
    .filter(Boolean)
    .slice(0, 3);

  const pursuits: IkigaiPursuit[] = [];

  if (want && goodAt) {
    pursuits.push({
      id: nanoid(10),
      title: `Craft at the edge of love and skill`,
      summary: `A path where “${clip(want, 60)}” is expressed through “${clip(goodAt, 60)}” — not as a job title first, but as a way of being useful that feels alive.`,
      why: [
        `You named love/want as: ${clip(want)}.`,
        `You named what you’re good at as: ${clip(goodAt)}.`,
        ...(have[0] ? [`You already carry the skill “${have[0]}”.`] : []),
      ],
      intersections: ["passion", "ikigai"],
      questions: [
        `When you imagine bringing “${clip(goodAt, 40)}” to “${clip(want, 40)}”, what feels nourishing rather than performative?`,
        `Where have you already done a small version of this without calling it your purpose?`,
        `What would you protect about this direction even if nobody paid you yet?`,
      ],
    });
  }

  if (want && need) {
    pursuits.push({
      id: nanoid(10),
      title: `Service shaped by what you love`,
      summary: `A mission-shaped direction: letting “${clip(want, 50)}” meet “${clip(need, 50)}”, so purpose is relational — something offered into a real need.`,
      why: [
        `You wrote that you love/want: ${clip(want)}.`,
        `You sense the world needs: ${clip(need)}.`,
        ...(values[0] ? [`Your value “${values[0]}” may be the compass between them.`] : []),
      ],
      intersections: ["mission", "ikigai"],
      questions: [
        `Whose specific life gets quieter or freer if your love meets that need?`,
        `What part of “${clip(need, 40)}” touches you personally, not just intellectually?`,
        `If you could only help one narrow corner of that need, which corner feels honest?`,
      ],
    });
  }

  if (goodAt && reward) {
    pursuits.push({
      id: nanoid(10),
      title: `Sustainable craft exchange`,
      summary: `A profession-shaped path where “${clip(goodAt, 50)}” can be received as “${clip(reward, 50)}” — worth contemplating how livelihood can support, not devour, meaning.`,
      why: [
        `You said you’re good at: ${clip(goodAt)}.`,
        `You can imagine being rewarded by: ${clip(reward)}.`,
        ...(offer ? [`You already sketch an offer: ${clip(offer)}.`] : []),
      ],
      intersections: ["profession"],
      questions: [
        `What form of “${clip(reward, 40)}” would still let you respect your energy?`,
        `Where does skill become commodity, and where does it stay gift?`,
        `What standard of enoughness would keep this path from becoming only income?`,
      ],
    });
  }

  if (need && reward) {
    pursuits.push({
      id: nanoid(10),
      title: `Vocation at the need–reward crossing`,
      summary: `A vocation-shaped contemplation: serving “${clip(need, 50)}” in a way that can also be sustained through “${clip(reward, 50)}”.`,
      why: [
        `World need: ${clip(need)}.`,
        `Possible reward: ${clip(reward)}.`,
        ...(lack[0]
          ? [`You named a growth edge — “${lack[0]}” — which often sits on this path.`]
          : []),
      ],
      intersections: ["vocation"],
      questions: [
        `What would “serving and sustaining” look like without burning out the servant?`,
        `Which part of the need are you uniquely positioned to witness?`,
        `What must remain non-negotiable if this becomes livelihood?`,
      ],
    });
  }

  if (offer) {
    pursuits.push({
      id: nanoid(10),
      title: `Deepen what you already say you deliver`,
      summary: `Your center statement — “${clip(offer, 80)}” — may already be pointing at Ikigai. Contemplation here means refining the offer until it feels inevitable.`,
      why: [
        `You wrote your deliverable/offer as: ${clip(offer)}.`,
        ...(want ? [`It sits near love/want: ${clip(want)}.`] : []),
        ...(need ? [`It faces a need: ${clip(need)}.`] : []),
      ],
      intersections: ["ikigai"],
      questions: [
        `If this offer were a sentence you could stand behind for a decade, what would you change?`,
        `Who is the first real person this offer is for?`,
        `What disappears from your life if you stop delivering this?`,
      ],
    });
  }

  if (goodAt && need && !want) {
    pursuits.push({
      id: nanoid(10),
      title: `Skill offered into a real need`,
      summary: `Even before love/want is fully named, “${clip(goodAt, 50)}” meeting “${clip(need, 50)}” is already a serious contemplative path — vocation often appears here first.`,
      why: [
        `You said you’re good at: ${clip(goodAt)}.`,
        `You sense the world needs: ${clip(need)}.`,
        ...(have[0] ? [`A concrete skill you hold: “${have[0]}”.`] : []),
        ...(values[0] ? [`Value under it: “${values[0]}”.`] : []),
      ],
      intersections: ["vocation", "mission"],
      questions: [
        `When you use “${clip(goodAt, 40)}” for “${clip(need, 40)}”, what feels like duty and what feels like belonging?`,
        `Whose specific face comes to mind when you read that need?`,
        `What would you refuse to commercialize even if this path grew?`,
      ],
    });
  }

  if (have.length >= 2 && need) {
    pursuits.push({
      id: nanoid(10),
      title: `Weave the skills you already name`,
      summary: `Your skill list (${have.slice(0, 3).map((h) => `“${h}”`).join(", ")}${have.length > 3 ? "…" : ""}) already sketches a unique offer into “${clip(need, 50)}”. Contemplation: which combination is irreducibly yours?`,
      why: [
        `Skills you wrote: ${have.slice(0, 4).join("; ")}.`,
        `Need you wrote: ${clip(need)}.`,
        ...(values.length
          ? [`Values that may select among them: ${values.slice(0, 3).join(", ")}.`]
          : []),
      ],
      intersections: ["profession", "ikigai"],
      questions: [
        `If you could keep only two skills in service of that need, which two feel honest?`,
        `Where have strangers already benefited from this combination without a title?`,
        `What skill gap (${lack[0] ? `“${lack[0]}”` : "still unnamed"}) is actually optional vs essential?`,
      ],
    });
  }

  if (pursuits.length === 0) {
    pursuits.push({
      id: nanoid(10),
      title: `Begin with honest noticing`,
      summary:
        "Your map still has empty rooms. Before choosing a pursuit, contemplate which quadrant feels warmest when you sit with it — love, skill, need, or reward.",
      why: [
        "Several core map fields are still empty, so any strong claim about your Ikigai would be guesswork.",
        ...(noteBits[0]
          ? [`Your notes already hold a thread: ${clip(noteBits[0])}.`]
          : ["Even a short note under Want or Need can open the first door."]),
      ],
      intersections: ["ikigai"],
      questions: [
        "Which empty field feels least scary to fill honestly today?",
        "What have you repeatedly done for others without calling it purpose?",
        "What do you defend when nobody is watching?",
      ],
    });
  }

  const tensions: string[] = [];
  if (want && reward && want !== reward) {
    tensions.push(
      `Sit with the gap between what you love (“${clip(want, 50)}”) and how you imagine being rewarded (“${clip(reward, 50)}”).`
    );
  }
  if (have.length && lack.length) {
    tensions.push(
      `You hold “${have[0]}” while still reaching for “${lack[0]}” — which edge is identity, and which is aspiration?`
    );
  }
  if (need && !want) {
    tensions.push(
      "You can see a world need, but love/want is quieter. Contemplation: service without affection can become duty."
    );
  }
  if (want && !need) {
    tensions.push(
      "Love is clear, but the world’s need is not yet named. Contemplation: who specifically benefits if your love matures?"
    );
  }
  if (tensions.length === 0) {
    tensions.push(
      "Notice where your answers sound impressive versus where they feel quietly true."
    );
    tensions.push(
      "Ikigai is often found in what you already return to, not only in what you aspire to become."
    );
  }

  const filled = [want, goodAt, need, reward, offer].filter(Boolean).length;
  const mirror =
    filled >= 3
      ? `Across your map, a pattern is forming around ${[
          want && "what you love",
          goodAt && "what you can do",
          need && "what others need",
          reward && "how life might sustain you",
          offer && "what you say you deliver",
        ]
          .filter(Boolean)
          .slice(0, 3)
          .join(", ")}. These pursuits are invitations to contemplate — not conclusions.`
      : goodAt && need
        ? `Even with some fields still quiet, your map already points toward skill meeting need — “${clip(goodAt, 40)}” and “${clip(need, 40)}”. Sit with the pursuits below before forcing a complete picture.`
        : `Your Ikigai picture is still emerging. Use the reflections below as mirrors, not verdicts. Fill more of the map when something feels true, then return here.`;

  return {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    mirror,
    pursuits: pursuits.slice(0, 4),
    tensions: tensions.slice(0, 4),
    source: "local",
  };
}

export function mapReadyForReflection(data: AppData): {
  ready: boolean;
  filled: number;
  hint: string;
} {
  const map = data.map;
  const flags = [
    hasText(map, "want"),
    hasText(map, "goodAt"),
    hasText(map, "need"),
    hasText(map, "reward"),
    hasText(map, "offer"),
  ];
  const filled = flags.filter(Boolean).length;
  return {
    ready: filled >= 2 || (data.notes?.length ?? 0) > 0,
    filled,
    hint:
      filled >= 2
        ? "Enough of your map is filled to begin a thoughtful reflection."
        : "Add at least two map fields (or a note) so reflection has something true to stand on.",
  };
}
