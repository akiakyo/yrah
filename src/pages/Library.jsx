import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  AddFolderIcon, AddCircleIcon, PlayIcon, Pen2Icon, TrashBinMinimalisticIcon, AltArrowRightIcon, MagnifierIcon,
  DocumentTextIcon, CameraIcon, LayersMinimalisticIcon, FoldersIcon, CloseIcon,
} from '@solar-icons/react/bold'
import { useLibrary, playableCards, MAX_DEPTH } from '../lib/library.jsx'
import { useConfirm } from '../lib/confirm.jsx'

function Crumbs({ path }) {
  return (
    <nav className="crumbs" aria-label="breadcrumb">
      <Link to="/library">library</Link>
      {path.map((f) => (
        <span key={f.id}><AltArrowRightIcon size={14} /><Link to={`/library/${f.id}`}>{f.name}</Link></span>
      ))}
    </nav>
  )
}

function DeckRow({ deck, path, onDelete }) {
  const count = playableCards(deck).length
  return (
    <div className="deck-row">
      <Link to={`/deck/${deck.id}`} className="deck-row-main">
        <span className="deck-row-icon"><LayersMinimalisticIcon size={22} /></span>
        <span className="deck-row-text">
          <strong>{deck.title || 'untitled deck'}</strong>
          <small>{count} {count === 1 ? 'card' : 'cards'}{path ? ` · ${path}` : ''}</small>
        </span>
      </Link>
      <button className="mini danger" data-sfx="none" aria-label="delete deck" onClick={onDelete}><CloseIcon size={14} /></button>
      <Link to={`/study/${deck.id}`} className="deck-play" aria-label={`study ${deck.title}`} onClick={(e) => { if (!count) e.preventDefault() }}>
        <PlayIcon size={20} />
      </Link>
    </div>
  )
}

