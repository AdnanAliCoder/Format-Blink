"""Bounded, single-job conversion worker. Never fetches user-supplied URLs."""
import io
import json
import os
from pathlib import Path
import subprocess
import sys

EXTENSIONS = {
    'pdf-to-word': ({'.pdf'}, 'docx'), 'word-to-pdf': ({'.doc', '.docx', '.odt'}, 'pdf'),
    'ocr-pdf': ({'.pdf'}, 'pdf'), 'pdf-to-excel': ({'.pdf'}, 'xlsx'),
    'excel-to-pdf': ({'.xls', '.xlsx', '.ods'}, 'pdf'), 'pdf-to-powerpoint': ({'.pdf'}, 'pptx'),
    'powerpoint-to-pdf': ({'.ppt', '.pptx', '.odp'}, 'pdf'),
    'protect-pdf': ({'.pdf'}, 'pdf'), 'unlock-pdf': ({'.pdf'}, 'pdf'),
    'html-to-pdf': ({'.html', '.htm'}, 'pdf'),
    'background-remover': ({'.jpg', '.jpeg', '.png', '.webp', '.avif', '.bmp', '.gif'}, 'png'),
    'image-to-text': ({'.jpg', '.jpeg', '.png', '.webp', '.avif', '.bmp', '.gif'}, 'txt'),
    'video-to-text': ({'.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'}, 'txt'),
}

def command(args, timeout=180):
    result = subprocess.run(args, capture_output=True, timeout=timeout)
    if result.returncode:
        raise ValueError('The conversion engine could not process this file.')
    return result.stdout

def pdf_reader(source, password=''):
    from pypdf import PdfReader
    reader = PdfReader(source)
    if reader.is_encrypted and not reader.decrypt(password):
        raise ValueError('The PDF password is incorrect or missing.')
    if not 0 < len(reader.pages) <= 100:
        raise ValueError('Use PDFs containing 1–100 pages.')
    return reader

def render(source, directory):
    pdf_reader(source)
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(str(source))
    images = []
    try:
        for index in range(len(pdf)):
            page = pdf[index]
            bitmap = page.render(scale=2.0)
            image = directory / f'page-{index+1}.png'
            bitmap.to_pil().save(image, 'PNG')
            bitmap.close()
            images.append(image)
            page.close()
    finally:
        pdf.close()
    return images

