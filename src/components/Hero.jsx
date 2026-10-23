import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '@solar-icons/react/bold'
import { sfx } from '../lib/sfx.js'

// splits text into letters that pop in one by one
function Split({ text, delay = 0, className = '' }) {
  return (
    <span className={`hero-line ${className}`} aria-hidden="true">
      {[...text].map((ch, i) => (
        <span key={i} className="char" style={{ animationDelay: `${delay + i * 0.045}s` }}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}

export default function Hero() {
  const [flipped, setFlipped] = useState(false)
  const art = useRef()
  const stack = useRef()

  // 3d tilt on the card stack (mouse only)
  useEffect(() => {
    if (matchMedia('(hover: none)').matches) return
    const el = art.current
    const move = (e) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      stack.current.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 18}deg)`
    }
    const leave = () => { stack.current.style.transform = '' }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
  }, [])

  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="pill reveal"><span className="pulse" /> free study tools, no sign up</p>
        {/* one h1 for seo, the letter spans are hidden from screen readers */}
        <h1 className="display hero-title" aria-label="study cuter. learn faster.">
          <Split text="study cuter." />
          <Split text="learn faster." delay={0.5} className="accent" />
        </h1>
        <p className="lead reveal">drop in a pdf, word doc, slides or your messy notes. get clean flashcards in seconds.</p>
        <div className="hero-cta reveal">
          <Link to="/tools/pdf-fc" className="btn btn-primary">
            pdf to flashcards <ArrowRightIcon size={18} />
          </Link>
          <Link to="/tools" className="btn btn-ghost">all tools</Link>
        </div>
      </div>

      <div className="hero-art" ref={art}>
        <div className="stack" ref={stack}>
          <div className="h-card c3"><span className="tag">biology</span><p>mitochondria</p></div>
          <div className="h-card c2"><span className="tag">history</span><p>1898 independence</p></div>
          <div className={`h-card c1 ${flipped ? 'flipped' : ''}`} onClick={() => { sfx('flip'); setFlipped((f) => !f) }}>
            <div className="h-inner">
              <div className="h-face front"><span className="tag">tap me</span><p className="display">what makes studying fun?</p></div>
              <div className="h-face back"><span className="tag">answer</span><p className="display">a yellow dino &amp; good flashcards</p></div>
            </div>
          </div>
        </div>
        <span className="spark s1">✦</span><span className="spark s2">✦</span><span className="spark s3">✦</span>
      </div>
    </section>
  )
}
