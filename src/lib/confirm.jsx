import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { DangerTriangleIcon } from '@solar-icons/react/bold'
import { sfx } from './sfx.js'

// promise based pop-up: const ok = await ask({ title, text, ok, cancel, Icon, danger })
// with input: { placeholder, value } it resolves to the typed text, or null when cancelled
const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null)
  const [closing, setClosing] = useState(false)
  const [text, setText] = useState('')
  const resolver = useRef()

  const ask = useCallback((o) => {
    sfx('pop')
    setClosing(false)
    setText(o.input?.value || '')
    setOpts(o)
    return new Promise((res) => { resolver.current = res })
  }, [])

  const close = useCallback((value) => {
    setClosing(true)
    setTimeout(() => {
      setOpts(null)
      resolver.current?.(value)
    }, 220)
  }, [])

  useEffect(() => {
    if (!opts) return
    const onKey = (e) => { if (e.key === 'Escape') close(false) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [opts, close])

  const Icon = opts?.Icon || DangerTriangleIcon

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {opts && (
        <div className={`modal ${closing ? 'closing' : ''}`} onClick={() => close(false)}>
          <div className={`modal-card ${opts.danger ? 'danger' : ''}`} role="alertdialog" aria-modal="true"
            aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
            <span className="modal-burst" aria-hidden="true">✦</span>
            <span className="modal-icon"><Icon size={36} /></span>
            <h2 id="modal-title" className="display">{opts.title}</h2>
            {opts.text && <p className="muted">{opts.text}</p>}
            {opts.input && (
              <form id="modal-form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) close(text.trim()) }}>
                <input className="modal-input" autoFocus maxLength={opts.input.max || 40} placeholder={opts.input.placeholder}
                  value={text} onChange={(e) => setText(e.target.value)} />
              </form>
            )}
            <div className="modal-actions">
              <button className="modal-btn" data-sfx="tap" onClick={() => close(opts.input ? null : false)} autoFocus={!opts.input}>{opts.cancel || 'cancel'}</button>
              <button className={`modal-btn primary ${opts.danger ? 'danger' : ''}`} data-sfx={opts.danger ? 'trash' : 'success'}
                disabled={opts.input && !text.trim()}
                onClick={() => close(opts.input ? text.trim() : true)}>{opts.ok || 'ok'}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
