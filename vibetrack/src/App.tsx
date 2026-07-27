import { useDeferredValue, useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
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
} from 'lucide-react'
import { HABITS, type HabitId } from './lib/habits'
import {
  filterQuotes,
  groupQuotesByAuthor,
  quoteOfTheDay,
  type Quote,
} from './lib/quotes'
import {
  createQuoteBackup,
  loadHabitsForDay,
  loadQuotes,
  mergeQuotes,
  parseQuoteBackup,
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
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(searchQuery)

  const todaysQuote = quoteOfTheDay(quotes, dateKey)
  const completedCount = HABITS.filter((habit) => habits.checks[habit.id]).length
  const filteredQuotes = filterQuotes(quotes, deferredSearch)
  const quoteGroups = groupQuotesByAuthor(filteredQuotes)

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
    setExpandedId(quote.id)
    setEditingId(quote.id)
    setEditText(quote.text)
    setEditAuthor(quote.author)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
    setEditAuthor('')
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id))
    if (editingId === id) cancelEdit()
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

  function exportQuotes() {
    const backup = createQuoteBackup(quotes)
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `vibetrack-quotes-${format(new Date(), 'yyyy-MM-dd')}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setBackupMessage('Quotes exported. Keep this file to restore later.')
  }

  async function importQuotes(file: File | null) {
    if (!file) return

    try {
      const raw = await file.text()
      const incoming = parseQuoteBackup(raw)
      setQuotes((current) => mergeQuotes(current, incoming))
      setLibraryOpen(true)
      setBackupMessage(
        `Imported ${incoming.length} quote${incoming.length === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      setBackupMessage(
        error instanceof Error ? error.message : 'Could not import that file.',
      )
    }
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

          <p className="storage-note">
            Quotes are saved in this browser for this exact site address. Switching
            between localhost ports or preview links starts a fresh library —
            use Export / Import to keep them.
          </p>

          {backupMessage && <p className="backup-message">{backupMessage}</p>}

          {libraryOpen && (
            <div id="quote-library" className="library-panel">
              <div className="library-tools">
                <label className="library-search">
                  <Search size={16} strokeWidth={2.25} aria-hidden="true" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search quotes or authors…"
                  />
                </label>

                <div className="backup-actions">
                  <button
                    type="button"
                    className="text-action"
                    onClick={exportQuotes}
                  >
                    <Download size={14} strokeWidth={2.25} />
                    Export
                  </button>
                  <label className="text-action import-action">
                    <Upload size={14} strokeWidth={2.25} />
                    Import
                    <input
                      type="file"
                      accept="application/json,.json"
                      hidden
                      onChange={(event) => {
                        void importQuotes(event.target.files?.[0] ?? null)
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>

              <p className="library-meta">
                {quotes.length === 0
                  ? 'No quotes in your library yet.'
                  : deferredSearch.trim()
                    ? `${filteredQuotes.length} of ${quotes.length} match`
                    : `Grouped by author · ${quotes.length} total`}
              </p>

              {quotes.length === 0 ? null : filteredQuotes.length === 0 ? (
                <p className="library-empty">No quotes match that search.</p>
              ) : (
                <div className="library-scroll">
                  {quoteGroups.map((group) => (
                    <section key={group.author} className="library-group">
                      <div className="library-group-head">
                        <h3>{group.author}</h3>
                        <span>
                          {group.quotes.length} quote
                          {group.quotes.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <ul className="library-list">
                        {group.quotes.map((quote) => {
                          const isEditing = editingId === quote.id
                          const isExpanded = expandedId === quote.id || isEditing

                          return (
                            <li
                              key={quote.id}
                              className={`library-item ${isExpanded ? 'is-expanded' : ''}`}
                            >
                              {isEditing ? (
                                <form className="library-edit" onSubmit={saveEdit}>
                                  <label className="field">
                                    <span>Quote</span>
                                    <textarea
                                      value={editText}
                                      onChange={(event) =>
                                        setEditText(event.target.value)
                                      }
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
                                    <button
                                      type="submit"
                                      className="text-action primary"
                                    >
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
                                  <button
                                    type="button"
                                    className="library-summary"
                                    onClick={() => toggleExpanded(quote.id)}
                                    aria-expanded={isExpanded}
                                  >
                                    <p className="library-quote">
                                      “{quote.text}”
                                    </p>
                                    <span className="library-chevron" aria-hidden="true">
                                      {isExpanded ? (
                                        <ChevronUp size={16} strokeWidth={2.25} />
                                      ) : (
                                        <ChevronDown size={16} strokeWidth={2.25} />
                                      )}
                                    </span>
                                  </button>

                                  {isExpanded && (
                                    <div className="library-details">
                                      <p className="library-author">
                                        — {quote.author}
                                      </p>
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
                                    </div>
                                  )}
                                </>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
