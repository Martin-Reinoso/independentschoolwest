#!/usr/bin/env python3
"""Map verified DOCX structure onto frozen policy text without duplicating its prose.

Requires explicit private originals and their read-only verification report. Does not
download files, publish documents or alter controlled Word originals. --write updates
only the local draft source and checksum-named figures; regenerate projections afterwards.
"""
import argparse
import hashlib
import json
from pathlib import Path
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph
from policy_publication import verify_publication_copy, OLD_STREET, NEW_STREET

CODES = ['C.2.2.iif','C.4.4.iih','C.4.2.iib','C.4.1.iiw','C.4.4.iia','C.4.4.iic','C.4.1.iva']
DECORATIVE_LOGO = 'f1d19f86c1758f38adefd96413d54909cbc807d855c0fe486aa1828ebbb91db5'
MAP_SHA = 'e273b2e02bd71657345e6cddc8131cf4bbc7a37b49f4e48cfd4a6f539d03870d'
MAP_PATH = f'Files/Policies/offer-snapshots/student-code-site-supervision-map-{MAP_SHA}.png'
MAP_FIGURE = {
    'assetPath': MAP_PATH, 'sha256': MAP_SHA, 'width': 2200, 'height': 1600, 'bytes': 350808,
    'caption': 'Appendix A: Site Supervision Map',
    'alt': 'Site supervision map showing active play, arrival and movement, indoor supervision, restricted areas and emergency access, with supervision points SP1 to SP5.'
}


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
    assert not document.element.body.xpath('.//w:pict|.//w:object|.//w:txbxContent'), 'Review legacy image, embedded object or text box'
    lines = policy['text'].splitlines()
    cursor, table_index, top, child = 0, 0, 0, 0
    blocks, covered, figures, assets = [], set(), [], {}

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
            for image in p._p.xpath('.//a:blip'):
                assert not image.get(qn('r:link')), 'Review externally linked policy image'
                part = document.part.related_parts[image.get(qn('r:embed'))]
                blob = part.blob
                digest = hashlib.sha256(blob).hexdigest()
                if digest == DECORATIVE_LOGO:
                    continue
                assert digest == MAP_SHA and policy['title'] == 'Student Code of Conduct Policy', 'Review unmapped policy image'
                assert not text and not figures, 'Review inline or repeated policy figure'
                assert blob[:8] == b'\x89PNG\r\n\x1a\n' and len(blob) == MAP_FIGURE['bytes']
                assert (int.from_bytes(blob[16:20], 'big'), int.from_bytes(blob[20:24], 'big')) == (2200,1600)
                blocks.append(['figure',cursor,0,len(figures)])
                figures.append(dict(MAP_FIGURE))
                assets[MAP_PATH] = blob
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
            assert not element.xpath('.//a:blip'), 'Review policy image inside table'
            table_index += 1
            table = Table(element, document)
            marker = lines.index(f'[TABLE {table_index}]')
            rows = [' | '.join(cell.text.strip() for cell in row.cells) for row in table.rows]
            assert lines[marker+1:marker+1+len(rows)] == rows, 'Table differs from frozen text'
            blocks.append(['table',marker,len(rows)])
            covered.update(range(marker,marker+1+len(rows)))
        elif element.tag == qn('w:sdt'):
            assert not list(element.iter(qn('a:blip'))), 'Review image inside structured content'
            fields=' '.join(node.text or '' for node in element.iter(qn('w:instrText')))
            assert fields.strip().startswith('TOC '), 'Review non-contents structured content'
        elif element.tag not in [qn('w:sectPr'),qn('w:bookmarkStart'),qn('w:bookmarkEnd')]:
            raise ValueError('Review unsupported document block')
    assert covered == {i for i,line in enumerate(lines) if line.strip()}, 'Frozen policy text is not covered exactly'
    assert len(figures) == (1 if policy['title'] == 'Student Code of Conduct Policy' else 0), 'Policy figure missing'
    return blocks, figures, assets


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--originals',type=Path,required=True)
    parser.add_argument('--verification',type=Path,required=True)
    parser.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[1]/'post-offer/agreement-draft.json')
    parser.add_argument('--write',action='store_true')
    parser.add_argument('--publication-copies',type=Path,help='Copies with only the approved Bridge Road address and cached contents corrections')
    args=parser.parse_args()
    report=json.loads(args.verification.read_text())
    source=json.loads(args.source.read_text())
    assert len(source['policies'])==len(CODES)
    for code,policy in zip(CODES,source['policies']):
        record=next(r for r in report['records'] if r['code']==code)
        path=args.originals/Path(record['relativePath']).name
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        assert record['byteIdenticalToCatalogue'] and digest==record['sha256']==record['catalogueSha256']
        publication_digest = None
        if args.publication_copies:
            publication = args.publication_copies/path.name
            verify_publication_copy(path,publication)
            publication_digest = hashlib.sha256(publication.read_bytes()).hexdigest()
            expected_count = 0 if code == 'C.4.1.iiw' else 1
            assert policy['text'].count(OLD_STREET) + policy['text'].count(NEW_STREET) == expected_count
            policy['text'] = policy['text'].replace(OLD_STREET,NEW_STREET)
            document=Document(publication)
        else:
            assert not policy.get('publicationSha256'), 'Use the verified publication copy for this snapshot'
            document=Document(path)
        assert next(p.text.strip() for p in document.paragraphs if p.style.name=='Title')==policy['title']
        blocks,figures,assets=structure(document,policy)
        policy['sourceStructure']=blocks
        policy['sourceFigures']=figures
        policy['sourceSha256']=digest
        policy['sourceEvidenceCode']=code
        policy['sourceSnapshot']='Controlled original verified 8 November 2026; original wording retained'
        if publication_digest:
            policy['publicationSha256']=publication_digest
            policy['sourceSnapshot']='Controlled original verified 8 November 2026; publication address changed to 456 Bridge Road, Cobblebank as instructed by the user; policy wording otherwise retained'
            if 'sourceDownloads' in policy:
                assert policy['sourceDownloads']['docx']['sha256'] == publication_digest, 'Downloads need a fresh publication package'
        print(code, 'mapped',len(blocks),'blocks;',sum(b[0]=='h' for b in blocks),'numbered headings')
        if args.write:
            root=Path(__file__).resolve().parents[3]
            for relative,blob in assets.items():
                target=root/relative
                target.parent.mkdir(parents=True,exist_ok=True)
                if target.exists():
                    assert target.read_bytes() == blob, 'Immutable policy figure changed'
                else:
                    target.write_bytes(blob)
    if args.write:
        args.source.write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
        print('Updated local draft structure/provenance and verified figures; publication address applied only when explicitly selected. Regenerate projections before use.')


if __name__=='__main__':
    main()
