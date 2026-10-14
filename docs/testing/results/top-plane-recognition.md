# Top-plane recognition sprint

**Automated validation:** local checks and hosted CI run 38510905966 passed.

**Live Onshape acceptance:** BLOCKED. The latest adapter has not been owner-tested in Onshape.

The code under test is PR #1 commit e4ad2a310a251e4684ccfdf48fe34d87958032e3. A later documentation-only PR commit carries this report; no extension source changed after the tested commit. PR #1 remains open and unmerged.

## Authenticated evidence and root cause

The owner supplied an authenticated Onshape v3 structural report:

- The clicked Top text is a span within nonsemantic div wrappers.
- At the reported common parent, six direct children were observed: Default geometry at sibling offset -2, an unlabeled element at -1, and the Top branch at 0.
- The Top branch bounds were about 1.6 times the label width and 1.3 times its height. A larger parent was 7.8 times the label height and must not be highlighted.
- No semantic tree roles or explicit actionable markup were exposed.
- Front/Right sibling relationships were not confirmed because the diagnostic reached its limits.
- ANCESTOR_DEPTH_LIMIT_REACHED visibility, enabled, and context values mean diagnostic inspection was incomplete. They are not failure observations.
- productionRecognition is NOT_RUN. This report does not claim that the diagnostic measured a production recognition result.

The existing semantic path requires a tree/treegrid context, a named Default geometry semantic group, and an actionable semantic row. Those assumptions do not match the reported non-ARIA structure. Before the fix, a sanitized regression fixture matching the reported Top structure produced only a low-confidence span candidate. This reproduces the source-code limitation without claiming that productionRecognition ran in the owner’s browser.

## Adapter and safety boundaries

The existing semantic-tree resolver remains in place. The new non-ARIA adapter recognizes a plane only when it finds:

- An exact Top, Front, or Right text span inside a nonsemantic div branch.
- A direct sibling Default geometry heading in the same bounded div region.
- Default geometry before the plane row, with at least one unlabeled sibling between them. Any intervening named sibling must itself be an exact reference-plane row.
- A measured candidate row that contains the label, fits inside the local region, and does not overlap a sibling’s measured bounds.

The resolver chooses the closest enclosing branch that satisfies those relationships. It never highlights the larger common parent. It does not use CSS class names, a fixed sibling offset, a fixed child count, screen position, or pixel ratios. Parent traversal is limited to eight levels; local children are limited to 32, and names to 64 nodes/128 characters. Oversized, incomplete, hidden, clipped, disabled, duplicate, or structurally uncertain candidates are rejected or ambiguous.

Dialogs, trees handled by the semantic path, toolbars, menus, navigation, forms, canvas/SVG/viewport contexts, Leqad-owned elements, explicit controls, and unrelated exact Top text are excluded. The extension only draws a pointer-events-none outline. It does not click the row. Because Onshape exposed no actionability signal, the structural candidate reports enabled UNKNOWN and explains that click handling and selected state remain unknown. Structural highlighting is excluded from selected-plane evidence; no lesson completion, permission, or model evidence was changed.

The highlight uses the candidate branch’s current DOMRect. A mutation or removal clears the stale outline; a later Show me resolves the replacement node. Existing scroll, resize, identity-change, and navigation cleanup remains covered by the shared highlighter tests.

## Regression coverage

The sanitized unit fixture labels its evidence boundary in the test source. It models only the captured Top span, nested div wrappers, six-child common parent, -2/-1/0 sibling relationship, and measured 1.6x/1.3x/7.8x bounds. The other three leading empty children preserve the reported count; their real contents are unknown. Front/Right use simulated variants with a changed sibling gap and child count and are not live Onshape evidence.

The regressions cover exact Top/Front/Right matching, duplicate rows, camera/viewport/dialog decoys, unrelated Top text, a distant rather than direct Default geometry sibling, hidden rows, an oversized row bound that overlaps Default geometry, unknown click/selection state, click-through, cleanup, and DOM replacement followed by a fresh Show me.

Changed implementation and tests:

