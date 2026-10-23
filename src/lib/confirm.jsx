import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { DangerTriangleIcon } from '@solar-icons/react/bold'
import { sfx } from './sfx.js'

// promise based pop-up: const ok = await ask({ title, text, ok, cancel, Icon, danger })
const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null)
  const [closing, setClosing] = useState(false)
  const resolver = useRef()

  const ask = useCallback((o) => {
    sfx('pop')
    setClosing(false)
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
            <div className="modal-actions">
              <button className="modal-btn" data-sfx="tap" onClick={() => close(false)} autoFocus>{opts.cancel || 'cancel'}</button>
              <button className={`modal-btn primary ${opts.danger ? 'danger' : ''}`} data-sfx={opts.danger ? 'trash' : 'success'}
                onClick={() => close(true)}>{opts.ok || 'ok'}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
