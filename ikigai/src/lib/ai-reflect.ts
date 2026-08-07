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

export const REFLECT_SYSTEM_PROMPT = `You are a calm, practical Ikigai reflection guide.
Help the user see realistic life directions from their own words.
Be accurate, realistic, inspiring, and helpful — never theatrical or absurd.

Tone and content rules:
- Do NOT invent grandiose, mystical, or preposterous titles (no “cosmic weaver”, “soul architect”, “destiny alchemist”, or similar).
- Titles must sound like real directions a thoughtful adult could pursue in the next 1–5 years (roles, crafts, services, practices).
- Prefer plain language: teaching, coaching, writing, building, caring, advising, designing, researching, etc., grounded in what they wrote.
- Summaries should be concrete and hopeful, not hype or hustle.
- Do NOT give weekly experiments, task lists, or productivity coaching.
- Do NOT invent skills, needs, or careers they did not imply.

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
- 3 to 4 pursuits maximum.
- Each title: short, realistic, specific (about 3–8 words).
- Each why item must clearly reference something they wrote (quote or paraphrase tightly).
- Each pursuit has EXACTLY ONE contemplation question — open, practical, and useful.
- tensions: 1 to 2 items only. Each tension is one short, precise sentence (no poetry).
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
    .slice(0, 4)
    .map((p) => ({
      id: nanoid(10),
      title: clean(p.title) || "Untitled direction",
      summary: clean(p.summary) || "",
      why: (p.why ?? []).map(clean).filter(Boolean).slice(0, 4),
      intersections: (p.intersections ?? [])
        .map((x) => x as InsightConnectionId)
        .filter((x) => VALID_INTERSECTIONS.has(x))
        .slice(0, 3),
      // Exactly one contemplation question per pursuit.
      questions: (p.questions ?? []).map(clean).filter(Boolean).slice(0, 1),
    }))
    .filter((p) => p.title && p.summary);

  return {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    mirror:
      clean(data.mirror) ||
      "Your map is still forming. Sit with what is already true before forcing a destination.",
    pursuits,
    tensions: (data.tensions ?? []).map(clean).filter(Boolean).slice(0, 2),
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
      title: `Use your strengths for what you care about`,
      summary: `A realistic path: apply “${clip(goodAt, 50)}” toward “${clip(want, 50)}” in small, repeatable ways — teaching, making, advising, or building — before inventing a grand role.`,
      why: [
        `You named love/want as: ${clip(want)}.`,
        `You named what you’re good at as: ${clip(goodAt)}.`,
        ...(have[0] ? [`You already list the skill “${have[0]}”.`] : []),
      ],
      intersections: ["passion", "ikigai"],
      questions: [
        `Where could you use “${clip(goodAt, 40)}” for “${clip(want, 40)}” in a real setting this year?`,
      ],
    });
  }

  if (want && need) {
    pursuits.push({
      id: nanoid(10),
      title: `Help a real group with what you love`,
      summary: `Connect “${clip(want, 45)}” to “${clip(need, 45)}” for a specific group of people — one clear problem, not the whole world.`,
      why: [
        `You wrote that you love/want: ${clip(want)}.`,
        `You sense the world needs: ${clip(need)}.`,
        ...(values[0] ? [`Your value “${values[0]}” can keep this honest.`] : []),
      ],
      intersections: ["mission", "ikigai"],
      questions: [
        `Who is the first real person or group you would help if “${clip(need, 40)}” were your focus?`,
      ],
    });
  }

  if (goodAt && reward) {
    pursuits.push({
      id: nanoid(10),
      title: `Earn from a skill you already have`,
      summary: `A practical livelihood angle: turn “${clip(goodAt, 50)}” into something people can pay for via “${clip(reward, 50)}”, without pretending it must be your whole identity.`,
      why: [
        `You said you’re good at: ${clip(goodAt)}.`,
        `You can imagine being rewarded by: ${clip(reward)}.`,
        ...(offer ? [`You already sketch an offer: ${clip(offer)}.`] : []),
      ],
      intersections: ["profession"],
      questions: [
        `What is the simplest paid form of “${clip(goodAt, 40)}” someone would hire you for?`,
      ],
    });
  }

  if (need && reward) {
    pursuits.push({
      id: nanoid(10),
      title: `Serve a need in a sustainable way`,
      summary: `Help with “${clip(need, 50)}” in a form that can also support you through “${clip(reward, 50)}” — useful work that can last.`,
      why: [
        `World need: ${clip(need)}.`,
        `Possible reward: ${clip(reward)}.`,
        ...(lack[0]
          ? [`You named a growth edge — “${lack[0]}” — that may matter here.`]
          : []),
      ],
      intersections: ["vocation"],
      questions: [
        `What part of “${clip(need, 40)}” could you serve without burning out?`,
      ],
    });
  }

  if (offer) {
    pursuits.push({
      id: nanoid(10),
      title: `Clarify what you already offer`,
      summary: `You already wrote an offer — “${clip(offer, 80)}”. Make that sentence clearer and more specific for real people.`,
      why: [
        `You wrote your deliverable/offer as: ${clip(offer)}.`,
        ...(want ? [`It sits near love/want: ${clip(want)}.`] : []),
        ...(need ? [`It faces a need: ${clip(need)}.`] : []),
      ],
      intersections: ["ikigai"],
      questions: [
        `Who is the first real person this offer is for, in one sentence?`,
      ],
    });
  }

  if (goodAt && need && !want) {
    pursuits.push({
      id: nanoid(10),
      title: `Apply your skill where it’s needed`,
      summary: `A grounded next step: use “${clip(goodAt, 50)}” for “${clip(need, 50)}” — coaching, support, teaching, or practical help — even while love/want is still forming.`,
      why: [
        `You said you’re good at: ${clip(goodAt)}.`,
        `You sense the world needs: ${clip(need)}.`,
        ...(have[0] ? [`A concrete skill you hold: “${have[0]}”.`] : []),
        ...(values[0] ? [`Value under it: “${values[0]}”.`] : []),
      ],
      intersections: ["vocation", "mission"],
      questions: [
        `In what concrete role or setting could “${clip(goodAt, 40)}” help with “${clip(need, 40)}”?`,
      ],
    });
  }

  if (have.length >= 2 && need) {
    pursuits.push({
      id: nanoid(10),
      title: `Combine two skills you already have`,
      summary: `Your skills (${have
        .slice(0, 3)
        .map((h) => `“${h}”`)
        .join(", ")}${have.length > 3 ? "…" : ""}) can support “${clip(need, 50)}” if you pick a focused combo instead of trying to use everything.`,
      why: [
        `Skills you wrote: ${have.slice(0, 4).join("; ")}.`,
        `Need you wrote: ${clip(need)}.`,
        ...(values.length
          ? [`Values that may guide the choice: ${values.slice(0, 3).join(", ")}.`]
          : []),
      ],
      intersections: ["profession", "ikigai"],
      questions: [
        `Which two of your skills would you combine first to help with “${clip(need, 40)}”?`,
      ],
    });
  }

  if (pursuits.length === 0) {
    pursuits.push({
      id: nanoid(10),
      title: `Fill in the map a bit more`,
      summary:
        "Your map still has empty fields. Add honest answers for love, skill, need, or reward before locking a direction.",
      why: [
        "Several core map fields are still empty, so strong claims about your Ikigai would be guesswork.",
        ...(noteBits[0]
          ? [`Your notes already hold a thread: ${clip(noteBits[0])}.`]
          : ["A short note under Want or Need is enough to start."]),
      ],
      intersections: ["ikigai"],
      questions: [
        "Which empty field can you fill honestly in one or two sentences today?",
      ],
    });
  }

  const tensions: string[] = [];
  if (want && reward && want !== reward) {
    tensions.push(
      `Love (“${clip(want, 40)}”) and reward (“${clip(reward, 40)}”) are not the same yet.`
    );
  }
  if (have.length && lack.length) {
    tensions.push(
      `You have “${have[0]}”, but still want “${lack[0]}”.`
    );
  }
  if (need && !want) {
    tensions.push("You see a need clearly, but love/want is still unclear.");
  }
  if (want && !need) {
    tensions.push("Love is clear, but who specifically needs it is not.");
  }
  if (tensions.length === 0) {
    tensions.push("Keep what feels quietly true; drop what only sounds impressive.");
  }

  const filled = [want, goodAt, need, reward, offer].filter(Boolean).length;
  const mirror =
    filled >= 3
      ? `Your inputs point to a few realistic directions around ${[
          want && "what you care about",
          goodAt && "what you can do",
          need && "who needs help",
          reward && "how you could sustain it",
          offer && "what you already offer",
        ]
          .filter(Boolean)
          .slice(0, 3)
          .join(", ")}. Treat these as options to test gently — not final answers.`
      : goodAt && need
        ? `Even with some fields empty, a practical thread is clear: your skill (“${clip(goodAt, 40)}”) and a real need (“${clip(need, 40)}”).`
        : `Your Ikigai picture is still forming. Use the options below as mirrors, then add more honest detail to your map.`;

  return {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    mirror,
    pursuits: pursuits.slice(0, 4),
    tensions: tensions.slice(0, 2),
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
