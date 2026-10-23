import { useEffect, useState } from 'react'

// the install prompt fires once per page load, so keep it at module level
// where every component can reach it, not just the one mounted at that moment
let deferred = null
const subs = new Set()
const emit = () => subs.forEach((fn) => fn(deferred))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit() })
  window.addEventListener('appinstalled', () => { deferred = null; emit() })
}

export function useInstall() {
  const [prompt, setPrompt] = useState(deferred)
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const android = /android/i.test(navigator.userAgent)

  useEffect(() => {
    subs.add(setPrompt)
    return () => subs.delete(setPrompt)
  }, [])

  const install = async () => {
    if (!deferred) return false
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    deferred = null
    emit()
    return outcome === 'accepted'
  }

  return { canInstall: !!prompt && !standalone, install, ios, android, standalone }
}
