// tiny synth sound effects with web audio, no files so they work offline
const KEY = 'yrah-sfx'
let ctx = null
let muted = (() => { try { return localStorage.getItem(KEY) === 'off' } catch { return false } })()
const listeners = new Set()

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// one oscillator note with a quick attack and exponential release
function tone(ac, { freq, to, type = 'sine', at = 0, dur = 0.12, vol = 0.12 }) {
  const t = ac.currentTime + at
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

// filtered noise sweep, sounds like a card whoosh
function whoosh(ac, { dur = 0.18, from = 600, to = 3200, vol = 0.18 } = {}) {
  const t = ac.currentTime
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  const filter = ac.createBiquadFilter()
  const gain = ac.createGain()
  src.buffer = buf
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(from, t)
  filter.frequency.exponentialRampToValueAtTime(to, t + dur)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter).connect(gain).connect(ac.destination)
  src.start(t)
}

const sounds = {
  tap: (ac) => tone(ac, { freq: 520, to: 780, dur: 0.06, vol: 0.06 }),
  pop: (ac) => tone(ac, { freq: 380, to: 900, type: 'triangle', dur: 0.1, vol: 0.12 }),
  toggle: (ac) => tone(ac, { freq: 1100, dur: 0.04, type: 'square', vol: 0.03 }),
  flip: (ac) => whoosh(ac),
  know: (ac) => { tone(ac, { freq: 784, type: 'triangle', dur: 0.12 }); tone(ac, { freq: 1175, type: 'triangle', at: 0.08, dur: 0.2 }) },
  again: (ac) => { tone(ac, { freq: 330, to: 220, type: 'triangle', dur: 0.16, vol: 0.14 }); tone(ac, { freq: 247, to: 180, type: 'triangle', at: 0.09, dur: 0.18, vol: 0.12 }) },
  undo: (ac) => tone(ac, { freq: 900, to: 450, dur: 0.1, vol: 0.08 }),
  trash: (ac) => { whoosh(ac, { dur: 0.14, from: 2400, to: 400, vol: 0.12 }); tone(ac, { freq: 300, to: 120, type: 'triangle', dur: 0.14, vol: 0.08 }) },
  success: (ac) => [880, 1109, 1319, 1760].forEach((f, i) => tone(ac, { freq: f, type: 'triangle', at: i * 0.07, dur: 0.22, vol: 0.09 })),
  done: (ac) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(ac, { freq: f, type: 'triangle', at: i * 0.11, dur: 0.3, vol: 0.12 }))
    tone(ac, { freq: 1568, type: 'sine', at: 0.5, dur: 0.5, vol: 0.06 })
  },
  error: (ac) => { tone(ac, { freq: 220, type: 'square', dur: 0.1, vol: 0.04 }); tone(ac, { freq: 180, type: 'square', at: 0.12, dur: 0.16, vol: 0.04 }) },
}

export function sfx(name) {
  if (muted || !sounds[name]) return
  const ac = audio()
  if (ac) sounds[name](ac)
}

export const isMuted = () => muted

export function setMuted(value) {
  muted = value
  try { localStorage.setItem(KEY, value ? 'off' : 'on') } catch { /* ignore */ }
  listeners.forEach((fn) => fn(muted))
  if (!value) sfx('toggle')
}

export function onMuteChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// every button or link gets a soft tap unless it has its own data-sfx
export function installTapSounds() {
  const handler = (e) => {
    const el = e.target.closest('button, a, [data-sfx]')
    if (!el || el.disabled) return
    const name = el.dataset.sfx ?? 'tap'
    if (name !== 'none') sfx(name)
  }
  document.addEventListener('pointerdown', handler)
  return () => document.removeEventListener('pointerdown', handler)
}
