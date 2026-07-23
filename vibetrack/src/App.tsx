import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'
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
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editAuthor, setEditAuthor] = useState('')

  const todaysQuote = quoteOfTheDay(quotes, dateKey)
  const completedCount = HABITS.filter((habit) => habits.checks[habit.id]).length

  useEffect(() => {
    saveQuotes(quotes)
  }, [quotes])

  useEffect(() => {
    saveHabitsForDay(dateKey, habits)
  }, [dateKey, habits])

  function toggleHabit(id: HabitId) {
    setHabits((current) => ({
      ...current,
      checks: { ...current.checks, [id]: !current.checks[id] },
    }))
  }

  function updateReadingBooks(value: string) {
    setHabits((current) => ({
      ...current,
      readingBooks: value,
      checks: {
        ...current.checks,
        reading: value.trim().length > 0 ? true : current.checks.reading,
      },
    }))
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

  function startEdit(quote: Quote) {
    setEditingId(quote.id)
    setEditText(quote.text)
    setEditAuthor(quote.author)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
    setEditAuthor('')
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingId) return

    const trimmed = editText.trim()
    if (!trimmed) return

    setQuotes((current) =>
      current.map((quote) =>
        quote.id === editingId
          ? {
              ...quote,
              text: trimmed,
              author: editAuthor.trim() || 'Anonymous',
            }
          : quote,
      ),
    )
    cancelEdit()
  }

  function deleteQuote(id: string) {
    setQuotes((current) => current.filter((quote) => quote.id !== id))
    if (editingId === id) cancelEdit()
  }

  return (
    <div className="app">
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
              const checked = habits.checks[habit.id]
              return (
                <li key={habit.id} className="habit-row">
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

                  {habit.id === 'reading' && checked && (
                    <label className="reading-note">
                      <span>Books read today</span>
                      <input
                        type="text"
                        value={habits.readingBooks}
                        onChange={(event) =>
                          updateReadingBooks(event.target.value)
                        }
                        placeholder="e.g. Atomic Habits, Meditations"
                      />
                    </label>
                  )}
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

          <div className="library-bar">
            <p className="library-count">
              {quotes.length} quote{quotes.length === 1 ? '' : 's'} in your
              library
            </p>
            <button
              type="button"
              className="library-toggle"
              aria-expanded={libraryOpen}
              aria-controls="quote-library"
              onClick={() => setLibraryOpen((open) => !open)}
            >
              {libraryOpen ? 'Hide library' : 'Browse library'}
              {libraryOpen ? (
                <ChevronUp size={16} strokeWidth={2.25} />
              ) : (
                <ChevronDown size={16} strokeWidth={2.25} />
              )}
            </button>
          </div>

          {libraryOpen && (
            <ul id="quote-library" className="library-list">
              {quotes.length === 0 ? (
                <li className="library-empty">No quotes in your library yet.</li>
              ) : (
                quotes.map((quote) => {
                  const isEditing = editingId === quote.id

                  return (
                    <li key={quote.id} className="library-item">
                      {isEditing ? (
                        <form className="library-edit" onSubmit={saveEdit}>
                          <label className="field">
                            <span>Quote</span>
                            <textarea
                              value={editText}
                              onChange={(event) => setEditText(event.target.value)}
                              rows={3}
                              required
                            />
                          </label>
                          <label className="field">
                            <span>Author</span>
                            <input
                              type="text"
                              value={editAuthor}
                              onChange={(event) =>
                                setEditAuthor(event.target.value)
                              }
                              placeholder="Optional"
                            />
                          </label>
                          <div className="library-actions">
                            <button type="submit" className="text-action primary">
                              Save
                            </button>
                            <button
                              type="button"
                              className="text-action"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <p className="library-quote">“{quote.text}”</p>
                          <p className="library-author">— {quote.author}</p>
                          <div className="library-actions">
                            <button
                              type="button"
                              className="text-action"
                              onClick={() => startEdit(quote)}
                            >
                              <Pencil size={14} strokeWidth={2.25} />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-action danger"
                              onClick={() => deleteQuote(quote.id)}
                            >
                              <Trash2 size={14} strokeWidth={2.25} />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  )
                })
              )}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
