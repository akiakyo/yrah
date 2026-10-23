import { tools } from '../lib/tools.jsx'

export default function Marquee() {
  // doubled so the loop is seamless
  const items = [...tools, ...tools]
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {items.map((t, i) => <span key={i}>{t.name}</span>)}
      </div>
    </div>
  )
}
