import { useEffect, useRef } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AddCircleIcon, TrashBinMinimalisticIcon, CloseIcon, PlayIcon, AltArrowLeftIcon, MagicWandIcon } from '@solar-icons/react/bold'
import { useLibrary, uid, playableCards } from '../lib/library.jsx'
import { useConfirm } from '../lib/confirm.jsx'
import { firstSentence } from '../lib/shorten.js'
import FolderSelect from '../components/FolderSelect.jsx'

// textarea that grows with its content
function Grow(props) {
  const ref = useRef()
  useEffect(() => {
    const fit = () => {
      const el = ref.current
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
    fit()
    // rotating the phone changes the width, so refit
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [props.value])
  return <textarea ref={ref} rows={1} {...props} />
}

export default function Deck() {
  const { deckId } = useParams()
  const lib = useLibrary()
  const navigate = useNavigate()
  const ask = useConfirm()
  const deck = lib.getDeck(deckId)

  useEffect(() => { if (deck) lib.openDeck(deck.id) }, [deckId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!deck) return <Navigate to="/library" replace />

  const count = playableCards(deck).length
  const path = lib.path(deck.folderId)
  const back = deck.folderId ? `/library/${deck.folderId}` : '/library'
  const longAnswers = deck.cards.filter((c) => firstSentence(c.def) !== c.def.replace(/\s+/g, ' ').trim()).length

  const setCards = (fn) => lib.updateDeck(deck.id, (d) => ({ cards: fn(d.cards) }))
  const update = (id, key, value) => setCards((cards) => cards.map((c) => (c.id === id ? { ...c, [key]: value } : c)))
  const remove = (id) => setCards((cards) => cards.filter((c) => c.id !== id))
  const add = () => {
    setCards((cards) => [...cards, { id: uid(), term: '', def: '' }])
    // focus the new card once it renders
    setTimeout(() => {
      const rows = document.querySelectorAll('.card-row textarea')
      rows[rows.length - 2]?.focus()
    }, 50)
  }

  const shortenAll = async () => {
    const ok = await ask({
      title: 'shorten answers?',
      text: `${longAnswers} long ${longAnswers === 1 ? 'answer' : 'answers'} will be cut to 1 sentence. you can still edit them after.`,
      ok: 'shorten', cancel: 'not now', Icon: MagicWandIcon,
    })
    if (!ok) return
    setCards((cards) => cards.map((c) => ({ ...c, def: firstSentence(c.def) })))
    lib.notify('answers shortened ✦')
  }

  const removeDeck = async () => {
    const ok = await ask({
      title: 'delete this deck?',
      text: `all ${deck.cards.length} cards will be gone. this can't be undone.`,
      ok: 'yes, delete', cancel: 'keep it', Icon: TrashBinMinimalisticIcon, danger: true,
    })
    if (!ok) return
    lib.deleteDeck(deck.id)
    lib.notify('deck deleted')
    navigate(back, { replace: true })
  }

  return (
    <section className="deck-page page-top">
      <Link to={back} className="back-link"><AltArrowLeftIcon size={20} /> {path.length ? path[path.length - 1].name : 'library'}</Link>

      <div className="deck-head">
        <p className="eyebrow">{path.length ? path.map((f) => f.name).join(' / ') : 'unsorted'} · {count} cards</p>
        <input className="deck-title" placeholder="untitled deck" maxLength={60} value={deck.title}
          onChange={(e) => lib.updateDeck(deck.id, { title: e.target.value })} />
      </div>

      <FolderSelect label="saved in" value={deck.folderId} onChange={(folderId) => { lib.updateDeck(deck.id, { folderId }); lib.notify('deck moved ✦') }} />

      <div className="deck-tools">
        <button className="deck-btn" data-sfx="none" disabled={!longAnswers} onClick={shortenAll}><MagicWandIcon size={18} /> shorten</button>
        <button className="deck-btn" data-sfx="pop" onClick={add}><AddCircleIcon size={18} /> card</button>
        <button className="deck-btn danger" data-sfx="none" onClick={removeDeck}><TrashBinMinimalisticIcon size={18} /> delete</button>
      </div>

      <div className="card-list">
        {deck.cards.map((c, i) => (
          <div className="card-row" key={c.id}>
            <div className="card-row-head">
              <span className="card-num">{i + 1}</span>
              <button className="del" data-sfx="trash" aria-label="delete card" onClick={() => remove(c.id)}><CloseIcon size={16} /></button>
            </div>
            <label>
              <span>term</span>
              <Grow placeholder="e.g. photosynthesis" value={c.term} onChange={(e) => update(c.id, 'term', e.target.value)} />
            </label>
            <label>
              <span>definition</span>
              <Grow placeholder="keep it short: a keyword or 1 sentence" value={c.def} onChange={(e) => update(c.id, 'def', e.target.value)} />
            </label>
          </div>
        ))}
        {!deck.cards.length && <p className="empty">no cards yet. add one below.</p>}
      </div>

      <button className="add-card" data-sfx="pop" onClick={add}><AddCircleIcon size={24} /> add card</button>

      {/* sticky study bar sits above the tab bar on phones */}
      <div className="study-bar">
        <span className="muted">{count} cards ready</span>
        <button className="btn btn-primary" disabled={!count} onClick={() => navigate(`/study/${deck.id}`)}><PlayIcon size={18} /> study</button>
      </div>
    </section>
  )
}
