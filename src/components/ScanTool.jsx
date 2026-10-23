import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraIcon, GalleryAddIcon, RefreshIcon, CloseIcon, MagicWandIcon, AddCircleIcon } from '@solar-icons/react/bold'
import { useLibrary, uid } from '../lib/library.jsx'
import { textToCards } from '../lib/parse.js'
import { renderPage, makePdf, ocr, makeDocx, makeXlsx, download } from '../lib/scan.js'
import { fixPages } from '../lib/ocrfix.js'
import OcrReview from './OcrReview.jsx'
import { sfx } from '../lib/sfx.js'
import { friendlyError } from '../lib/errors.js'

const labels = { pdf: 'make pdf', docx: 'make word doc', xlsx: 'make excel', cards: 'make flashcards' }

export default function ScanTool({ tool }) {
  const [pages, setPages] = useState([])
  const [enhance, setEnhance] = useState(true)
  const [progress, setProgress] = useState(null)
  // text reader results waiting for the student to check them
  const [review, setReview] = useState(null)
  const camera = useRef()
  const gallery = useRef()
  const navigate = useNavigate()
  const lib = useLibrary()
  const { notify } = lib

  // free the preview urls when leaving
  const pagesRef = useRef(pages)
  pagesRef.current = pages
  useEffect(() => () => pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  const addFiles = (files) => {
    const imgs = [...files].filter((f) => f.type.startsWith('image/'))
    if (!imgs.length) return
    sfx('pop')
    setPages((p) => [...p, ...imgs.map((file) => ({ id: uid(), file, url: URL.createObjectURL(file), rotate: 0 }))])
  }
  const rotate = (id) => setPages((p) => p.map((pg) => (pg.id === id ? { ...pg, rotate: (pg.rotate + 90) % 360 } : pg)))
  const remove = (id) => setPages((p) => {
    const gone = p.find((pg) => pg.id === id)
    if (gone) URL.revokeObjectURL(gone.url)
    return p.filter((pg) => pg.id !== id)
  })

  const name = `scan-${new Date().toISOString().slice(0, 10)}`

  const run = async () => {
    try {
      setProgress({ pct: 0, status: 'preparing pages…' })

      if (tool.output === 'pdf') {
        const canvases = []
        for (const p of pages) canvases.push(await renderPage(p, enhance))
        setProgress({ pct: 0.6, status: 'building pdf…' })
        download(await makePdf(canvases), `${name}.pdf`)
        sfx('success')
        notify('pdf saved ✦')
        return
      }

      // the reader always gets the sharp black & white version, whatever the preview shows
      const canvases = []
      for (const p of pages) canvases.push(await renderPage(p, 'ocr'))
      const read = await ocr(canvases, ({ page, total, pct, status }) =>
        setProgress({ pct: ((page - 1 + pct) / total) * 0.9, status: status === 'reading' ? `reading page ${page} of ${total}…` : status }))
      if (!read.some((p) => p.text.trim())) { sfx('error'); return notify("couldn't read any text, try a clearer photo") }
      setProgress({ pct: 0.95, status: 'fixing typos…' })
      const checked = await fixPages(read)
      sfx('pop')
      setReview(checked)
    } catch (err) {
      sfx('error')
      notify(friendlyError(err))
    } finally {
      setProgress(null)
    }
  }

  // after the student checked the text
  const finish = async (texts) => {
    try {
      if (tool.output === 'cards') {
        const cards = textToCards(texts.join('\f'))
        if (!cards.length) { sfx('error'); return notify("couldn't find any cards in that, try the edit button") }
        sfx('success')
        const folderId = lib.prefs.folderId && lib.getFolder(lib.prefs.folderId) ? lib.prefs.folderId : null
        const id = lib.createDeck({ title: name, cards, folderId })
        navigate(`/study/${id}`, { state: { made: cards.length } })
        return
      }
      if (tool.output === 'docx') download(await makeDocx(texts), `${name}.docx`)
      else download(await makeXlsx(texts), `${name}.xlsx`)
      sfx('success')
      notify('file saved ✦')
    } catch (err) {
      sfx('error')
      notify(friendlyError(err))
    }
  }

  const busy = !!progress

  if (review) {
    return (
      <OcrReview review={review} onChange={setReview} onDone={finish} onBack={() => setReview(null)}
        label={labels[tool.output]} Icon={tool.Icon} />
    )
  }

  return (
    <div className="scan">
      {/* capture="environment" opens the back camera on phones */}
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
      <input ref={gallery} type="file" accept="image/*" multiple hidden
        onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />

      {!pages.length ? (
        <div className="scan-empty">
          <div className="scan-frame" aria-hidden="true">
            <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
            <span className="scan-line" />
            <CameraIcon size={52} />
          </div>
          <button className="btn btn-primary btn-block" onClick={() => camera.current.click()}><CameraIcon size={22} /> take photo</button>
          <button className="btn btn-ghost btn-block" onClick={() => gallery.current.click()}><GalleryAddIcon size={22} /> from gallery</button>
          <p className="tip">lay the page flat, fill the frame, good light. add as many pages as you need.</p>
        </div>
      ) : (
        <>
          <div className="scan-grid">
            {pages.map((p, i) => (
              <figure key={p.id} className="scan-page">
                <div className="scan-thumb">
                  <img src={p.url} alt={`page ${i + 1}`} className={enhance ? 'doc' : ''} style={{ transform: `rotate(${p.rotate}deg)` }} />
                </div>
                <figcaption>
                  <span className="scan-num">{i + 1}</span>
                  <button className="mini" aria-label="rotate page" disabled={busy} onClick={() => rotate(p.id)}><RefreshIcon size={16} /></button>
                  <button className="mini danger" data-sfx="trash" aria-label="remove page" disabled={busy} onClick={() => remove(p.id)}><CloseIcon size={14} /></button>
                </figcaption>
              </figure>
            ))}
            <div className="scan-add">
              <button disabled={busy} onClick={() => camera.current.click()}><CameraIcon size={24} /><span>photo</span></button>
              <button disabled={busy} onClick={() => gallery.current.click()}><AddCircleIcon size={24} /><span>gallery</span></button>
            </div>
          </div>

          <button className="setting" data-sfx="toggle" disabled={busy} onClick={() => setEnhance((v) => !v)}>
            <MagicWandIcon size={22} />
            <span><strong>document mode</strong><small>cleaner black &amp; white pages</small></span>
            <span className={`switch ${enhance ? 'on' : ''}`} />
          </button>

          {busy ? (
            <div className="scan-progress" role="status">
              <div className="progress"><span style={{ width: `${Math.round(progress.pct * 100)}%` }} /></div>
              <p>{progress.status}</p>
            </div>
          ) : (
            <button className="btn btn-primary btn-block" onClick={run}>
              <tool.Icon size={20} /> {labels[tool.output]} · {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            </button>
          )}
          {tool.output !== 'pdf' && !busy && <p className="tip">the first scan downloads the text reader (~10mb), then it works offline.</p>}
        </>
      )}
    </div>
  )
}
