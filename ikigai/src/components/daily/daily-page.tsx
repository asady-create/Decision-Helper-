"use client";

import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { nanoid } from "nanoid";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useIkigai } from "@/components/providers/ikigai-provider";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  emptyDayHabits,
  filterQuotes,
  groupQuotesByAuthor,
  HABITS,
  isQuote,
  mergeQuotes,
  quoteOfTheDay,
  todayKey,
} from "@/lib/daily";
import type { HabitId, Quote } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DailyPage() {
  const { ready, quotes, habits, setQuotes, setDayHabits } = useIkigai();
  const dateKey = todayKey();
  const day = habits[dateKey] ?? emptyDayHabits();

  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const todaysQuote = quoteOfTheDay(quotes, dateKey);
  const completedCount = HABITS.filter((h) => day.checks[h.id]).length;
  const filteredQuotes = useMemo(
    () => filterQuotes(quotes, deferredSearch),
    [quotes, deferredSearch]
  );
  const quoteGroups = useMemo(
    () => groupQuotesByAuthor(filteredQuotes),
    [filteredQuotes]
  );

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-10 w-48 rounded bg-[var(--surface-2)]" />
        <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
      </div>
    );
  }

  function toggleHabit(id: HabitId) {
    setDayHabits(dateKey, {
      ...day,
      checks: { ...day.checks, [id]: !day.checks[id] },
    });
  }

  function updateReadingBooks(value: string) {
    setDayHabits(dateKey, {
      checks: {
        ...day.checks,
        reading: value.trim().length > 0 ? true : day.checks.reading,
      },
      readingBooks: value,
    });
  }

  function handleAddQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const next: Quote = {
      id: nanoid(10),
      text: trimmed,
      author: author.trim() || "Anonymous",
      createdAt: new Date().toISOString(),
    };
    setQuotes([next, ...quotes]);
    setText("");
    setAuthor("");
    setLibraryOpen(true);
  }

  function startEdit(quote: Quote) {
    setExpandedId(quote.id);
    setEditingId(quote.id);
    setEditText(quote.text);
    setEditAuthor(quote.author);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
    setEditAuthor("");
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    const trimmed = editText.trim();
    if (!trimmed) return;
    setQuotes(
      quotes.map((quote) =>
        quote.id === editingId
          ? {
              ...quote,
              text: trimmed,
              author: editAuthor.trim() || "Anonymous",
            }
          : quote
      )
    );
    cancelEdit();
  }

  function deleteQuote(id: string) {
    setQuotes(quotes.filter((quote) => quote.id !== id));
    if (editingId === id) cancelEdit();
  }

  function exportQuotes() {
    const backup = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      quotes,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ikigai-quotes-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMessage("Quotes exported.");
  }

  async function importQuotes(file: File | null) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const incoming = Array.isArray(parsed)
        ? parsed.filter(isQuote)
        : Array.isArray((parsed as { quotes?: unknown }).quotes)
          ? ((parsed as { quotes: unknown[] }).quotes.filter(isQuote) as Quote[])
          : [];
      if (incoming.length === 0) throw new Error("No valid quotes in file.");
      setQuotes(mergeQuotes(quotes, incoming));
      setLibraryOpen(true);
      setBackupMessage(
        `Imported ${incoming.length} quote${incoming.length === 1 ? "" : "s"}.`
      );
    } catch (error) {
      setBackupMessage(
        error instanceof Error ? error.message : "Could not import that file."
      );
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
          Daily · VibeTrack
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 font-display text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl"
        >
          {format(new Date(), "EEEE, MMMM d")}
        </motion.h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
          Quote of the day and long-term habits — now inside Ikigai 2.0.
        </p>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-3"
      >
        <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          Quote of the day
        </h2>
        {todaysQuote ? (
          <blockquote className="border-l-2 border-[var(--accent)] pl-5 sm:pl-6">
            <p className="font-display text-xl leading-snug font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
              “{todaysQuote.text}”
            </p>
            <footer className="mt-3 text-sm text-[var(--muted)]">
              — {todaysQuote.author}
            </footer>
          </blockquote>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Add a quote below to begin your collection.
          </p>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Today’s habits
          </h2>
          <span className="text-sm tabular-nums text-[var(--muted)]">
            {completedCount}/{HABITS.length}
          </span>
        </div>

        <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {HABITS.map((habit) => {
            const checked = day.checks[habit.id];
            return (
              <li key={habit.id} className="py-2">
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 py-2 transition",
                    checked && "text-[var(--muted)]"
                  )}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    onChange={() => toggleHabit(habit.id)}
                  />
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded border transition",
                      checked
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    )}
                  >
                    {checked && <Check className="size-3.5" strokeWidth={2.5} />}
                  </span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {habit.label}
                  </span>
                </label>

                {habit.id === "reading" && checked && (
                  <div className="mb-2 ml-8 space-y-1.5">
                    <Label htmlFor="books-read" className="text-xs text-[var(--muted)]">
                      Books read today
                    </Label>
                    <Input
                      id="books-read"
                      value={day.readingBooks}
                      onChange={(event) =>
                        updateReadingBooks(event.target.value)
                      }
                      placeholder="e.g. Atomic Habits, Meditations"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="space-y-4"
      >
        <div>
          <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Add a quote
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Saved quotes rotate as your future quotes of the day.
          </p>
        </div>

        <form onSubmit={handleAddQuote} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="quote-text">Quote</Label>
            <Textarea
              id="quote-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write something worth returning to…"
              required
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quote-author">Author</Label>
            <Input
              id="quote-author"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <Button type="submit" variant="accent">
            <Plus />
            Save quote
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-sm text-[var(--muted)]">
            {quotes.length} quote{quotes.length === 1 ? "" : "s"} in your library
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLibraryOpen((open) => !open)}
            aria-expanded={libraryOpen}
          >
            {libraryOpen ? "Hide library" : "Browse library"}
            {libraryOpen ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>

        {backupMessage && (
          <p className="text-sm text-[var(--accent)]">{backupMessage}</p>
        )}

        {libraryOpen && (
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search quotes or authors…"
                  className="pl-9"
                />
              </label>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={exportQuotes}>
                  <Download />
                  Export
                </Button>
                <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)]">
                  <Upload className="size-4" />
                  Import
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={(event) => {
                      void importQuotes(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <p className="text-xs text-[var(--muted)]">
              {deferredSearch.trim()
                ? `${filteredQuotes.length} of ${quotes.length} match`
                : `Grouped by author · ${quotes.length} total`}
            </p>

            {filteredQuotes.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No quotes match that search.
              </p>
            ) : (
              <div className="max-h-[min(28rem,55svh)] space-y-5 overflow-auto pr-1">
                {quoteGroups.map((group) => (
                  <section key={group.author}>
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold">
                        {group.author}
                      </h3>
                      <span className="text-xs text-[var(--muted)]">
                        {group.quotes.length}
                      </span>
                    </div>
                    <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                      {group.quotes.map((quote) => {
                        const isEditing = editingId === quote.id;
                        const isExpanded =
                          expandedId === quote.id || isEditing;
                        return (
                          <li key={quote.id} className="py-3">
                            {isEditing ? (
                              <form className="space-y-3" onSubmit={saveEdit}>
                                <Textarea
                                  value={editText}
                                  onChange={(event) =>
                                    setEditText(event.target.value)
                                  }
                                  required
                                  className="min-h-[90px]"
                                />
                                <Input
                                  value={editAuthor}
                                  onChange={(event) =>
                                    setEditAuthor(event.target.value)
                                  }
                                  placeholder="Author"
                                />
                                <div className="flex gap-2">
                                  <Button type="submit" size="sm" variant="accent">
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="flex w-full items-start justify-between gap-3 text-left"
                                  onClick={() =>
                                    setExpandedId((current) =>
                                      current === quote.id ? null : quote.id
                                    )
                                  }
                                  aria-expanded={isExpanded}
                                >
                                  <p
                                    className={cn(
                                      "font-display text-sm leading-snug font-medium text-[var(--foreground)]",
                                      !isExpanded && "line-clamp-2"
                                    )}
                                  >
                                    “{quote.text}”
                                  </p>
                                  {isExpanded ? (
                                    <ChevronUp className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" />
                                  ) : (
                                    <ChevronDown className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" />
                                  )}
                                </button>
                                {isExpanded && (
                                  <div className="mt-2 flex flex-wrap items-center gap-3">
                                    <p className="text-sm text-[var(--muted)]">
                                      — {quote.author}
                                    </p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEdit(quote)}
                                    >
                                      <Pencil />
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteQuote(quote.id)}
                                    >
                                      <Trash2 />
                                      Delete
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.section>
    </div>
  );
}
