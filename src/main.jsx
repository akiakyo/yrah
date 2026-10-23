import React from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './styles.css'

// offline cache. on a new deploy the new service worker takes over and the page reloads
// itself (autoUpdate). installed apps stay open for days on phones, so also look for a
// new version every time the app comes back to the foreground, and every 30 minutes
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => { if (navigator.onLine) registration.update().catch(() => {}) }
    setInterval(check, 30 * 60 * 1000)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  },
})

// every deploy renames the code chunks and removes the old ones. a phone still running
// the previous version then fails to lazy load (pdf reader, ocr, etc). reload once to get
// the new version, but never loop: skip if we already reloaded in the last 20 seconds
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'yrah-chunk-reload'
  let last = 0
  try { last = Number(sessionStorage.getItem(KEY)) || 0 } catch { /* ignore */ }
  if (Date.now() - last < 20000) return
  event.preventDefault()
  try { sessionStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ }
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
