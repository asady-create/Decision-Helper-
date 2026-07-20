import { emptyHabits, type DayHabits } from './habits'
import { SEED_QUOTES, type Quote } from './quotes'

const QUOTES_KEY = 'vibetrack:quotes'
const HABITS_KEY = 'vibetrack:habits'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
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

export function loadHabitsForDay(dateKey: string): DayHabits {
  const all = readJson<Record<string, DayHabits>>(HABITS_KEY, {})
  return { ...emptyHabits(), ...(all[dateKey] ?? {}) }
}

export function saveHabitsForDay(dateKey: string, habits: DayHabits): void {
  try {
    const all = readJson<Record<string, DayHabits>>(HABITS_KEY, {})
    all[dateKey] = habits
    localStorage.setItem(HABITS_KEY, JSON.stringify(all))
  } catch {
    // Ignore storage quota / private-mode write failures.
  }
}
