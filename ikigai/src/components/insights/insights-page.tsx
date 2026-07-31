"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { nanoid } from "nanoid";
import { ArrowRight, Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import { useIkigai } from "@/components/providers/ikigai-provider";
import {
  INSIGHT_CONNECTIONS,
  generateInsightIdeas,
  mergeAutoInsights,
} from "@/lib/insights";
import type { InsightConnectionId, InsightIdea } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Diagram highlighting classic intersections. */
function IntersectionDiagram({
  active,
  onSelect,
}: {
  active: InsightConnectionId | null;
  onSelect: (id: InsightConnectionId) => void;
}) {
  const hotspots: {
    id: InsightConnectionId;
    label: string;
    style: string;
  }[] = [
    { id: "passion", label: "Passion", style: "top-[18%] left-1/2 -translate-x-1/2" },
    { id: "mission", label: "Mission", style: "top-1/2 left-[14%] -translate-y-1/2" },
    {
      id: "profession",
      label: "Profession",
      style: "top-1/2 right-[10%] -translate-y-1/2",
    },
    {
      id: "vocation",
      label: "Vocation",
      style: "bottom-[18%] left-1/2 -translate-x-1/2",
    },
    {
      id: "ikigai",
      label: "生き甲斐",
      style: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    },
  ];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <svg
        viewBox="0 0 400 400"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        <circle
          cx="155"
          cy="155"
          r="118"
          fill="rgba(13, 92, 99, 0.14)"
          stroke="rgba(13, 92, 99, 0.45)"
          strokeWidth="1.5"
        />
        <circle
          cx="245"
          cy="155"
          r="118"
          fill="rgba(37, 99, 120, 0.12)"
          stroke="rgba(37, 99, 120, 0.4)"
          strokeWidth="1.5"
        />
        <circle
          cx="155"
          cy="245"
          r="118"
          fill="rgba(71, 85, 105, 0.1)"
          stroke="rgba(71, 85, 105, 0.35)"
          strokeWidth="1.5"
        />
        <circle
          cx="245"
          cy="245"
          r="118"
          fill="rgba(15, 118, 110, 0.12)"
          stroke="rgba(15, 118, 110, 0.4)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Corner labels */}
      <span className="absolute top-3 left-3 text-[10px] font-medium text-[var(--muted)]">
        Love
      </span>
      <span className="absolute top-3 right-3 text-[10px] font-medium text-[var(--muted)]">
        Good at
      </span>
      <span className="absolute bottom-3 left-3 text-[10px] font-medium text-[var(--muted)]">
        World needs
      </span>
      <span className="absolute right-3 bottom-3 text-[10px] font-medium text-[var(--muted)]">
        Paid for
      </span>

      {hotspots.map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={() => onSelect(h.id)}
          className={cn(
            "absolute z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition sm:text-xs",
            h.style,
            active === h.id
              ? "bg-[var(--accent)] text-white ring-2 ring-[var(--accent)]/30"
              : "bg-white/90 text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-white"
          )}
        >
          {h.label}
        </button>
      ))}
    </div>
  );
}

export function InsightsPage() {
  const { ready, data, insights, setInsights } = useIkigai();
  const map = data.map;
  const [active, setActive] = useState<InsightConnectionId>("mission");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const conn = INSIGHT_CONNECTIONS.find((c) => c.id === active)!;
  const readyCount = INSIGHT_CONNECTIONS.filter((c) => c.ready(map)).length;

  const ideasForActive = useMemo(
    () => insights.filter((i) => i.connectionId === active),
    [insights, active]
  );

  const regenerate = () => {
    const generated = generateInsightIdeas(map, 5);
    setInsights(mergeAutoInsights(insights, generated));
  };

  const addManual = () => {
    const text = draft.trim();
    if (!text) return;
    const idea: InsightIdea = {
      id: nanoid(10),
      connectionId: active,
      text,
      source: "manual",
      createdAt: new Date().toISOString(),
    };
    setInsights([idea, ...insights]);
    setDraft("");
  };

  const removeIdea = (id: string) => {
    setInsights(insights.filter((i) => i.id !== id));
  };

  const saveEdit = () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) return;
    setInsights(
      insights.map((i) =>
        i.id === editingId ? { ...i, text, source: "manual" as const } : i
      )
    );
    setEditingId(null);
    setEditText("");
  };

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-8 w-36 rounded bg-[var(--surface-2)]" />
        <div className="aspect-square max-w-md rounded-2xl bg-[var(--surface-2)]" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
            Insights
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Reflect on the overlaps
          </h1>
          <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
            Passion, mission, profession, vocation — and the center. Select a
            zone, answer the prompt, keep 3–5 ideas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="accent"
            onClick={regenerate}
            disabled={readyCount === 0}
          >
            <Wand2 />
            Generate from map
          </Button>
          {insights.some((i) => i.source === "auto") && (
            <Button
              variant="secondary"
              onClick={() =>
                setInsights(insights.filter((i) => i.source === "manual"))
              }
            >
              <RefreshCw />
              Clear auto
            </Button>
          )}
        </div>
      </header>

      {readyCount === 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
          Fill the four circles on the Map first.{" "}
          <Link
            href="/map"
            className="inline-flex items-center gap-1 font-medium text-[var(--accent)] hover:underline"
          >
            Open map
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      <IntersectionDiagram active={active} onSelect={setActive} />

      <motion.section
        key={active}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">
            {conn.label}
          </h2>
          <span className="text-sm text-[var(--muted)]">{conn.formula}</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">
          {conn.prompt}
        </p>
        {!conn.ready(map) && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Needs the matching Map circles filled before auto-ideas unlock.
          </p>
        )}

        <ul className="mt-5 space-y-2">
          <AnimatePresence initial={false}>
            {ideasForActive.length === 0 && (
              <li className="text-sm text-[var(--muted)]">
                No ideas here yet — generate or write one.
              </li>
            )}
            {ideasForActive.map((idea) => (
              <motion.li
                key={idea.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="group rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
              >
                {editingId === idea.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[72px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="accent" onClick={saveEdit}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(idea.id);
                        setEditText(idea.text);
                      }}
                      className="min-w-0 flex-1 text-left text-sm leading-relaxed text-[var(--foreground)]"
                    >
                      {idea.text}
                      <span className="mt-1 block text-[10px] tracking-wide text-[var(--muted)] uppercase">
                        {idea.source}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeIdea(idea.id)}
                      className="shrink-0 rounded p-1 text-[var(--muted)] opacity-60 transition hover:text-red-600 group-hover:opacity-100"
                      aria-label="Remove idea"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addManual();
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Your reflection on ${conn.label.toLowerCase()}…`}
          />
          <Button type="submit" variant="secondary" disabled={!draft.trim()}>
            <Plus />
            Add
          </Button>
        </form>
      </motion.section>

      <div className="flex flex-wrap gap-2">
        {INSIGHT_CONNECTIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition",
              active === c.id
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {c.label}
            <span className="ml-1 tabular-nums opacity-60">
              {insights.filter((i) => i.connectionId === c.id).length}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
