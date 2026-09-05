# Family Information Evening presentation

Public route: `/family-evening/presentation/`

This is a static, image-based viewer for the supplied 26 August 2026 PowerPoint.
It retains all 37 slides, including the added website screenshot on slide 32.
The original PowerPoint is not published. Dates and statements remain an archive
of the presentation, with that context explained on the web page.

## Regeneration

Run `build-family-evening-presentation.py` with the approved source PowerPoint path.
It requires Pillow and ReportLab and writes to `family-evening/presentation/`.
It preserves presentation order using the PowerPoint relationship manifest,
reproduces image placement, and rejects visible non-image content or unsupported
transforms. If the deck changes, review the title list and slide count guard first.

The output includes 1600px and 800px WebP slides, a JSON manifest and a PDF with
original JPEG image streams (the composite screenshot slide is flattened).
No invented slide text is added. Since the source is raster images, its full text
is not screen-reader-readable; descriptive slide labels and contact/navigation
links are provided, but this is not a tagged accessible document.

## Verification and release

- Serve the repository over HTTP and run `tests/family-evening-presentation.test.cjs`
  using Playwright. It accepts a base URL as its optional first argument.
- Inspect desktop, mobile portrait, mobile landscape and expanded-view screenshots.
- Render the PDF, verify 37 pages, and check slide 32's screenshot placement.
- Run the site's static-reference and public-data gates from the clean release tree.
- Publish only the viewer, assets, relevant newsletter link, sitemap entry, builder
  and tests. Never stage unrelated files from the operational working directory.
- Verify GitHub Pages builds the committed main revision and compare the live
  viewer, manifest, newsletter and PDF to the release files.

Navigation supports buttons, a slide selector, left/right and Home/End keys,
swipe gestures and `#slide-N` deep links. Only the current and next image load
initially. Reduced-data connections do not prefetch. Element fullscreen falls
back to a full-window view when unavailable. The PDF remains accessible when
JavaScript or the slide manifest fails.

The optional `?from=email09-v2` parameter returns readers to the v2 comparison
newsletter. Other values are ignored and retain the original newsletter link.
