# Leqad active brand: geometric Version B — SVG only

On 2026-10-20 the owner selected the upper-right geometric concept B as the active Leqad identity. This supersedes previous cube-and-arrow branding. The source uses **hand-authored editable SVG paths only**: straight lines, sharp corners, no arrows, no raster embeds and no font dependency.

- `leqad-b-icon.svg`: standalone transparent symbol.
- `leqad-b-header.svg`: symbol on sharp-edged ivory tile for existing navy header (currently used by the extension).
- `leqad-b-logo.svg`: primary centered symbol plus bespoke geometric Leqad lettering.
- `leqad-b-horizontal.svg`: alternative compact vector lockup.

The design uses approximate colors of selected reference B: navy `#0E2943`, orange `#B74B21`, ivory `#FDFBF8`. It is a deterministic geometric reconstruction of the screenshot, not a pixel-perfect vector trace. The global panel UI palette remains unchanged.

The previous PNG assets `leqad_isometric_learning_mark.png`, `leqad-header-mark.png` and `leqad-header-wordmark.png` remain only as **legacy comparison/history** and are not imported by production. Earlier A/B screenshots under `docs/images/v1-ui` describe the retired identity.

The extension's SVG header asset is bundled using Vite's `?inline`. The word “Leqad” remains the existing concise header text, while the source SVG full logo contains vector wordmark geometry. Manifest icons have not been switched yet. No change to lesson, CAD recognition, verification or guidance behavior.

Keep draft PR #15 unmerged until new branding passes CI, a 33px header visual check, and owner runtime acceptance. The Onshape access permission decision remains pending.