- apps/extension/src/services/referencePlanes.ts
- apps/extension/src/services/semanticTargets.ts
- apps/extension/src/services/referencePlanes.test.ts
- apps/extension/tests/e2e/panel.spec.ts

No Onshape API integration, AI tutoring, or lesson verification behavior was added.

## Automated validation

Local results for source commit e4ad2a310a251e4684ccfdf48fe34d87958032e3:

| Check                             | Result                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Lint                              | PASS                                                                                      |
| Typecheck                         | PASS                                                                                      |
| Unit/component suite              | PASS — 237 tests across 17 files                                                          |
| Formatting                        | PASS                                                                                      |
| Chrome and Edge production builds | PASS — 423.93 kB each                                                                     |
| Browser suite                     | 11 PASS / 0 FAIL / 1 managed-policy SKIP                                                  |
| Chrome and Edge ZIP packaging     | PASS — 129,414 bytes each                                                                 |
| Local Chrome/Edge ZIP SHA-256     | 244cc70661fbb423158d599046e86bc650947a7bb03f6864698f52f28229cd8f for each; byte-identical |

The new Playwright case is a controlled simulation. It confirms the measured row outline, pointer click-through, stale-outline removal when Onshape-style DOM is replaced, and a fresh match on the next Show me. It is not an authenticated Onshape test.

Hosted CI [run 38510905966](https://github.com/anandanikait-bot/leqad/actions/runs/38510905966) on source commit e4ad2a310a251e4684ccfdf48fe34d87958032e3 passed frozen install, lint, typecheck, formatting, **237 unit/component tests across 17 files**, Chrome/Edge builds, **12 browser tests**, packaging, and artifact upload. [Download the tested Chrome/Edge build — artifact 11869538592](https://github.com/anandanikait-bot/leqad/actions/runs/38510905966/artifacts/11869538592). Each inner ZIP is 129,414 bytes with SHA-256 244cc70661fbb423158d599046e86bc650947a7bb03f6864698f52f28229cd8f. The two inner packages are byte-identical and match the local packages. The outer artifact is 259,062 bytes with SHA-256 8d2c6d4d7dfea92ba657fbae7547bc7ffa98c344a2cf976ec9d51d6b48c8c238, matching the Actions digest. I downloaded the hosted artifact and verified the outer digest, both inner hashes, and byte equality with the local Chrome/Edge packages. These hashes were measured for this artifact and are not copied from the diagnostic build.

The earlier diagnostic-only build passed Actions run 38502121687, artifact 11865553662. Its Chrome/Edge inner packages were 128,329 bytes each with SHA-256 8e330abb5e603f868bbd75939243af712fe01b6bb06e0d10e2cef8f8e13645a0. That artifact predates this adapter and is not the live-acceptance build.

## Owner live test

Download [artifact 11869538592](https://github.com/anandanikait-bot/leqad/actions/runs/38510905966/artifacts/11869538592) and extract its outer ZIP. Extract leqadextension-0.1.0-chrome.zip (or the Edge ZIP) into a folder with manifest.json at its root. Disable/remove older Leqad copies, open chrome://extensions or edge://extensions, enable Developer mode, choose **Load unpacked**, select that folder, and refresh Onshape.

In an authorized disposable Part Studio:

1. Expand Default geometry so Top, Front, and Right are visible.
2. Open Step 2 and choose **Show me**. Record whether only the correct Top row is outlined. Confirm the CAD click still passes through and no plane is selected automatically.
3. Collapse/re-expand or rerender the feature list, repeat Show me, then navigate to another document. Confirm the old outline clears and a fresh Show me targets the current row.
4. Record PASS, FAIL, or BLOCKED plus a short observed result. Test Chrome and Edge separately. Do not send document IDs/URLs, credentials, cookies, tokens, or private CAD content.

The 24-case Phase 1 acceptance report remains BLOCKED until its real Onshape scenarios are completed. The authenticated structure supports the first Top resolver, but the productionRecognition field was NOT_RUN, Front/Right relationships are unverified, JavaScript click handling is unknown, and no owner live retest has occurred. Phase 1 acceptance has not passed. Keep PR #1 open and unmerged; licensing and a completion announcement still require owner approval.
