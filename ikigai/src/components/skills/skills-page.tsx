"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  GripVertical,
  Plus,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import type { PurposeMap, Skill } from "@/lib/types";
import { createEmptyMap, normalizeMap } from "@/lib/synthesis";
import { useIkigai } from "@/components/providers/ikigai-provider";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function SkillCard({
  skill,
  accent,
  noteOpen,
  onToggleNote,
  onRemove,
  onRename,
  onNote,
  onMove,
  moveLabel,
}: {
  skill: Skill;
  accent: "have" | "lack";
  noteOpen: boolean;
  onToggleNote: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
  onNote: (note: string) => void;
  onMove: () => void;
  moveLabel: string;
}) {
  const controls = useDragControls();
  const hasNote = Boolean(skill.note.trim());

  return (
    <Reorder.Item
      value={skill}
      id={skill.id}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "list-none rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3",
        accent === "lack" && "border-l-2 border-l-[var(--accent)]"
      )}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 8px 24px rgba(18, 20, 26, 0.12)",
        zIndex: 20,
      }}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="mt-6 shrink-0 cursor-grab touch-none rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] active:cursor-grabbing"
          aria-label="Drag to reorder"
          onPointerDown={(e) => controls.start(e)}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Skill
          </p>
          <Input
            value={skill.name}
            onChange={(e) => onRename(e.target.value)}
            aria-label="Skill name"
            placeholder="Skill name"
            className="h-9 border-[var(--border)] bg-[var(--background)] font-medium"
          />
        </div>

        <div className="mt-5 flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={onToggleNote}
            className={cn(
              "rounded p-1.5 transition",
              noteOpen || hasNote
                ? "text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            )}
            aria-label={noteOpen ? "Hide note" : "Show note"}
            aria-expanded={noteOpen}
            title={noteOpen ? "Hide note" : "Show note"}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                noteOpen && "rotate-180"
              )}
            />
          </button>
          <button
            type="button"
            onClick={onMove}
            className="rounded p-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            aria-label={moveLabel}
            title={moveLabel}
          >
            <ArrowRightLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1.5 text-[var(--muted)] transition hover:text-red-600"
            aria-label={`Remove ${skill.name || "skill"}`}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {noteOpen && (
          <motion.div
            key="note"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 ml-7 border-l-2 border-[var(--border)] pl-3">
              <Textarea
                id={`skill-note-${skill.id}`}
                value={skill.note}
                onChange={(e) => onNote(e.target.value)}
                aria-label={`Note for ${skill.name || "skill"}`}
                placeholder="Level, proof, why it matters…"
                rows={2}
                className="min-h-[64px] resize-y border-[var(--border)] bg-[var(--background)]/70 px-2.5 py-2 text-xs leading-relaxed text-[var(--muted)] placeholder:text-[var(--muted)]/50 focus:text-[var(--foreground)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function SkillColumn({
  title,
  subtitle,
  skills,
  draft,
  setDraft,
  onAdd,
  onRemove,
  onRename,
  onNote,
  onMove,
  onReorder,
  moveLabel,
  accent,
}: {
  title: string;
  subtitle: string;
  skills: Skill[];
  draft: string;
  setDraft: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onNote: (id: string, note: string) => void;
  onMove: (id: string) => void;
  onReorder: (next: Skill[]) => void;
  moveLabel: string;
  accent: "have" | "lack";
}) {
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  const toggleNote = (id: string) => {
    setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isNoteOpen = (skill: Skill) => {
    if (openNotes[skill.id] !== undefined) return openNotes[skill.id];
    // Default: open if there's already a note
    return Boolean(skill.note.trim());
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
      </div>

      {skills.length === 0 ? (
        <p className="py-2 text-sm text-[var(--muted)]">None yet.</p>
      ) : (
        <Reorder.Group
          axis="y"
          values={skills}
          onReorder={onReorder}
          className="flex flex-col gap-3"
        >
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              accent={accent}
              noteOpen={isNoteOpen(skill)}
              onToggleNote={() => toggleNote(skill.id)}
              onRemove={() => onRemove(skill.id)}
              onRename={(name) => onRename(skill.id, name)}
              onNote={(note) => onNote(skill.id, note)}
              onMove={() => onMove(skill.id)}
              moveLabel={moveLabel}
            />
          ))}
        </Reorder.Group>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd();
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a skill"
          maxLength={80}
        />
        <Button type="submit" variant="secondary" disabled={!draft.trim()}>
          <Plus />
          Add
        </Button>
      </form>
    </section>
  );
}

