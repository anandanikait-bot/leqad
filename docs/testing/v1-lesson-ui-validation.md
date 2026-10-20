# Approved V1 lesson UI validation

Scope: issue #16 and draft PR #15, on `design/approved-v1-lesson-ui`, stacked on PR #14. Do not merge without owner visual approval and resolution of the earlier PR stack.

## Implementation

- The shared lesson panel uses the approved 365px width, 10px corners, 16px section spacing, and 15px instruction-card padding. Named Next action and Lesson help regions separate instructions from optional assistance.
- The navy, ivory, off-white and russet colors follow the approved design. Inactive navigation text uses a measured 4.71:1 contrast against ivory. The panel retains its light palette under both browser color schemes.
- The existing completed-step count drives the percentage, fill and ARIA value. Accessible text states how many steps are completed and that CAD work may remain unverified.
- HINT, SHOW and GUIDE use 44px controls with mutually exclusive selected states. Completion labels preserve existing modes: Got it for acknowledgement, Check progress for supported UI checks, Mark done for self-report or unverified continuation.
- The existing callbacks, recognition services, verification rules, lesson transitions and guidance safety conditions are unchanged. Projects and Ask remain previews.

## Exact logo source and header derivative

The owner supplied `Leqad_Final_Approved_Logo_Original.zip`, containing one valid RGB PNG, 1254 × 1254 pixels. The master is copied unchanged to `apps/extension/src/assets/brand/leqad_isometric_learning_mark.png`.

Master SHA-256: `03f744dcc135567bb4f5f91c7a58ce3fe35783b6815942686586db29dc1ab01c`.

Production Header A replaces the L placeholder with a faithful 132 × 132 cube crop rendered at 33 CSS pixels. Its original background and colors are preserved. The image is bundled as a PNG data URL so it does not depend on host-page paths or external image requests. The full master remains intact in the repository, including its original raster wordmark. See [asset provenance](../../apps/extension/src/assets/brand/README.md) for crop bounds, hashes and reproducible generation.

[16/24/32/33px derivative preview](../images/v1-ui/leqad-logo-size-review.png) is for owner review. No manifest icon was changed or approved by this work. The derivative's small-size legibility and visual acceptance remain owner decisions.

## Regression evidence

`AssistantPanel.test.tsx` adds 13 cases covering:

- Exact master-byte integrity and header-mark replacement.
- 0%, 50% and 100% rehydration from 0/4/8 completed steps, including a visible Step 4 with 0% completion.
- Reset to 0% and rehydration of the reset session.
- Separate instructions and help, with no CAD calls on render.
- Mutually exclusive assistance selection without lesson completion.
- Acknowledgement, supported UI verification, unavailable verification, and self-report labels.

`v1-ui.spec.ts` adds nine browser cases covering the effective zoom/color-scheme matrix, sequential percentage updates, reload/reset, navigation contrast, pointer dragging and a narrow viewport. Existing calibration, Rectangle SHOW, reliability and Sketch-capture browser tests now use the approved Mark done label. Their behavioral assertions are retained.

The three progress-description checks and region check failed before their UI additions and pass afterward. The contrast test failed at 4.378:1 before the color correction and passes at 4.71:1 afterward. Existing completed-step arithmetic and completion-mode behavior already passed the added regression cases.

## Fixture screenshots

All screenshots show controlled simulation data, not authenticated Onshape. The Rectangle controls and guidance transitions are fixtures. The Step 4 screenshot shows 38% because three steps have been completed. The Step 5 screenshot shows 50% because four steps have been completed.

- [Panel, Step 4 at 38%](../images/v1-ui/leqad-v1-panel.png)
- [Step 5 at 50%](../images/v1-ui/leqad-v1-progress-50.png)
- [100% effective zoom](../images/v1-ui/leqad-v1-fixture-100.png)
- [125% effective zoom](../images/v1-ui/leqad-v1-fixture-125.png)
- [150% effective zoom](../images/v1-ui/leqad-v1-fixture-150.png)

The zoom tests use a smaller CSS viewport with matching device scale to model desktop zoom. They check panel bounds, typography, scroll access, and control sizes in Chromium. They do not establish actual browser zoom behavior inside Onshape. Chrome and Edge package builds likewise do not establish Edge runtime acceptance.

## Local validation results

