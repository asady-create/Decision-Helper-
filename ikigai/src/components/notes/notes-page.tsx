"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { nanoid } from "nanoid";
import { Plus, Search, Trash2 } from "lucide-react";
import { useIkigai } from "@/components/providers/ikigai-provider";
import { NOTE_TAGS, type Note, type NoteTag } from "@/lib/types";
import { suggestTags, tagsFromHashtags } from "@/lib/note-tags";
import { formatDisplayDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DateFilter = "all" | "today" | "7d" | "30d";

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function inDateFilter(iso: string, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const created = new Date(iso);
  const now = new Date();
  if (filter === "today") {
    return dateKey(iso) === dateKey(now.toISOString());
  }
  const days = filter === "7d" ? 7 : 30;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return created >= cutoff;
}

function TagChip({
  tag,
  active,
  onClick,
}: {
  tag: NoteTag;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-1 text-xs font-medium transition",
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
      )}
    >
      #{tag}
    </button>
  );
}

export function NotesPage() {
  const { ready, notes, upsertNote, removeNote } = useIkigai();
  const [draft, setDraft] = useState("");
  const [manualTags, setManualTags] = useState<NoteTag[]>([]);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<NoteTag | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const previewTags = useMemo(
    () => suggestTags(draft, manualTags),
    [draft, manualTags]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (tagFilter !== "all" && !note.tags.includes(tagFilter)) return false;
      if (!inDateFilter(note.createdAt, dateFilter)) return false;
      if (!q) return true;
      const hay = `${note.content} ${note.tags.map((t) => `#${t}`).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [notes, query, tagFilter, dateFilter]);

  const toggleManualTag = (tag: NoteTag) => {
    setManualTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const save = () => {
    const content = draft.trim();
    if (!content) return;
    const now = new Date().toISOString();
    const tags = suggestTags(content, manualTags);
    upsertNote({
      id: nanoid(10),
      content,
      tags,
      createdAt: now,
      updatedAt: now,
    });
    setDraft("");
    setManualTags([]);
  };

  const updateNoteTags = (note: Note, tag: NoteTag) => {
    const tags = note.tags.includes(tag)
      ? note.tags.filter((t) => t !== tag)
      : [...note.tags, tag];
    upsertNote({
      ...note,
      tags: NOTE_TAGS.filter((t) => tags.includes(t)),
      updatedAt: new Date().toISOString(),
    });
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    // If user types #Want etc., fold into manual selection so chips stay in sync
    const fromHash = tagsFromHashtags(value);
    if (fromHash.length > 0) {
      setManualTags((prev) => {
        const set = new Set([...prev, ...fromHash]);
        return NOTE_TAGS.filter((t) => set.has(t));
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-8 w-28 rounded bg-[var(--surface-2)]" />
        <div className="h-32 rounded-xl bg-[var(--surface-2)]" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
          Notes
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Mini journal
        </h1>
        <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
          Fast entry. Tag with map elements (#Want, #Gap, #Idea…). ⌘/Ctrl+Enter
          to save.
        </p>
      </header>

      <section className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write something concrete… use #Want #Gap #Idea"
          className="min-h-[110px]"
          autoFocus
        />
        <div className="flex flex-wrap gap-1.5">
          {NOTE_TAGS.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              active={previewTags.includes(tag)}
              onClick={() => toggleManualTag(tag)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={save} disabled={!draft.trim()}>
            <Plus />
            Save note
          </Button>
          {previewTags.length > 0 && (
            <p className="text-xs text-[var(--muted)]">
              Tags: {previewTags.map((t) => `#${t}`).join(" ")}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTagFilter("all")}
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-medium transition",
              tagFilter === "all"
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                : "border-[var(--border)] text-[var(--muted)]"
            )}
          >
            All tags
          </button>
          {NOTE_TAGS.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              active={tagFilter === tag}
              onClick={() =>
                setTagFilter((prev) => (prev === tag ? "all" : tag))
              }
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "Any date"],
              ["today", "Today"],
              ["7d", "7 days"],
              ["30d", "30 days"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDateFilter(value)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium transition",
                dateFilter === value
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                  : "border-[var(--border)] text-[var(--muted)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            History
          </h2>
          <span className="text-xs tabular-nums text-[var(--muted)]">
            {filtered.length}
            {filtered.length !== notes.length ? ` / ${notes.length}` : ""}
          </span>
        </div>
        <ul className="mt-4 space-y-3">
          <AnimatePresence initial={false}>
            {filtered.length === 0 && (
              <li className="text-sm text-[var(--muted)]">
                {notes.length === 0 ? "No notes yet." : "No matches."}
              </li>
            )}
            {filtered.map((note) => (
              <motion.li
                key={note.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-[var(--muted)]">
                    {formatDisplayDate(note.createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeNote(note.id)}
                    className="text-[var(--muted)] transition hover:text-red-600"
                    aria-label="Delete note"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                  {note.content}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {NOTE_TAGS.map((tag) => (
                    <TagChip
                      key={tag}
                      tag={tag}
                      active={note.tags.includes(tag)}
                      onClick={() => updateNoteTags(note, tag)}
                    />
                  ))}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </div>
  );
}
