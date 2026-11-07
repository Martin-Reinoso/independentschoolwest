#!/usr/bin/env python3
"""Map verified DOCX structure onto frozen policy text without duplicating its prose.

Requires explicit private originals and their read-only verification report. Does not
download files, publish documents or alter controlled Word originals. --write updates
only the local draft source; regenerate its JS projections and asset hashes afterwards.
"""
import argparse
import hashlib
import json
from pathlib import Path
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

CODES = ['C.2.2.iif','C.4.4.iih','C.4.2.iib','C.4.1.iiw','C.4.4.iia','C.4.4.iic','C.4.1.iva']


def numbering(document, paragraph):
    node = paragraph._p.pPr.numPr if paragraph._p.pPr is not None else None
    style = paragraph.style
    while (node is None or node.numId is None) and style is not None:
        props = style.element.pPr
        candidate = props.numPr if props is not None else None
        if candidate is not None and candidate.numId is not None:
            node = candidate
            break
        style = style.base_style
    if node is None or node.numId is None:
        return None
    level = int(node.ilvl.val) if node.ilvl is not None else 0
    root = document.part.numbering_part.element
    num = root.xpath(f'./w:num[@w:numId="{int(node.numId.val)}"]')[0]
    assert not num.xpath('./w:lvlOverride'), 'Review numbering overrides'
    abstract = num.find(qn('w:abstractNumId')).get(qn('w:val'))
    definition = root.xpath(f'./w:abstractNum[@w:abstractNumId="{abstract}"]/w:lvl[@w:ilvl="{level}"]')[0]
    return level, definition.find(qn('w:numFmt')).get(qn('w:val')), definition.find(qn('w:lvlText')).get(qn('w:val'))


def structure(document, policy):
    lines = policy['text'].splitlines()
    cursor, table_index, top, child = 0, 0, 0, 0
    blocks, covered = [], set()

    def paragraph_span(text, title=False):
        nonlocal cursor
        parts = text.splitlines()
        while cursor < len(lines) and not lines[cursor].strip():
            cursor += 1
        actual = lines[cursor:cursor+len(parts)]
        if title and actual:
            actual = [actual[0].removeprefix('## '), *actual[1:]]
        assert actual == parts, f"Paragraph differs from frozen text near line {cursor}: {text[:70]}"
        span = [cursor, len(parts)]
        covered.update(range(cursor,cursor+len(parts)))
        cursor += len(parts)
        return span

    for element in document.element.body:
        if element.tag == qn('w:p'):
            p = Paragraph(element, document)
            text = p.text.strip()
            if not text:
                continue
            style = p.style.name
            span = paragraph_span(text, style == 'Title')
            num = numbering(document, p)
            if style in ['Scroll Heading 1','Scroll Heading 2']:
                level = 1 if style.endswith('1') else 2
                assert num == (level-1,'decimal','%1.' if level==1 else '%1.%2'), f'Unexpected heading numbering: {num}'
                if level == 1:
                    top += 1
                    child = 0
                else:
                    assert top
                    child += 1
                number = str(top) if level == 1 else f'{top}.{child}'
                blocks.append(['h',*span,level,number])
            elif num:
                assert num[1] == 'bullet' and num[0] in [0,1], f'Review non-bullet or deeply nested list: {num}'
                blocks.append(['li',*span,num[0]])
            else:
                blocks.append(['title' if style=='Title' else 'p',*span])
        elif element.tag == qn('w:tbl'):
            table_index += 1
            table = Table(element, document)
            marker = lines.index(f'[TABLE {table_index}]')
            rows = [' | '.join(cell.text.strip() for cell in row.cells) for row in table.rows]
            assert lines[marker+1:marker+1+len(rows)] == rows, 'Table differs from frozen text'
            blocks.append(['table',marker,len(rows)])
            covered.update(range(marker,marker+1+len(rows)))
        elif element.tag == qn('w:sdt'):
            fields=' '.join(node.text or '' for node in element.iter(qn('w:instrText')))
            assert fields.strip().startswith('TOC '), 'Review non-contents structured content'
        elif element.tag not in [qn('w:sectPr'),qn('w:bookmarkStart'),qn('w:bookmarkEnd')]:
            raise ValueError('Review unsupported document block')
    assert covered == {i for i,line in enumerate(lines) if line.strip()}, 'Frozen policy text is not covered exactly'
    return blocks


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--originals',type=Path,required=True)
    parser.add_argument('--verification',type=Path,required=True)
    parser.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[1]/'post-offer/agreement-draft.json')
    parser.add_argument('--write',action='store_true')
    args=parser.parse_args()
    report=json.loads(args.verification.read_text())
    source=json.loads(args.source.read_text())
    assert len(source['policies'])==len(CODES)
    for code,policy in zip(CODES,source['policies']):
        record=next(r for r in report['records'] if r['code']==code)
        path=args.originals/Path(record['relativePath']).name
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        assert record['byteIdenticalToCatalogue'] and digest==record['sha256']==record['catalogueSha256']
        document=Document(path)
        assert next(p.text.strip() for p in document.paragraphs if p.style.name=='Title')==policy['title']
        blocks=structure(document,policy)
        policy['sourceStructure']=blocks
        policy['sourceSha256']=digest
        policy['sourceEvidenceCode']=code
        policy['sourceSnapshot']='Controlled original verified 8 November 2026; original wording retained'
        print(code, 'mapped',len(blocks),'blocks;',sum(b[0]=='h' for b in blocks),'numbered headings')
    if args.write:
        args.source.write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
        print('Updated local draft structure/provenance only; text unchanged. Regenerate projections before use.')


if __name__=='__main__':
    main()
