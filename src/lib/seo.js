// search + social meta for every route. plain js (no jsx) so the build script
// in scripts/seo.mjs can import it to prerender html, sitemap.xml and robots.txt
export const SITE = {
  name: 'yrah',
  url: (typeof process !== 'undefined' && process.env?.SITE_URL) || 'https://yrah.vercel.app',
  image: '/og.png',
  locale: 'en_US',
}

// noindex: personal app screens or tools that aren't built yet (thin pages hurt seo)
export const pages = {
  '/': {
    title: 'yrah — Free Flashcard Maker, PDF & Scan to Flashcards',
    description: 'Turn PDFs, Word docs, slides, notes and photos of your notebook into flashcards in seconds. Free, no sign up, works offline on your phone.',
  },
  '/tools': {
    title: 'All Study Tools — Flashcards, Scanner & Converters | yrah',
    description: 'Every free yrah tool in one place: flashcard maker, PDF/Word/PowerPoint to flashcards, scan to PDF, Word or Excel, and file converters.',
  },
  '/tools/notes': {
    title: 'Notes to Flashcards — Free Online Converter | yrah',
    description: 'Paste your notes and get clean study flashcards instantly. Works with "term - definition" and "term: definition" notes. Free, no sign up.',
  },
  '/tools/quizlet': {
    title: 'Quizlet Import — Move Your Sets for Free | yrah',
    description: 'Export a Quizlet set as text, paste it into yrah and study it as flashcards right away. Free, no account needed.',
  },
  '/tools/scan-fc': {
    title: 'Scan to Flashcards — Photo of Notes to Cards | yrah',
    description: 'Snap a photo of your notebook or handout and turn it into flashcards with on-device text recognition. Free and private, works on your phone.',
  },
  '/tools/scan-pdf': {
    title: 'Scan to PDF — Free Phone Document Scanner | yrah',
    description: 'Use your phone camera to scan pages into a clean black and white PDF. Multiple pages, rotate and reorder. Free, nothing is uploaded.',
  },
  '/tools/scan-word': {
    title: 'Scan to Word — Photo to Editable DOCX (OCR) | yrah',
    description: 'Take a photo of printed text and get an editable Word document. Free OCR that runs right on your phone, no upload, no sign up.',
  },
  '/tools/scan-excel': {
    title: 'Scan to Excel — Photo of a Table to XLSX | yrah',
    description: 'Turn a photo of a printed table into an Excel spreadsheet with free on-device OCR. Works on mobile, no account needed.',
  },
  '/tools/pdf-fc': {
    title: 'PDF to Flashcards — Free Flashcard Generator | yrah',
    description: 'Upload a lecture PDF or reviewer and get study flashcards in seconds. Runs on your device, free, no sign up. Then study with swipe mode.',
  },
  '/tools/word-fc': {
    title: 'Word to Flashcards — DOCX Reviewer to Cards | yrah',
    description: 'Convert a Word (.docx) reviewer into flashcards instantly. Free, private and works on your phone.',
  },
  '/tools/ppt-fc': {
    title: 'PowerPoint to Flashcards — PPTX Slides to Cards | yrah',
    description: 'Turn PowerPoint slides into flashcards: each slide title becomes a term and its bullets the definition. Free, no sign up.',
  },
  '/tools/pdf-word': {
    title: 'PDF to Word — Free PDF to DOCX Converter | yrah',
    description: 'Convert a PDF into an editable Word document with headings, paragraphs and tables. Free online converter, no sign up.',
  },
  '/tools/pdf-excel': {
    title: 'PDF to Excel — Extract PDF Tables to XLSX | yrah',
    description: 'Pull tables out of a PDF into an Excel spreadsheet, one sheet per table. Free online converter, no account needed.',
  },
  '/tools/word-pdf': {
    title: 'Word to PDF — Free DOCX to PDF Converter | yrah',
    description: 'Turn a Word document into a clean PDF right in your browser. Free, private, works offline on your phone.',
  },
  '/tools/yt-fc': { title: 'YouTube to Flashcards (coming soon) | yrah', description: 'Turn lecture videos into flashcards. Coming soon to yrah.', noindex: true },
  '/tools/pdf-sum': { title: 'PDF Summarizer (coming soon) | yrah', description: 'Get the key points of any PDF. Coming soon to yrah.', noindex: true },
  '/tools/ppt-sum': { title: 'PowerPoint Summarizer (coming soon) | yrah', description: 'Summarize a slide deck in one page. Coming soon to yrah.', noindex: true },
  '/tools/yt-sum': { title: 'YouTube Summarizer (coming soon) | yrah', description: 'Skip the 2-hour lecture. Coming soon to yrah.', noindex: true },
  '/study': { title: 'Study Your Flashcards | yrah', description: 'Swipe through your flashcards: right if you know it, left to review again.', noindex: true },
  '/deck': { title: 'My Flashcard Deck | yrah', description: 'Edit the terms and definitions in your flashcard deck.', noindex: true },
}

export const seoFor = (path) => pages[path] || pages['/']

export const absolute = (path) => SITE.url.replace(/\/$/, '') + path
