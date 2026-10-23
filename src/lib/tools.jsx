// every tool on the site. kind decides what the tool page shows:
// maker = go to the deck editor, paste = textarea, cards = file -> flashcards,
// convert = file -> python backend -> download, scan = camera -> ocr/pdf on device, soon = not built yet
import {
  LayersMinimalisticIcon, NotesIcon, ImportIcon, DocumentTextIcon, FileTextIcon, PresentationGraphIcon,
  VideoLibraryIcon, MagicWandIcon, StarsIcon, SheetIcon, DocumentIcon, ScannerIcon, CameraIcon, CameraSquareIcon, CameraMinimalisticIcon,
} from '@solar-icons/react/bold'

export const tools = [
  { id: 'maker', group: 'create', Icon: LayersMinimalisticIcon, name: 'flashcard maker', desc: 'build a deck from scratch and study it.', kind: 'maker' },
  { id: 'notes', group: 'create', Icon: NotesIcon, name: 'notes to flashcards', desc: 'paste messy notes, get clean cards.', kind: 'paste',
    placeholder: 'photosynthesis - how plants turn light into food\nmitosis: cell division into two identical cells\n…' },
  { id: 'quizlet', group: 'create', Icon: ImportIcon, name: 'quizlet import', desc: 'bring a quizlet set over in one paste.', kind: 'paste',
    placeholder: 'in quizlet: ⋯ → export → copy text, then paste here.\nterm<tab>definition per line works best.' },

  { id: 'scan-fc', group: 'scan', Icon: CameraIcon, name: 'scan to flashcards', desc: 'snap your notebook, get a deck.', kind: 'scan', output: 'cards' },
  { id: 'scan-pdf', group: 'scan', Icon: ScannerIcon, name: 'scan to pdf', desc: 'turn photos into a clean pdf.', kind: 'scan', output: 'pdf' },
  { id: 'scan-word', group: 'scan', Icon: CameraSquareIcon, name: 'scan to word', desc: 'photo of text to an editable .docx.', kind: 'scan', output: 'docx' },
  { id: 'scan-excel', group: 'scan', Icon: CameraMinimalisticIcon, name: 'scan to excel', desc: 'photo of a table to a spreadsheet.', kind: 'scan', output: 'xlsx' },

  { id: 'pdf-fc', group: 'flashcards', Icon: DocumentTextIcon, name: 'pdf to flashcards', desc: 'turn lecture pdfs into a study deck.', kind: 'cards', accept: '.pdf,application/pdf', label: 'pdf', source: 'pdf' },
  { id: 'word-fc', group: 'flashcards', Icon: FileTextIcon, name: 'word to flashcards', desc: 'convert reviewers in .docx to cards.', kind: 'cards', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'docx', source: 'docx' },
  { id: 'ppt-fc', group: 'flashcards', Icon: PresentationGraphIcon, name: 'powerpoint to flashcards', desc: 'slides in, flashcards out.', kind: 'cards', accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'pptx', source: 'pptx' },
  { id: 'yt-fc', group: 'flashcards', Icon: VideoLibraryIcon, name: 'youtube to flashcards', desc: 'cards from any lecture video.', kind: 'soon' },

  { id: 'pdf-sum', group: 'summarize', Icon: MagicWandIcon, name: 'pdf summarizer', desc: 'the key points of any pdf.', kind: 'soon' },
  { id: 'ppt-sum', group: 'summarize', Icon: StarsIcon, name: 'powerpoint summarizer', desc: 'a 50-slide deck in one page.', kind: 'soon' },
  { id: 'yt-sum', group: 'summarize', Icon: VideoLibraryIcon, name: 'youtube summarizer', desc: 'skip the 2-hour lecture.', kind: 'soon' },

  { id: 'pdf-word', group: 'convert', Icon: FileTextIcon, name: 'pdf to word', desc: 'editable .docx from any pdf.', kind: 'convert', accept: '.pdf,application/pdf', label: 'pdf', endpoint: '/convert/pdf-to-word' },
  { id: 'pdf-excel', group: 'convert', Icon: SheetIcon, name: 'pdf to excel', desc: 'pull tables into a spreadsheet.', kind: 'convert', accept: '.pdf,application/pdf', label: 'pdf', endpoint: '/convert/pdf-to-excel' },
  { id: 'word-pdf', group: 'convert', Icon: DocumentIcon, name: 'word to pdf', desc: 'clean pdf from your .docx.', kind: 'convert', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'docx', local: 'word-pdf' },
]

export const groups = [
  { id: 'all', label: 'all' },
  { id: 'create', label: 'create' },
  { id: 'scan', label: 'scan' },
  { id: 'flashcards', label: 'to flashcards' },
  { id: 'summarize', label: 'summarize' },
  { id: 'convert', label: 'convert' },
]

export const toolPath = (t) => (t.kind === 'maker' ? '/deck' : `/tools/${t.id}`)
