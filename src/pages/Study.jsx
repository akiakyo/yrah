import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  CloseCircleIcon, CloseIcon, CheckIcon, PenNewSquareIcon, MenuDotsIcon, UndoLeftRoundIcon, ShuffleIcon,
  TransferHorizontalIcon, RestartIcon, CloudUploadIcon, CupStarIcon, Home2Icon, LayersMinimalisticIcon,
} from '@solar-icons/react/bold'
import { VolumeLoudIcon, VolumeCrossIcon } from '@solar-icons/react/bold'
import { useDeck } from '../lib/deck.jsx'
import { sfx } from '../lib/sfx.js'
import { useMuted } from '../lib/useMuted.js'

const SWIPE = 90

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

const buzz = (ms = 8) => navigator.vibrate?.(ms)

export default function Study() {
  const { deck } = useDeck()
  const navigate = useNavigate()
  const { state, pathname } = useLocation()
  const playable = useMemo(() => deck.cards.filter((c) => c.term.trim() || c.def.trim()), [deck.cards])

  const [round, setRound] = useState(() => playable.map((_, i) => i))
  const [results, setResults] = useState([])
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [swapped, setSwapped] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState(0)
  const [sheet, setSheet] = useState(false)
  const [banner, setBanner] = useState(state?.made || 0)
  const drag = useRef(null)
  const dxRef = useRef(0)
  // blocks a second answer while the card is still flying out (fast double taps)
  const busy = useRef(false)
  const [muted, toggleMute] = useMuted()

  // the "cards made" banner should show once, not again after a refresh
  useEffect(() => {
    if (state?.made) navigate(pathname, { replace: true, state: null })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const card = playable[round[pos]]
  const done = pos >= round.length
  const known = results.filter((r) => r === 'know').length
  const again = results.filter((r) => r === 'again').length

  useEffect(() => { if (done && round.length) sfx('done') }, [done, round.length])

  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(0), 3200)
    return () => clearTimeout(t)
  }, [banner])

  const start = (indices) => {
    setRound(indices)
    setResults([])
    setPos(0)
    setFlipped(false)
    setLeaving(0)
    setSheet(false)
  }
  const restart = (shuffle = isShuffled) => start(shuffle ? shuffled(playable.map((_, i) => i)) : playable.map((_, i) => i))

  const answer = (r) => {
    if (done || busy.current) return
    busy.current = true
    buzz()
    sfx(r)
    setLeaving(r === 'know' ? 1 : -1)
    setTimeout(() => {
      setResults((res) => { const n = [...res]; n[pos] = r; return n })
      setPos((p) => p + 1)
      setFlipped(false)
      setLeaving(0)
      setDx(0)
      dxRef.current = 0
      busy.current = false
    }, 260)
  }

  const undo = () => {
    if (pos === 0 || busy.current) return
    buzz()
    sfx('undo')
    setPos((p) => p - 1)
    setResults((res) => res.slice(0, pos - 1))
    setFlipped(false)
  }

  const flip = () => { buzz(5); sfx('flip'); setFlipped((f) => !f) }

  // swipe: right = know it, left = still learning, tap = flip
  const onDown = (e) => {
    // left mouse button / finger only
    if (busy.current || e.button !== 0) return
    drag.current = { x: e.clientX, moved: false }
    dxRef.current = 0
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e) => {
    if (!drag.current) return
    const d = e.clientX - drag.current.x
    if (Math.abs(d) > 6) drag.current.moved = true
    dxRef.current = d
    setDx(d)
  }
  const onUp = (e) => {
    if (!drag.current) return
    const { moved } = drag.current
    drag.current = null
    setDragging(false)
    // read the ref, the dx state can be one render behind on fast swipes
    const d = dxRef.current
    if (e.type !== 'pointercancel' && d > SWIPE) answer('know')
    else if (e.type !== 'pointercancel' && d < -SWIPE) answer('again')
    else { setDx(0); dxRef.current = 0; if (!moved && e.type !== 'pointercancel') flip() }
  }

  // desktop keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (sheet) return
      if (e.key === 'Escape') return navigate('/')
      // let focused buttons, links and inputs handle their own keys
      if (e.target.closest?.('button, a, input, textarea, select')) return
      if (done || e.repeat) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip() }
      if (e.key === 'ArrowRight') answer('know')
      if (e.key === 'ArrowLeft') answer('again')
      if (e.key === 'Backspace' || e.key === 'z') undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!playable.length) {
    return (
      <div className="study study-empty">
        <LayersMinimalisticIcon size={56} />
        <h2 className="display">no cards yet</h2>
        <p className="muted">upload a pdf or make a deck first.</p>
        <Link to="/tools/pdf-fc" className="btn btn-primary">upload a pdf</Link>
        <Link to="/deck" className="btn btn-ghost">make a deck</Link>
      </div>
    )
  }

  const x = leaving ? leaving * window.innerWidth : dx
  const tilt = x / 18
  const front = card ? (swapped ? card.def : card.term) : ''
  const back = card ? (swapped ? card.term : card.def) : ''

  return (
    <div className="study">
      <header className="study-top">
        <button className="icon-btn" aria-label="close" onClick={() => navigate('/')}><CloseCircleIcon size={28} /></button>
        <div className="study-title">
          <strong>{deck.title || 'untitled deck'}</strong>
          <span>{Math.min(pos + 1, round.length)} / {round.length}</span>
        </div>
        <Link to="/deck" className="icon-btn" aria-label="edit cards"><PenNewSquareIcon size={26} /></Link>
        <button className="icon-btn" aria-label="options" onClick={() => setSheet(true)}><MenuDotsIcon size={26} /></button>
      </header>

      <div className="progress"><span style={{ width: `${(pos / round.length) * 100}%` }} /></div>

      {banner > 0 && <div className="made-banner">✦ {banner} cards made. tap a card to flip</div>}

      {!done ? (
        <>
          <div className="study-counts">
            <span className="count again">{again} still learning</span>
            <span className="count know">{known} know it</span>
          </div>

          <div className="card-stage">
            {/* the next card peeks from behind */}
            {round[pos + 1] !== undefined && <div className="peek" />}
            <div key={pos} className={`study-card enter ${flipped ? 'flipped' : ''} ${dragging ? 'dragging' : ''}`}
              style={{ transform: `translateX(${x}px) rotate(${tilt}deg)` }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              role="button" tabIndex={0} aria-label="flashcard, tap to flip">
              <span className="stamp stamp-know" style={{ opacity: Math.max(0, Math.min(x / SWIPE, 1)) }}>know it</span>
              <span className="stamp stamp-again" style={{ opacity: Math.max(0, Math.min(-x / SWIPE, 1)) }}>again</span>
              <div className="s-inner">
                <div className="s-face front"><span className="tag">{swapped ? 'definition' : 'term'}</span><p>{front}</p></div>
                <div className="s-face back"><span className="tag">{swapped ? 'term' : 'definition'}</span><p>{back}</p></div>
              </div>
            </div>
          </div>

          <p className="swipe-hint">tap to flip · swipe right if you know it</p>

          <div className="study-actions">
            <button className="act act-again" data-sfx="none" onClick={() => answer('again')} aria-label="still learning"><CloseIcon size={34} /></button>
            <button className="act act-undo" data-sfx="none" onClick={undo} disabled={pos === 0} aria-label="undo"><UndoLeftRoundIcon size={24} /></button>
            <button className="act act-know" data-sfx="none" onClick={() => answer('know')} aria-label="know it"><CheckIcon size={34} /></button>
          </div>
        </>
      ) : (
        <div className="done">
          <span className="done-icon"><CupStarIcon size={56} /></span>
          <h2 className="display sticker">{again === 0 ? 'perfect!' : 'nice work!'}</h2>
          <p className="muted">you know {known} of {round.length} cards</p>
          <div className="done-bar">
            <span className="know" style={{ width: `${(known / round.length) * 100}%` }} />
          </div>
          <div className="done-actions">
            {again > 0 && (
              <button className="btn btn-primary btn-block" onClick={() => start(round.filter((_, i) => results[i] === 'again'))}>
                study {again} {again === 1 ? 'card' : 'cards'} again
              </button>
            )}
            <button className={`btn btn-block ${again > 0 ? 'btn-ghost' : 'btn-primary'}`} onClick={() => restart()}><RestartIcon size={20} /> restart deck</button>
            <Link to="/deck" className="btn btn-ghost btn-block"><PenNewSquareIcon size={20} /> edit cards</Link>
            <Link to="/" className="btn btn-ghost btn-block"><Home2Icon size={20} /> home</Link>
          </div>
        </div>
      )}

      {sheet && (
        <div className="sheet-wrap" onClick={() => setSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <span className="sheet-grip" />
            <p className="mega-title">options</p>
            <button className="sheet-item" data-sfx="none" onClick={toggleMute}>
              {muted ? <VolumeCrossIcon size={24} /> : <VolumeLoudIcon size={24} />} <span>sound effects</span> <span className={`switch ${muted ? '' : 'on'}`} />
            </button>
            <button className="sheet-item" data-sfx="toggle" onClick={() => { setIsShuffled((s) => !s); restart(!isShuffled) }}>
              <ShuffleIcon size={24} /> <span>shuffle</span> <span className={`switch ${isShuffled ? 'on' : ''}`} />
            </button>
            <button className="sheet-item" data-sfx="toggle" onClick={() => { setSwapped((s) => !s); setFlipped(false) }}>
              <TransferHorizontalIcon size={24} /> <span>definition first</span> <span className={`switch ${swapped ? 'on' : ''}`} />
            </button>
            <button className="sheet-item" onClick={() => restart()}><RestartIcon size={24} /> <span>restart</span></button>
            <Link className="sheet-item" to="/deck"><PenNewSquareIcon size={24} /> <span>edit cards</span></Link>
            <Link className="sheet-item" to="/tools/pdf-fc"><CloudUploadIcon size={24} /> <span>upload another pdf</span></Link>
          </div>
        </div>
      )}
    </div>
  )
}
