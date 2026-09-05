"""Extract this image-based deck faithfully; optimise web images and create a PDF.

Usage: python3 scripts/build-family-evening-presentation.py SOURCE.pptx
Requires Pillow and reportlab. Source PowerPoint is never modified or published.
Unsupported visible shapes/transforms fail explicitly instead of silently disappearing.
"""
import argparse
import hashlib
import io
import json
import posixpath
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab import rl_config

rl_config.useA85 = 0  # Keep JPEG streams binary instead of inflating them with ASCII85.

NS = {"p": "http://schemas.openxmlformats.org/presentationml/2006/main",
      "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
TITLES = [
    "Family Information Evening, 26 August 2026", "Agenda", "Project history",
    "Our vision", "Guiding principles", "The journey so far", "Board of Directors",
    "Families for Education and Rosewood College", "Rosewood College identity",
    "Site update", "Permanent site location, Highett Road", "Our permanent home",
    "Proposed permanent site plan", "Cobblebank location", "Our initial site",
    "Initial site photograph", "Temporary college Stage 1 plan", "Building design, first view",
    "Building design, second view", "Modular building photographs", "Principal’s update",
    "Founding Principal, Dr Anne-Marie Irwin", "Scripture and Liturgy Teaching Approach",
    "Mentoring as partnership", "The Spalding Method", "Enrolments", "Applications for Enrolment",
    "2027 fees", "Sibling discounts", "Refundable family bond", "Enrolment process",
    "Website application invitation request", "Coming up", "Emotion Coaching",
    "Rosewood College site blessing", "Questions and answers", "Contact and application details",
]


def relationships(z, path):
    parent, name = posixpath.split(path)
    relpath = posixpath.join(parent, "_rels", name + ".rels")
    return {r.attrib["Id"]: posixpath.normpath(posixpath.join(parent, r.attrib["Target"]))
            for r in ET.fromstring(z.read(relpath)) if r.attrib.get("TargetMode") != "External"}


def build(source, destination):
    destination.mkdir(parents=True, exist_ok=True)
    assets = destination / "slides"
    assets.mkdir(exist_ok=True)
    pdfpath = destination / "rosewood-family-information-evening-2026-08-26.pdf"
    pdf = canvas.Canvas(str(pdfpath), pagesize=(960, 540), pageCompression=1)
    pdf.setTitle("Rosewood College Family Information Evening - 26 August 2026")
    pdf.setAuthor("Families for Education")
    slides, original_bytes = [], 0
    with ZipFile(source) as z:
        presentation = ET.fromstring(z.read("ppt/presentation.xml"))
        size = presentation.find("p:sldSz", NS)
        sw, sh = int(size.attrib["cx"]), int(size.attrib["cy"])
        assert sw / sh == 16 / 9, "Unexpected slide proportions"
        rels = relationships(z, "ppt/presentation.xml")
        ordered = presentation.findall("p:sldIdLst/p:sldId", NS)
        assert len(ordered) == len(TITLES), "Review slide titles when the slide count changes"
        for index, item in enumerate(ordered, 1):
            path = rels[item.attrib[f'{{{NS["r"]}}}id']]
            root = ET.fromstring(z.read(path))
            assert root.attrib.get("show", "1") != "0", "Review hidden slides before publishing"
            tree = root.find("p:cSld/p:spTree", NS)
            for shape in tree:
                tag = shape.tag.split("}")[-1]
                if tag in ("nvGrpSpPr", "grpSpPr", "pic"):
                    continue
                hidden = shape.find("p:nvSpPr/p:cNvPr", NS)
                assert hidden is not None and hidden.attrib.get("hidden") == "1", f"Visible non-image content in slide {index}"
            pics = tree.findall("p:pic", NS)
            image_rels = relationships(z, path)
            output = None
            original_jpeg = None
            for pic in pics:
                assert pic.find("p:blipFill/a:srcRect", NS) is None, "Unexpected image crop"
                assert pic.find("p:spPr/a:effectLst", NS) is None, "Unexpected image effects"
                xfrm = pic.find("p:spPr/a:xfrm", NS)
                assert not xfrm.attrib, "Unexpected image rotation/flip"
                off, ext = xfrm.find("a:off", NS), xfrm.find("a:ext", NS)
                x, y = int(off.attrib["x"]), int(off.attrib["y"])
                w, h = int(ext.attrib["cx"]), int(ext.attrib["cy"])
                rid = pic.find("p:blipFill/a:blip", NS).attrib[f'{{{NS["r"]}}}embed']
                raw = z.read(image_rels[rid])
                original_bytes += len(raw)
                im = Image.open(io.BytesIO(raw)).convert("RGB")
                if output is None:
                    assert (x, y, w, h) == (0, 0, sw, sh), "First image must fill slide"
                    output = im.resize((1600, 900), Image.Resampling.LANCZOS)
                    if len(pics) == 1 and raw[:2] == b'\xff\xd8':
                        original_jpeg = raw
                else:
                    # Reproduce the supplied screenshot's exact PowerPoint placement.
                    bounds = (round(x / sw * 1600), round(y / sh * 900),
                              round((x + w) / sw * 1600), round((y + h) / sh * 900))
                    im = im.resize((bounds[2] - bounds[0], bounds[3] - bounds[1]), Image.Resampling.LANCZOS)
                    output.paste(im, bounds[:2])
            assert output is not None
            stem = f"slide-{index:02}"
            output.save(assets / f"{stem}.webp", quality=88, method=6)
            output.resize((800, 450), Image.Resampling.LANCZOS).save(assets / f"{stem}-800.webp", quality=86, method=6)
            if original_jpeg is None:
                buffer = io.BytesIO()
                output.save(buffer, format="JPEG", quality=95, subsampling=0)
                original_jpeg = buffer.getvalue()
            pdf.bookmarkPage(stem)
            pdf.addOutlineEntry(f"{index}. {TITLES[index - 1]}", stem)
            pdf.drawImage(ImageReader(io.BytesIO(original_jpeg)), 0, 0, width=960, height=540)
            pdf.showPage()
            slides.append({"title": TITLES[index - 1], "src": f"slides/{stem}.webp",
                           "small": f"slides/{stem}-800.webp", "width": 1600, "height": 900})
        pdf.save()
    manifest = {"slides": slides, "pdf": pdfpath.name, "pdfBytes": pdfpath.stat().st_size}
    (destination / "slides.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    full_bytes = sum(p.stat().st_size for p in assets.glob("slide-??.webp"))
    print(json.dumps({"slides": len(slides), "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                      "sourceImageBytes": original_bytes, "webImageBytes": full_bytes,
                      "pdfBytes": pdfpath.stat().st_size, "firstSlideBytes": (assets / 'slide-01.webp').stat().st_size}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "family-evening/presentation")
    args = parser.parse_args()
    build(args.source, args.output)
