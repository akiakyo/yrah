import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AddCircleIcon, NotesIcon, DocumentTextIcon, TrashBinMinimalisticIcon, CloseIcon, PlayIcon } from '@solar-icons/react/bold'
import { useDeck, uid } from '../lib/deck.jsx'
import { useConfirm } from '../lib/confirm.jsx'

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
  const { deck, setDeck, notify } = useDeck()
  const navigate = useNavigate()
  const ask = useConfirm()
  const count = deck.cards.filter((c) => c.term.trim() || c.def.trim()).length

  const update = (id, key, value) => setDeck((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, [key]: value } : c)) }))
  const remove = (id) => setDeck((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) }))
  const add = () => {
    setDeck((d) => ({ ...d, cards: [...d.cards, { id: uid(), term: '', def: '' }] }))
    // focus the new card once it renders
    setTimeout(() => {
      const rows = document.querySelectorAll('.card-row textarea')
      rows[rows.length - 2]?.focus()
    }, 50)
  }
  const clear = async () => {
    const ok = await ask({
      title: 'clear this deck?',
      text: `all ${count} cards will be gone. this can't be undone.`,
      ok: 'yes, clear it',
      cancel: 'keep them',
      Icon: TrashBinMinimalisticIcon,
      danger: true,
    })
    if (!ok) return
    setDeck({ title: '', cards: [{ id: uid(), term: '', def: '' }] })
    notify('deck cleared')
  }

  return (
    <section className="deck-page page-top">
      <div className="deck-head">
        <p className="eyebrow">my deck · {count} cards</p>
        <input className="deck-title" placeholder="untitled deck" maxLength={60} value={deck.title}
          onChange={(e) => setDeck((d) => ({ ...d, title: e.target.value }))} />
      </div>

      <div className="deck-tools">
        <Link to="/tools/pdf-fc" className="deck-btn"><DocumentTextIcon size={18} /> from pdf</Link>
        <Link to="/tools/notes" className="deck-btn"><NotesIcon size={18} /> notes</Link>
        <button className="deck-btn danger" data-sfx="none" onClick={clear}><TrashBinMinimalisticIcon size={18} /> clear</button>
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
              <Grow placeholder="what it means" value={c.def} onChange={(e) => update(c.id, 'def', e.target.value)} />
            </label>
          </div>
        ))}
        {!deck.cards.length && <p className="empty">no cards yet. add one below.</p>}
      </div>

      <button className="add-card" data-sfx="pop" onClick={add}><AddCircleIcon size={24} /> add card</button>

      {/* sticky study bar sits above the tab bar on phones */}
      <div className="study-bar">
        <span className="muted">{count} cards ready</span>
        <button className="btn btn-primary" disabled={!count} onClick={() => navigate('/study')}><PlayIcon size={18} /> study</button>
      </div>
    </section>
  )
}
