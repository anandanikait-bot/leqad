# Rectangle metadata validation follow-up

Status: **diagnostic ready for owner retest; automatic highlighting not fixed**.
Baseline: PR #11 at `5b3f2c624255167b777a7506e5b91236cf2ab091`.

## Evidence and findings

The owner supplied a four-state live observation summary in the task outline.
The raw four-state JSON was not attached to this task or posted in PR #11's
comments when reviewed. The summary is treated as owner-provided live evidence;
no reconstruction is presented as an authenticated fixture.

| State              | Actual owner observation                                              | Remaining gap                                                                  |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A, Sketch          | Toolbar marker, LINESEGMENT, RECTANGLE_TWO_CORNERS, same-parent arrow | Visibility, enabledness, exact arrow bounds and full relevant coverage UNKNOWN |
| B, dropdown open   | All three Rectangle IDs in a menu nested in a toolbar                 | Which arrow input caused the transition and which local group owns that menu   |
| C, changed variant | Face changes to RECTANGLE_CENTER, still same-parent arrow             | Same eligible arrow boundary after the change                                  |
| D, Extrude         | newSketch and active extrude; no Rectangle recorded                   | Incomplete inspection cannot establish Rectangle absence                       |

The 16-ancestor cutoff explains UNKNOWN eligibility for deeply nested controls.
Walking every SVG path explains command-budget exhaustion. Neither cutoff is a
negative observation about the actual UI. Presence of extrude alone cannot
classify Sketch versus Extrude, because the owner also observed it in Sketch.
A same-parent report establishes a relationship, not verified ownership.

## Changes and limits

The existing opt-in diagnostic now exports schema
`leqad-rectangle-command-metadata/2`:

- Eligibility uses one combined ancestor pass, caching computed styles only
  within that snapshot. At most 96 ancestors per target and 4,096 style reads
  per inspector are allowed. It checks hidden/ARIA-hidden, CSS visibility,
  opacity, inert/native/ARIA-disabled state, zero size, connection, viewport,
  clipping and a center-point hit test. Missing hit testing remains UNKNOWN.
  Bounds alone and a larger depth limit do not establish eligibility.
- Focused inspection covers command-bearing candidates in at most eight toolbar
  and eight menu regions. JavaScript inspects at most 256 unique command
  candidates, visits at most 4,096 region elements, and exports 24 command
  records. Fixed exact-identity queries retain
  useful observations when general coverage truncates; those first observations
  never establish uniqueness. Unrelated SVG paths consume no command budget.
- `scan.inspection` describes completion of the bounded local inspection;
  `scan.relevantRegionCoverage` describes coverage of the discovered marker
  regions. Missing regions or truncation leaves coverage UNKNOWN. Neither field
  claims knowledge of UI outside those regions. Native browser selector-engine
  execution is **not hard bounded**; the report explicitly discloses this.
  Native queries
  request single matches or live marker collections; command/actionable discovery
  does not materialize all matches before applying its budget. A bounded region
  walk skips SVG subtrees only when a first-match query finds no command metadata.
  There is no new full-document descendant walk.
- At most 16 arrows and 32 direct children per group are inspected. A local
  group candidate requires one direct Rectangle face, a unique arrow, no
  competing command/actionable branch, and measured separate face/arrow bounds
  inside a local parent. Relative arrow coordinates and size are exported;
  absolute screen positions are not. Eligibility remains separate from identity.
  Every record keeps `menuAssociation: NOT_ESTABLISHED` until an interaction is
  examined. LOCAL_CANDIDATE never means verified ownership.
- State B inspects the actual owner event path before the normal input runs.
  It distinguishes a unique local arrow candidate from OTHER or UNKNOWN input.
  It compares pre-input menu state with a changed visible Rectangle menu.
  Only complete current command coverage and a unique, connected face/arrow
  group containing that menu receive
  LOCAL_TRANSITION_CANDIDATE. Portals, replacement, unrelated menus, duplicate
  groups and uncertain relationships abstain. No captured event is exported.
- State B waits at most 20 seconds, throttles transition inspection to 50 ms,
  and permits at most 20 transition inspections. Unrelated menus do not complete
  capture. Timeout retains a partial sanitized report. Restart, unmount,
  pagehide, hidden document, cancel and expiration clean up listeners and timers.
- `activeSketchState` is always UNKNOWN. Command clues, active marker and safe
  supported-page/editability enums are recorded separately. Conflicting clues
  and known restricted pages are explicit. No permission is inferred.

No new production selector, context detector, highlight admission, lesson
progression or geometry verification is enabled. Production recognition remains
NOT_RUN. Existing Top/Sketch behavior is preserved.

## Controlled validation

All added DOM fixtures are simulations. They cover deep valid/hidden/disabled
ancestry, clipping, occlusion, missing hit tests, duplicates, competing controls,
changed variants, coverage limits, unrelated menus, detached/replaced nodes,
timeout/cancellation and a poisoned export privacy test.

A local controlled jsdom run with 10,000 SVG paths took approximately 166–188 ms and
inspected two command-bearing candidates. The test has a generous five-second
regression ceiling; this is not a performance guarantee for real Onshape.
Browser coverage uses deep wrappers and SVG-heavy simulated controls and checks
the owner's input passes through without CAD automation or lesson advancement.
Hosted checks and browser packages are linked from the dependent PR.

## One final owner retest

This is one focused four-state retest of the improved schema, not another broad
DOM capture. Use an authorized disposable document and the tested build linked
in the PR. Extract the GitHub artifact, then the Chrome ZIP; disable the old
Leqad copy; load the folder containing manifest.json at chrome://extensions
with Developer mode enabled. Refresh Onshape.

1. Enter Sketch with the Rectangle menu closed. Enable recognition diagnostics
   and record State A.
2. Arm State B, wait for the armed message, then click the actual Rectangle
   arrow once. Wait for the saved or timeout message. Do not return to the panel
   while waiting. A timeout or uncertain association is useful evidence.
3. Manually select another Rectangle variant and record State C with its menu
   closed. Confirm in your own words that the visible toolbar face changed.
4. Manually exit Sketch, open Extrude and record State D. Copy the report; save
   and review it locally as pending review before sharing. Do not commit it or
   export any document/account identifiers.

If a state cannot be reached, copy the partial report and describe that block.
Do not repeat the experiment indefinitely.

## Conditional production proposal and stopping gate

Recommendation now: **one final missing observation**, using the retest above.
Do not enable a production resolver from this summary or simulated fixtures.

A later narrow resolver is reasonable only if the retest establishes complete
relevant coverage, one eligible face/arrow pair across A/C, actual arrow input
and attributable menu ownership in B, and independently distinguishable Sketch
context with conservative negative-context tests. It would resolve the exact
allowlisted Rectangle family within the observed toolbar and revalidate the
arrow at SHOW time; replacement, scrolling, zoom, navigation, duplicate groups,
unknown permissions or context conflicts must abstain. Menu items require their
own exact identity and group ownership evidence. No automatic clicks or model
verification are permitted.

If the focused owner retest still cannot establish identity, eligibility,
ownership or context uniqueness, stop this diagnostic path and recommend the
separately consented vision-assisted localization benchmark. Do not build more
DOM infrastructure while waiting. Real automatic highlighting acceptance remains
BLOCKED until owner testing of an evidence-backed production implementation.
