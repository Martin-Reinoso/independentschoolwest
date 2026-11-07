#!/usr/bin/env python3
"""Check policy contents against rendered PDF destinations; optionally prepare private copies.

Originals are checksum-verified and never overwritten. --copies updates only cached
contents page numbers in new DOCX copies. Re-render and run this checker again before
publishing; this operation does not approve policy wording, address or publication.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile

import pdfplumber
from lxml import etree
from pypdf import PdfReader

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
NS = {'w': W[1:-1]}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normal(text):
    return ''.join(c.casefold() for c in text if c.isalnum())


def flat_outline(items):
    for item in items:
        if isinstance(item, list):
            yield from flat_outline(item)
        else:
            yield item


def verify_contents_only_copy(original, candidate):
    def canonical(xml):
        root = etree.fromstring(xml)
        for link in root.xpath('.//w:sdt//w:hyperlink', namespaces=NS):
            fields = ' '.join(link.xpath('.//w:instrText/text()', namespaces=NS))
            if fields.strip().startswith('PAGEREF '):
                texts = link.xpath('.//w:t', namespaces=NS)
                assert texts and re.fullmatch(r'\d+', texts[-1].text or '')
                texts[-1].text = '0'
        return etree.tostring(root, method='c14n')
    with ZipFile(original) as source, ZipFile(candidate) as copy:
        assert source.namelist() == copy.namelist(), 'Copy package entries differ'
        for name in source.namelist():
            a,b = source.read(name),copy.read(name)
            assert (canonical(a) == canonical(b) if name == 'word/document.xml' else a == b), 'Change outside cached contents: ' + name


def check(docx, pdf, expected_count, copy_to=None):
    with ZipFile(docx) as archive:
        original_xml = archive.read('word/document.xml')
    root = etree.fromstring(original_xml)
    reader = PdfReader(pdf)
    destinations = {}
    for item in flat_outline(reader.outline):
        title = normal(str(item['/Title']))
        assert title not in destinations, 'Duplicate outline heading'
        destinations[title] = reader.get_destination_page_number(item) + 1
    entries = []
    for link in root.xpath('.//w:sdt//w:hyperlink', namespaces=NS):
        fields = ' '.join(link.xpath('.//w:instrText/text()', namespaces=NS))
        if not fields.strip().startswith('PAGEREF '):
            continue
        texts = link.xpath('.//w:t', namespaces=NS)
        assert texts and re.fullmatch(r'\d+', texts[-1].text or ''), 'Unrecognised cached contents field'
        title = ''.join(t.text or '' for t in texts[:-1]).strip()
        key = normal(title)
        assert key in destinations, 'Contents title has no PDF outline destination: ' + title
        entries.append((title, int(texts[-1].text), destinations[key], texts[-1]))
    assert len(destinations) == expected_count, 'PDF outline coverage differs'
    assert len(entries) == expected_count or (not entries and not root.xpath('.//w:sdt', namespaces=NS)), 'Contents coverage differs'
    assert len({normal(e[0]) for e in entries}) == len(entries)
    numbered = {re.match(r'^\d+(?:\.\d+)?', e[0])[0]: e[0] for e in entries}
    page_numbers = {page.indirect_reference.idnum: i+1 for i,page in enumerate(reader.pages)}
    with pdfplumber.open(pdf) as rendered:
        visible = {}
        for page,pdf_page in zip(rendered.pages,reader.pages):
            for ref in pdf_page.get('/Annots', []):
                annotation = ref.get_object()
                x0,y0,x1,y1 = map(float, annotation['/Rect'])
                area = (x0, page.height-y1, x1, page.height-y0)
                text = page.crop(area).extract_text() or ''
                match = re.fullmatch(r'(\d+(?:\.\d+)?)[.\s]+.+?[.\s]+(\d+)', text.strip(), re.S)
                if match and match[1] in numbered:
                    key = normal(numbered[match[1]])
                    assert key not in visible, 'Duplicate contents PDF link'
                    assert page_numbers[annotation['/Dest'][0].idnum] == destinations[key], 'Contents link targets wrong page'
                    visible[key] = int(match[2])
        assert len(visible) == len(entries), 'PDF contents links/text do not cover all headings'
        for title, cached, actual, node in entries:
            assert visible[normal(title)] == cached, 'Word/PDF contents values differ'
            assert normal(title) in normal(rendered.pages[actual-1].extract_text() or ''), 'Destination misses heading'
    changes = [{'heading':title, 'cachedPage':cached, 'actualPage':actual}
               for title,cached,actual,node in entries if cached != actual]
    if copy_to:
        assert copy_to.resolve() != docx.resolve() and not copy_to.exists(), 'Never overwrite a source or prepared copy'
        for title,cached,actual,node in entries:
            node.text = str(actual)
        # Restore fields in a separate tree to prove all non-contents XML unchanged.
        updated_xml = etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
        if not changes:
            updated_xml = original_xml
        for title,cached,actual,node in entries:
            node.text = str(cached)
        assert etree.tostring(root, method='c14n') == etree.tostring(etree.fromstring(original_xml), method='c14n')
        copy_to.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(docx) as source, ZipFile(copy_to, 'w') as output:
            for entry in source.infolist():
                output.writestr(entry, updated_xml if entry.filename == 'word/document.xml' else source.read(entry.filename))
        if not changes:
            copy_to.write_bytes(docx.read_bytes())
        copy_to.chmod(0o600)
        with ZipFile(docx) as source, ZipFile(copy_to) as output:
            assert source.namelist() == output.namelist()
            assert all(source.read(name) == output.read(name) for name in source.namelist() if name != 'word/document.xml')
    return {'sourceDocxSha256':digest(docx), 'renderedPdfSha256':digest(pdf),
            'pages':len(reader.pages), 'headingsChecked':expected_count, 'contentsEntries':len(entries), 'contentsCorrections':changes,
            'preparedDocxSha256':digest(copy_to) if copy_to else None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--originals', type=Path, required=True)
    parser.add_argument('--rendered', type=Path, required=True)
    parser.add_argument('--verification', type=Path, required=True)
    parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[1]/'post-offer/agreement-draft.json')
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--copies', type=Path)
    parser.add_argument('--review-copies', type=Path, help='Check already-prepared copies against originals and their new renders')
    args = parser.parse_args()
    assert args.report.suffix == '.json' and not args.report.resolve().is_relative_to(args.originals.resolve()), 'Keep reports outside the controlled originals'
    assert not (args.copies and args.review_copies), 'Prepare or review copies in separate runs'
    verified = json.loads(args.verification.read_text())
    policies = json.loads(args.source.read_text())['policies']
    report = {}
    for policy in policies:
        code = policy['sourceEvidenceCode']
        record = next(r for r in verified['records'] if r['code'] == code)
        original = args.originals/Path(record['relativePath']).name
        before = digest(original)
        assert record['byteIdenticalToCatalogue'] and before == record['sha256'] == policy['sourceSha256']
        checked = original
        if args.review_copies:
            checked = args.review_copies/original.name
            verify_contents_only_copy(original,checked)
        pdf = args.rendered/code/(original.stem+'.pdf')
        report[code] = check(checked, pdf, sum(b[0] == 'h' for b in policy['sourceStructure']),
                             args.copies/original.name if args.copies else None)
        report[code]['controlledOriginalSha256'] = before
        assert digest(original) == before, 'Source was changed'
        print(code, len(report[code]['contentsCorrections']), 'contents corrections;', report[code]['headingsChecked'], 'headings checked')
    args.report.write_text(json.dumps(report, indent=2)+'\n')
    args.report.chmod(0o600)


if __name__ == '__main__':
    main()
