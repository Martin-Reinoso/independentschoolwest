#!/usr/bin/env python3
"""Stage private policy download review files; never publish or alter the agreement.

Accepts controlled originals and contents-only corrected copies. Rechecks the actual
Word/PDF contents, source identity and report checksums before copying any file.
Publication approval (including address/map review) is a separate release step.
"""
import argparse
import importlib.util
import json
import re
from pathlib import Path

spec = importlib.util.spec_from_file_location('contents', Path(__file__).with_name('check-policy-contents.py'))
contents = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contents)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('originals', 'copies', 'rendered', 'verification', 'contents-report', 'output'):
        parser.add_argument('--' + name, type=Path, required=True)
    parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[1]/'post-offer/agreement-draft.json')
    args = parser.parse_args()
    output = args.output.resolve()
    repository = Path(__file__).resolve().parents[3]
    if output.exists() or output.is_relative_to(repository) or any(output.is_relative_to(p.resolve()) for p in (args.originals,args.copies,args.rendered)):
        raise ValueError('Use a new private review directory outside the repository and source directories.')
    policies = json.loads(args.source.read_text())['policies']
    verification = json.loads(args.verification.read_text())['records']
    report = json.loads(args.contents_report.read_text())
    pending, manifest = [], {}
    for policy in policies:
        code = policy['sourceEvidenceCode']
        record = next(r for r in verification if r['code'] == code)
        original = args.originals/Path(record['relativePath']).name
        docx = args.copies/original.name
        pdf = args.rendered/code/(original.stem+'.pdf')
        if not record['byteIdenticalToCatalogue'] or contents.digest(original) != record['sha256'] or record['sha256'] != policy['sourceSha256']:
            raise ValueError('Controlled original does not match the policy: ' + code)
        contents.verify_contents_only_copy(original, docx)
        checked = contents.check(docx, pdf, sum(b[0] == 'h' for b in policy['sourceStructure']))
        if checked['contentsCorrections'] or any(checked[k] != report[code][k] for k in checked) or report[code]['controlledOriginalSha256'] != policy['sourceSha256']:
            raise ValueError('Policy copies or their review evidence changed: ' + code)
        downloads = {'sourceSha256': policy['sourceSha256']}
        slug = re.sub(r'[^a-z0-9]+', '-', policy['title'].lower()).strip('-')
        for format, source in (('pdf',pdf),('docx',docx)):
            data = source.read_bytes()
            digest = contents.digest(source)
            asset = f'Files/Policies/offer-snapshots/{slug}-{digest}.{format}'
            downloads[format] = {'assetPath':asset,'sha256':digest,'bytes':len(data)}
            pending.append((asset,data))
        manifest[code] = downloads
    output.mkdir(mode=0o700, parents=True)
    for asset,data in pending:
        target = output/asset
        target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        target.write_bytes(data)
        target.chmod(0o600)
    target = output/'download-review-manifest.json'
    target.write_text(json.dumps({'publicationApproved':False,'policies':manifest},indent=2)+'\n')
    target.chmod(0o600)
    print(f'Staged {len(pending)} files for private review; agreement unchanged and publication not approved.')


if __name__ == '__main__':
    main()
