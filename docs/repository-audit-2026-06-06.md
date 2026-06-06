# Repository Audit - 2026-06-06

This audit maps the repository as it exists today and suggests a safer cleanup path before deleting anything.

## High-Level Snapshot

- Total tracked `.html` files: 82
- Root-level `.html` files: 46
- Root-level `preview-*.html` files: 32
- Archived preview files under `old versions/`: 28
- README is effectively empty and does not explain repository structure

## Current Repo Map

### 1. Likely Active Families for Education site files

These appear to be the main public site and related pages:

- `index.html`
- `index.css`
- `styles.css`
- `donate.html`
- `donate.css`
- `info-session.html`
- `flyer-info-session-a4.html`
- `emails/`
- `img/`
- `Files/Bulletins/`
- `robots.txt`
- `sitemap.xml`
- `CNAME`

Notes:

- `index.html` currently declares a canonical URL of `https://ffe.org.au/preview-2.html`, which looks wrong for a live homepage.
- `index-progress-preview.html` is nearly the same shape as `index.html`, but is untracked and looks like a working preview rather than a permanent page.

### 2. Preview and archive clutter

This is the largest cleanup area.

At repository root:

- `preview-2.html` through `preview-29.html`
- `preview-30.html`
- `preview-31.html`
- `preview-32.html`
- `preview-33.html`
- `preview.html`
- `donate-success-preview.html`
- `index-progress-preview.html`
- `presentation-waiting-screen.html`
- `BACKUP 14 APRIL.html`

Under `old versions/`:

- `preview-2.html` through `preview-29.html`
- matching `preview-2.css` through `preview-29.css`

Important distinction:

- `preview-2.html` through `preview-29.html` at repo root are mostly tiny redirect stubs that point into `old versions/`.
- `old versions/preview-*.html` are the actual archived historical pages.
- `preview-30.html` to `preview-33.html` are not redirect stubs; they are standalone experiments/variants.

### 3. Rosewood project content

This looks like a separate project mixed into the same repo:

- `rosewood_college.html`
- `survey2.html`
- `survey2-report.html`
- `motto-report.html`
- `assets/`
- `Rosewood College – Temporary Site Enquiry/`
- `rosewood-presentation 2/`
- `presentation-waiting-screen.html`

This should probably live under one parent directory such as `projects/rosewood/`.

### 4. Reports, decks, and research artifacts

These are not site pages and should not live at repo root long-term:

- `board-premeeting-dossier-2026-05.md`
- `Ideals in Teaching files/`
- `FFE Font Trajan/`
- `trivia-night-2025.html`

These look more like working documents, presentations, or design assets than web app source.

### 5. Infrastructure and donation backend

- `Stripe donation/`
- `Stripe donation/lambda/index.mjs`
- `Stripe donation/stripe-donation-handover.md`
- `scripts/stripe-embedded-checkout-server.mjs`

These belong together conceptually and would be easier to maintain under a single `infrastructure/` or `backend/` area.

### 6. Local/generated clutter

- `.DS_Store`
- `.codex-temp/`
- `Stripe donation/lambda/stripe-donations-lambda.zip`

`.codex-temp/` has now been added to `.gitignore`.

## Image Audit

### Current image buckets

- `img/` contains 44 images and is currently the catch-all bucket for the Families for Education site
- `assets/` contains 19 images and is used for Rosewood option mockups
- `rosewood-presentation 2/` contains 21 images, including a second copy of most Rosewood mockup assets

### Main image problems

- The `img/` folder mixes logos, portraits, flyers, screenshots, event graphics, social cards, and payment icons
- Filenames are inconsistent: some are descriptive (`anne-marie.png`), some are presentation-style (`FIRST EVENT.png`), and some are temporary (`image copy.png`)
- Some assets are duplicated under alternate names for channel-specific use:
  - `img/hero.jpg` and `img/Mother & child reading.jpg`
  - `img/ideals-anne-marie.png` and `img/email/ideals.png`
  - `img/picnic collage.png` and `img/email/picnic-collage.png`
  - `img/familyPicnic.jpg` and `img/email/picnicfinal.jpeg`
- The Rosewood mockup set is duplicated between:
  - `assets/`
  - `rosewood-presentation 2/assets/`
- `rosewood-presentation 2/assets/image.png` is an exact duplicate of `img/image copy.png`

### Better structure for images

Recommended structure:

```text
img/
  brand/
    logos/
    favicon/
  people/
  photography/
  events/
  flyers/
  cards/
  email/
  donate/
  screenshots/
  archive/

projects/
  rosewood/
    assets/
      logos/
      mockups/
      apparel/
      signage/
      presentation/
```

### How to decide what goes where

