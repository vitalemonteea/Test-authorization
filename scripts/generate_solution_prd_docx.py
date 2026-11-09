#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate docs/01-需求/REQ-SOL_解决方案型授权/导出/解决方案型测试授权需求方案.docx from docs/01-需求/REQ-SOL_解决方案型授权/解决方案型测试授权需求方案.md
"""

import re
import os
from pathlib import Path
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / 'docs' / '01-需求' / 'REQ-SOL_解决方案型授权'
MD_PATH = DOCS_DIR / '解决方案型测试授权需求方案.md'
DOCX_PATH = DOCS_DIR / '导出' / '解决方案型测试授权需求方案.docx'

PRIMARY_COLOR = '1F4E79'   # Deep Blue
SECONDARY_COLOR = '2C5282' # Mid Blue
TEXT_COLOR = '2D3748'      # Dark Charcoal
MUTED_COLOR = '718096'     # Gray
HEADER_BG = 'EBF3FA'       # Soft Blue
ZEBRA_BG = 'F8FAFC'        # Off White
BORDER_COLOR = 'CBD5E0'    # Light Gray Border
FONT_FAMILY = '微软雅黑'
FONT_LATIN = 'Arial'

def set_run_font(run, size=10.5, bold=False, italic=False, color=TEXT_COLOR):
    run.font.name = FONT_LATIN
    run._element.rPr.rFonts.set(qn('w:eastAsia'), FONT_FAMILY)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor.from_string(color)

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, v in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(v))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, fill_hex):
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}" w:val="clear"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_table_borders(table):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="{BORDER_COLOR}"/>
            <w:left w:val="none"/>
            <w:bottom w:val="single" w:sz="8" w:space="0" w:color="{PRIMARY_COLOR}"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{BORDER_COLOR}"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def add_formatted_text(paragraph, text, base_size=10, base_color=TEXT_COLOR, base_italic=False, base_bold=False):
    # Split text by bold (**...**) and inline code (`...`)
    tokens = re.split(r'(\*\*.*?\*\*|`.*?`)', text)
    for token in tokens:
        if not token:
            continue
        if token.startswith('**') and token.endswith('**') and len(token) >= 4:
            sub = token[2:-2]
            run = paragraph.add_run(sub)
            set_run_font(run, size=base_size, bold=True, italic=base_italic, color=base_color)
        elif token.startswith('`') and token.endswith('`') and len(token) >= 2:
            sub = token[1:-1]
            run = paragraph.add_run(sub)
            set_run_font(run, size=base_size - 0.5, bold=False, italic=False, color='9C4221')
            run.font.name = 'Consolas'
        else:
            run = paragraph.add_run(token)
            set_run_font(run, size=base_size, bold=base_bold, italic=base_italic, color=base_color)

def parse_markdown_to_docx(md_content, doc):
    lines = md_content.split('\n')
    i = 0
    in_code_block = False
    code_lines = []
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Handle Code blocks
        if stripped.startswith('```'):
            if in_code_block:
                # end code block
                in_code_block = False
                p = doc.add_paragraph()
                p.paragraph_format.space_before = Pt(4)
                p.paragraph_format.space_after = Pt(8)
                p.paragraph_format.left_indent = Inches(0.2)
                code_text = '\n'.join(code_lines)
                run = p.add_run(code_text)
                set_run_font(run, size=8.5, color='333333')
                run.font.name = 'Consolas'
                code_lines = []
            else:
                in_code_block = True
                code_lines = []
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        if not stripped or stripped == '---':
            i += 1
            continue

        # Header 1
        if line.startswith('# '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(8)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(line[2:].strip())
            set_run_font(run, size=18, bold=True, color=PRIMARY_COLOR)
            i += 1
            continue

        # Header 2
        if line.startswith('## '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line[3:].strip())
            set_run_font(run, size=14, bold=True, color=PRIMARY_COLOR)
            # Add bottom border styling or spacing
            i += 1
            continue

        # Header 3
        if line.startswith('### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line[4:].strip())
            set_run_font(run, size=12, bold=True, color=SECONDARY_COLOR)
            i += 1
            continue

        # Header 4
        if line.startswith('#### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line[5:].strip())
            set_run_font(run, size=11, bold=True, color='0F3854')
            i += 1
            continue

        # Blockquote >
        if line.startswith('> '):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.25)
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(4)
            text = line[2:].strip()
            add_formatted_text(p, text, base_size=9.5, base_color='4A5568', base_italic=False)
            i += 1
            continue

        # Table detection
        if line.startswith('|') and '|' in line[1:]:
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                table_lines.append(lines[i].strip())
                i += 1
            
            # Process table
            rows_data = []
            for tl in table_lines:
                # remove leading/trailing pipe
                parts = [p.strip() for p in tl.strip('|').split('|')]
                # skip separator row like |:---|:---|
                if all(re.match(r'^:?-+:?$', p) for p in parts):
                    continue
                rows_data.append(parts)
            
            if rows_data:
                num_cols = max(len(r) for r in rows_data)
                table = doc.add_table(rows=len(rows_data), cols=num_cols)
                table.alignment = WD_TABLE_ALIGNMENT.CENTER
                set_table_borders(table)
                
                for r_idx, r_data in enumerate(rows_data):
                    is_header = (r_idx == 0)
                    row = table.rows[r_idx]
                    for c_idx in range(num_cols):
                        cell = row.cells[c_idx]
                        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
                        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
                        
                        if is_header:
                            set_cell_shading(cell, HEADER_BG)
                        elif r_idx % 2 == 1:
                            set_cell_shading(cell, ZEBRA_BG)
                            
                        val = r_data[c_idx] if c_idx < len(r_data) else ''
                        p = cell.paragraphs[0]
                        p.paragraph_format.space_before = Pt(1)
                        p.paragraph_format.space_after = Pt(1)
                        p.paragraph_format.line_spacing = 1.15
                        
                        # parse line breaks within table cell (<br>)
                        sub_lines = val.split('<br>')
                        for s_idx, sl in enumerate(sub_lines):
                            if s_idx > 0:
                                p = cell.add_paragraph()
                                p.paragraph_format.space_before = Pt(1)
                                p.paragraph_format.space_after = Pt(1)
                                p.paragraph_format.line_spacing = 1.15
                            add_formatted_text(p, sl, base_size=9, base_bold=is_header, base_color=PRIMARY_COLOR if is_header else TEXT_COLOR)
                
                # Space after table
                p_after = doc.add_paragraph()
                p_after.paragraph_format.space_before = Pt(0)
                p_after.paragraph_format.space_after = Pt(6)
            continue

        # List items (ordered / unordered)
        list_match = re.match(r'^(\s*)([\d]+\.|\-|\*)\s+(.*)$', line)
        if list_match:
            indent_spaces = len(list_match.group(1))
            bullet = list_match.group(2)
            content = list_match.group(3)
            
            p = doc.add_paragraph()
            # Calculate indent
            base_indent = 0.2
            extra_indent = (indent_spaces // 2) * 0.2
            p.paragraph_format.left_indent = Inches(base_indent + extra_indent)
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.2
            
            bullet_run = p.add_run(f"{bullet} ")
            set_run_font(bullet_run, size=10, bold=bool(re.match(r'^\d+\.', bullet)), color=PRIMARY_COLOR if re.match(r'^\d+\.', bullet) else MUTED_COLOR)
            add_formatted_text(p, content, base_size=10, base_color=TEXT_COLOR)
            i += 1
            continue

        # Regular paragraph
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.25
        add_formatted_text(p, line, base_size=10, base_color=TEXT_COLOR)
        i += 1

def main():
    print(f"Reading {MD_PATH}...")
    with open(MD_PATH, 'r', encoding='utf-8') as f:
        md_text = f.read()

    doc = Document()
    
    # Page setup (A4 with 1 inch margin)
    for s in doc.sections:
        s.page_width = Inches(8.27)  # A4
        s.page_height = Inches(11.69)
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.9)
        s.right_margin = Inches(0.9)

    print("Converting Markdown to Docx...")
    parse_markdown_to_docx(md_text, doc)

    DOCX_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"Saving to {DOCX_PATH}...")
    doc.save(str(DOCX_PATH))
    print(f"Successfully generated {DOCX_PATH}, size: {os.path.getsize(DOCX_PATH)} bytes")

if __name__ == '__main__':
    main()
