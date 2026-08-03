"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowRight, Compass, LoaderCircle, Sparkles } from "lucide-react";
import { useIkigai } from "@/components/providers/ikigai-provider";
import { mapReadyForReflection } from "@/lib/ai-reflect";
import type { AiReflection } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReflectPage() {
  const { ready, data, aiReflection, setAiReflection } = useIkigai();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modeNote, setModeNote] = useState<string | null>(null);

  const readiness = mapReadyForReflection(data);
  const reflection = aiReflection;

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-10 w-48 rounded bg-[var(--surface-2)]" />
        <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
      </div>
    );
  }

  async function runReflection() {
    setLoading(true);
    setError(null);
    setModeNote(null);
    try {
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const json = (await res.json()) as {
        reflection?: AiReflection;
        note?: string;
        error?: string;
      };
      if (!res.ok || !json.reflection) {
        throw new Error(json.error || "Reflection failed");
      }
      setAiReflection(json.reflection);
      if (json.note) setModeNote(json.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reflection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-12">
      <section className="pt-2 sm:pt-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-sm font-semibold tracking-[0.18em] text-[var(--accent)] uppercase"
        >
          Reflect · Ikigai
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 font-display text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl"
        >
          Contemplate your direction
        </motion.h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          Assistance for contemplation — not a plan, not a verdict. It reads
          your map, notes, and insights, then names possible Ikigai pursuits to
          sit with, grounded in your own words and questions meant for quiet
          attention.
        </p>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Begin a reflection
            </h2>
            <p className="text-sm text-[var(--muted)]">{readiness.hint}</p>
            <p className="text-xs text-[var(--muted)]">
              Map fields filled: {readiness.filled}/5 core areas
            </p>
          </div>
          <Button
            type="button"
            variant="accent"
            size="lg"
            onClick={() => void runReflection()}
            disabled={loading || !readiness.ready}
          >
            {loading ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {reflection ? "Reflect again" : "Contemplate my Ikigai"}
          </Button>
        </div>

        {!readiness.ready && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/map">
                Open map
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/notes">Add a note</Link>
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
        {modeNote && <p className="text-xs text-[var(--muted)]">{modeNote}</p>}
      </motion.section>

      {reflection && (
        <>
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                A mirror
              </h2>
              <span className="text-xs text-[var(--muted)]">
                {format(new Date(reflection.createdAt), "MMM d, yyyy · HH:mm")}
                {" · "}
                {reflection.source === "openai" ? "AI model" : "Built-in guide"}
              </span>
            </div>
            <blockquote className="border-l-2 border-[var(--accent)] pl-5 sm:pl-6">
              <p className="font-display text-xl leading-snug font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
                {reflection.mirror}
              </p>
            </blockquote>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-5"
          >
            <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              Possible pursuits to contemplate
            </h2>

            <div className="space-y-5">
              {reflection.pursuits.map((pursuit, index) => (
                <article
                  key={pursuit.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--accent)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 space-y-3">
                      <div>
                        <h3 className="font-display text-xl font-semibold tracking-tight text-[var(--foreground)]">
                          {pursuit.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                          {pursuit.summary}
                        </p>
                      </div>

                      {pursuit.intersections.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pursuit.intersections.map((item) => (
                            <span
                              key={item}
                              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      )}

                      {pursuit.why.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                            Grounded in what you wrote
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {pursuit.why.map((reason) => (
                              <li
                                key={reason}
                                className="text-sm leading-relaxed text-[var(--foreground)]"
                              >
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {pursuit.questions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                            Sit with these
                          </p>
                          <ul className="mt-2 space-y-2">
                            {pursuit.questions.map((question) => (
                              <li
                                key={question}
                                className={cn(
                                  "rounded-lg border border-[var(--border)]/80 bg-[var(--background)]/70 px-3 py-2.5",
                                  "text-sm leading-relaxed text-[var(--foreground)]"
                                )}
                              >
                                {question}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </motion.section>

          {reflection.tensions.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="space-y-3"
            >
              <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Tensions worth keeping open
              </h2>
              <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {reflection.tensions.map((tension) => (
                  <li
                    key={tension}
                    className="py-3.5 text-sm leading-relaxed text-[var(--foreground)]"
                  >
                    {tension}
                  </li>
                ))}
              </ul>
            </motion.section>
          )}

          <p className="text-xs leading-relaxed text-[var(--muted)]">
            These are contemplative suggestions, not a prescription. Return to
            your map when something here feels true — or false — and revise your
            own words.
          </p>
        </>
      )}

      {!reflection && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
          <Compass className="mt-0.5 size-4 shrink-0" />
          <p>
            When you reflect, you’ll see a mirror of your inputs, a few possible
            Ikigai directions, and questions meant for contemplation — not a
            weekly plan.
          </p>
        </div>
      )}
    </div>
  );
}
