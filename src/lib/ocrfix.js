// cleans up text-reader (ocr) mistakes before it becomes flashcards or files.
// only words the reader itself was unsure about AND that aren't real english words
// get touched. real words, acronyms, numbers and confident jargon/names are left alone.
// dictionary-en only exports a node loader, so its word files are loaded as plain assets
import affUrl from '../../node_modules/dictionary-en/index.aff?url'
import dicUrl from '../../node_modules/dictionary-en/index.dic?url'

let spellPromise = null
export function loadSpeller() {
  spellPromise ??= (async () => {
    const [{ default: nspell }, aff, dic] = await Promise.all([
      import('nspell'),
      fetch(affUrl).then((r) => r.text()),
      fetch(dicUrl).then((r) => r.text()),
    ])
    return nspell(aff, dic)
  })().catch((err) => { spellPromise = null; throw err })
  return spellPromise
}

// classic ocr swaps. multi-letter ones are 2+ edits away so the spellchecker alone misses
// them, and look-alike letters are tried in pairs ("chlorophvli" needs v->y and i->l)
const CONFUSIONS = [
  ['rn', 'm'], ['m', 'rn'], ['vv', 'w'], ['cl', 'd'], ['li', 'h'], ['ii', 'u'], ['li', 'll'], ['ll', 'li'],
  ['0', 'o'], ['1', 'l'], ['1', 'i'], ['5', 's'], ['8', 'b'], ['6', 'b'],
  ['v', 'y'], ['y', 'v'], ['i', 'l'], ['l', 'i'], ['c', 'e'], ['e', 'c'], ['n', 'u'], ['u', 'n'],
  ['h', 'b'], ['b', 'h'], ['a', 'o'], ['o', 'a'], ['t', 'f'], ['f', 't'],
]
const AUTO_FIX_BELOW = 80 // reader confidence under this + not a word = safe to auto-fix
const UNSURE_BELOW = 85 // not a word and confidence under this = ask the student
const UNSURE_KNOWN_BELOW = 45 // even real words get flagged when the reader was this unsure
const GUESS_FLOOR = 40 // below this the reader basically saw noise, suggest instead of auto-fixing
const BAD_PHOTO_BELOW = 55 // whole page this unsure: never auto-fix, let the student decide
const MAX_SUGGEST = 400 // spellchecker suggestions are slow, cap per document

let nextId = 0

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

// keep the original casing style: Word, WORD or word
function matchCase(word, like) {
  if (like.length > 1 && like === like.toUpperCase()) return word.toUpperCase()
  if (like[0] === like[0].toUpperCase()) return word[0].toUpperCase() + word.slice(1)
  return word
}

// "(photosynthesis," -> ["(", "photosynthesis", ","]
const splitWord = (t) => t.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u).slice(1)

function isWord(spell, w) {
  return spell.correct(w) || spell.correct(w.toLowerCase()) || spell.correct(w[0].toUpperCase() + w.slice(1).toLowerCase())
}