export default function Library() {
  const { folderId = null } = useParams()
  const lib = useLibrary()
  const ask = useConfirm()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const folder = folderId ? lib.getFolder(folderId) : null

  // imports from tool pages default to the folder you were last looking at
  useEffect(() => { if (!folderId || folder) lib.setPref('folderId', folderId) }, [folderId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (folderId && !folder) return <Navigate to="/library" replace />

  const depth = folder ? lib.depth(folderId) : 0
  const childKind = depth === 0 ? 'course' : 'subject'
  const subs = depth < MAX_DEPTH ? lib.childFolders(folderId) : []
  const decks = lib.decksIn(folderId)
  const q = query.trim().toLowerCase()
  const results = q ? lib.decks.filter((d) => d.title.toLowerCase().includes(q) || d.cards.some((c) => c.term.toLowerCase().includes(q))) : null
  const pathLabel = (d) => lib.path(d.folderId).map((f) => f.name).join(' / ')

  const newFolder = async () => {
    const name = await ask({
      title: `new ${childKind}`,
      text: depth === 0 ? 'a course holds subjects and decks.' : `a subject inside ${folder.name}.`,
      input: { placeholder: depth === 0 ? 'e.g. bs computer science' : 'e.g. physics 101' },
      ok: 'create',
      Icon: AddFolderIcon,
    })
    if (name) { lib.createFolder(name, folderId); lib.notify(`${childKind} created ✦`) }
  }

  const newDeck = () => navigate(`/deck/${lib.createDeck({ title: '', folderId })}`)

  const rename = async () => {
    const name = await ask({ title: `rename ${depth === 1 ? 'course' : 'subject'}`, input: { value: folder.name }, ok: 'save', Icon: Pen2Icon })
    if (name) lib.renameFolder(folder.id, name)
  }

  const removeFolder = async () => {
    const n = lib.deckCount(folder.id)
    const ok = await ask({
      title: `delete ${folder.name}?`,
      text: n ? `its ${n} ${n === 1 ? 'deck moves' : 'decks move'} up a level, nothing is lost.` : 'it is empty.',
      ok: 'yes, delete', cancel: 'keep it', Icon: TrashBinMinimalisticIcon, danger: true,
    })
    if (!ok) return
    lib.deleteFolder(folder.id)
    navigate(folder.parentId ? `/library/${folder.parentId}` : '/library', { replace: true })
  }

  const removeDeck = async (deck) => {
    const ok = await ask({
      title: 'delete this deck?',
      text: `"${deck.title || 'untitled deck'}" and its ${deck.cards.length} cards will be gone.`,
      ok: 'yes, delete', cancel: 'keep it', Icon: TrashBinMinimalisticIcon, danger: true,
    })
    if (ok) { lib.deleteDeck(deck.id); lib.notify('deck deleted') }
  }

  return (
    <section className="library page-top">
      {folder && <Crumbs path={lib.path(folderId).slice(0, -1)} />}

      <div className="lib-head">
        {folder && <span className="lib-color" style={{ background: folder.color }}><FoldersIcon size={26} /></span>}
        <div className="lib-head-text">
          <p className="eyebrow">{folder ? (depth === 1 ? 'course' : 'subject') : 'your library'}</p>
          <h1 className="display">{folder ? folder.name : 'library'}</h1>
        </div>
        {folder && (
          <div className="lib-head-actions">
            <button className="mini" aria-label="rename" onClick={rename}><Pen2Icon size={16} /></button>
            <button className="mini danger" data-sfx="none" aria-label="delete" onClick={removeFolder}><TrashBinMinimalisticIcon size={15} /></button>
          </div>
        )}
      </div>

      {!folder && (
        <label className="search">
          <MagnifierIcon size={20} />
          <input type="search" placeholder="search decks and terms" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      )}

      {results ? (
        <div className="lib-section">
          <p className="mega-title">{results.length} {results.length === 1 ? 'result' : 'results'}</p>
          <div className="deck-list">
            {results.map((d) => <DeckRow key={d.id} deck={d} path={pathLabel(d) || 'unsorted'} onDelete={() => removeDeck(d)} />)}
          </div>
        </div>
      ) : (
        <>
          {depth < MAX_DEPTH && (
            <div className="lib-section">
              <p className="mega-title">{childKind === 'course' ? 'courses' : 'subjects'}</p>
              <div className="folder-grid">
                {subs.map((f, i) => {
                  const inner = lib.childFolders(f.id).length
                  const n = lib.deckCount(f.id)
                  return (
                    <Link key={f.id} to={`/library/${f.id}`} className="folder-tile" style={{ '--tint': f.color, animationDelay: `${i * 0.04}s` }}>
                      <span className="folder-tab" />
                      <FoldersIcon size={26} />
                      <strong>{f.name}</strong>
                      <small>{depth === 0 && inner ? `${inner} ${inner === 1 ? 'subject' : 'subjects'} · ` : ''}{n} {n === 1 ? 'deck' : 'decks'}</small>
                    </Link>
                  )
                })}
                <button className="folder-tile folder-new" onClick={newFolder}>
                  <AddFolderIcon size={26} />
                  <strong>new {childKind}</strong>
                  <small>{childKind === 'course' ? 'e.g. course 1' : 'e.g. subject 1'}</small>
                </button>
              </div>
            </div>
          )}

          <div className="lib-section">
            <p className="mega-title">{folder ? 'decks' : 'unsorted decks'}</p>
            <div className="deck-list">
              {decks.map((d) => <DeckRow key={d.id} deck={d} onDelete={() => removeDeck(d)} />)}
              {!decks.length && <p className="empty small">no decks here yet.</p>}
            </div>
            <div className="lib-actions">
              <button className="deck-btn" data-sfx="pop" onClick={newDeck}><AddCircleIcon size={18} /> new deck</button>
              <Link to="/tools/pdf-fc" className="deck-btn"><DocumentTextIcon size={18} /> from pdf</Link>
              <Link to="/tools/scan-fc" className="deck-btn"><CameraIcon size={18} /> scan</Link>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
