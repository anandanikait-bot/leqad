# Issue #3 Task C: conditional Rectangle dropdown SHOW

Date: 2026-10-16. Base: PR #7, `062f87e867075d0915acc85fa9746d5b71f5fe69`.
This is a separate production change, not another capture workflow revision.
Keep all stacked PRs open and unmerged.

## New owner SHOW snapshot: context failure established

The [owner's reason-specific report](https://github.com/anandanikait-bot/leqad/pull/8#issuecomment-6210325141)
now establishes that the real request stopped at `CONTEXT` with
`SKETCH_CONTEXT_UNESTABLISHED`, `context: UNKNOWN`, and `productionLookup: NOT_RUN`.
The production Rectangle resolver was not called. Independently, the read-only
inspection found `NO_TOOLBAR_SEMANTICS`; eligibility was `NOT_EVALUATED`.

`pageGate: ALLOWED` and zero read-only indicators do not establish editing
permission. Neither the current Finish command matcher nor the plane-labelled
Sketch dialog observer recognized the owner's active Sketch. This is a detection
gap, not user error. The original sanitized v3 file was subsequently supplied and
reviewed locally: its truncated nonsemantic paths, UNKNOWN enabled/context state,
span geometry and unproven menu association do not establish an exit control or a
safe dropdown arrow. The raw report remains local, outside approved reference data.

One correctness fix is possible without inventing a positive signal: absence of
supported active-Sketch evidence now reports `SKETCH_UI_ACTIVE: UNKNOWN`, rather
than asserting `CLOSED`. Existing positive observations still report `OPEN`.
The context gate and Rectangle admission rules are unchanged. A simulation joins
the real context observer, Sketch UI observer, read-only inspection and runner to
reproduce the owner report without executing target lookup or highlighting.

The owner authorized a narrow, temporary **Capture Sketch exit control** option
in the existing one-shot inspector. It records the user-indicated Finish/Exit
control before its normal manual click handler runs, including bounded ancestry,
nearby labels, relative bounds, visibility, enabled state, accessibility metadata
and icon tag counts. It does not apply Sketch-command matching to exit candidates
or claim that a clicked element establishes active Sketch. See the
[local capture instructions](./sketch-control-capture.md#active-sketch-exit-control-capture).

Real active-Sketch recognition and Rectangle highlighting remain **BLOCKED**
until that evidence supports a detector and the owner accepts the actual result.
No repeated Rectangle opening/selection recording is requested.

## Owner live acceptance follow-up: BLOCKED

The owner tested candidate `02cc1fe9c99c591637243c0df64ae8ef1064273d` in real
Onshape. Step 4 SHOW displayed the combined context/dropdown failure message.
CI #96 was successful for that candidate, but **live acceptance failed its gate**.
It is an earlier conditional candidate, not a live-compatible build.

Confirmed cause in code: the fallback replaced context, lookup and eligibility
failures with identical text. The semantic lookup also cannot admit the observed
nonsemantic div/svg/span path. The old report/message cannot identify which gate
stopped that particular SHOW, or establish that every toolbar in the document is
nonsemantic. Do not invent that precise runtime result.

The follow-up adds a small read-only diagnosis of the current SHOW request:

| Failed category    | What the report distinguishes                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| CONTEXT            | Actual runner context and sanitized page eligibility; Finish Sketch recognition status, observed dialog-plane presence, positive read-only count |
| SKETCH_OBSERVATION | Required Sketch observation did not match after the context check                                                                                |
| GROUP_LOOKUP       | Missing semantic toolbar, missing popup markup, no exact supported group name, or bounded search limit                                           |
| TARGET_ELIGIBILITY | Hidden, disabled, clipped, obscured, wrong context/role, ancestry limit, aggregate control, or competing usable groups                           |
| HIGHLIGHT          | Target changed before an outline could be installed                                                                                              |

`productionLookup: NOT_RUN` means the production request stopped before target
resolution. `RUN` means that resolution was actually called, even if context was
lost during it. The separately labelled inspection reuses the actual collector
read-only and may inspect group evidence even when the production context gate
stopped. Its findings must not be relabelled as an executed production lookup.

The report is `leqad-rectangle-show/1`, scoped to `SHOW_REQUEST_SNAPSHOT`, not a
continuously current result. It contains only closed reason enums, booleans and
capped counts. No page text, DOM, attributes, URLs, IDs or authentication data are
exported. Copying is opt-in; no capture listeners or CAD actions are started.
Copied SHOW output clears when the request changes, HINT/GUIDE is selected or
navigation cancels it. The success message describes a temporary highlight that
was shown and may clear when the interface changes; it does not assert that an
outline remains after independent highlighter cleanup. The runner retains a
request snapshot until expiry/new guidance, not a continuously observed outline.
Original Rectangle capture v3 is unchanged.

### One targeted owner observation, not another interaction recording

Install this PR's latest successful artifact (linked in the PR; do not use the
older #96 artifact), enter the real Sketch, and press Step 4 SHOW once. Then enable
recognition diagnostics and choose **Copy Rectangle SHOW diagnosis**. Save/review
that small JSON locally before sharing it. Clipboard fallback uses the read-only
**Recognition diagnostics output** field. Do not open/re-arm/record the dropdown.

The original sanitized v3 JSON is not present in this workspace; the reviewed
Issue #3 summary was used. Reattaching that already-saved file can expose omitted
local ancestry/geometry without repeating a recording. Until safe real control
bounds, unique visibility/enabled state and context are established, no new
nonsemantic adapter is justified. Actual highlighting acceptance remains BLOCKED;
Top/Sketch, CAD verification, permission inference and self-reported progress are
unchanged. Do not merge PR #8 or count simulated semantic fixtures as live success.

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
