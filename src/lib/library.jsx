import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

// the library: folders (courses at the top, subjects inside them) holding decks of cards.
// saved in localStorage. folder.parentId = null -> course, = course id -> subject
const STORE = 'yrah-library'
const OLD_STORE = 'yrah-deck'
const PREFS = 'yrah-prefs'
export const MAX_DEPTH = 2
export const COLORS = ['#ffd23f', '#ffb59a', '#b8e3a1', '#a8d8ff', '#d7c2ff', '#ffc6e0']

export const uid = () => Math.random().toString(36).slice(2, 9)
const now = () => Date.now()

const starterDeck = () => ({
  id: uid(),
  title: 'starter deck',
  folderId: null,
  updatedAt: now(),
  cards: [
    { id: uid(), term: 'nailong', def: 'a chubby yellow dino who is always happy' },
    { id: uid(), term: 'spaced repetition', def: 'reviewing cards at growing intervals so they stick' },
    { id: uid(), term: 'active recall', def: 'testing yourself instead of re-reading notes' },
  ],
})

// bad or old saved data must never crash the app
const cleanCards = (cards) => (Array.isArray(cards) ? cards : [])
  .filter((c) => c && typeof c === 'object')
  .map((c) => ({ id: typeof c.id === 'string' ? c.id : uid(), term: String(c.term ?? ''), def: String(c.def ?? '') }))

function sanitize(raw) {
  if (!raw || !Array.isArray(raw.decks)) return null
  const folders = (Array.isArray(raw.folders) ? raw.folders : [])
    .filter((f) => f && typeof f.id === 'string')
    .map((f, i) => ({ id: f.id, name: String(f.name || 'untitled'), parentId: f.parentId ?? null, color: f.color || COLORS[i % COLORS.length], createdAt: f.createdAt || now() }))
  const ids = new Set(folders.map((f) => f.id))
  // drop links to folders that no longer exist
  folders.forEach((f) => { if (f.parentId && !ids.has(f.parentId)) f.parentId = null })
  const decks = raw.decks.filter((d) => d && typeof d.id === 'string').map((d) => ({
    id: d.id,
    title: String(d.title ?? ''),
    folderId: d.folderId && ids.has(d.folderId) ? d.folderId : null,
    updatedAt: d.updatedAt || now(),
    cards: cleanCards(d.cards),
  }))
  return { folders, decks, lastDeckId: raw.lastDeckId ?? null }
}

function loadLibrary() {
  try {
    const lib = sanitize(JSON.parse(localStorage.getItem(STORE)))
    if (lib) return lib
  } catch { /* fall through */ }
  // first run after the update: move the old single deck into the library
  try {
    const old = JSON.parse(localStorage.getItem(OLD_STORE))
    const cards = cleanCards(old?.cards).filter((c) => c.term.trim() || c.def.trim())
    if (cards.length) {
      const deck = { id: uid(), title: String(old.title || 'my deck'), folderId: null, updatedAt: now(), cards }
      return { folders: [], decks: [deck], lastDeckId: deck.id }
    }
  } catch { /* ignore */ }
  const deck = starterDeck()
  return { folders: [], decks: [deck], lastDeckId: deck.id }
}

function loadPrefs() {
  try { return { answer: 'sentence', folderId: null, ...JSON.parse(localStorage.getItem(PREFS)) } } catch { return { answer: 'sentence', folderId: null } }
}

const LibraryContext = createContext(null)