def convert(slug, source, settings, directory):
    if slug not in EXTENSIONS or source.suffix.lower() not in EXTENSIONS[slug][0]:
        raise ValueError('Unsupported input format.')
    output = directory / ('result.' + EXTENSIONS[slug][1])
    language = settings.get('language', 'eng')
    if language not in {'eng', 'urd', 'hin', 'eng+urd', 'eng+hin'}:
        raise ValueError('Unsupported OCR language.')
    if slug in {'word-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf'}:
        profile = directory / 'lo-profile'
        # Dedicated profile disables macros and external link updates.
        user = profile / 'user'
        user.mkdir(parents=True)
        (user / 'registrymodifications.xcu').write_text('''<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item><item oor:path="/org.openoffice.Office.Calc/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>2</value></prop></item></oor:items>''')
        target = directory / 'office'
        target.mkdir()
        command([__import__('shutil').which('libreoffice') or __import__('shutil').which('soffice') or 'libreoffice', '-env:UserInstallation=' + profile.as_uri(), '--headless', '--convert-to', 'pdf', '--outdir', str(target), str(source)])
        converted = target / (source.stem + '.pdf')
        if not converted.exists():
            raise ValueError('Office conversion failed. Check the document format.')
        converted.replace(output)
    elif slug in {'protect-pdf', 'unlock-pdf'}:
        from pypdf import PdfWriter
        password = settings.get('password', '')
        if not isinstance(password, str) or not 1 <= len(password) <= 128:
            raise ValueError('Enter a password of 1–128 characters.')
        reader = pdf_reader(source, password if slug == 'unlock-pdf' else '')
        writer = PdfWriter(clone_from=reader)
        if slug == 'protect-pdf':
            writer.encrypt(password, algorithm='AES-256')
        with output.open('wb') as handle:
            writer.write(handle)
    elif slug == 'pdf-to-word':
        pdf_reader(source)
        mode = settings.get('documentMode', 'editable')
        if mode == 'appearance':
            # One full-page image per section retains scans, diagrams and typography.
            from docx import Document
            from docx.shared import Pt
            from docx.enum.section import WD_SECTION_START
            import pypdfium2 as pdfium
            doc = Document()
            pdf = pdfium.PdfDocument(str(source))
            try:
                for i in range(len(pdf)):
                    page = pdf[i]
                    w, h = page.get_size()
                    section = doc.sections[0] if i == 0 else doc.add_section(WD_SECTION_START.NEW_PAGE)
                    section.page_width, section.page_height = Pt(w), Pt(h)
                    section.top_margin = section.bottom_margin = Pt(0)
                    section.left_margin = section.right_margin = Pt(0)
                    section.header_distance = section.footer_distance = Pt(0)
                    bitmap = page.render(scale=2)
                    data = io.BytesIO()
                    bitmap.to_pil().save(data, 'PNG')
                    data.seek(0)
                    para = doc.add_paragraph()
                    para.paragraph_format.space_before = Pt(0)
                    para.paragraph_format.space_after = Pt(0)
                    para.paragraph_format.line_spacing = 1
                    para.add_run().add_picture(data, width=Pt(w), height=Pt(h-1))
                    bitmap.close()
                    page.close()
            finally:
                pdf.close()
            doc.save(output)
        elif mode == 'editable':
            from pdf2docx import Converter
            if not any((page.extract_text() or '').strip() for page in pdf_reader(source).pages):
                raise ValueError('This PDF is scanned. Choose Preserve appearance, or run OCR PDF before editable conversion.')
            converter = Converter(str(source))
            try:
                converter.convert(str(output), multi_processing=False)
            finally:
                converter.close()
        else:
            raise ValueError('Choose editable or appearance conversion.')
    elif slug == 'pdf-to-excel':
        import pdfplumber
        from openpyxl import Workbook
        pdf_reader(source)
        book = Workbook()
        book.remove(book.active)
        with pdfplumber.open(source) as pdf:
            for i, page in enumerate(pdf.pages):
                for j, table in enumerate(page.extract_tables()):
                    sheet = book.create_sheet(f'Page {i+1} table {j+1}')
                    for row in table:
                        sheet.append(row)
                    # User-supplied table text is always text, never spreadsheet formulas.
                    for row in sheet:
                        for cell in row:
                            if isinstance(cell.value, str):
                                cell.data_type = 's'
                    from openpyxl.styles import Alignment
                    from openpyxl.utils import get_column_letter
                    sheet.freeze_panes = 'A2'
                    for row in sheet:
                        for cell in row:
                            cell.alignment = Alignment(wrap_text=True, vertical='top')
                    for column in sheet.columns:
                        length = max((len(str(c.value or '')) for c in column), default=10)
                        sheet.column_dimensions[get_column_letter(column[0].column)].width = min(60, max(12, length+2))
        if not book.sheetnames:
            raise ValueError('No text-based tables detected. OCR scanned pages first.')
        book.save(output)
    elif slug == 'pdf-to-powerpoint':
        from pptx import Presentation
        from pptx.util import Inches
        from PIL import Image
        images = render(source, directory)
        deck = Presentation()
        with Image.open(images[0]) as first:
            ratio = first.width / first.height
        deck.slide_width = Inches(10)
        deck.slide_height = Inches(10 / ratio)
        for image in images:
            slide = deck.slides.add_slide(deck.slide_layouts[6])
            with Image.open(image) as im:
                scale = min(deck.slide_width / im.width, deck.slide_height / im.height)
                w, h = round(im.width * scale), round(im.height * scale)
            slide.shapes.add_picture(str(image), (deck.slide_width-w)//2, (deck.slide_height-h)//2, width=w, height=h)
        deck.save(output)
    elif slug in {'ocr-pdf', 'image-to-text'}:
        import pytesseract
        from PIL import Image
        Image.MAX_IMAGE_PIXELS = 25_000_000
        if slug == 'image-to-text':
            with Image.open(source) as im:
                if im.width * im.height > 25_000_000:
                    raise ValueError('Use an image under 25 megapixels.')
                text = pytesseract.image_to_string(im, lang=language, timeout=120)
            if not text.strip():
                raise ValueError('No text recognized. Try a clearer image or another language.')
            output.write_text(text, encoding='utf-8')
        else:
            from pypdf import PdfWriter, PdfReader
            writer = PdfWriter()
            for image in render(source, directory):
                data = pytesseract.image_to_pdf_or_hocr(str(image), extension='pdf', lang=language, timeout=120)
                writer.append(PdfReader(io.BytesIO(data)))
            with output.open('wb') as handle:
                writer.write(handle)
    elif slug == 'html-to-pdf':
        html = source.read_text(encoding='utf-8')
        if any(token in html.lower() for token in ('<script', 'http://', 'https://', 'file://')):
            raise ValueError('Use self-contained HTML without scripts or external resources.')
        from weasyprint import HTML
        def deny_resources(url, *args, **kwargs):
            # Permit only embedded raster images; never fetch network or local files.
            from weasyprint import default_url_fetcher
            if url.startswith(('data:image/png;', 'data:image/jpeg;', 'data:image/gif;', 'data:image/webp;')) and len(url) <= 14_000_000:
                return default_url_fetcher(url)
            raise ValueError('External and local resources are disabled.')
        try:
            HTML(string=html, url_fetcher=deny_resources).write_pdf(output)
        except Exception as error:
            raise ValueError('HTML layout rendering failed. Check the HTML and the WeasyPrint installation.') from error
    elif slug == 'background-remover':
        from PIL import Image
        from rembg import remove, new_session
        Image.MAX_IMAGE_PIXELS = 25_000_000
        with Image.open(source) as image:
            if image.width * image.height > 25_000_000:
                raise ValueError('Use an image under 25 megapixels.')
            result = remove(image.convert('RGBA'), session=new_session('u2netp'))
            result.save(output, 'PNG')
    elif slug == 'video-to-text':
        from faster_whisper import WhisperModel
        info = json.loads(command(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(source)]))
        if not any(s.get('codec_type') == 'audio' for s in info.get('streams', [])):
            raise ValueError('This video has no audio track.')
        if float(info['format']['duration']) > 600:
            raise ValueError('Transcribe clips up to 10 minutes here. Use Clip Studio for longer recordings.')
        model = WhisperModel(os.environ.get('WHISPER_MODEL', 'small'), device='cpu', compute_type='int8', cpu_threads=2)
        # Decode with the installed FFmpeg instead of version-sensitive PyAV APIs.
        import numpy as np
        pcm = command(['ffmpeg', '-v', 'error', '-i', str(source), '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1'])
        audio = np.frombuffer(pcm, dtype=np.float32).copy()
        segments, _ = model.transcribe(audio, beam_size=3, vad_filter=True)
        text = '\n'.join(f'[{s.start:.2f} – {s.end:.2f}] {s.text.strip()}' for s in segments)
        if not text.strip():
            raise ValueError('No speech detected in this video.')
        output.write_text(text, encoding='utf-8')
    if not output.exists() or output.stat().st_size == 0:
        raise ValueError('No output was produced.')
    return output

if __name__ == '__main__':
    try:
        slug, source = sys.argv[1:3]
        print(convert(slug, Path(source), json.load(sys.stdin), Path(source).parent))
    except Exception as error:
        # Only a concise error reaches the API. No file contents or passwords are logged.
        print(str(error)[:300], file=sys.stderr)
        sys.exit(1)
