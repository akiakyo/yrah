"""yrah backend: file conversions the browser can't do on its own.

run with:  uvicorn main:app --reload --port 8000   (from inside /server)
"""

import io
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

app = FastAPI(title="yrah api")

# only needed when the frontend is not served through the vite proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-filename"],
)

MAX_BYTES = 25 * 1024 * 1024
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


async def save_upload(file: UploadFile, folder: Path, ext: str) -> Path:
    # writes the upload to a temp folder after basic checks
    if not file.filename or not file.filename.lower().endswith(ext):
        raise HTTPException(400, f"please upload a {ext} file")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "file is too big (max 25mb)")
    path = folder / f"input{ext}"
    path.write_bytes(data)
    return path


def download(data: bytes, filename: str, media_type: str) -> Response:
    return Response(data, media_type=media_type, headers={"x-filename": filename})


def stem(file: UploadFile) -> str:
    return Path(file.filename or "file").stem


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/convert/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    # pdfplumber + python-docx instead of pdf2docx: pdf2docx pulls ~900mb of
    # opencv/onnx deps, too big for a vercel function (500mb cap)
    import pdfplumber
    from docx import Document

    with tempfile.TemporaryDirectory() as tmp:
        src = await save_upload(file, Path(tmp), ".pdf")
        doc = Document()
        try:
            with pdfplumber.open(src) as pdf:
                for i, page in enumerate(pdf.pages):
                    if i:
                        doc.add_page_break()
                    write_page(doc, page)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(422, "couldn't read that pdf")

        buf = io.BytesIO()
        doc.save(buf)
        return download(buf.getvalue(), f"{stem(file)}.docx", DOCX)


def write_page(doc, page):
    """adds one pdf page to the docx: text lines become headings/paragraphs, tables stay tables."""
    tables = page.find_tables()
    boxes = [t.bbox for t in tables]

    def in_table(obj):
        return any(b[0] <= obj["x0"] and obj["x1"] <= b[2] and b[1] <= obj["top"] and obj["bottom"] <= b[3] for b in boxes)

    text_page = page.filter(lambda o: o.get("object_type") != "char" or not in_table(o)) if boxes else page
    lines = text_page.extract_text_lines(return_chars=True)

    sizes = sorted(c["size"] for line in lines for c in line["chars"] if c["text"].strip())
    body = sizes[len(sizes) // 2] if sizes else 11

    # everything on the page in reading order, top to bottom
    items = [("line", line["top"], line) for line in lines] + [("table", t.bbox[1], t) for t in tables]
    items.sort(key=lambda it: it[1])

    para = None
    last = None
    for kind, top, obj in items:
        if kind == "table":
            rows = [r for r in obj.extract() if any(c for c in r)]
            if rows:
                cols = max(len(r) for r in rows)
                table = doc.add_table(rows=len(rows), cols=cols)
                table.style = "Table Grid"
                for r, row in enumerate(rows):
                    for c, cell in enumerate(row):
                        table.cell(r, c).text = (cell or "").replace("\n", " ")
            para, last = None, None
            continue

        text = obj["text"].strip()
        chars = [c for c in obj["chars"] if c["text"].strip()]
        if not text or not chars:
            continue
        size = max(c["size"] for c in chars)
        bold = all("bold" in c["fontname"].lower() for c in chars)

        if size >= body * 1.35:
            doc.add_heading(text, level=1)
            para, last = None, None
        elif size >= body * 1.12:
            doc.add_heading(text, level=2)
            para, last = None, None
        else:
            # join wrapped lines into one paragraph when the style and spacing match
            gap = top - last["bottom"] if last else None
            same = last and abs(last["size"] - size) < 0.5 and last["bold"] == bold
            if para is not None and same and gap is not None and gap < size * 0.9:
                para.add_run(" " + text).bold = bold
            else:
                para = doc.add_paragraph()
                para.add_run(text).bold = bold
            last = {"bottom": obj["bottom"], "size": size, "bold": bold}


@app.post("/api/convert/pdf-to-excel")
async def pdf_to_excel(file: UploadFile = File(...)):
    import pdfplumber
    from openpyxl import Workbook

    with tempfile.TemporaryDirectory() as tmp:
        src = await save_upload(file, Path(tmp), ".pdf")
        wb = Workbook()
        wb.remove(wb.active)

        try:
            with pdfplumber.open(src) as pdf:
                for i, page in enumerate(pdf.pages, 1):
                    for j, table in enumerate(page.extract_tables(), 1):
                        ws = wb.create_sheet(f"p{i} table {j}"[:31])
                        for row in table:
                            ws.append([cell or "" for cell in row])

                # no tables found, dump the text line by line instead
                if not wb.sheetnames:
                    ws = wb.create_sheet("text")
                    for page in pdf.pages:
                        for line in (page.extract_text() or "").splitlines():
                            ws.append([line])
        except Exception:
            raise HTTPException(422, "couldn't read that pdf")

        buf = io.BytesIO()
        wb.save(buf)
        return download(buf.getvalue(), f"{stem(file)}.xlsx", XLSX)


@app.post("/api/convert/word-to-pdf")
async def word_to_pdf(file: UploadFile = File(...)):
    with tempfile.TemporaryDirectory() as tmp:
        src = await save_upload(file, Path(tmp), ".docx")
        out = Path(tmp) / "input.pdf"

        # docx2pdf uses microsoft word (windows/mac), libreoffice is the fallback
        try:
            from docx2pdf import convert

            convert(str(src), str(out))
        except Exception:
            soffice = shutil.which("soffice") or shutil.which("libreoffice")
            if not soffice:
                raise HTTPException(501, "word to pdf needs microsoft word or libreoffice on the server")
            subprocess.run(
                [soffice, "--headless", "--convert-to", "pdf", "--outdir", tmp, str(src)],
                check=True,
                timeout=120,
            )

        if not out.exists():
            raise HTTPException(500, "conversion failed")
        return download(out.read_bytes(), f"{stem(file)}.pdf", "application/pdf")


@app.post("/api/pptx/text")
async def pptx_text(file: UploadFile = File(...)):
    from pptx import Presentation

    with tempfile.TemporaryDirectory() as tmp:
        src = await save_upload(file, Path(tmp), ".pptx")
        try:
            deck = Presentation(str(src))
        except Exception:
            raise HTTPException(422, "couldn't read that powerpoint")

        # one "title - body" line per slide so the frontend parser makes a card from it
        lines = []
        for slide in deck.slides:
            title = slide.shapes.title.text.strip() if slide.shapes.title else ""
            body = []
            for shape in slide.shapes:
                if shape == slide.shapes.title or not shape.has_text_frame:
                    continue
                for para in shape.text_frame.paragraphs:
                    text = "".join(run.text for run in para.runs).strip()
                    if text:
                        body.append(text)
            if title and body:
                lines.append(f"{' '.join(title.split())} - {'; '.join(body)}")
            elif body:
                lines.append("\n".join(body) + "\n")

        return {"text": "\n".join(lines)}
