# Leqad V1 approved UI: Codex handoff

**Base:** PR #14 (branch `test/reduce-manual-onshape-testing`), not main. This visual PR depends on unmerged PRs #8–#14.
**Brand:** Dull Violet Black `#0D1C43`, Hay's Russet `#793327`, Warm Ivory `#F5EFE7`, card `#FFFAF4`.
**Approved panel:** 365px default, 10px outer radius, 16px padding and section spacing, 15px instruction card, navy header and ivory body, friendlier minimalist copy.
**Approved actions:** 44px solid HINT/SHOW/GUIDE, 14px semibold, navy selected and off-white unselected; "How can I help?" heading. Prominent 18px dynamic progress % (completed step count; no invented percentages). 44px primary actions. "Mark done" only for self-reported/unverified steps; keep "Check progress" and "Got it" where evidence/acknowledgement semantics differ.
**Active logo:** The owner-attached original-square SVG is immutable. Light uses `leqad-primary.svg`; Dark uses `leqad-black.svg`, both at 33px. Manifest PNGs are primary-derived. Earlier raster and geometric Version B assets are historical only. See the branding README.
**Validation:** Run formatting, lint, typecheck, unit/reference/browser suites and both browser builds/packages. Fixture zoom checks do not replace native browser zoom or authorized Onshape acceptance. Do not merge until owner reviews the current screenshots.
**Safety:** No changes to recognition, cad evidence, automated clicking, lesson engine or progress semantics. Fixture CI cannot prove authenticated Onshape compatibility; live automation permission remains pending.

## Historical lettering comparison (superseded)

An earlier review compared the cube crop plus rendered text against a crop of
the original raster lettering. Those assets and screenshots remain historical
references only. Neither is the active header; the current header retains its
existing text beside the approved original-square SVG.

## Active original-square SVG and V1.1 appearance

The owner-approved immutable source is `Leqad_Original_Left_Faithful.svg`.
The earlier geometric Version B and cube-arrow marks are superseded.
Light uses `leqad-primary.svg`; Dark uses `leqad-black.svg`; System follows
the device preference. Both header assets stay 33px. SVG geometry and the
existing header wordmark are unchanged. Manifest icons remain primary-derived.

Settings opens within the existing 365px panel, with a Back action preserving
the prior Learn/Projects/Ask view. Light and on-demand assistance are the
defaults for missing or invalid preferences. Proactive opt-in permits only
the existing local cursor cue near a recognized control; it does not enable
AI design reviews, model analysis, CAD actions or verified completion.
See [V1.1 validation](../testing/v1-appearance-assistance.md).

PR #15 stays draft and unmerged pending owner visual approval. Fixture tests
do not establish authenticated Onshape compatibility.