- `pnpm format:check`, `pnpm lint`, and `pnpm typecheck`: passed.
- `pnpm test`: 603 passed across 33 files.
- `pnpm reference:test`: 45 passed across four files.
- `pnpm reference:validate`: passed, zero approved capture hashes, NO LIVE EVIDENCE.
- `pnpm test:e2e`: 65 passed, one existing local managed-Chromium extension-installation skip (66 total). Both Chrome and Edge production builds passed.
- `pnpm package:browsers`: both Chrome and Edge ZIPs built.
- Independent read-only review of the initial UI implementation found no blocking or minor regression. The logo follow-up is covered by master-byte integrity, image-loading and existing browser regressions.

Hosted CI results and the exact tested artifact are recorded in PR #15 to keep the validation report from pointing to an earlier commit's package.

## Final owner review: original lettering

The original PNG remains byte-identical to the owner's master hash. Production
Header A is unchanged: cube crop plus separately rendered Leqad text. Option B
uses a direct crop of the original lettering at 80 × 26 CSS pixels alongside the
33px cube. Original colors and ivory background are preserved. The wordmark crop
is not part of the production import graph; no source artwork is redrawn.

Option B is a fixture-only proposal. It has not received owner approval. At
100/125/150% effective zoom, the fixture tests verify image loading, equal header
height, no header overflow, collapse at 280px, and restoration of A on reload.
The normal header is 61 CSS pixels high for both options in these fixtures.

Seven additional `v1-brand-review.spec.ts` cases cover the three A/B zoom views,
three assistance selections with safe fallback, and collapsed/narrow production
layout. Tests retain 38% completion after HINT/SHOW/GUIDE, selected/unselected
colors, and 44px control bounds. SHOW in this fixture demonstrates the manual
Onshape Search fallback; GUIDE remains unavailable for the unvalidated Rectangle
workflow. Neither assistance selection completes a step.

Required screenshot set (controlled fixtures, no private CAD content):

| View                                 | Screenshot                                                         |
| ------------------------------------ | ------------------------------------------------------------------ |
| Header A versus B                    | [Side-by-side review](../images/v1-ui/leqad-header-comparison.png) |
| A: current production header         | [Header A](../images/v1-ui/leqad-header-option-a.png)              |
| B: original lettering, not approved  | [Header B](../images/v1-ui/leqad-header-option-b.png)              |
| Full Step 4 at 38%                   | [Step 4](../images/v1-ui/leqad-v1-step4-review.png)                |
| Four completed steps at 50%          | [Progress 50%](../images/v1-ui/leqad-v1-progress50-review.png)     |
| HINT selected                        | [HINT](../images/v1-ui/leqad-v1-selected-hint.png)                 |
| SHOW selected, manual fallback       | [SHOW](../images/v1-ui/leqad-v1-selected-show.png)                 |
| GUIDE selected, unavailable workflow | [GUIDE](../images/v1-ui/leqad-v1-selected-guide.png)               |
| Collapsed production header          | [Collapsed](../images/v1-ui/leqad-v1-collapsed.png)                |
| 320px viewport / 304px panel         | [Narrow](../images/v1-ui/leqad-v1-narrow.png)                      |

The screenshot set uses 2× device scale. The existing 100/125/150% effective zoom
screenshots remain linked above. The comparison does not change locked UI rules,
CAD recognition/targeting, Rectangle SHOW, Search fallback, verification,
HINT/SHOW/GUIDE safety, diagnostics, persistence, or user-controlled CAD actions.

Regenerated local Chrome/Edge ZIPs retain SHA-256
`993d7a464f7363e5acd9bba3aabb9d3d94ab325c37385414eff3f3918026663b`,
matching the previously computed local packages at `cc008a6`. This verifies that
the review-only assets/tests did not change the extension package. Hosted CI and
its freshly uploaded artifact are tracked separately in PR #15.

The branch is ready for owner visual acceptance. Header choice, icon approval,
actual Onshape/Edge runtime acceptance, provider automation permission and the
existing stacked-PR merge order remain external gates. It is not approved for
merge or represented as live Onshape compatible.

## Owner acceptance still required

1. Choose Header A or B from the comparison. Review the faithful small header derivative and its 16/24/32/33px preview before extension-icon use.
2. Review the fixture screenshots for visual approval.
3. Install the built Chrome extension in an authorized regular Chrome profile and check loading, dragging, collapse, scrolling and readability at actual 100%, 125%, and 150% browser zoom.
4. Check existing Top/Sketch/Rectangle highlights and HINT/SHOW/GUIDE fallbacks, self-reported progress and persistence. Confirm that no UI styling obscures the intended CAD control.
5. Check Edge runtime separately if it is part of release acceptance.

Authenticated Onshape automation has not been performed. Provider permission remains pending; offline CI cannot establish live acceptance.
