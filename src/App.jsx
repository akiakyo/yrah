import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { DeckProvider } from './lib/deck.jsx'
import { ConfirmProvider } from './lib/confirm.jsx'
import { useReveal } from './lib/useReveal.js'
import { useSeo } from './lib/useSeo.js'
import { installTapSounds } from './lib/sfx.js'
import Background from './components/Background.jsx'
import Nav from './components/Nav.jsx'
import TabBar from './components/TabBar.jsx'
import Home from './pages/Home.jsx'
import ToolsPage from './pages/ToolsPage.jsx'
import ToolPage from './pages/ToolPage.jsx'
import Study from './pages/Study.jsx'
import Deck from './pages/Deck.jsx'

function Layout() {
  const { pathname } = useLocation()
  // study is a focus screen: no nav, no tab bar
  const focus = pathname === '/study'

  // instant, otherwise the smooth-scroll css animates every page change
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [pathname])
  useReveal([pathname])
  useSeo(pathname)

  return (
    <>
      <Background />
      {!focus && <Nav />}
      <main key={pathname} className={`page ${focus ? 'page-focus' : ''}`}>
        <Outlet />
      </main>
      {!focus && <TabBar />}
    </>
  )
}

export default function App() {
  useEffect(() => installTapSounds(), [])

  return (
    <BrowserRouter>
      <DeckProvider>
        <ConfirmProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="tools" element={<ToolsPage />} />
            <Route path="tools/:id" element={<ToolPage />} />
            <Route path="study" element={<Study />} />
            <Route path="deck" element={<Deck />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </ConfirmProvider>
      </DeckProvider>
    </BrowserRouter>
  )
}
