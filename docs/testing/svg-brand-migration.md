# Original-square SVG migration — visual approval pending

The attached `Leqad_Original_Left_Faithful.svg` is now the immutable source. Primary is byte-identical; black and grey substitute only the specified fill colors. No geometry, dimensions, layering, diagonal, spacing or wordmark changes were made.

The 33px inline header icon and Chrome/Edge manifest PNG icons use the primary identity. Existing Version B and cube-arrow assets are superseded, retained for historical reference. The standalone primary is also the canonical icon master. No reversed variant is required.

## Review images

These are controlled local browser renders, not authenticated Onshape evidence.

- [Three variants](../images/svg-brand/variants.png)
- [Full-size primary](../images/svg-brand/primary.png) (278 CSS pixels, captured at 2×)
- [16, 24, 32 and 48px comparison](../images/svg-brand/sizes.png)
- [Production header](../images/svg-brand/header.png)
- [365px panel](../images/svg-brand/panel.png)

## Checks and remaining acceptance

Unit tests pin the attached source hash, compare each variant against exact palette substitutions, prohibit raster/font/filter dependencies, and validate PNG dimensions and provenance hashes. Browser checks load the inline SVG at 33px, retain the 365px panel, sample all three distinct color regions at 16–48px, and compare both packaged icon sets with the generated PNGs. Small-size visual approval remains an owner decision; pixel samples do not prove subjective legibility.

Reproduction: `node scripts/generate-brand-assets.mjs`. The source and PNG renderer hashes are recorded in `apps/extension/src/assets/brand/generated-icons.json`. No runtime recognition, CAD guidance, verification, permission or lesson code was changed.

Local validation passed: formatting, lint, typecheck, 609 unit tests, 45 reference tests, reference integrity (zero approved captures; NO LIVE EVIDENCE), 71 browser tests with one existing managed-Chromium extension-installation skip, Chrome/Edge builds and packaging. Exact delivery results and commit-specific CI links are recorded in draft PR #15. Keep the PR draft and unmerged until owner visual approval. Actual Onshape compatibility and Edge runtime acceptance remain unverified by these fixtures.
