import { NavLink } from 'react-router-dom'
import { Home2Icon, WidgetIcon, AddCircleIcon, FoldersIcon, LayersMinimalisticIcon } from '@solar-icons/react/bold'

// phone-only bottom navigation, the middle button goes straight to pdf upload
const tabs = [
  { to: '/', label: 'home', Icon: Home2Icon, end: true },
  { to: '/tools', label: 'tools', Icon: WidgetIcon, end: true },
  { to: '/tools/pdf-fc', label: 'upload', Icon: AddCircleIcon, main: true },
  { to: '/library', label: 'library', Icon: FoldersIcon },
  { to: '/study', label: 'study', Icon: LayersMinimalisticIcon },
]

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="main">
      {tabs.map(({ to, label, Icon, end, main }) => (
        <NavLink key={to} to={to} end={end} className={`tab-item ${main ? 'tab-main' : ''}`}>
          <span className="tab-icon"><Icon size={main ? 30 : 24} /></span>
          <span className="tab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
