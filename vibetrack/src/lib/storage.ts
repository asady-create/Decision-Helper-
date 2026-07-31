import { emptyHabits, normalizeDayHabits, type DayHabits } from './habits'
import { SEED_QUOTES, type Quote } from './quotes'

const QUOTES_KEY = 'vibetrack:quotes'
const HABITS_KEY = 'vibetrack:habits'

export type QuoteBackup = {
  version: 1
  exportedAt: string
  quotes: Quote[]
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function isQuote(value: unknown): value is Quote {
  if (!value || typeof value !== 'object') return false
  const quote = value as Record<string, unknown>
  return (
    typeof quote.id === 'string' &&
    typeof quote.text === 'string' &&
    typeof quote.author === 'string' &&
    typeof quote.createdAt === 'string'
  )
}

export function loadQuotes(): Quote[] {
  const quotes = readJson<Quote[]>(QUOTES_KEY, SEED_QUOTES)
  return Array.isArray(quotes) && quotes.length > 0 ? quotes : SEED_QUOTES
}

export function saveQuotes(quotes: Quote[]): void {
  try {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes))
  } catch {
    // Ignore storage quota / private-mode write failures.
  }
}

export function createQuoteBackup(quotes: Quote[]): QuoteBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    quotes,
  }
}

export function parseQuoteBackup(raw: string): Quote[] {
  const parsed = JSON.parse(raw) as unknown

  if (Array.isArray(parsed)) {
    const quotes = parsed.filter(isQuote)
    if (quotes.length === 0) throw new Error('No valid quotes found in file.')
    return quotes
  }

  if (parsed && typeof parsed === 'object') {
    const backup = parsed as Partial<QuoteBackup>
    if (Array.isArray(backup.quotes)) {
      const quotes = backup.quotes.filter(isQuote)
      if (quotes.length === 0) throw new Error('No valid quotes found in file.')
      return quotes
    }
  }

  throw new Error('Unrecognized backup format.')
}

export function mergeQuotes(current: Quote[], incoming: Quote[]): Quote[] {
  const byId = new Map<string, Quote>()
  for (const quote of [...incoming, ...current]) {
    byId.set(quote.id, quote)
  }
  return [...byId.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

export function loadHabitsForDay(dateKey: string): DayHabits {
  const all = readJson<Record<string, unknown>>(HABITS_KEY, {})
  return normalizeDayHabits(all[dateKey] ?? emptyHabits())
}

export function saveHabitsForDay(dateKey: string, habits: DayHabits): void {
  try {
    const all = readJson<Record<string, unknown>>(HABITS_KEY, {})
    all[dateKey] = habits
    localStorage.setItem(HABITS_KEY, JSON.stringify(all))
  } catch {
    // Ignore storage quota / private-mode write failures.
  }
}
