// camera scans -> pdf / word / excel / text. everything runs on the device,
// heavy libs are lazy loaded the first time a scan tool is used
const MAX_SIDE = 2000

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("couldn't open that image")) }
    img.src = url
  })
}

// draws a page upright, scaled down, and optionally cleaned up like a scanner
export async function renderPage({ file, rotate = 0 }, enhance) {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const turned = rotate % 180 !== 0
  const canvas = document.createElement('canvas')
  canvas.width = turned ? h : w
  canvas.height = turned ? w : h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotate * Math.PI) / 180)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  if (enhance) documentFilter(ctx, canvas.width, canvas.height)
  return canvas
}

// grayscale + contrast stretch: paper turns white, ink turns dark
function documentFilter(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h)
  const px = data.data
  const hist = new Uint32Array(256)
  for (let i = 0; i < px.length; i += 4) {
    const g = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0
    px[i] = g
    hist[g]++
  }
  // ignore the darkest/brightest 2% so shadows don't wreck the stretch
  const total = w * h
  let lo = 0
  let hi = 255
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < total * 0.02; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < total * 0.12; hi--);
  const range = Math.max(hi - lo, 1)
  for (let i = 0; i < px.length; i += 4) {
    let v = ((px[i] - lo) / range) * 255
    v = v > 200 ? 255 : v < 0 ? 0 : v
    px[i] = px[i + 1] = px[i + 2] = v
  }
  ctx.putImageData(data, 0, 0)
}

const toBlob = (canvas, type = 'image/jpeg', q = 0.85) => new Promise((r) => canvas.toBlob(r, type, q))

export function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function makePdf(canvases) {
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  for (const c of canvases) {
    const jpg = await pdf.embedJpg(await (await toBlob(c)).arrayBuffer())
    // a4 width in points, height follows the photo
    const width = 595
    const height = (c.height / c.width) * width
    pdf.addPage([width, height]).drawImage(jpg, { x: 0, y: 0, width, height })
  }
  return new Blob([await pdf.save()], { type: 'application/pdf' })
}

export async function ocr(canvases, onProgress) {
  const { createWorker } = await import('tesseract.js')
  let page = 0
  onProgress?.({ page: 1, total: canvases.length, pct: 0, status: 'loading reader…' })
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.({ page: page + 1, total: canvases.length, pct: m.progress, status: 'reading' })
    },
  })
  const pages = []
  try {
    for (; page < canvases.length; page++) {
      const { data } = await worker.recognize(canvases[page])
      pages.push(data.text)
    }
  } finally {
    await worker.terminate()
  }
  return pages
}

export async function makeDocx(pages) {
  const { Document, Packer, Paragraph, TextRun } = await import('docx')
  const children = []
  pages.forEach((text, i) => {
    text.split('\n').forEach((line) => {
      children.push(new Paragraph({ children: [new TextRun({ text: line, font: 'Calibri', size: 24 })] }))
    })
    if (i < pages.length - 1) children.push(new Paragraph({ pageBreakBefore: true, children: [] }))
  })
  const doc = new Document({ sections: [{ children }] })
  return Packer.toBlob(doc)
}

export async function makeXlsx(pages) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  pages.forEach((text, i) => {
    const ws = wb.addWorksheet(`page ${i + 1}`)
    // ocr keeps wide gaps between table columns, so 2+ spaces or tabs = new cell
    text.split('\n').filter((l) => l.trim()).forEach((line) => {
      ws.addRow(line.trim().split(/\t|\s{2,}|\s\|\s/).map((cell) => {
        const n = Number(cell.replace(/,/g, ''))
        return cell !== '' && !Number.isNaN(n) ? n : cell
      }))
    })
    ws.columns.forEach((col) => { col.width = 18 })
  })
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
