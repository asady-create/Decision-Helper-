export type Quote = {
  id: string
  text: string
  author: string
  createdAt: string
}

export const SEED_QUOTES: Quote[] = [
  {
    id: 'seed-1',
    text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    author: 'Aristotle',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-2',
    text: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-3',
    text: 'Small disciplines repeated with consistency every day lead to great achievements.',
    author: 'John C. Maxwell',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

/** Stable day index so the same quote is shown for a given calendar day. */
export function quoteOfTheDay(quotes: Quote[], dateKey: string): Quote | null {
  if (quotes.length === 0) return null

  let hash = 0
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0
  }

  return quotes[hash % quotes.length] ?? null
}
