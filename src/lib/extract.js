// pulls plain text out of uploaded files, libs are lazy loaded
export async function pdfToText(file) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.js?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  let out = ''
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    for (const item of content.items) out += item.str + (item.hasEOL ? '\n' : '')
    out += '\n\n'
  }
  return out
}

export async function docxToText(file) {
  const mammoth = await import('mammoth/mammoth.browser')
  const res = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return res.value
}
