// runs after `vite build`:
// 1. writes dist/<route>/index.html with the right title/description/canonical/og tags,
//    so google and link previews (messenger, facebook, x) see them without running js
// 2. writes dist/sitemap.xml and dist/robots.txt
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE, absolute, pages } from '../src/lib/seo.js'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const base = readFileSync(join(dist, 'index.html'), 'utf8')
const today = new Date().toISOString().slice(0, 10)

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function render(path, { title, description, noindex }) {
  const url = absolute(path)
  const t = esc(title)
  const d = esc(description)
  const swap = (html, re, value) => {
    if (!re.test(html)) throw new Error(`seo: tag not found in index.html: ${re}`)
    return html.replace(re, value)
  }
  let html = base
  html = swap(html, /<title>[^<]*<\/title>/, `<title>${t}</title>`)
  html = swap(html, /(<meta name="description" content=")[^"]*/, `$1${d}`)
  html = swap(html, /(<meta name="robots" content=")[^"]*/, `$1${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}`)
  html = swap(html, /(<link rel="canonical" href=")[^"]*/, `$1${url}`)
  html = swap(html, /(<meta property="og:title" content=")[^"]*/, `$1${t}`)
  html = swap(html, /(<meta property="og:description" content=")[^"]*/, `$1${d}`)
  html = swap(html, /(<meta property="og:url" content=")[^"]*/, `$1${url}`)
  html = swap(html, /(<meta property="og:image" content=")[^"]*/, `$1${absolute(SITE.image)}`)
  html = swap(html, /(<meta name="twitter:title" content=")[^"]*/, `$1${t}`)
  html = swap(html, /(<meta name="twitter:description" content=")[^"]*/, `$1${d}`)
  html = swap(html, /(<meta name="twitter:image" content=")[^"]*/, `$1${absolute(SITE.image)}`)
  return html
}

let count = 0
for (const [path, meta] of Object.entries(pages)) {
  const file = path === '/' ? join(dist, 'index.html') : join(dist, path, 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, render(path, meta))
  count++
}

const indexed = Object.entries(pages).filter(([, m]) => !m.noindex)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexed.map(([path]) => `  <url>
    <loc>${absolute(path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${path === '/' ? '1.0' : path === '/tools' ? '0.9' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>
`
writeFileSync(join(dist, 'sitemap.xml'), sitemap)

// /study and /deck stay crawlable on purpose: they carry noindex, and google
// can only see a noindex tag on pages it is allowed to fetch
const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${absolute('/sitemap.xml')}
`
writeFileSync(join(dist, 'robots.txt'), robots)

console.log(`seo: ${count} pages prerendered, ${indexed.length} urls in sitemap.xml, robots.txt written`)
