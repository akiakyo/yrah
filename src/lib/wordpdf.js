// word -> pdf right in the browser: mammoth reads the .docx, pdf-lib lays it out on a4.
// keeps headings, paragraphs, lists and tables as text. images are skipped.
const PAGE = { w: 595, h: 842, margin: 56 }
const STYLES = {
  h1: { size: 20, bold: true, gap: 14 },
  h2: { size: 16, bold: true, gap: 12 },
  h3: { size: 13, bold: true, gap: 10 },
  h4: { size: 12, bold: true, gap: 8 },
  p: { size: 11, gap: 8 },
  li: { size: 11, gap: 4 },
  tr: { size: 10, gap: 4 },
}

export async function docxToPdf(file) {
  const mammoth = await import('mammoth/mammoth.browser')
  const { value: html } = await (mammoth.default || mammoth).convertToHtml({ arrayBuffer: await file.arrayBuffer() })
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.13, 0.11, 0.06)
  const maxW = PAGE.w - PAGE.margin * 2
  let page = pdf.addPage([PAGE.w, PAGE.h])
  let y = PAGE.h - PAGE.margin

  // standard pdf fonts only know latin characters, swap anything else
  const safe = (text, font) => [...text.replace(/\s+/g, ' ')].map((ch) => {
    try { font.encodeText(ch); return ch } catch { return ch === '₱' ? 'PHP ' : '?' }
  }).join('')

  const block = (text, tag, indent = 0, prefix = '') => {
    const style = STYLES[tag] || STYLES.p
    const font = style.bold ? bold : regular
    const clean = safe(text, font).trim()
    if (!clean) return
    const lineH = style.size * 1.4
    const width = maxW - indent
    // greedy word wrap
    const lines = []
    let line = ''
    for (const word of clean.split(' ')) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, style.size) > width && line) { lines.push(line); line = word } else line = test
    }
    if (line) lines.push(line)

    lines.forEach((l, i) => {
      if (y - lineH < PAGE.margin) { page = pdf.addPage([PAGE.w, PAGE.h]); y = PAGE.h - PAGE.margin }
      y -= lineH
      if (i === 0 && prefix) page.drawText(prefix, { x: PAGE.margin + indent - 12, y, size: style.size, font: regular, color: ink })
      page.drawText(l, { x: PAGE.margin + indent, y, size: style.size, font, color: ink })
    })
    y -= style.gap
  }

  const walk = (parent, depth = 0) => {
    for (const el of parent.children) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'ul' || tag === 'ol') {
        [...el.children].forEach((li, i) => {
          // text of this item without its nested lists
          const own = [...li.childNodes].filter((n) => !/^(ul|ol)$/i.test(n.nodeName)).map((n) => n.textContent).join(' ')
          block(own, 'li', 18 * (depth + 1), tag === 'ol' ? `${i + 1}.` : '•')
          walk(li, depth + 1)
        })
      } else if (tag === 'table') {
        el.querySelectorAll('tr').forEach((tr) => block([...tr.children].map((td) => td.textContent.trim()).join('  |  '), 'tr'))
        y -= 6
      } else if (/^h[1-6]$/.test(tag)) {
        block(el.textContent, tag in STYLES ? tag : 'h4')
      } else if (tag === 'p') {
        block(el.textContent, 'p')
      } else {
        walk(el, depth)
      }
    }
  }

  walk(new DOMParser().parseFromString(html, 'text/html').body)
  return new Blob([await pdf.save()], { type: 'application/pdf' })
}
