import type { NoteTag } from "./types";
import { NOTE_TAGS } from "./types";

const HASHTAG_MAP: Record<string, NoteTag> = {
  want: "Want",
  offer: "Offer",
  need: "Need",
  reward: "Reward",
  have: "Have",
  gap: "Gap",
  gaps: "Gap",
  lack: "Gap",
  idea: "Idea",
  ideas: "Idea",
  value: "Value",
  values: "Value",
};

const KEYWORD_RULES: { tag: NoteTag; pattern: RegExp }[] = [
  { tag: "Want", pattern: /\b(i want|what i want|goal|purpose|desire)\b/i },
  { tag: "Offer", pattern: /\b(deliver|build|product|service|offer)\b/i },
  { tag: "Need", pattern: /\b(need|users?|customers?|market|audience)\b/i },
  { tag: "Reward", pattern: /\b(paid|pay|money|revenue|equity|reward)\b/i },
  { tag: "Have", pattern: /\b(i (already )?have|skilled at|good at)\b/i },
  { tag: "Gap", pattern: /\b(lack|gap|need to learn|missing skill)\b/i },
  { tag: "Idea", pattern: /\b(idea|hypothesis|what if|maybe)\b/i },
  { tag: "Value", pattern: /\b(value|principle|non-negotiable|integrity)\b/i },
];

/** Parse #Want-style hashtags from note body. */
export function tagsFromHashtags(content: string): NoteTag[] {
  const found = new Set<NoteTag>();
  const re = /#([A-Za-z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const key = m[1].toLowerCase();
    const tag = HASHTAG_MAP[key];
    if (tag) found.add(tag);
  }
  return [...found];
}

/** Lightweight keyword auto-tag when no hashtags present. */
export function tagsFromKeywords(content: string): NoteTag[] {
  const found = new Set<NoteTag>();
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(content)) found.add(rule.tag);
  }
  return [...found];
}

/**
 * Suggest tags: prefer explicit hashtags; else keywords.
 * Merges with any manually selected tags (manual wins / union).
 */
export function suggestTags(
  content: string,
  manual: NoteTag[] = []
): NoteTag[] {
  const fromHash = tagsFromHashtags(content);
  const auto = fromHash.length > 0 ? fromHash : tagsFromKeywords(content);
  const set = new Set<NoteTag>([...manual, ...auto]);
  // Preserve NOTE_TAGS order
  return NOTE_TAGS.filter((t) => set.has(t));
}

export function isNoteTag(value: string): value is NoteTag {
  return (NOTE_TAGS as readonly string[]).includes(value);
}