export function SkillsPage() {
  const { ready, data, upsertMap } = useIkigai();
  const [map, setMap] = useState<PurposeMap>(createEmptyMap);
  const [haveDraft, setHaveDraft] = useState("");
  const [lackDraft, setLackDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ready || hydrated.current) return;
    setMap(normalizeMap(data.map));
    hydrated.current = true;
  }, [ready, data.map]);

  const persist = useCallback(
    (next: PurposeMap) => {
      if (!hydrated.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        upsertMap({ ...next, updatedAt: new Date().toISOString() });
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1000);
      }, 300);
    },
    [upsertMap]
  );

  const updateSkills = (
    list: "skillsHave" | "skillsLack",
    nextSkills: Skill[]
  ) => {
    setMap((prev) => {
      const next = { ...prev, [list]: nextSkills };
      persist(next);
      return next;
    });
  };

  const addSkill = (list: "skillsHave" | "skillsLack", name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = map[list];
    if (existing.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    updateSkills(list, [
      ...existing,
      { id: nanoid(8), name: trimmed, note: "" },
    ]);
  };

  const renameSkill = (
    list: "skillsHave" | "skillsLack",
    id: string,
    name: string
  ) => {
    updateSkills(
      list,
      map[list].map((s) => (s.id === id ? { ...s, name } : s))
    );
  };

  const noteSkill = (
    list: "skillsHave" | "skillsLack",
    id: string,
    note: string
  ) => {
    updateSkills(
      list,
      map[list].map((s) => (s.id === id ? { ...s, note } : s))
    );
  };

  const moveSkill = (from: "skillsHave" | "skillsLack", id: string) => {
    const to = from === "skillsHave" ? "skillsLack" : "skillsHave";
    const skill = map[from].find((s) => s.id === id);
    if (!skill) return;
    setMap((prev) => {
      const next: PurposeMap = {
        ...prev,
        [from]: prev[from].filter((s) => s.id !== id),
        [to]: [...prev[to], skill],
      };
      persist(next);
      return next;
    });
  };

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-8 w-32 rounded bg-[var(--surface-2)]" />
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="h-48 rounded-xl bg-[var(--surface-2)]" />
          <div className="h-48 rounded-xl bg-[var(--surface-2)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
            Skills
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Have vs lack
          </h1>
          <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
            Drag the grip to reorder. Use the chevron to show or hide each
            skill’s note.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs transition-opacity",
            savedFlash
              ? "text-[var(--accent)] opacity-100"
              : "text-[var(--muted)] opacity-40"
          )}
        >
          <Check className="size-3.5" />
          Saved
        </span>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-10 sm:grid-cols-2"
      >
        <SkillColumn
          title="I have"
          subtitle="Skills you can already use."
          skills={map.skillsHave}
          draft={haveDraft}
          setDraft={setHaveDraft}
          accent="have"
          moveLabel="Move to lack"
          onAdd={() => {
            addSkill("skillsHave", haveDraft);
            setHaveDraft("");
          }}
          onRemove={(id) =>
            updateSkills(
              "skillsHave",
              map.skillsHave.filter((s) => s.id !== id)
            )
          }
          onRename={(id, name) => renameSkill("skillsHave", id, name)}
          onNote={(id, note) => noteSkill("skillsHave", id, note)}
          onMove={(id) => moveSkill("skillsHave", id)}
          onReorder={(next) => updateSkills("skillsHave", next)}
        />
        <SkillColumn
          title="I lack"
          subtitle="Skills required for what you want."
          skills={map.skillsLack}
          draft={lackDraft}
          setDraft={setLackDraft}
          accent="lack"
          moveLabel="Move to have"
          onAdd={() => {
            addSkill("skillsLack", lackDraft);
            setLackDraft("");
          }}
          onRemove={(id) =>
            updateSkills(
              "skillsLack",
              map.skillsLack.filter((s) => s.id !== id)
            )
          }
          onRename={(id, name) => renameSkill("skillsLack", id, name)}
          onNote={(id, note) => noteSkill("skillsLack", id, note)}
          onMove={(id) => moveSkill("skillsLack", id)}
          onReorder={(next) => updateSkills("skillsLack", next)}
        />
      </motion.div>
    </div>
  );
}