function checkToken(spell, token, budget) {
  // a stray pipe next to letters is almost always an l or I
  const text = token.text.replace(/\|(?=\p{L})|(?<=\p{L})\|/gu, 'l')
  const [lead, core, trail] = splitWord(text)
  const base = { ...token, text, original: token.text }
  const lettersOnly = /^\p{L}+$/u.test(core)
  const mixed = /\p{L}/u.test(core) && /\d/.test(core)

  // skip short bits, acronyms (ATP, DNA), plain numbers and anything non-latin
  if (core.length < 3 || /^[A-Z0-9]{2,}$/.test(core) || /^[\d.,%-]+$/.test(core) || !/^[\p{Script=Latin}\d'’-]+$/u.test(core)) {
    return { ...base, status: 'ok' }
  }
  if (lettersOnly && isWord(spell, core)) {
    return { ...base, status: token.conf < UNSURE_KNOWN_BELOW ? 'unsure' : 'ok', suggestions: [] }
  }

  // try the classic ocr swaps: "rnitochondria" -> "mitochondria", "c0ncept" -> "concept".
  // the same mistake often repeats in one word ("ce11", "rnernbrane"), so also swap every occurrence
  const lower = core.toLowerCase()
  const swaps = (word) => {
    const out = []
    for (const [from, to] of CONFUSIONS) {
      if (!word.includes(from)) continue
      out.push(word.split(from).join(to))
      for (let at = word.indexOf(from); at !== -1; at = word.indexOf(from, at + 1)) out.push(word.slice(0, at) + to + word.slice(at + from.length))
    }
    return out
  }
  const fits = (candidate) => candidate !== lower && /^\p{L}+$/u.test(candidate) && isWord(spell, candidate)
  if (token.conf < 90 || mixed) {
    const one = swaps(lower)
    let hit = one.find(fits)
    // two different mistakes in one word: try each swap on top of every single swap
    if (!hit && core.length >= 5) {
      for (const first of one) { hit = swaps(first).find(fits); if (hit) break }
    }
    if (hit) return { ...base, text: lead + matchCase(hit, core) + trail, status: 'fixed' }
  }

  if (token.conf >= UNSURE_BELOW || !lettersOnly) return { ...base, status: 'ok' }

  const suggestions = budget.left-- > 0 && core.length <= 18 ? spell.suggest(core).slice(0, 4) : []
  const best = suggestions[0]
  if (best && token.conf < AUTO_FIX_BELOW && token.conf >= GUESS_FLOOR && levenshtein(lower, best.toLowerCase()) <= (core.length > 6 ? 2 : 1)) {
    return { ...base, text: lead + matchCase(best, core) + trail, status: 'fixed', suggestions }
  }
  return { ...base, status: 'unsure', suggestions }
}

// drops junk lines (page edges, specks read as symbols) and rejoins hyphen-split words
function tidyLines(lines) {
  const out = lines.filter((line) => {
    if (!line) return true
    const joined = line.map((w) => w.text).join('')
    const useful = (joined.match(/[\p{L}\p{N}]/gu) || []).length
    return useful >= 2 && useful / joined.length >= 0.45
  })
  for (let i = 0; i < out.length - 1; i++) {
    const line = out[i]
    const next = out[i + 1]
    if (!line || !next?.length) continue
    const last = line[line.length - 1]
    if (/\p{L}-$/u.test(last.text) && /^\p{Ll}/u.test(next[0].text)) {
      last.text = last.text.slice(0, -1) + next[0].text
      last.conf = Math.min(last.conf, next[0].conf)
      next.shift()
    }
  }
  return out.filter((line, i) => line === null ? out[i - 1] !== null : line.length)
}

// ocr pages in -> { pages: [{ lines: [[token]] }], fixed, unsure }
export async function fixPages(ocrPages) {
  const spell = await loadSpeller()
  const budget = { left: MAX_SUGGEST }
  let fixed = 0
  let unsure = 0
  const pages = ocrPages.map((page) => ({
    lines: tidyLines(page.lines.map((l) => (l ? l.map((w) => ({ ...w })) : null))).map((line) => line && line.map((w) => {
      const t = { id: `w${nextId++}`, ...checkToken(spell, w, budget) }
      if (t.status === 'fixed') fixed++
      if (t.status === 'unsure') unsure++
      return t
    })),
  }))
  // average reader confidence, used to tell the student a photo is too blurry to trust
  const confs = ocrPages.flatMap((p) => p.lines.flat().filter(Boolean).map((w) => w.conf))
  const avgConf = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0

  // on a bad photo the "fixes" are guesses on top of noise: show them as suggestions instead
  if (avgConf < BAD_PHOTO_BELOW) {
    for (const page of pages) {
      for (const line of page.lines) {
        for (const t of line || []) {
          if (t.status !== 'fixed') continue
          t.suggestions = [t.text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''), ...(t.suggestions || [])]
          t.text = t.original
          t.status = 'unsure'
          fixed--
          unsure++
        }
      }
    }
  }
  return { pages, fixed, unsure, avgConf }
}

export const pageText = (page) => page.lines.map((line) => (line ? line.map((t) => t.text).join(' ') : '')).join('\n').replace(/\n{3,}/g, '\n\n').trim()

// quick path for pdf pages that had to be read from images: auto-fix only, no review
export async function fixedText(ocrPages) {
  const { pages } = await fixPages(ocrPages)
  return pages.map(pageText)
}
