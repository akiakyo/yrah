import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DownloadMinimalisticIcon, CloudCrossIcon, BoltIcon, AddSquareIcon, UploadSquareIcon, MenuDotsIcon, CheckCircleIcon, CloseIcon,
} from '@solar-icons/react/bold'
import { useInstall } from '../lib/useInstall.js'
import { sfx } from '../lib/sfx.js'

const perks = [
  { Icon: CloudCrossIcon, text: 'works offline' },
  { Icon: BoltIcon, text: 'opens instantly' },
  { Icon: AddSquareIcon, text: 'one tap from home' },
]

const steps = {
  iphone: [
    { Icon: UploadSquareIcon, text: <>open in <b>safari</b>, tap the <b>share</b> button</> },
    { Icon: AddSquareIcon, text: <>scroll and tap <b>add to home screen</b></> },
    { Icon: CheckCircleIcon, text: <>tap <b>add</b>. yrah is on your phone ✦</> },
  ],
  android: [
    { Icon: MenuDotsIcon, text: <>open in <b>chrome</b>, tap the <b>⋮</b> menu</> },
    { Icon: DownloadMinimalisticIcon, text: <>tap <b>install app</b> or <b>add to home screen</b></> },
    { Icon: CheckCircleIcon, text: <>tap <b>install</b>. yrah is on your phone ✦</> },
  ],
}

function Steps({ onClose, initial }) {
  const [tab, setTab] = useState(initial)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" aria-label="close" onClick={onClose}><CloseIcon size={18} /></button>
        <span className="modal-icon"><img src="/icons/icon-192.png" alt="" width="48" height="48" /></span>
        <h2 id="install-title" className="display">add yrah to your phone</h2>
        <div className="seg" role="tablist">
          {['iphone', 'android'].map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} data-sfx="toggle" className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
          <span className={`seg-ink ${tab === 'android' ? 'right' : ''}`} />
        </div>
        <ol className="install-steps" key={tab}>
          {steps[tab].map(({ Icon, text }, i) => (
            <li key={i} style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="step-dot"><Icon size={22} /></span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <button className="modal-btn primary" onClick={onClose}>got it</button>
      </div>
    </div>
  )
}

export default function InstallCard() {
  const { canInstall, install, ios, standalone } = useInstall()
  const [open, setOpen] = useState(false)

  if (standalone) return null

  const onInstall = async () => {
    // android/chrome: real install prompt, everywhere else: show the steps
    if (canInstall) { if (await install()) sfx('success') } else setOpen(true)
  }

  return (
    <section className="install reveal">
      <div className="install-phone" aria-hidden="true">
        <div className="phone">
          <span className="phone-notch" />
          <div className="phone-grid">
            {Array.from({ length: 8 }).map((_, i) => <span key={i} className="app-dot" />)}
            <span className="app-yrah"><img src="/icons/icon-192.png" alt="" /></span>
          </div>
        </div>
      </div>
      <div className="install-copy">
        <p className="eyebrow">get the app</p>
        <h2 className="display">install yrah on your phone</h2>
        <p className="muted">no app store, no download size. it lives on your home screen like a real app.</p>
        <ul className="perks">
          {perks.map(({ Icon, text }) => <li key={text}><Icon size={18} /> {text}</li>)}
        </ul>
        <button className="btn btn-primary" onClick={onInstall}><DownloadMinimalisticIcon size={20} /> install yrah</button>
      </div>
      {/* portal so the modal escapes the dark section's styles */}
      {open && createPortal(<Steps initial={ios ? 'iphone' : 'android'} onClose={() => setOpen(false)} />, document.body)}
    </section>
  )
}
