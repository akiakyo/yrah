import { useEffect, useRef } from 'react'

export default function Background() {
  const glow = useRef()

  // soft yellow glow that follows the cursor
  useEffect(() => {
    if (matchMedia('(hover: none)').matches) return
    const move = (e) => {
      glow.current.style.opacity = 1
      glow.current.style.left = e.clientX + 'px'
      glow.current.style.top = e.clientY + 'px'
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])

  return (
    <>
      <div className="bg" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="grain" />
      </div>
      <div className="cursor-glow" ref={glow} aria-hidden="true" />
    </>
  )
}
