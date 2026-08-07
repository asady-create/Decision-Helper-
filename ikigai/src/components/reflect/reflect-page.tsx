"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Compass,
  Sparkles,
} from "lucide-react";
import { useIkigai } from "@/components/providers/ikigai-provider";
import {
  buildLocalReflection,
  buildOutsourcedReflectPrompt,
  mapReadyForReflection,
  parseOutsourcedAiReply,
} from "@/lib/ai-reflect";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReflectPage() {
  const { ready, data, aiReflection, setAiReflection } = useIkigai();
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modeNote, setModeNote] = useState<string | null>(null);

  const readiness = mapReadyForReflection(data);
  const reflection = aiReflection;
  const prompt = useMemo(
    () => (ready ? buildOutsourcedReflectPrompt(data) : ""),
    [ready, data]
  );

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-10 w-48 rounded bg-[var(--surface-2)]" />
        <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
      </div>
    );
  }

  async function copyPrompt() {
    setError(null);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setModeNote(
        "Prompt copied. Paste it into ChatGPT, Claude, Gemini, or any model you trust — then bring the reply back here."
      );
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy automatically — select the prompt and copy it manually.");
    }
  }

  function importReply() {
    setError(null);
    setModeNote(null);
    try {
      const parsed = parseOutsourcedAiReply(paste);
      setAiReflection(parsed);
      setModeNote(
        "Imported from your outsourced AI reply. Sit with it — revise your map if something feels true or false."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse the reply");
    }
  }

  function runLocalGuide() {
    setError(null);
    const local = buildLocalReflection(data);
    setAiReflection(local);
    setModeNote(
      "Quick local guide (template-based). For richer AI language, copy the prompt into your own model."
    );
  }

  const sourceLabel =
    reflection?.source === "outsourced"
      ? "Your AI (pasted)"
      : reflection?.source === "openai"
        ? "OpenAI (app key)"
        : reflection
          ? "Built-in guide"
          : null;

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
          Copy a prompt built from your map into any AI you trust, then paste the
          reply back. Aim for directions that are accurate, realistic, inspiring,
          and helpful — one question per pursuit, short tensions only.
        </p>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
      >
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            1 · Copy your reflection prompt
          </h2>
          <p className="text-sm text-[var(--muted)]">{readiness.hint}</p>
          <p className="text-xs text-[var(--muted)]">
            Map fields filled: {readiness.filled}/5 · Works with ChatGPT, Claude,
            Gemini, DeepSeek, or any chat model you can access from Hong Kong.
          </p>
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

        {readiness.ready && (
          <>
            <textarea
              readOnly
              value={prompt}
              rows={12}
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 font-mono text-xs leading-relaxed text-[var(--foreground)]"
              aria-label="Ikigai reflection prompt to copy"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="accent"
                size="lg"
                onClick={() => void copyPrompt()}
              >
                {copied ? <Check /> : <ClipboardCopy />}
                {copied ? "Copied" : "Copy prompt"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={runLocalGuide}
              >
                <Sparkles />
                Quick local guide
              </Button>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
        {modeNote && <p className="text-xs text-[var(--muted)]">{modeNote}</p>}
      </motion.section>

      {readiness.ready && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
        >
          <div className="space-y-2">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              2 · Paste the AI reply
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Ask the model for JSON only (the prompt already says so). Paste the
              whole reply below — fenced code blocks are fine.
            </p>
          </div>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={8}
            placeholder='Paste JSON here, e.g. { "mirror": "...", "pursuits": [...], "tensions": [...] }'
            className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 font-mono text-xs leading-relaxed text-[var(--foreground)] placeholder:text-[var(--muted)]"
            aria-label="Paste AI reflection JSON"
          />
          <Button
            type="button"
            variant="accent"
            size="lg"
            onClick={importReply}
            disabled={!paste.trim()}
          >
            Import reflection
          </Button>
        </motion.section>
      )}

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
                {sourceLabel ? ` · ${sourceLabel}` : ""}
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
                            Sit with this
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
                Tensions to keep in view
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
            Copy the prompt → run it in your AI → paste the JSON reply. You’ll
            get a mirror, possible Ikigai directions, and questions for
            contemplation — not a weekly plan.
          </p>
        </div>
      )}
    </div>
  );
}
