/**
 * Reflection prompts for the four classic ikigai circles + center.
 * Precise. No filler.
 */

export type CircleId = "love" | "goodAt" | "need" | "reward";

export interface CirclePrompt {
  id: CircleId;
  /** Field on PurposeMap */
  field: "want" | "goodAt" | "need" | "reward";
  label: string;
  japaneseHint: string;
  prompt: string;
  followUp: string;
  placeholder: string;
}

export const CIRCLE_PROMPTS: CirclePrompt[] = [
  {
    id: "love",
    field: "want",
    label: "What you love",
    japaneseHint: "好きなこと",
    prompt:
      "What do you return to when nothing is forcing you? Name the subject, craft, or problem — not a job title.",
    followUp:
      "If you could only keep one obsession for the next five years, what is it?",
    placeholder: "Be concrete. One clear desire beats five vague ones.",
  },
  {
    id: "goodAt",
    field: "goodAt",
    label: "What you’re good at",
    japaneseHint: "得意なこと",
    prompt:
      "Where do people already trust your judgment or ask for help? What feels easy for you that is hard for most?",
    followUp:
      "Which of those skills compounds if you practiced it deliberately for 90 days?",
    placeholder: "Evidence over aspiration. What have you already proven?",
  },
  {
    id: "need",
    field: "need",
    label: "What the world needs",
    japaneseHint: "世界が求めること",
    prompt:
      "Whose concrete friction would get quieter if you did this well? Name the person and the pain.",
    followUp:
      "Would they pay attention, time, or money to make that pain go away?",
    placeholder: "A specific someone with a specific problem.",
  },
  {
    id: "reward",
    field: "reward",
    label: "What you can be paid for",
    japaneseHint: "報酬になること",
    prompt:
      "What exchange feels fair — money, equity, reputation, freedom? Who pays, and for what outcome?",
    followUp:
      "If that reward never arrived, would you still want the work itself?",
    placeholder: "Name the form of reward, and who grants it.",
  },
];

export const CENTER_PROMPT = {
  label: "生き甲斐 — what you deliver",
  prompt:
    "Standing in the overlap: what will you actually build or deliver that someone else wants to own or use?",
  placeholder: "One sentence. The thing you will put into the world.",
};

export const INTERSECTION_PROMPTS: {
  id: "passion" | "mission" | "profession" | "vocation" | "ikigai";
  label: string;
  formula: string;
  prompt: string;
}[] = [
  {
    id: "passion",
    label: "Passion",
    formula: "Love ∩ Good at",
    prompt:
      "Where do enjoyment and competence already meet? What would you do more of if skill were not the bottleneck?",
  },
  {
    id: "mission",
    label: "Mission",
    formula: "Love ∩ World needs",
    prompt:
      "Which real need pulls on what you love? If you ignored money for a moment, who would you serve?",
  },
  {
    id: "profession",
    label: "Profession",
    formula: "Good at ∩ Paid for",
    prompt:
      "What are you already skilled at that the market rewards? Where is the exchange already proven?",
  },
  {
    id: "vocation",
    label: "Vocation",
    formula: "World needs ∩ Paid for",
    prompt:
      "What needed work can sustain you? Even if love is incomplete — what is useful and paid?",
  },
  {
    id: "ikigai",
    label: "Ikigai",
    formula: "All four",
    prompt:
      "What sits in the center — loved, skilled, needed, and rewarded? Write the smallest honest version.",
  },
];
