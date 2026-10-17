# Targeted Sketch / Extrude discovery

## Confirmed defect and remaining hypotheses

Baseline `3957b57` inspected a depth-first prefix of the body. Its 6,000-element
budget was shared by irrelevant DOM and useful UI. A later dialog could be
entirely absent from the report. Two simulated regressions reproduced that
failure while the previous 15 capture tests passed. Two further regressions reproduced an exact named command being starved by a
large sibling inside its candidate region, and an early icon-heavy region using
the entire SVG candidate prefix. All four were observed failing before correction.

The owner's two incomplete, empty captures establish **failed discovery**, not
identical Sketch and Extrude interfaces. We have not observed which live subtree
used the budget, where the live toolbar falls in DOM order, whether its labels
are filtered, or whether some UI is in shadow roots. These remain hypotheses.

The earlier identity capture queries `[role="dialog"],dialog` before its bounded
inspection. The paired capture previously did not. The content script passes
`document` into both; the differing discovery algorithms explain the discrepancy
without requiring a different page root. Neither diagnostic runs production
recognition. `sketchGuidance.ts`, `semanticTargets.ts` and `referencePlanes.ts`
use their own evidence rules; their results must not be inferred from diagnostic
candidate counts.

## Implementation and limits

`editorRegionDiscovery.ts` discovers diagnostic candidates from four sources:

1. Generic dialog markup already encountered in owner captures.
2. Semantic toolbars, when present.
3. Exact allowlisted `aria-label`, `title` or `data-tooltip` attributes.
4. SVG elements and up to three enclosing structural levels. These are possible
   control clusters, never proof of a toolbar, Sketch, or actionable ownership.

Each source examines at most 32 native query results, sampled across document
order rather than a prefix, and selects at most six local roots. Oversubscribed
root lists are sampled across the ranked candidates too. Locally measurable candidates are preferred within that bounded
sample. Attribute anchors are retained alongside their surrounding region so a
large sibling cannot consume their entire opportunity for inspection.

Each root receives up to 128 element visits before the remaining budget is used
for the body fallback. **Total detailed visits stay at or below 6,000**, including
overlaps. Local depth remains 28, ancestry summaries five, observations 24,
regions six, and serialized snapshots/pairs 12,000/24,000 characters. Aggregation
after inspection deduplicates overlapping roots. Size trimming retains leading
observations alongside region evidence where possible; all omissions are flagged.

Native selector-engine searches and ancestor-selector checks are **not a hard
browser-engine traversal or time bound**. Query results may cover more nodes than
we inspect. Reports distinguish that work from bounded candidate enumeration and
detailed inspection. This is the same limitation as the older native dialog query;
we do not claim exhaustive discovery or constant-time whole-page scanning.

Unsupported names, identifiers, classes, URLs, editable values and HTML are not
exported. Targeted roots cannot bypass editable or Leqad ancestor exclusions.
Accessible-name precedence and conservative visibility/enabled observations stay
intact. Open shadow boundaries encountered are counted without inspecting their
contents; closed roots cannot be detected. No iframe or shadow contents are read.

A temporary synchronous MutationObserver detects changes during inspection.
Inconsistent observations are discarded with `DOM_CHANGED_DURING_INSPECTION_RETRY`;
the observer disconnects in `finally`. Each capture starts fresh. No persistent
listener, CAD action, model verification or lesson progression is added.

## What the tests establish

All fixtures are **simulations**, not reconstructed live Onshape DOM. Regressions
cover 6,500 unrelated predecessors, late semantic dialogs, non-ARIA SVG clusters,
multiple unnamed dialogs, exact anchors inside noisy regions, an early icon-heavy region, source/local/report
limits, privacy exclusions, genuine deep targets, hidden/removed/replaced dialogs,
shadow boundaries and changes during inspection. The browser fixture exercises the
existing panel's two-state capture beyond 6,500 nodes, compares sanitized labels,
and checks that CAD click count and lesson progress do not change.

These checks establish the discovery algorithm's behavior. They do not establish
that the actual Onshape editor exposes a unique Sketch discriminator.

## One owner-run pair

1. Download `leqad-browser-packages` from the successful Actions run linked in the
   delivery message. Extract it, then extract the Chrome ZIP inside it to a stable
   local folder. In `chrome://extensions`, enable Developer mode. Remove/disable
   the older Leqad copy, then **Load unpacked** and select the folder containing
   `manifest.json`. For an existing unpacked installation, replace its files and
   click Reload. Refresh the Onshape tab.
2. Use regular local Chrome with the actual extension enabled and an authorized
   disposable Part Studio. The independent reference recorder disables extensions
   and is not the workflow for this test.
3. Enable Leqad recognition diagnostics. Manually enter Sketch editing, leaving
   its dialog and tools visible. Click **Capture State A — Sketch**. This capture
   does not click Finish or Cancel and does not determine editor identity.
4. Manually leave Sketch and open Extrude (or another unrelated feature editor).
   Select **Extrude** under **State B reported editor**, then click
   **Capture State B — Extrude**.
5. Click **Copy Sketch vs other editor report**. Save the sanitized JSON locally
   as pending review first. Review it before sharing it with the PR. Do not share
   document URLs, account details, credentials, editable feature names or CAD data.
6. Report whether each snapshot has useful `candidateRegions` and observations.
   `discovery.method` should be `TARGETED_REGIONS_THEN_BOUNDED_LIGHT_DOM_FALLBACK`.
   A global `incomplete: true` or fallback node limit may coexist with useful local
   evidence. UNKNOWN visibility is not visibility failure. If
   `DOM_CHANGED_DURING_INSPECTION_RETRY` appears, wait for the UI to settle and
   recapture that state. Recapturing A clears B.

**Live acceptance remains BLOCKED pending this pair.** Even a useful pair does
not alone prove uniqueness against other editors. Do not interpret a shared
empty report or `productionRecognition: NOT_RUN` as a production recognition result.

If the bounded sources still miss the relevant area, the smallest proposed next
step is one opt-in, time-limited passive pointer indication of the visible editor
header. It would inspect only that element and bounded nearby structure without
preventing the user's interaction, recording coordinates, or asserting identity.
This fallback is a proposal, not an implemented new capture flow.

## Local delivery checks

- Focused capture suite: 25 passed (10 new tests; four discovery regressions
  explicitly observed RED before their fixes).
- Full unit/component suite: 531 passed across 28 files.
- Independent reference suite: 45 passed. Integrity validation passed with **zero
  approved captures**; it is not live acceptance.
- Lint, TypeScript and repository formatting: passed.
- Browser suite: 47 passed, one built-extension mounting test skipped by the
  existing managed-Chromium environment guard. Hosted CI must run that test.
- Chrome and Edge builds and ZIP packaging: passed. Both local ZIPs have SHA-256
  `02c2cc085b83bacceb7412a05df7c78091c0fdb4fbd18ab18a895bd47e2d8f12`.
  This is a newly calculated local hash, not a claim about hosted artifact bytes.
- Hosted CI and the tested commit/artifact are linked in the delivery response.
  No actual Onshape live test was performed in this environment.

The first hosted run for this change (`38994918005`) failed because the lifecycle
regression repeated three 6,100-node scans in one test, taking 6.4 seconds against
Vitest's five-second timeout. The fixture now retains the large prefix for its
late-hidden-target assertion and removes that unrelated subtree before the
replacement/removal assertions. Dedicated late-discovery regressions retain their
full adversarial DOM. No timeout, scanner limit or recognition requirement was
relaxed. The final delivery links the subsequent run for the corrected test.
