// camera scans -> pdf / word / excel / text. everything runs on the device,
// heavy libs are lazy loaded the first time a scan tool is used
const MAX_SIDE = 2000
// the text reader wants big letters: upscale small images, but cap memory on phones
const OCR_MIN_SIDE = 1800
const OCR_MAX_SIDE = 2200

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("couldn't open that image")) }
    img.src = url
  })
}

// draws a page upright and sized for its use.
// mode: false = as is, true = scanner look (pdf output), 'ocr' = sharp black & white for the text reader
export async function renderPage({ file, rotate = 0 }, mode) {
  const img = await loadImage(file)
  const long = Math.max(img.width, img.height)
  const scale = mode === 'ocr'
    ? Math.min(OCR_MAX_SIDE, Math.max(OCR_MIN_SIDE, long)) / long
    : Math.min(1, MAX_SIDE / long)
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const turned = rotate % 180 !== 0
  const canvas = document.createElement('canvas')
  canvas.width = turned ? h : w
  canvas.height = turned ? w : h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotate * Math.PI) / 180)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  if (mode === 'ocr') prepareForOcr(canvas)
  else if (mode) documentFilter(ctx, canvas.width, canvas.height)
  return canvas
}

// adaptive threshold (bradley): each pixel is compared with the average of its
// neighbourhood instead of one global value, so phone shadows and uneven light
// don't turn whole areas black or wash text out
export function prepareForOcr(canvas) {
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const data = ctx.getImageData(0, 0, w, h)
  const px = data.data
  const raw = new Uint8Array(w * h)
  for (let i = 0, j = 0; j < raw.length; i += 4, j++) raw[j] = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0

  // light 3x3 blur first: camera grain otherwise turns into black specks after thresholding
  const tmp = new Uint8Array(w * h)
  const gray = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = x ? x - 1 : x
      const r = x < w - 1 ? x + 1 : x
      tmp[y * w + x] = (raw[y * w + l] + raw[y * w + x] * 2 + raw[y * w + r]) >> 2
    }
  }
  for (let y = 0; y < h; y++) {
    const u = y ? y - 1 : y
    const d = y < h - 1 ? y + 1 : y
    for (let x = 0; x < w; x++) gray[y * w + x] = (tmp[u * w + x] + tmp[y * w + x] * 2 + tmp[d * w + x]) >> 2
  }

  // integral image: sum of everything above-left of each pixel, uint32 is enough for 2200px
  const integral = new Uint32Array(w * h)
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += gray[y * w + x]
      integral[y * w + x] = row + (y ? integral[(y - 1) * w + x] : 0)
    }
  }
  const half = Math.max(8, Math.round(Math.max(w, h) / 32))
  const T = 0.15
  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - half)
    const y2 = Math.min(h - 1, y + half)
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half)
      const x2 = Math.min(w - 1, x + half)
      const count = (x2 - x1 + 1) * (y2 - y1 + 1)
      const sum = integral[y2 * w + x2]
        - (x1 ? integral[y2 * w + x1 - 1] : 0)
        - (y1 ? integral[(y1 - 1) * w + x2] : 0)
        + (x1 && y1 ? integral[(y1 - 1) * w + x1 - 1] : 0)
      const v = gray[y * w + x] * count < sum * (1 - T) ? 0 : 255
      const i = (y * w + x) * 4
      px[i] = px[i + 1] = px[i + 2] = v
    }
  }
  ctx.putImageData(data, 0, 0)
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

// reads every page. returns [{ text, lines }] where lines is a list of
// [{ text, conf }] words (conf 0-100), with null between paragraphs
export async function ocr(canvases, onProgress) {
  const { createWorker, PSM } = await import('tesseract.js')
  let page = 0
  onProgress?.({ page: 1, total: canvases.length, pct: 0, status: 'loading reader…' })
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.({ page: page + 1, total: canvases.length, pct: m.progress, status: 'reading' })
    },
  })
  // auto layout handles headings, columns and margins on notebook pages better than
  // the default "one block of text"; dpi stops tesseract guessing 70dpi on canvases
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  })
  const pages = []
  try {
    for (; page < canvases.length; page++) {
      const { data } = await worker.recognize(canvases[page], {}, { text: true, blocks: true })
      const lines = []
      for (const block of data.blocks || []) {
        for (const para of block.paragraphs || []) {
          for (const line of para.lines || []) {
            const words = (line.words || []).filter((w) => w.text.trim()).map((w) => ({ text: w.text, conf: w.confidence }))
            if (words.length) lines.push(words)
          }
          lines.push(null)
        }
      }
      pages.push({ text: data.text, lines })
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