- `img/brand/logos/`: logo variants, monograms, transparent exports
- `img/brand/favicon/`: favicon and browser icon files
- `img/people/`: portraits such as Anne-Marie
- `img/photography/`: hero photography and general photo assets
- `img/events/`: event-specific promos and artwork
- `img/flyers/`: printable or flyer-style exports
- `img/cards/`: SVG or PNG announcement cards
- `img/email/`: images that are resized or cropped specifically for email use
- `img/donate/`: payment marks and donation page graphics
- `img/screenshots/`: UI/site screenshots
- `img/archive/`: old superseded files kept only for reference

### Naming convention to use

Use lowercase kebab-case names with purpose first, for example:

- `logo-family-education-primary.png`
- `portrait-anne-marie.png`
- `photo-family-sunset.png`
- `event-family-picnic-flyer-2026.png`
- `card-information-evening.svg`
- `email-website-preview.png`
- `donate-payment-visa.webp`

Avoid:

- spaces in filenames
- `copy`, `final`, `temp`, `new`, or date-less `version` labels
- channel-specific duplicates unless the crop or dimensions are genuinely different

### Lowest-risk cleanup moves

These are good first moves before any broader refactor:

- move `img/donation page images/` to `img/donate/`
- move logo files into `img/brand/logos/`
- move `favicon.ico` into `img/brand/favicon/`
- move `img/email/` under a clearer email-only convention and keep only truly email-specific variants there
- consolidate Rosewood image assets so there is one canonical source folder instead of both `assets/` and `rosewood-presentation 2/assets/`
- rename temporary files such as `image copy.png` and `website-preview tem.png`
- move replaced or uncertain assets into `img/archive/` rather than deleting immediately

### Important rule

Choose one canonical master file per image.

If the same visual is used in multiple places:

- keep one source asset in the main library
- only create derivatives when size, crop, transparency, or format actually differs
- make the filename explain the derivative purpose

## What Looks Safe To Remove First

These are strong delete or archive candidates, pending one last confirmation that no public links rely on them:

- Root redirect stubs `preview-2.html` through `preview-29.html`
- `preview.html`
- `BACKUP 14 APRIL.html`
- `info-session old/`
- `changes/` if it is only temporary comparison output

Why these are low-risk:

- The numbered root previews are mostly redirect wrappers, not primary source files.
- `BACKUP 14 APRIL.html` is a snapshot-style filename, not a maintainable content path.
- `info-session old/` is clearly archival.
- `changes/index-progress-preview.html` duplicates the purpose of `index-progress-preview.html`.

## What Needs Review Before Deleting

These are not obviously safe to remove without a content decision:

- `preview-30.html`
- `preview-31.html`
- `preview-32.html`
- `preview-33.html`
- `index-progress-preview.html`
- `donate-success-preview.html`
- `presentation-waiting-screen.html`
- `trivia-night-2025.html`
- `Rosewood College – Temporary Site Enquiry/`
- `rosewood-presentation 2/`

Reason:

- These are not just redirect shims. They contain real content, working variants, or materials that may still be useful as references.

## Recommended Target Structure

One clean option:

```text
docs/
  repository-audit-2026-06-06.md
  board/
  reports/

site/
  index.html
  donate.html
  info-session.html
  css/
  img/
  bulletins/
  emails/

projects/
  rosewood/
    branding/
    enquiry-site/
    presentations/
    surveys/

archive/
  ffe-previews/
  old-info-session/
  backups/

infrastructure/
  Stripe donation/
  stripe/
```

If you want to keep GitHub Pages serving from the repo root, we can still use this structure with a small publish step or keep only the deployable pages at root and move everything else out.

## Recommended Cleanup Sequence

1. Decide what must remain deployable from repo root for GitHub Pages or current hosting.
2. Move clearly non-site work into `projects/`, `docs/`, and `archive/`.
3. Remove root redirect stubs for old previews after confirming they are not externally linked.
4. Move `old versions/` to `archive/ffe-previews/`.
5. Merge Rosewood materials under a single directory.
6. Fix page naming and canonical URLs for anything still considered live.
7. Replace the current README with a real repo guide.

## Concrete Issues Found

- `index.html` canonical points to `https://ffe.org.au/preview-2.html`
- `preview-31.html` canonical also points to `https://ffe.org.au/preview-2.html`
- README does not document any structure, workflow, or active pages
- Repository root currently mixes live pages, archives, campaign drafts, reports, presentation assets, and backend code

## Suggested Next Step

The safest next move is a non-destructive reorganization:

- create the top-level folders
- move obvious archives and non-site materials out of root
- leave live pages in place for now
- then do a second pass to delete obsolete preview files

That gives us a much cleaner repo without risking a broken deployment.
