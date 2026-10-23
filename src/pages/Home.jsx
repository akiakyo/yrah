import { Link } from 'react-router-dom'
import { CameraIcon, DocumentTextIcon, NotesIcon, FoldersIcon, PlayIcon, AltArrowRightIcon } from '@solar-icons/react/bold'
import Hero from '../components/Hero.jsx'
import Marquee from '../components/Marquee.jsx'
import Steps from '../components/Steps.jsx'
import Footer from '../components/Footer.jsx'
import { useLibrary, playableCards } from '../lib/library.jsx'
import InstallCard from '../components/InstallCard.jsx'

const quick = [
  { to: '/tools/pdf-fc', Icon: DocumentTextIcon, title: 'upload a pdf', text: 'lecture, reviewer, module' },
  { to: '/tools/scan-fc', Icon: CameraIcon, title: 'scan your notes', text: 'snap a photo of any page' },
  { to: '/tools/notes', Icon: NotesIcon, title: 'paste notes', text: 'term - definition style' },
  { to: '/library', Icon: FoldersIcon, title: 'my library', text: 'courses, subjects & decks' },
]

export default function Home() {
  const lib = useLibrary()
  const deck = lib.getDeck(lib.lastDeckId) || lib.decks[0]
  const count = playableCards(deck).length
  const where = deck ? lib.path(deck.folderId).map((f) => f.name).join(' / ') : ''

  return (
    <>
      <Hero />

      <section className="section-tight">
        <div className="quick">
          {quick.map(({ to, Icon, title, text }, i) => (
            <Link key={to} to={to} className="quick-tile reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
              <span className="quick-icon"><Icon size={26} /></span>
              <span><strong>{title}</strong><small>{text}</small></span>
              <AltArrowRightIcon size={20} className="quick-arrow" />
            </Link>
          ))}
        </div>

        {count > 0 && (
          <Link to={`/study/${deck.id}`} className="resume reveal">
            <div>
              <p className="eyebrow">continue studying</p>
              <h3 className="display">{deck.title || 'untitled deck'}</h3>
              <p className="muted">{count} cards{where ? ` · ${where}` : ''}</p>
            </div>
            <span className="resume-play"><PlayIcon size={26} /></span>
          </Link>
        )}

      </section>

      <Marquee />
      <Steps />
      <InstallCard />

      <section className="cta reveal">
        <h2 className="display sticker">ready to rawr through exams?</h2>
        <Link to="/tools/pdf-fc" className="btn btn-dark">upload a pdf</Link>
      </section>
      <Footer />
    </>
  )
}
