"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Minus, Download } from "lucide-react";
import { useIkigai } from "@/components/providers/ikigai-provider";
import { IkigaiDiagramStatic } from "@/components/map/ikigai-canvas";
import { mapProgress } from "@/lib/synthesis";
import { downloadMarkdown } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ANDREESSEN_QUOTE =
  "The world is a very malleable place. If you know what you want, and you go for it with maximum energy and drive and passion, the world will often reconfigure itself around you much more quickly and easily than you would think.";

const SECTIONS = [
  {
    key: "want" as const,
    label: "What you love",
    href: "/map",
    hint: "Love / want",
  },
  {
    key: "goodAt" as const,
    label: "What you’re good at",
    href: "/map",
    hint: "Skill reflection",
  },
  {
    key: "need" as const,
    label: "What the world needs",
    href: "/map",
    hint: "Need",
  },
  {
    key: "reward" as const,
    label: "What you can be paid for",
    href: "/map",
    hint: "Reward",
  },
  {
    key: "offer" as const,
    label: "What I deliver",
    href: "/map",
    hint: "Center / 生き甲斐",
  },
  {
    key: "values" as const,
    label: "Values",
    href: "/map#values",
    hint: "Non-negotiables",
  },
  {
    key: "skillsHave" as const,
    label: "Skills I have",
    href: "/skills",
    hint: "Inventory",
  },
  {
    key: "skillsLack" as const,
    label: "Skills I lack",
    href: "/skills",
    hint: "Gaps",
  },
];

export function HomeDashboard() {
  const { ready, data, insights } = useIkigai();
  const map = data.map;
  const progress = mapProgress(map);
  const pct = Math.round((progress.filled / progress.total) * 100);
  const next = SECTIONS.find((s) => !progress[s.key]);
  const topIdeas = insights.slice(0, 3);

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-10 w-48 rounded bg-[var(--surface-2)]" />
        <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
      </div>
    );
  }

  return (
    <div className="space-y-14">
      {/* Hero — brand + Andreessen quote + CTA */}
      <section className="pt-2 sm:pt-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-sm font-semibold tracking-[0.18em] text-[var(--accent)] uppercase"
        >
          Ikigai 2.0
        </motion.p>
        <motion.blockquote
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.45 }}
          className="mt-5 max-w-2xl border-l-2 border-[var(--accent)] pl-5 sm:pl-6"
        >
          <p className="font-display text-xl leading-snug font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl sm:leading-snug">
            {ANDREESSEN_QUOTE}
          </p>
          <footer className="mt-4 text-sm text-[var(--muted)]">
            — Marc Andreessen
          </footer>
        </motion.blockquote>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <Button asChild size="lg" variant="accent">
            <Link href={next?.href ?? "/map"}>
              {progress.filled === 0
                ? "Start your map"
                : next
                  ? `Continue — ${next.label}`
                  : "Review map"}
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/daily">
              Open Daily
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/reflect">
              Reflect on Ikigai
              <ArrowRight />
            </Link>
          </Button>
          {map && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => downloadMarkdown()}
            >
              <Download />
              Export
            </Button>
          )}
        </motion.div>
      </section>

      {/* Classic ikigai — graphical reference before prompts */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 sm:px-6 sm:py-8"
      >
        <IkigaiDiagramStatic />
        <div className="mt-4">
          <Button asChild variant="secondary" size="sm">
            <Link href="/map">
              Write on the diagram
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        className="space-y-3"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Your map
          </h2>
          <span className="text-sm tabular-nums text-[var(--muted)]">
            {progress.filled}/{progress.total}
          </span>
        </div>
        <Progress value={pct} />
        <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {SECTIONS.map((s) => {
            const done = progress[s.key];
            return (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className="flex items-center gap-3 py-3.5 transition hover:bg-[var(--surface)]/60"
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border",
                      done
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted)]"
                    )}
                  >
                    {done ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Minus className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[var(--foreground)]">
                      {s.label}
                    </span>
                    <span className="text-xs text-[var(--muted)]">{s.hint}</span>
                  </span>
                  <ArrowRight className="size-4 text-[var(--muted)]" />
                </Link>
              </li>
            );
          })}
        </ul>
      </motion.section>

      {map && map.values?.length > 0 && (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              Values
            </h2>
            <Button asChild variant="ghost" className="h-auto px-0 py-0 text-sm">
              <Link href="/map#values">
                Edit
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {map.values.map((v) => (
              <li
                key={v}
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)]"
              >
                {v}
              </li>
            ))}
          </ul>
        </section>
      )}

      {map?.synthesis?.trim() && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="border-l-2 border-[var(--accent)] pl-5"
        >
          <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Synthesis
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--foreground)]">
            {map.synthesis}
          </p>
          <Button asChild variant="ghost" className="mt-3 px-0">
            <Link href="/map#synthesis">
              Edit
              <ArrowRight />
            </Link>
          </Button>
        </motion.section>
      )}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Insights
          </h2>
          <Button asChild variant="ghost" className="h-auto px-0 py-0 text-sm">
            <Link href="/insights">
              Connection view
              <ArrowRight />
            </Link>
          </Button>
        </div>
        {topIdeas.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {topIdeas.map((idea) => (
              <li
                key={idea.id}
                className="border-l-2 border-[var(--border)] pl-3 text-sm leading-relaxed text-[var(--foreground)]"
              >
                {idea.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Overlaps like Want + Need → purpose areas. Generate or add ideas on
            Insights.
          </p>
        )}
      </section>

      {map && map.skillsLack.some((s) => s.name.trim()) && (
        <section>
          <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Gaps to close
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {map.skillsLack
              .filter((s) => s.name.trim())
              .map((s) => (
                <li
                  key={s.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)]"
                >
                  {s.name}
                </li>
              ))}
          </ul>
          <Button asChild variant="ghost" className="mt-3 px-0">
            <Link href="/skills">
              Edit skills
              <ArrowRight />
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}
