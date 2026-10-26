# Leqad Compact Companion design review pack

Status: design only, awaiting owner approval. This is not an Electron build or live CAD evidence.

- [Complete specification](../../superpowers/specs/2026-10-25-desktop-compact-companion-design.md), including interaction flow, exact dimensions, copy, consent, overlay policy, accessibility, architecture, and proposed phases.
- [Static mockup gallery](mockups.html), 19 annotated boards. Open locally or serve the directory. Buttons illustrate states; they do not run the product.
- [Six-state comparison](previews/comparison.png).
- [Independent review and resolved findings](review.md).
- [Static rendering report](render-report.json).
- [Design palette calculations](palette-ratios.json).
- [Asset provenance and SHA-256 hashes](asset-provenance.json).

## Boards

| Board | Preview                                                             |
| ----- | ------------------------------------------------------------------- |
| 01    | [Window selection](previews/board-01.png)                           |
| 02    | [Capture consent](previews/board-02.png)                            |
| 03    | [Normal lesson](previews/board-03.png)                              |
| 04    | [Progressive help](previews/board-04.png)                           |
| 05    | [Local Ask](previews/board-05.png)                                  |
| 06    | [Schematic overlay](previews/board-06.png)                          |
| 07    | [Unknown recognition](previews/board-07.png)                        |
| 08    | [Paused](previews/board-08.png)                                     |
| 09    | [Disconnected](previews/board-09.png)                               |
| 10    | [Settings](previews/board-10.png)                                   |
| 11    | [Compact screen](previews/board-11.png)                             |
| 12    | [Dark help](previews/board-12.png)                                  |
| 13    | [Multiple displays schematic](previews/board-13.png)                |
| 14    | [Collapsed](previews/board-14.png)                                  |
| 15    | [Unavailable capture](previews/board-15.png)                        |
| 16    | [SHOW / GUIDE and permission gating](previews/board-16.png)         |
| 17    | [SHOW pending / inspecting / Cancel](previews/board-17.png)         |
| 18    | [Acknowledgement / self-report / completion](previews/board-18.png) |
| 19    | [Saved lesson resume](previews/board-19.png)                        |

## Decisions for approval

The owner selected Compact Companion. Exact size, timing, and placement defaults below are proposed for review:

- Default 365 × 600 logical-pixel teaching window; movable and resizable. Help/Ask reuse its space.
- Single-body scrolling when short height, large text, or additional permission copy would squeeze help; no automatic window expansion.
- Optional capture plus accessibility inspection only during an explicit SHOW request, with no inspection between requests.
- Ten-second focus handoff followed by at most five seconds of observation; known invalidation cancels immediately and stale evidence expires within the existing 750ms policy limit.
- Collapse/minimize cancel visual work and preserve the existing lesson active/paused state. Returning never restarts capture.
- One interactive teaching panel, separate non-focusable native click-through overlay, written fallback whenever its safety cannot be established.

## Documentation QA

The render script uses installed Playwright/Chromium only for static HTML. It renders 19 board PNGs and the comparison sheet, records font readiness and layout bounds, and rejects inaccessible outer-panel/body overflow. The compact and permission-required variants intentionally scroll within one body region. The primary agent visually inspected the comparison and consent, guidance, request, and compact boards.

The four official SVGs are byte-identical to the current main source; bundled font licenses are included. The gallery uses no external assets or product scripts. Twelve opaque text palette pairs pass 4.5:1 with minimum 6.884:1. These checks do not validate native interaction, focus, Windows text scaling, live capture, browser-tab identity, overlay placement, or CAD recognition.

No production source or dependency files changed. Production CI, unit tests, Electron tests, and live Onshape/FreeCAD tests were not run for this documentation-only delivery.

## Reproduce the static design assets

No dependency installation is needed if the repository's Playwright tooling is already installed. From the repository root:

```bash
python docs/design/desktop-compact/create-mockups.py
python -m http.server 4187 --bind 127.0.0.1 --directory docs/design/desktop-compact
```

In a second terminal, with existing repository tools:

```bash
node docs/design/desktop-compact/render.mjs
```

Use `LEQAD_PLAYWRIGHT_ROOT` to point to a separate existing checkout containing `@playwright/test`. `CHROMIUM_PATH` overrides `/usr/bin/chromium`; `DESIGN_URL` overrides the localhost URL. These are design-tool conveniences, not installation instructions for the future Windows app. Format the generated HTML with the existing Prettier if regenerating it. Preserve the SVG and licensed font bytes exactly. The original third-party OFL text files retain their source line endings and whitespace; documentation whitespace review excludes these unmodified vendor assets.

The specification references PR #17 at `d5f182a6f9cff4a14689d72e11f3779688dcaaa0` and PR #15 at `5dbd09dd8d2be1ce2080834dfad5e3cbc9a67be4`. No existing PR was changed. A later plan must resolve the desktop baseline and unmerged extension presentation dependencies explicitly.

## Official branding correction

The active design uses the official circular emblem and custom vector wordmark from `main` at `df1879e223b055583a0a8d150438483afebdb085`, governed by `docs/branding/official-logo.md`. Horizontal light/dark lockups occupy a 132 × 36 DIP object-fit box, aligned left in the existing 56px header. The collapsed header uses the 33 × 33 DIP symbol. No font-generated wordmark remains. All four SVG files retain exact source bytes. The older square asset is removed from the design pack. Layout, Settings, Help scrolling, SHOW deadlines, and completion navigation are retained.

## Finalized design and implementation proposal

See [the Phase 1B implementation plan](../../superpowers/plans/2026-10-25-phase1b-desktop-implementation.md) for twelve testable tasks, four milestone gates, TypeScript contracts, exactly three Luna-max workstreams, the dependency strategy and risk register. This is a proposal for approval, not executed work. The final cleanup supersedes the earlier description of default Help as independently scrolling: when fewer than six lines fit, the body scrolls instead.
