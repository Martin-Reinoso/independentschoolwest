# Embedded PDF fonts

Noto Sans Regular/Bold and Noto Serif Regular are redistributed unmodified under the SIL Open Font
License in `OFL.txt`. They are public font assets; this directory must never contain
the principal's private signature or a family's signature.

Source: https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSans
Letter headings: https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSerif
Licence: https://github.com/notofonts/noto-fonts/blob/main/LICENSE
Retrieved 8 November 2026. Runtime PDF generation uses these local files, not a CDN.

SHA-256:

- Regular: `b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5`
- Bold: `c976e4b1b99edc88775377fcc21692ca4bfa46b6d6ca6522bfda505b28ff9d6a`
- Serif Regular: `c8f669ceb2c9c60ccf55198b305e08a997ffca79a38cc7eeb551e643cbe66505`
- Licence: `0dab92d0544f7b233403f14b84a663bdbfa746982eda629e7f4f9ffe1b036feb`

The font covers Latin (including Vietnamese), Greek and Cyrillic. The renderer
checks every character and fails explicitly when another script needs a reviewed
font; it must never silently omit a person's name or substitute a missing-glyph box.
