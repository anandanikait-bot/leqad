# Issue #3: Corner Rectangle lesson and capture handoff

## Scope and compatibility

[Issue #3](https://github.com/anandanikait-bot/leqad/issues/3) specifies Corner
Rectangle for this exercise. Step 4 now teaches the dropdown arrow, explicit
variant selection, two opposite corner clicks, and one closed four-edge profile.
The explanation distinguishes Center Point Rectangle (center first) and Aligned
Rectangle (line direction, then perpendicular width). The group icon can retain
the last-used variant, so its presence does not identify the intended command.
Step 5 still separately teaches horizontal 40 mm and vertical 30 mm dimensions.

This instructional change is based on the issue's product decision and official
Onshape tool documentation, **not new authenticated DOM evidence**:

- [Corner Rectangle](https://cad.onshape.com/help/Content/Sketch/corner_rectangle.htm)
- [Center Point Rectangle](https://cad.onshape.com/help/Content/Sketch/center_point_rectangle.htm)
- [Aligned Rectangle](https://cad.onshape.com/help/Content/Sketch/aligned_rectangle.htm)
- [Sketch tool groups](https://cad.onshape.com/help/Content/Sketch/sketch_tools.htm)

The branch starts at PR #2's `2e7fc910f03caf0c5523c9357b16b8ea7165de36`.
Its review PR targets PR #2's branch so reviewers see only the teaching changes.
PR #2 remains a dependency requiring independent review; neither PR is merged.

Lesson version stays `2.0.0`. This corrects instructional copy without changing
step IDs/order, completion signals, evidence requirements or stored state.
`progressStore.restoreSession` and the panel reject incompatible versions;
bumping it here would discard compatible saved progress. Regressions cover
resuming existing self-reported Step 4 progress and reload persistence.

The production registry still distinguishes the Rectangle **group** from exact
variants. No exact variant or production GUIDE recipe is enabled by this change.
No recognition, diagnostic, model verification or Sketch adapter code changes.

## Install the capture build

Use the successful CI run and exact commit linked in the PR/delivery message.
Download its `leqad-browser-packages` artifact, extract the outer ZIP, then
extract `leqadextension-0.1.0-chrome.zip` into a separate folder. In regular local
Chrome, open `chrome://extensions`, enable Developer mode and Load unpacked the
folder directly containing `manifest.json`. Disable the previous Leqad copy,
then refresh the authorized disposable Onshape Part Studio.

For Edge use `leqadextension-0.1.0-edge.zip` at `edge://extensions`. Packaging
success does not establish a live browser acceptance result. The independent
reference recorder disables extensions; use normal Chrome for this test.

## Owner capture required before automatic dropdown work

1. Manually enter Sketch editing in a disposable Part Studio. Select Step 4 in
   Leqad. Read the action and **Why?** explanation; confirm Corner Rectangle is
   explicit even if SHOW fails or GUIDE is unavailable.
2. Start with the Rectangle dropdown **closed**. In Leqad choose **Enable
   recognition diagnostics** → **Capture Rectangle dropdown**.
3. Within the 20-second observation window, manually open the actual dropdown
   arrow. The diagnostic observes the interaction; it does not click CAD tools.
4. If appropriate, manually select **Corner Rectangle**. Record whether selection
   works and whether the group icon reflects a previously selected variant.
5. If the automatic result stays UNKNOWN or times out, close the menu, choose
   **Capture manual before snapshot (I report closed)**, reopen it manually, then
   choose **Capture manual after snapshot (I report open)**. Those labels remain
   user-reported; they cannot establish an observed OPEN state. If panel clicks
   close the menu before capture, include that short observation.
6. Choose **Copy Rectangle dropdown report**. If clipboard access fails, copy
   from the read-only report field. Save the sanitized JSON locally for review
   before sharing it with the developer. Do not commit a live capture to GitHub.

Share the sanitized report, tested commit/browser/zoom, whether Corner Rectangle
was selectable, and any icon change or ambiguity. Do not send URLs, document or
account IDs, raw HTML, screenshots, CAD content, cookies, credentials or tokens.
The existing diagnostic limits and privacy rules remain in force.

## Evidence gate and owner results

| Check                                                     | Current result                 | Evidence / next action                                      |
| --------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| Original Step 4 SHOW failure                              | FAIL (historical owner report) | Issue #3; not a new build result                            |
| Corrected lesson content/rendering                        | Automated tests only           | Controlled simulations, not live Onshape acceptance         |
| Real group trigger → menu → Corner Rectangle relationship | BLOCKED                        | Owner sanitized capture required                            |
| Automatic exact variant SHOW / GUIDE                      | BLOCKED                        | No supported capture-backed adapter yet                     |
| Current build live Top + Sketch regression                | BLOCKED                        | Recheck in local Onshape; PR #2 historical reports retained |
| Closed rectangle and dimensions                           | UNKNOWN                        | Student report/UI alone cannot verify CAD geometry          |

Stop automatic recognition work until the capture establishes a unique, current,
visible, enabled trigger and menu-option relationship. Then follow Issue #3 Task
C with a failing capture-backed regression before implementing an adapter.
Task D acceptance follows review: test prior variant choices, fallback, Top,
Sketch, Dimension and Finish Sketch at 80/100/125/150% zoom; record PASS, FAIL or
BLOCKED with short actual observations. Passing CI does not complete that gate
or establish Phase 1 acceptance.
