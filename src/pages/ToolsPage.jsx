import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightUpIcon } from '@solar-icons/react/bold'
import { tools, groups, toolPath } from '../lib/tools.jsx'

export default function ToolsPage() {
  const [filter, setFilter] = useState('all')
  const list = tools.filter((t) => filter === 'all' || t.group === filter)

  // spotlight follows the cursor inside each card
  const spot = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <section className="section page-top">
      <div className="section-head">
        <p className="eyebrow">the toolbox</p>
        <h2 className="display">pick a tool</h2>
        <p className="muted">most of them run right on your phone.</p>
      </div>
      <div className="filters">
        {groups.map((g) => (
          <button key={g.id} className={`chip ${filter === g.id ? 'active' : ''}`} onClick={() => setFilter(g.id)}>{g.label}</button>
        ))}
      </div>
      <div className="tool-grid">
        {list.map((t, i) => (
          <Link key={`${filter}-${t.id}`} to={toolPath(t)} className="tool" style={{ animationDelay: `${i * 0.04}s` }} onMouseMove={spot}>
            <ArrowRightUpIcon size={20} className="tool-arrow" />
            <div className="tool-icon"><t.Icon size={26} /></div>
            <div className="tool-text">
              <h3>{t.name}</h3>
              <p>{t.desc}</p>
            </div>
            {t.kind === 'soon' && <span className="badge soon">soon</span>}
          </Link>
        ))}
      </div>
    </section>
  )
}
