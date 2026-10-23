# yrah

yellow, minimalist, phone-first study app (pwa): flashcard maker, notes / quizlet / pdf / word / powerpoint to flashcards, and pdf ↔ word ↔ excel converters.

## pages

| route | what |
| --- | --- |
| `/` | home, quick actions, continue studying |
| `/tools` | every tool |
| `/tools/:id` | one tool (upload / paste) |
| `/study` | full-screen flashcards: tap to flip, swipe right = know it, left = still learning |
| `/deck` | edit the deck |

## frontend (react + vite)

```bash
npm install
npm run dev                  # http://localhost:5173
npm run dev -- --host        # open it from a phone on the same wifi
npm run build && npm run preview   # test the pwa / offline mode
```

the service worker only runs in the production build. installing to the home screen needs https (or localhost).
when hosting, all routes must fall back to `index.html` (`public/_redirects` for netlify, `vercel.json` for vercel are included).

## backend (python + fastapi)

used by pdf → word, pdf → excel and powerpoint → flashcards. everything else (scan tools, word → pdf, flashcards) runs on the device.

**on vercel** it deploys automatically with the site: `api/index.py` wraps `server/main.py` as a serverless function, deps come from the root `requirements.txt`, and `/api/*` is routed to it in `vercel.json`.
limits: uploads up to ~4.5mb, 60s per request, 500mb function size (that's why pdf → word uses pdfplumber + python-docx instead of pdf2docx).

**locally:**

```bash
cd server
python -m venv .venv
.venv\Scripts\activate          # mac/linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

vite proxies `/api` to `127.0.0.1:8000` in dev.

## font & icons

put the nailong font in `public/fonts/` as `Nailong.ttf` (or `.otf` / `.woff2`). until then it falls back to chewy.
icons are [solar icons](https://solar-icons.dev/), bold style, via `@solar-icons/react/bold`.

## seo

- page titles/descriptions live in `src/lib/seo.js` (one entry per route, `noindex` for app screens and unfinished tools)
- `npm run build` runs `scripts/seo.mjs` after vite: prerenders `dist/<route>/index.html` with the right meta + open graph tags, and writes `sitemap.xml` and `robots.txt`
- `src/lib/useSeo.js` keeps the tags in sync while navigating inside the app
- share image: `public/og.png` (1200×630). set `SITE_URL` if the domain changes
