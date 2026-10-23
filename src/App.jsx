import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { LibraryProvider } from './lib/library.jsx'
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
import Library from './pages/Library.jsx'

function Layout() {
  const { pathname } = useLocation()
  // study is a focus screen: no nav, no tab bar
  const focus = pathname === '/study' || pathname.startsWith('/study/')

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
      <LibraryProvider>
        <ConfirmProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="tools" element={<ToolsPage />} />
            <Route path="tools/:id" element={<ToolPage />} />
            <Route path="library" element={<Library />} />
            <Route path="library/:folderId" element={<Library />} />
            <Route path="deck" element={<Navigate to="/library" replace />} />
            <Route path="deck/:deckId" element={<Deck />} />
            <Route path="study" element={<Study />} />
            <Route path="study/:deckId" element={<Study />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </ConfirmProvider>
      </LibraryProvider>
    </BrowserRouter>
  )
}
