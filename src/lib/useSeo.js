import { useEffect } from 'react'
import { SITE, absolute, seoFor } from './seo.js'

function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

// keeps title, description, canonical and social tags in sync while navigating
export function useSeo(pathname) {
  useEffect(() => {
    const { title, description, noindex } = seoFor(pathname)
    const url = absolute(pathname)
    document.title = title
    setMeta('name', 'description', description)
    setMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', absolute(SITE.image))
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    const canonical = document.head.querySelector('link[rel="canonical"]')
    if (canonical) canonical.href = url
  }, [pathname])
}
