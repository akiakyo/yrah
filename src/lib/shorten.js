// makes long flashcard answers easier to study. display only, the full text stays saved.
// mode: 'full' | 'sentence' | 'keywords'
const MAX_SENTENCE = 110

const STOP = new Set(`a an the and or but nor so yet of in on at to for from by with without into onto upon over under
about above below between through during before after than then as is are was were be been being am do does did done
has have had having it its it's this that these those there here which who whom whose what when where why how
can could may might must shall should will would not no also very just only such each every all any some most more
other another both either neither same own too their they them he she him her his hers we us our you your i me my
use used uses using make makes made making turn turns get gets one two way ways thing things called known refers
refer means mean defined define like e.g i.e etc states state stated include includes including`.split(/\s+/))

const words = (s) => s.split(/\s+/).filter(Boolean)

export function firstSentence(text) {
  const t = text.replace(/\s+/g, ' ').trim()
  let s = t.split(/(?<=[.!?;])\s+(?=[A-Z0-9("'])/)[0]
  if (s.length <= MAX_SENTENCE) return s
  // still long: stop at a natural break before the limit
  const cut = s.slice(0, MAX_SENTENCE)
  const brk = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf('; '), cut.lastIndexOf(' — '), cut.lastIndexOf(' which '), cut.lastIndexOf(' that '))
  s = brk > 40 ? cut.slice(0, brk) : cut.replace(/\s+\S*$/, '')
  // never end on a dangling "to the…"
  const w = words(s)
  while (w.length > 4 && STOP.has(w[w.length - 1].toLowerCase().replace(/[^a-z']/g, ''))) w.pop()
  return w.join(' ').replace(/[,;:\s]+$/, '') + '…'
}

export function keywords(text, max = 4) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (words(t).length <= 5) return t.replace(/[.;]$/, '')

  // chunks = runs of content words between stopwords/punctuation, e.g. "chemical energy"
  const chunks = []
  let cur = []
  const flush = () => { if (cur.length) chunks.push(cur); cur = [] }
  for (const raw of t.split(/\s+/)) {
    const endsClause = /[.,;:!?)]$/.test(raw)
    const w = raw.replace(/^[("'“]+|[)"'”.,;:!?]+$/g, '')
    if (!w || STOP.has(w.toLowerCase()) || w.length < 2) { flush() } else {
      cur.push(w)
      if (cur.length === 3) flush()
    }
    if (endsClause) flush()
  }
  flush()

  const score = (chunk) => chunk.reduce((sum, w, i) => {
    let s = 1
    if (/\d/.test(w) || /^[A-Z0-9]{2,}$/.test(w)) s += 3 // numbers, acronyms like ATP
    else if (i > 0 || chunks.indexOf(chunk) > 0) { if (/^[A-Z]/.test(w)) s += 2 } // names mid-sentence
    if (w.length > 7) s += 1
    return sum + s
  }, 0) + (chunk.length > 1 ? 1 : 0)

  // best chunks, shown in their original order, no repeats
  const seen = new Set()
  const unique = chunks.filter((c) => { const k = c.join(' ').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
  const top = new Set([...unique].sort((a, b) => score(b) - score(a)).slice(0, max))
  const picked = unique.filter((c) => top.has(c)).map((c) => c.join(' '))
  return picked.length ? picked.join(' · ') : firstSentence(t)
}

export function shorten(text, mode) {
  if (!text || mode === 'full') return text
  return mode === 'keywords' ? keywords(text) : firstSentence(text)
}

export const isShortened = (text, mode) => mode !== 'full' && shorten(text, mode) !== text.replace(/\s+/g, ' ').trim()
