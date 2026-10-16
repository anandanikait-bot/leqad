# Issue #3 Task C: conditional Rectangle dropdown SHOW

Date: 2026-10-16. Base: PR #7, `062f87e867075d0915acc85fa9746d5b71f5fe69`.
This is a separate production change, not another capture workflow revision.
Keep all stacked PRs open and unmerged.

## Evidence and remaining block

The [production-highlight handoff](https://github.com/anandanikait-bot/leqad/issues/3#issuecomment-6206486051)
and its linked owner evidence establish:

- Opening input passed through SVG/div wrappers and an ancestor labelled
  Corner rectangle, consistent with a last-used toolbar variant.
- A separate input began at an exact Corner rectangle span. Three variant labels
  and a duplicate Corner name appeared; menu nodes disconnected afterward.
- The owner separately confirmed manual tool activation. This is an owner-reported
  UI outcome, not model evidence, a verified selector or a selected-state observer.
- The report retained UNKNOWN menu state/ownership, incomplete paths and global
  scan, uncertain visibility and PAGE_HIDDEN cancellation.

They **do not** establish the actual arrow/control boundary, toolbar membership,
unique visible enabled menu row or group-to-menu ownership. This PR does not turn
those unknowns into a non-ARIA adapter. The reported nonsemantic structure remains
**BLOCKED**. Exact Corner option targeting, automatic SHOW transfer and GUIDE are
also **BLOCKED**. The owner does not need to repeat an identical diagnostic capture.

## What production behavior changes

- The registry now requests the distinct semantic identity `rectangle-dropdown`.
  Legacy lesson target `rectangle` delegates to that same group resolver; it no
  longer treats a standalone variant command/menu item as the group. The lesson
  remains version 2.0.0 with unchanged progress and self-report contracts.
- Conditional group-only SHOW requires a current observed Sketch interface, no
  usable read-only indicator, and one visible enabled named popup button inside
  an explicit toolbar. Its exact name may be Rectangle or a last-used Corner,
  Center Point or Aligned name. This identifies a **popup group**, not a selected
  variant. Aligned is not registered as an exact production action.
- Popup/toolbar/control roles are runtime semantic evidence, **not** roles claimed
  to exist in the owner capture. Without them, SHOW abstains. Unlabelled arrows,
  arbitrary SVG/div text and title-only cards are not promoted to controls.
- Dialogs (native or ARIA), menus, tree/viewport contexts, conflicting accessible
  names/roles and aggregate containers with independent controls are excluded.
  Search limits are 16 toolbars, 128 popup controls per toolbar, 512 distinct
  controls and 16 ancestor levels. Incomplete search/context cannot establish
  uniqueness. Duplicate usable groups yield AMBIGUOUS; no first-match selection.
- The existing measured outline remains click-through and lasts at most five
  seconds. It revalidates visibility, clipping, obstruction, enabled state, popup
  metadata and context on DOM/layout changes. User activation, blur, hidden tab,
  navigation, replacement, context loss and explicit cleanup remove the outline
  and its hooks. No CAD click is generated.
- Written instructions explicitly say to open the dropdown arrow and choose
  Corner Rectangle, including when recognition is unavailable. Missing or
  ambiguous SHOW does not offer blind Retry. SHOW stays available after a real
  UI change. The panel explicitly says the exact option is not highlighted.
- Known read-only or version pages cannot enter editing guidance context merely
  because their Part Studio controls remain visible. Unknown editing permission
  is unchanged and is never promoted by this guidance.

## Test evidence classifications

The regression fixtures are simulations. Observed label spellings and broad
SVG/div/span path facts are distinguished from assumed wrapper relationships,
semantic toolbar/popup roles, menu association, geometry and handlers. The real
nonsemantic evidence gets an abstention regression, not a fabricated positive.

Positive semantic fixtures exercise all three last-used variant names at simulated
80/100/125/150% layout scales. Other tests cover duplicate names/groups, standalone
commands/menu items, missing/incomplete evidence, wrong/read-only contexts,
conflicting names/roles, hidden/disabled/inert/clipped/obscured/stale controls,
rerendering, scrolling/resizing, popup loss, five-second expiry, navigation,
click-through, no unsolicited clicks and immediate listener cleanup. Existing
Top/Sketch, Dimension/Finish Sketch, lesson and persistence tests remain in the suite.

The browser fixture can use the actual production guidance registry through
`production-guidance`; its older GUIDE scenarios remain explicitly test-only.
Browser fixture success and CI are **not live Onshape acceptance**.

## Install and perform the next owner test

Use the exact successful run/head and artifact linked in the PR. Extract the
`leqad-browser-packages` ZIP, then extract `leqadextension-0.1.0-chrome.zip`.
Disable the previous Leqad copy. At `chrome://extensions`, enable Developer mode,
choose Load unpacked and select the folder directly containing `manifest.json`.
Refresh an authorized disposable Onshape Part Studio in regular Chrome.

Record **PASS, FAIL or BLOCKED** plus a short observation for each:

| Owner action                                   | Expected result                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Enter Sketch, Step 4 → SHOW with menu closed   | One exact dropdown control outline if supported semantic evidence exists; otherwise explicit safe fallback, classified BLOCKED |
| Confirm Corner Rectangle instructions          | Clearly names the arrow and intended variant, without claiming current selection                                               |
| Manually open dropdown                         | Group outline clears; exact-option transfer is deliberately BLOCKED, so no second Leqad click is required                      |
| Manually choose Corner Rectangle               | CAD click works normally; no automatic lesson/geometry PASS                                                                    |
| Repeat SHOW with a different last-used variant | Same conditional dropdown targeting, or BLOCKED; never outline the wrong variant command                                       |
| Retry Top-plane and Sketch SHOW                | Existing behavior remains correct; no stale outline after navigation/rerender                                                  |

Provide build/Chrome version and the short highlight results. No new JSON capture,
document identifiers or authentication data are requested. The minimum evidence
gap for a future non-ARIA/exact-option adapter is a distinguishable current control
boundary and a unique visible enabled row linked to that control's current menu.
Until that is established, this PR must not be called a real-Onshape Rectangle
highlighting fix or completion of Issue #3.