export function LibraryProvider({ children }) {
  const [lib, setLib] = useState(loadLibrary)
  const [prefs, setPrefs] = useState(loadPrefs)
  const [toast, setToast] = useState('')
  const timer = useRef()

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(lib)) } catch { /* private mode */ } }, [lib])
  useEffect(() => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)) } catch { /* private mode */ } }, [prefs])

  const notify = useCallback((msg) => {
    setToast(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2600)
  }, [])

  const setPref = useCallback((key, value) => setPrefs((p) => ({ ...p, [key]: value })), [])

  // ---- decks ----
  const createDeck = useCallback(({ title = '', cards = [], folderId = null } = {}) => {
    const deck = { id: uid(), title, folderId, updatedAt: now(), cards: cleanCards(cards) }
    if (!deck.cards.length) deck.cards = [{ id: uid(), term: '', def: '' }]
    setLib((l) => ({ ...l, decks: [deck, ...l.decks], lastDeckId: deck.id }))
    return deck.id
  }, [])

  // patch can be an object or a function of the deck
  const updateDeck = useCallback((id, patch) => setLib((l) => ({
    ...l,
    decks: l.decks.map((d) => (d.id === id ? { ...d, ...(typeof patch === 'function' ? patch(d) : patch), updatedAt: now() } : d)),
  })), [])

  const deleteDeck = useCallback((id) => setLib((l) => ({
    ...l, decks: l.decks.filter((d) => d.id !== id), lastDeckId: l.lastDeckId === id ? null : l.lastDeckId,
  })), [])

  const openDeck = useCallback((id) => setLib((l) => (l.lastDeckId === id ? l : { ...l, lastDeckId: id })), [])

  // ---- folders ----
  const createFolder = useCallback((name, parentId = null) => {
    const folder = { id: uid(), name, parentId, color: COLORS[Math.floor(Math.random() * COLORS.length)], createdAt: now() }
    setLib((l) => ({ ...l, folders: [...l.folders, folder] }))
    return folder.id
  }, [])

  const renameFolder = useCallback((id, name) => setLib((l) => ({
    ...l, folders: l.folders.map((f) => (f.id === id ? { ...f, name } : f)),
  })), [])

  // deleting a folder never deletes decks: they move up to the parent (or unsorted)
  const deleteFolder = useCallback((id) => setLib((l) => {
    const target = l.folders.find((f) => f.id === id)
    if (!target) return l
    const gone = new Set([id, ...l.folders.filter((f) => f.parentId === id).map((f) => f.id)])
    return {
      ...l,
      folders: l.folders.filter((f) => !gone.has(f.id)),
      decks: l.decks.map((d) => (gone.has(d.folderId) ? { ...d, folderId: target.parentId } : d)),
    }
  }), [])

  const value = useMemo(() => {
    const folderById = new Map(lib.folders.map((f) => [f.id, f]))
    const path = (folderId) => {
      const out = []
      let f = folderById.get(folderId)
      while (f) { out.unshift(f); f = folderById.get(f.parentId) }
      return out
    }
    const depth = (folderId) => path(folderId).length
    // every folder inside a folder, including itself
    const within = (folderId) => {
      const ids = new Set([folderId])
      lib.folders.forEach((f) => { if (ids.has(f.parentId)) ids.add(f.id) })
      lib.folders.forEach((f) => { if (ids.has(f.parentId)) ids.add(f.id) })
      return ids
    }
    return {
      ...lib,
      prefs,
      setPref,
      notify,
      getDeck: (id) => lib.decks.find((d) => d.id === id),
      getFolder: (id) => folderById.get(id),
      childFolders: (parentId) => lib.folders.filter((f) => f.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name)),
      decksIn: (folderId) => lib.decks.filter((d) => d.folderId === folderId).sort((a, b) => b.updatedAt - a.updatedAt),
      deckCount: (folderId) => { const ids = within(folderId); return lib.decks.filter((d) => ids.has(d.folderId)).length },
      path,
      depth,
      // "course / subject" labels for folder pickers
      folderOptions: () => {
        const out = []
        const add = (parentId, prefix) => lib.folders.filter((f) => f.parentId === parentId)
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach((f) => { out.push({ id: f.id, label: prefix + f.name }); add(f.id, prefix + f.name + ' / ') })
        add(null, '')
        return out
      },
      createDeck, updateDeck, deleteDeck, openDeck,
      createFolder, renameFolder, deleteFolder,
    }
  }, [lib, prefs, setPref, notify, createDeck, updateDeck, deleteDeck, openDeck, createFolder, renameFolder, deleteFolder])

  return (
    <LibraryContext.Provider value={value}>
      {children}
      <div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div>
    </LibraryContext.Provider>
  )
}

export const useLibrary = () => useContext(LibraryContext)

export const playableCards = (deck) => (deck?.cards || []).filter((c) => c.term.trim() || c.def.trim())
