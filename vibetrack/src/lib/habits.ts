export const HABITS = [
  { id: 'gym', label: 'Gym' },
  { id: 'running', label: 'Running' },
  { id: 'cycling', label: 'Cycling' },
  { id: 'swimming', label: 'Swimming' },
  { id: 'meditation', label: 'Meditation' },
  { id: 'reading', label: 'Reading' },
  { id: 'learning', label: 'Learning' },
  { id: 'investing', label: 'Investing' },
  { id: 'praying', label: 'Praying' },
] as const

export type HabitId = (typeof HABITS)[number]['id']

export type DayHabits = {
  checks: Record<HabitId, boolean>
  readingBooks: string
}

export function emptyChecks(): Record<HabitId, boolean> {
  return {
    gym: false,
    running: false,
    cycling: false,
    swimming: false,
    meditation: false,
    reading: false,
    learning: false,
    investing: false,
    praying: false,
  }
}

export function emptyHabits(): DayHabits {
  return {
    checks: emptyChecks(),
    readingBooks: '',
  }
}

/** Accepts both the legacy boolean map and the current day-entry shape. */
export function normalizeDayHabits(raw: unknown): DayHabits {
  const base = emptyHabits()
  if (!raw || typeof raw !== 'object') return base

  const value = raw as Record<string, unknown>

  if ('checks' in value && value.checks && typeof value.checks === 'object') {
    return {
      checks: { ...base.checks, ...(value.checks as Record<HabitId, boolean>) },
      readingBooks:
        typeof value.readingBooks === 'string' ? value.readingBooks : '',
    }
  }

  const checks = { ...base.checks }
  for (const habit of HABITS) {
    if (typeof value[habit.id] === 'boolean') {
      checks[habit.id] = value[habit.id] as boolean
    }
  }

  return {
    checks,
    readingBooks:
      typeof value.readingBooks === 'string' ? value.readingBooks : '',
  }
}
