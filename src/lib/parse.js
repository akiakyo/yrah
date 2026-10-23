// turns raw text (notes, pdf, docx, slides) into { term, def } cards
const SEPARATORS = ['\t', ' - ', ' – ', ' — ', ' = ', ': ', ' : ']
const PRONOUNS = /^(it|this|that|these|those|there|they|he|she|we|you|i|which|what|here)\b/i
const DEFINES = /^(.{2,60}?)\s+(?:is|are|refers to|means|is defined as|is called|was|were)\s+(.{8,})$/i
const MAX_CARDS = 200
const MAX_DEF = 400

const clean = (s) => s.replace(/\s+/g, ' ').replace(/^[-*•▪●◦\d.)\s]+/, '').trim()
const clip = (s) => (s.length > MAX_DEF ? s.slice(0, MAX_DEF).replace(/\s\S*$/, '') + '…' : s)
const card = (term, def) => ({ term: clean(term), def: clip(clean(def)) })

// 1. "term - definition" lines, quizlet exports, "term: definition"
function bySeparator(lines) {
  const out = []
  for (const line of lines) {
    const sep = SEPARATORS.find((s) => line.includes(s))
    // a wrapped definition continues on the next line in lowercase
    if (!sep && out.length && /^[a-z(]/.test(line)) {
      const last = out[out.length - 1]
      last.def = clip(clean(`${last.def} ${line}`))
      continue
    }
    if (!sep) continue
    const i = line.indexOf(sep)
    const term = line.slice(0, i)
    const def = line.slice(i + sep.length)
    if (clean(term) && clean(def) && term.length <= 120) out.push(card(term, def))
  }
  return out
}

// 2. sentences like "osmosis is the movement of water…"
function byDefinition(lines) {
  // rejoin wrapped pdf lines, but keep short heading lines on their own
  const text = lines.map((l) => (l.length < 60 && !/[.!?,;:]$/.test(l) ? l + '.' : l)).join(' ')
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
  const out = []
  for (const s of sentences) {
    const m = s.trim().match(DEFINES)
    if (!m || PRONOUNS.test(m[1]) || m[1].split(' ').length > 7) continue
    out.push(card(m[1].replace(/^(the|a|an)\s+/i, ''), m[2]))
  }
  return out
}

// 3. short heading lines followed by body text (slides, lecture pdfs)
function byHeading(lines) {
  const isHeading = (l, next) => l.length <= 60 && !/[.,;]$/.test(l) && /^[A-Z0-9]/.test(l) && next && next.length > l.length
  const out = []
  let cur = null
  lines.forEach((l, i) => {
    if (isHeading(l, lines[i + 1])) {
      if (cur && cur.body.length) out.push(card(cur.head, cur.body.join(' ')))
      cur = { head: l, body: [] }
    } else if (cur) cur.body.push(l)
  })
  if (cur && cur.body.length) out.push(card(cur.head, cur.body.join(' ')))
  return out
}

// 4. last resort: paragraphs, first sentence becomes the term
function byParagraph(text) {
  return text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length > 20).map((p) => {
    const m = p.match(/^(.{3,140}?[.!?:])\s+(.+)$/)
    return m ? card(m[1], m[2]) : card(p.slice(0, 60) + (p.length > 60 ? '…' : ''), p)
  })
}

// some pdfs store headings letter-spaced ("E L E N 2 0 0 4 4"), join them back
function unspace(line) {
  const tokens = line.trim().split(/\s+/)
  const singles = tokens.filter((t) => t.length === 1).length
  if (tokens.length < 4 || singles / tokens.length < 0.7) return line
  // 2+ spaces usually mark the real word gaps
  return line.trim().split(/\s{2,}/).map((w) => w.replace(/\s/g, '')).join(' ')
}

export function textToCards(text) {
  const raw = text.replace(/\r/g, '').split('\n').map(unspace).join('\n')
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const enough = (n) => n >= Math.max(2, Math.min(lines.length * 0.2, 8))

  const sep = bySeparator(lines)
  if (enough(sep.length)) return sep.slice(0, MAX_CARDS)

  const defs = [...sep, ...byDefinition(lines)]
  if (defs.length >= 3) return defs.slice(0, MAX_CARDS)

  const heads = byHeading(lines)
  if (heads.length >= 2) return heads.slice(0, MAX_CARDS)

  return byParagraph(raw).slice(0, MAX_CARDS)
}
