// pulls plain text out of uploaded files, libs are lazy loaded.
// pages are joined with \f (form feed) so the card maker reads every page on its own

// a page with less real text than this is treated as a photo/scan of a page
const MIN_PAGE_CHARS = 25

export async function pdfToText(file, onProgress) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.js?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const total = doc.numPages
  const pages = []
  const imagePages = []
  for (let p = 1; p <= total; p++) {
    onProgress?.(`reading page ${p} of ${total}…`)
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items) text += item.str + (item.hasEOL ? '\n' : '')
    pages.push(text)
    if (text.replace(/\s/g, '').length < MIN_PAGE_CHARS) imagePages.push(p)
  }

  // scanned/photo pages have no text layer: render them and run the text reader
  if (imagePages.length) {
    const { prepareForOcr, ocr } = await import('./scan.js')
    const { fixedText } = await import('./ocrfix.js')
    const canvases = []
    for (const p of imagePages) {
      onProgress?.(`page ${p} is a picture, getting it ready…`)
      const page = await doc.getPage(p)
      const base = page.getViewport({ scale: 1 })
      // aim for ~2000px on the long side, enough for small print
      const viewport = page.getViewport({ scale: Math.min(4, 2000 / Math.max(base.width, base.height)) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport }).promise
      canvases.push(prepareForOcr(canvas))
    }
    const read = await ocr(canvases, ({ page, pct, status }) => onProgress?.(
      status === 'reading' ? `reading picture page ${imagePages[page - 1]} of ${total}… ${Math.round(pct * 100)}%` : status,
    ))
    const texts = await fixedText(read)
    imagePages.forEach((p, i) => { pages[p - 1] = texts[i] })
  }
  return pages.join('\f')
}

export async function docxToText(file) {
  const mammoth = await import('mammoth/mammoth.browser')
  const res = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return res.value
}
