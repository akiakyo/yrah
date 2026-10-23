import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AltArrowLeftIcon, CloudUploadIcon, MagicWandIcon } from '@solar-icons/react/bold'
import { tools, toolPath } from '../lib/tools.jsx'
import { textToCards } from '../lib/parse.js'
import { pdfToText, docxToText } from '../lib/extract.js'
import { convertFile, pptxToText } from '../lib/api.js'
import { useDeck } from '../lib/deck.jsx'
import { sfx } from '../lib/sfx.js'
import ScanTool from '../components/ScanTool.jsx'

const extractors = { pdf: pdfToText, docx: docxToText, pptx: pptxToText }

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
      <span>{status ? 'hang tight, this stays on your phone' : 'tap to browse, or drop it here'}</span>
      <input ref={input} type="file" accept={tool.accept} hidden
        onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f) }} />
    </button>
  )
}

export default function ToolPage() {
  const { id } = useParams()
  const tool = tools.find((t) => t.id === id)
  const navigate = useNavigate()
  const { loadCards, notify } = useDeck()
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')

  if (!tool) return <Navigate to="/tools" replace />
  if (tool.kind === 'maker') return <Navigate to="/deck" replace />

  const others = tools.filter((t) => t.group === tool.group && t.id !== tool.id)

  // cards found -> straight to the study screen
  const fromText = (raw, title) => {
    const cards = textToCards(raw)
    if (!cards.length) { sfx('error'); return notify("couldn't find any cards in that") }
    sfx('success')
    loadCards(cards, title)
    navigate('/study', { state: { made: cards.length } })
  }

  const handleFile = async (file) => {
    try {
      if (tool.kind === 'cards') {
        setStatus(`reading your ${tool.label}…`)
        const raw = await extractors[tool.source](file)
        setStatus('making flashcards…')
        fromText(raw, file.name.replace(/\.[^.]+$/, ''))
      } else {
        setStatus('converting…')
        const name = await convertFile(tool.endpoint, file)
        sfx('success')
        notify(`downloaded ${name} ✦`)
      }
    } catch (err) {
      sfx('error')
      notify(err.message || 'something went wrong')
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
