import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { DownloadMinimalisticIcon, VolumeLoudIcon, VolumeCrossIcon } from '@solar-icons/react/bold'
import { useInstall } from '../lib/useInstall.js'
import { useMuted } from '../lib/useMuted.js'

export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-dot" />
      <span className="display sticker">yrah</span>
    </Link>
  )
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const { canInstall, install } = useInstall()
  const [muted, toggleMute] = useMuted()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <Logo />
      <nav className="nav-links">
        <NavLink to="/" end className="nav-link">home</NavLink>
        <NavLink to="/tools" className="nav-link">tools</NavLink>
        <NavLink to="/library" className="nav-link">library</NavLink>
      </nav>
      <div className="nav-right">
        <button className="icon-btn sound-btn" data-sfx="none" aria-label={muted ? 'turn sound on' : 'turn sound off'} onClick={toggleMute}>
          {muted ? <VolumeCrossIcon size={24} /> : <VolumeLoudIcon size={24} />}
        </button>
        {canInstall && (
          <button className="chip install-chip" onClick={install}><DownloadMinimalisticIcon size={16} /> install</button>
        )}
        <Link to="/study" className="btn btn-primary btn-sm nav-cta">study now</Link>
      </div>
    </header>
  )
}
