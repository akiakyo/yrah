import { useEffect, useState } from 'react'
import { isMuted, onMuteChange, setMuted } from './sfx.js'

export function useMuted() {
  const [muted, set] = useState(isMuted)
  useEffect(() => onMuteChange(set), [])
  return [muted, () => setMuted(!muted)]
}
