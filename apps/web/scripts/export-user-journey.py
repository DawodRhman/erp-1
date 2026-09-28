from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, PageBreak


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'docs' / 'TRACK360_USER_JOURNEY.md'
OUTPUT = ROOT / 'output' / 'pdf' / 'TRACK360_ERP_User_Journey.pdf'
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont('Guide', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('GuideBold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='GuideBold')

ink = colors.HexColor('#172033')
blue = colors.HexColor('#2353AD')
body = ParagraphStyle('Body', fontName='Guide', fontSize=9.5, leading=13.3,
                      textColor=ink, spaceAfter=7, alignment=TA_LEFT)
title = ParagraphStyle('Title', parent=body, fontName='GuideBold', fontSize=20,
                       leading=25, textColor=blue, spaceAfter=10)
section = ParagraphStyle('Section', parent=body, fontName='GuideBold', fontSize=16,
                         leading=21, textColor=blue, spaceAfter=12, keepWithNext=True)
subhead = ParagraphStyle('Subhead', parent=body, fontName='GuideBold', fontSize=10.5,
                         leading=14, spaceBefore=8, spaceAfter=5, keepWithNext=True)
step = ParagraphStyle('Step', parent=body, leftIndent=19, bulletIndent=0,
                      spaceAfter=5, bulletFontName='GuideBold', bulletFontSize=9.5)
bullet = ParagraphStyle('Bullet', parent=step, leftIndent=12, bulletFontName='Guide')


def markup(text):
    text = escape(text)
    return re.sub(r'`([^`]+)`', r'<b>\1</b>', text)


story = []
section_count = 0
for line in SOURCE.read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if not line:
        continue
    if line.startswith('# '):
        story.append(Paragraph(markup(line[2:]), title))
    elif line.startswith('## '):
        if section_count:
            story.append(PageBreak())
        section_count += 1
        story.append(Paragraph(markup(line[3:]), section))
    elif line.startswith('### '):
        story.append(Paragraph(markup(line[4:]), subhead))
    elif line.startswith('- '):
        story.append(Paragraph(markup(line[2:]), bullet, bulletText='-'))
    elif match := re.match(r'^(\d+)\. (.*)$', line):
        story.append(Paragraph(markup(match[2]), step, bulletText=match[1] + '.'))
    else:
        story.append(Paragraph(markup(line), body))


def page_frame(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#D3DEED'))
    canvas.line(45, height - 39, width - 45, height - 39)
    canvas.setFont('GuideBold', 8)
    canvas.setFillColor(blue)
    canvas.drawString(45, height - 29, 'ESSPL | ERP OPERATIONS GUIDE')
    canvas.setFont('Guide', 8)
    canvas.setFillColor(colors.HexColor('#53647A'))
    canvas.drawRightString(width - 45, height - 29, 'Updated 18 Sep 2026')
    canvas.line(45, 35, width - 45, 35)
    canvas.drawString(45, 22, 'React / Node / PostgreSQL | Quotation SMTP update')
    canvas.drawRightString(width - 45, 22, str(doc.page))
    canvas.restoreState()


doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=45, leftMargin=45,
                        topMargin=53, bottomMargin=47, title='ESSPL ERP User Journey',
                        author='ESSPL', subject='Portal-wise workflow with quotation email and approval')
doc.build(story, onFirstPage=page_frame, onLaterPages=page_frame)
print(OUTPUT)
