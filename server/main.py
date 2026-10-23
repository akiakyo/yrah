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
    from pdf2docx import Converter

    with tempfile.TemporaryDirectory() as tmp:
        src = await save_upload(file, Path(tmp), ".pdf")
        out = Path(tmp) / "output.docx"
        try:
            cv = Converter(str(src))
            cv.convert(str(out))
            cv.close()
        except Exception:
            raise HTTPException(422, "couldn't read that pdf")
        return download(out.read_bytes(), f"{stem(file)}.docx", DOCX)


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
