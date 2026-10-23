import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AltArrowLeftIcon, CloudUploadIcon, MagicWandIcon } from '@solar-icons/react/bold'
import { tools, toolPath } from '../lib/tools.jsx'
import { textToCards } from '../lib/parse.js'
import { pdfToText, docxToText } from '../lib/extract.js'
import { convertFile, pptxToText } from '../lib/api.js'
import { useLibrary } from '../lib/library.jsx'
import FolderSelect from '../components/FolderSelect.jsx'
import { sfx } from '../lib/sfx.js'
import { friendlyError } from '../lib/errors.js'
import ScanTool from '../components/ScanTool.jsx'
import { docxToPdf } from '../lib/wordpdf.js'
import { download } from '../lib/scan.js'

const extractors = { pdf: pdfToText, docx: docxToText, pptx: pptxToText }
const localConverters = { 'word-pdf': docxToPdf }

function DropZone({ tool, onFile, status }) {
  const [over, setOver] = useState(false)
  const input = useRef()

  const drop = (e) => {
    e.preventDefault()
    setOver(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <button type="button" className={`drop ${over ? 'over' : ''} ${status ? 'busy' : ''}`} disabled={!!status}
      onClick={() => input.current.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={drop}>
      {status ? <span className="spinner" /> : <span className="drop-icon"><CloudUploadIcon size={44} /></span>}
      <strong>{status || `choose a ${tool.label} file`}</strong>
      <span>{status ? (tool.endpoint || tool.source === 'pptx' ? 'hang tight, uploading to convert' : 'hang tight, this stays on your phone') : 'tap to browse, or drop it here'}</span>
      <input ref={input} type="file" accept={tool.accept} hidden
        onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f) }} />
    </button>
  )
}

export default function ToolPage() {
  const { id } = useParams()
  const tool = tools.find((t) => t.id === id)
  const navigate = useNavigate()
  const lib = useLibrary()
  const { notify } = lib
  const folderId = lib.prefs.folderId && lib.getFolder(lib.prefs.folderId) ? lib.prefs.folderId : null
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')

  if (!tool) return <Navigate to="/tools" replace />
  if (tool.kind === 'maker') return <Navigate to="/deck" replace />

  const others = tools.filter((t) => t.group === tool.group && t.id !== tool.id)

  // cards found -> saved as a new deck in the chosen folder, then straight to studying
  const fromText = (raw, title) => {
    const cards = textToCards(raw)
    if (!cards.length) { sfx('error'); return notify("couldn't find any cards in that") }
    sfx('success')
    const id = lib.createDeck({ title: title || tool.name.replace(/ to flashcards$/, '') + ' deck', cards, folderId })
    navigate(`/study/${id}`, { state: { made: cards.length } })
  }
  const makesCards = tool.kind === 'paste' || tool.kind === 'cards' || (tool.kind === 'scan' && tool.output === 'cards')

  const handleFile = async (file) => {
    try {
      if (tool.kind === 'cards') {
        setStatus(`reading your ${tool.label}…`)
        const raw = await extractors[tool.source](file)
        setStatus('making flashcards…')
        fromText(raw, file.name.replace(/\.[^.]+$/, ''))
      } else if (tool.local) {
        // converted on the device, no server needed
        setStatus('converting…')
        const name = file.name.replace(/\.[^.]+$/, '') + '.pdf'
        download(await localConverters[tool.local](file), name)
        sfx('success')
        notify(`downloaded ${name} ✦`)
      } else {
        setStatus('converting…')
        const name = await convertFile(tool.endpoint, file)
        sfx('success')
        notify(`downloaded ${name} ✦`)
      }
    } catch (err) {
      sfx('error')
      notify(friendlyError(err))
    } finally {
      setStatus('')
    }
  }

  return (
    <section className="tool-page page-top">
      <Link to="/tools" className="back-link"><AltArrowLeftIcon size={20} /> tools</Link>

      <div className="tool-hero">
        <div className="tool-hero-icon"><tool.Icon size={34} /></div>
        <h1 className="display">{tool.name}</h1>
        <p className="muted">{tool.desc}</p>
      </div>

      <div className="tool-work">
        {makesCards && <FolderSelect value={folderId} onChange={(id) => lib.setPref('folderId', id)} />}
        {tool.kind === 'paste' && (
          <>
            <textarea className="notes" placeholder={tool.placeholder} value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-primary btn-block" disabled={!text.trim()} onClick={() => fromText(text)}>
              <MagicWandIcon size={20} /> make flashcards
            </button>
          </>
        )}

        {tool.kind === 'scan' && <ScanTool tool={tool} />}

        {(tool.kind === 'cards' || tool.kind === 'convert') && <DropZone tool={tool} onFile={handleFile} status={status} />}

        {tool.kind === 'cards' && (
          <p className="tip">tip: notes written as <b>term - definition</b> or <b>term: definition</b> make the best cards.</p>
        )}

        {tool.kind === 'soon' && (
          <div className="soon-box">
            <span className="badge soon">coming soon</span>
            <p>nailong is still cooking this one. try the flashcard tools in the meantime.</p>
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div className="related">
          <p className="mega-title">also try</p>
          <div className="related-list">
            {others.map((t) => (
              <Link key={t.id} to={toolPath(t)} className="chip"><t.Icon size={16} /> {t.name}</Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
