import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const STORE = 'yrah-deck'
export const uid = () => Math.random().toString(36).slice(2, 9)

const starter = {
  title: 'starter deck',
  cards: [
    { term: 'nailong', def: 'a chubby yellow dino who is always happy' },
    { term: 'spaced repetition', def: 'reviewing cards at growing intervals so they stick' },
    { term: 'active recall', def: 'testing yourself instead of re-reading notes' },
  ],
}

const withIds = (deck) => ({ ...deck, cards: deck.cards.map((c) => (c.id ? c : { ...c, id: uid() })) })

// a bad saved deck (old format, manual edits) must never crash the app
function sanitize(raw) {
  if (!raw || !Array.isArray(raw.cards)) return starter
  return {
    title: typeof raw.title === 'string' ? raw.title : '',
    cards: raw.cards.filter((c) => c && typeof c === 'object')
      .map((c) => ({ id: c.id, term: String(c.term ?? ''), def: String(c.def ?? '') })),
  }
}

function loadDeck() {
  try { return withIds(sanitize(JSON.parse(localStorage.getItem(STORE)))) } catch { return withIds(starter) }
}

const DeckContext = createContext(null)

export function DeckProvider({ children }) {
  const [deck, setDeck] = useState(loadDeck)
  const [toast, setToast] = useState('')
  const timer = useRef()

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(deck)) } catch { /* private mode, ignore */ }
  }, [deck])

  const notify = useCallback((msg) => {
    setToast(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2600)
  }, [])

  // replaces the deck with freshly imported cards
  const loadCards = useCallback((cards, title = '') => setDeck(withIds({ title, cards })), [])

  return (
    <DeckContext.Provider value={{ deck, setDeck, notify, loadCards }}>
      {children}
      <div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div>
    </DeckContext.Provider>
  )
}

export const useDeck = () => useContext(DeckContext)
