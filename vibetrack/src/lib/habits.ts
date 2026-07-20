export const HABITS = [
  { id: 'gym', label: 'Gym' },
  { id: 'running', label: 'Running' },
  { id: 'meditation', label: 'Meditation' },
  { id: 'reading', label: 'Reading' },
  { id: 'investing', label: 'Investing' },
  { id: 'praying', label: 'Praying' },
] as const

export type HabitId = (typeof HABITS)[number]['id']

export type DayHabits = Record<HabitId, boolean>

export function emptyHabits(): DayHabits {
  return {
    gym: false,
    running: false,
    meditation: false,
    reading: false,
    investing: false,
    praying: false,
  }
}
