import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { Check, Plus } from 'lucide-react'
import { HABITS, type HabitId } from './lib/habits'
import { quoteOfTheDay, type Quote } from './lib/quotes'
import {
  loadHabitsForDay,
  loadQuotes,
  saveHabitsForDay,
  saveQuotes,
} from './lib/storage'

function todayKey() {
  return format(new Date(), 'yyyy-MM-dd')
}

function App() {
  const dateKey = todayKey()
  const [quotes, setQuotes] = useState<Quote[]>(() => loadQuotes())
  const [habits, setHabits] = useState(() => loadHabitsForDay(dateKey))
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [ready, setReady] = useState(false)

  const todaysQuote = quoteOfTheDay(quotes, dateKey)
  const completedCount = HABITS.filter((habit) => habits[habit.id]).length

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    saveQuotes(quotes)
  }, [quotes])

  useEffect(() => {
    saveHabitsForDay(dateKey, habits)
  }, [dateKey, habits])

  function toggleHabit(id: HabitId) {
    setHabits((current) => ({ ...current, [id]: !current[id] }))
  }

  function handleAddQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    const next: Quote = {
      id: crypto.randomUUID(),
      text: trimmed,
      author: author.trim() || 'Anonymous',
      createdAt: new Date().toISOString(),
    }

    setQuotes((current) => [next, ...current])
    setText('')
    setAuthor('')
  }

  return (
    <div className={`app ${ready ? 'is-ready' : ''}`}>
      <div className="atmosphere" aria-hidden="true" />

      <header className="top">
        <p className="brand">VibeTrack</p>
        <p className="date">{format(new Date(), 'EEEE, MMMM d')}</p>
      </header>

      <main>
        <section className="quote-panel" aria-labelledby="quote-heading">
          <p id="quote-heading" className="section-label">
            Quote of the day
          </p>
          {todaysQuote ? (
            <blockquote className="quote">
              <p>“{todaysQuote.text}”</p>
              <footer>— {todaysQuote.author}</footer>
            </blockquote>
          ) : (
            <p className="empty">Add a quote below to begin your collection.</p>
          )}
        </section>

        <section className="habits-panel" aria-labelledby="habits-heading">
          <div className="section-head">
            <h2 id="habits-heading">Today’s habits</h2>
            <p>
              {completedCount} of {HABITS.length} done
            </p>
          </div>

          <ul className="habit-list">
            {HABITS.map((habit) => {
              const checked = habits[habit.id]
              return (
                <li key={habit.id}>
                  <label className={`habit ${checked ? 'is-checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHabit(habit.id)}
                    />
                    <span className="box" aria-hidden="true">
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                    <span className="label">{habit.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="add-panel" aria-labelledby="add-heading">
          <h2 id="add-heading">Add a quote</h2>
          <p className="hint">Saved quotes rotate as your future quotes of the day.</p>

          <form className="quote-form" onSubmit={handleAddQuote}>
            <label className="field">
              <span>Quote</span>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                placeholder="Write something worth returning to…"
                required
              />
            </label>

            <label className="field">
              <span>Author</span>
              <input
                type="text"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Optional"
              />
            </label>

            <button type="submit" className="submit">
              <Plus size={16} strokeWidth={2.25} />
              Save quote
            </button>
          </form>

          <p className="library-count">
            {quotes.length} quote{quotes.length === 1 ? '' : 's'} in your library
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
