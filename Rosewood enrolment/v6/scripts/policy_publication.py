"""Verify the user-approved 8 November publication-address change only.

Controlled originals stay unchanged. Publication copies may also contain the
previously verified cached contents page-number corrections.
"""
from zipfile import ZipFile
from lxml import etree

OLD_STREET = '108-134 Alfred'
NEW_STREET = '456 Bridge'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}


def verify_publication_copy(original, publication):
    def canonical(data, restore_address=False):
        root = etree.fromstring(data)
        changes = 0
        if restore_address:
            for node in root.xpath('.//w:t', namespaces=NS):
                if node.text in (NEW_STREET, NEW_STREET+' Road,'):
                    node.text = node.text.replace(NEW_STREET, OLD_STREET)
                    changes += 1
        for link in root.xpath('.//w:sdt//w:hyperlink', namespaces=NS):
            fields = ' '.join(link.xpath('.//w:instrText/text()', namespaces=NS))
            if fields.strip().startswith('PAGEREF '):
                nodes = link.xpath('.//w:t', namespaces=NS)
                assert nodes and (nodes[-1].text or '').isdigit()
                nodes[-1].text = '0'
        return etree.tostring(root, method='c14n'), changes
    changed = 0
    with ZipFile(original) as source, ZipFile(publication) as copy:
        assert source.namelist() == copy.namelist(), 'Publication package differs'
        for name in source.namelist():
            a, b = source.read(name), copy.read(name)
            if name in ('word/document.xml', 'word/header1.xml'):
                normal, count = canonical(b, True)
                assert canonical(a)[0] == normal, 'Unapproved publication change: '+name
                changed += count
            else:
                assert a == b, 'Unapproved publication change: '+name
        assert changed == 1, 'Each policy must have exactly one approved address replacement'


def prepare_publication_copy(original, reviewed, target):
    assert not target.exists(), 'Never overwrite a publication copy'
    changed = 0
    with ZipFile(reviewed) as source, ZipFile(target, 'w') as copy:
        for entry in source.infolist():
            data = source.read(entry.filename)
            if entry.filename in ('word/document.xml', 'word/header1.xml'):
                changed += data.count(OLD_STREET.encode())
                data = data.replace(OLD_STREET.encode(), NEW_STREET.encode())
            copy.writestr(entry, data)
    target.chmod(0o600)
    assert changed == 1
    verify_publication_copy(original, target)
