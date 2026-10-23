import { AltArrowLeftIcon, Pen2Icon, CheckCircleIcon, MagicWandIcon, DangerTriangleIcon } from '@solar-icons/react/bold'
import { useConfirm } from '../lib/confirm.jsx'
import { pageText } from '../lib/ocrfix.js'

// shows what the text reader saw before it becomes cards or a file.
// yellow = auto-fixed (tap to check/undo), red underline = unsure (tap to fix)
export default function OcrReview({ review, onChange, onDone, onBack, label, Icon }) {
  const ask = useConfirm()
  const unsure = review.pages.reduce((n, p) => n + (p.text != null ? 0 : p.lines.flat().filter((t) => t?.status === 'unsure').length), 0)

  const setPage = (i, patch) => onChange({ ...review, pages: review.pages.map((p, j) => (j === i ? { ...p, ...patch } : p)) })

  const setWord = (i, id, text) => setPage(i, {
    lines: review.pages[i].lines.map((line) => line && line.map((t) => (t.id === id ? { ...t, text, status: 'done' } : t))),
  })

  const tapWord = async (i, t) => {
    const fixed = t.status === 'fixed'
    const hints = t.suggestions?.filter((s) => s !== t.text).slice(0, 3) || []
    const value = await ask({
      title: fixed ? 'auto-fixed word' : 'check this word',
      text: fixed
        ? `the reader saw "${t.original}". keep "${t.text}" or type the right word.`
        : `the reader wasn't sure about "${t.text}".${hints.length ? ` maybe: ${hints.join(', ')}` : ''}`,
      input: { value: fixed ? t.text : hints[0] || t.text, max: 60 },
      ok: 'save',
      cancel: fixed ? 'undo fix' : 'keep as is',
      Icon: fixed ? MagicWandIcon : DangerTriangleIcon,
    })
    if (value) setWord(i, t.id, value)
    // cancel on an auto-fix means "undo": put back what the reader saw
    else if (value === null && fixed) setWord(i, t.id, t.original)
    else if (value === null) setWord(i, t.id, t.text)
  }

  return (
    <div className="review">
      <div className="review-head">
        <button className="back-link" onClick={onBack}><AltArrowLeftIcon size={20} /> retake</button>
        <div className="review-stats">
          {review.fixed > 0 && <span className="stat fixed"><MagicWandIcon size={14} /> {review.fixed} fixed</span>}
          {unsure > 0
            ? <span className="stat unsure">{unsure} to check</span>
            : <span className="stat ok"><CheckCircleIcon size={14} /> all clear</span>}
        </div>
      </div>
      {review.avgConf < 70 && (
        <div className="review-warn" role="status">
          <DangerTriangleIcon size={20} />
          <p><strong>this photo is hard to read.</strong> for better results, retake it closer, flat, in good light, with no shadow on the page.</p>
        </div>
      )}
      <p className="tip review-tip"><mark className="ocr-word fixed">yellow</mark> = auto-fixed, <span className="ocr-word unsure">red</span> = not sure. tap a word to fix it.</p>

      {review.pages.map((p, i) => (
        <div className="review-page" key={i}>
          <div className="review-page-head">
            <span className="scan-num">page {i + 1}</span>
            <button className="chip" data-sfx="toggle" onClick={() => setPage(i, { text: p.text == null ? pageText(p) : p.text, editing: !p.editing })}>
              <Pen2Icon size={14} /> {p.editing ? 'done' : 'edit'}
            </button>
          </div>
          {p.editing ? (
            <textarea className="notes review-edit" value={p.text} onChange={(e) => setPage(i, { text: e.target.value })} />
          ) : p.text != null ? (
            <p className="review-text">{p.text}</p>
          ) : (
            <p className="review-text">
              {p.lines.map((line, li) => (line ? (
                <span key={li}>
                  {line.map((t) => (t.status === 'fixed' || t.status === 'unsure' ? (
                    <button key={t.id} className={`ocr-word ${t.status}`} onClick={() => tapWord(i, t)}>{t.text}</button>
                  ) : <span key={t.id}>{t.text}</span>)).reduce((acc, el, k) => (k ? [...acc, ' ', el] : [el]), [])}
                  {'\n'}
                </span>
              ) : <span key={li}>{'\n'}</span>))}
            </p>
          )}
        </div>
      ))}

      <button className="btn btn-primary btn-block review-go" onClick={() => onDone(review.pages.map((p) => (p.text != null ? p.text : pageText(p))))}>
        <Icon size={20} /> {label}
      </button>
    </div>
  )
}
