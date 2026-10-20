# Leqad V1 approved UI: Codex handoff

**Base:** PR #14 (branch `test/reduce-manual-onshape-testing`), not main. This visual PR depends on unmerged PRs #8–#14.
**Brand:** Dull Violet Black `#0D1C43`, Hay's Russet `#793327`, Warm Ivory `#F5EFE7`, card `#FFFAF4`.
**Approved panel:** 365px default, 10px outer radius, 16px padding and section spacing, 15px instruction card, navy header and ivory body, friendlier minimalist copy.
**Approved actions:** 44px solid HINT/SHOW/GUIDE, 14px semibold, navy selected and off-white unselected; "How can I help?" heading. Prominent 18px dynamic progress % (completed step count; no invented percentages). 44px primary actions. "Mark done" only for self-reported/unverified steps; keep "Check progress" and "Got it" where evidence/acknowledgement semantics differ.
**Exact logo:** Owner supplied `Leqad_Final_Approved_Logo_Original.zip`. The original `leqad_isometric_learning_mark.png` is preserved byte-for-byte at `apps/extension/src/assets/brand/leqad_isometric_learning_mark.png` (SHA-256 `03f744dcc135567bb4f5f91c7a58ce3fe35783b6815942686586db29dc1ab01c`). The 33px header uses a faithful crop/downscale of the cube mark, with original colors/background retained. No redraw, recoloring or generated substitute. See the asset README for crop bounds and reproduction. The small derivative and screenshots await owner visual approval; manifest icons are not changed.
**Codex to finish:** restructure to separate Next Action and help sections if practical without changing behavior; install exact approved image and appropriate faithful size derivatives; verify 100%, 125%, 150% zoom, 16/24/32px icon legibility, drag/collapse and scrolling; verify light/dark contrast; run lint, typecheck, format:check, unit, reference, fixture e2e, browser package builds; add focused UI test assertions; fix any failing snapshots. Do not merge until owner reviews extension screenshots.
**Safety:** No changes to recognition, cad evidence, automated clicking, lesson engine or progress semantics. Fixture CI cannot prove authenticated Onshape compatibility; live automation permission remains pending.

## Final lettering comparison

Production Header A remains the cube crop with separately rendered Leqad text.
The owner requested review-only Header B, combining the same cube with an exact
crop of the original raster lettering. Both preserve the ivory source background.
Option B is applied only to the controlled fixture, not imported by production,
and is removed on reload. It has not been approved. See the asset README for its
source crop and the validation report for the A/B screenshots. Do not switch the
production header or manifest icons until the owner approves that choice.

## Active SVG-only logo supersession (2026-10-20)
The owner now selects geometric Version B (navy interlocking square, diagonal negative-space openings and centered orange square) in preference to the earlier cube-and-arrow logo. Full brand identity is constructed from SVG straight-line paths with custom angular text outlines. See `apps/extension/src/assets/brand/README.md`. Historical header A/B comparisons and previous PNG asset approval are superseded. Existing 365px lesson panel, CAD recognition and verification behavior must not change. PR stays draft until updated CI, owner visual inspection and manual Onshape acceptance.
