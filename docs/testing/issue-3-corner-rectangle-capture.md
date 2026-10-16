# Issue #3: Rectangle diagnostic v2 capture handoff

## Scope and evidence

The [latest evidence review](https://github.com/anandanikait-bot/leqad/issues/3#issuecomment-6204552463)
found a diagnostic coverage gap, not a justified production selector change.
The actual Rectangle v1 report had an incomplete 6,000-element baseline and
UNKNOWN menu state. It observed three label strings and an unlabeled SVG input
path, without proving which command handled the input or which tool was selected.
The separate `leqad-recognition/3` semantic-tree report cannot establish a Top-plane
regression or a Rectangle result.

This diagnostic branch starts at PR #4's `507d2f50d11fba94f4aba7957622892a5140cc24`
and targets its branch for a separate review. Task A's Corner Rectangle teaching
remains in PR #4. PR #2's Sketch fix is included through that dependency.
Production recognition, guidance capabilities, lesson contracts and verification
are unchanged. Exact variant SHOW/GUIDE remains **BLOCKED** pending fresh evidence.
No raw owner report is committed. Fixtures distinguish observed label spelling /
row child relationships from simulated triggers, menus, layouts and handlers.

## Install the exact capture build

Use the successful CI run and commit linked in the PR/delivery message. Download
its `leqad-browser-packages` artifact, extract the outer ZIP, then extract
`leqadextension-0.1.0-chrome.zip` into its own folder. In normal local Chrome open
`chrome://extensions`, enable Developer mode and Load unpacked the folder directly
containing `manifest.json`. Disable the older Leqad copy, then refresh the
**authorized disposable Onshape Part Studio**.

For Edge use `leqadextension-0.1.0-edge.zip` at `edge://extensions`. Package checks
are not live browser acceptance. The independent recorder disables extensions;
use regular Chrome for these Leqad captures.

## Two separate owner captures

1. Manually enter Sketch editing and select Step 4. Check its action and **Why?**
   explanation explicitly teach Corner Rectangle. Note browser/version, zoom,
   tested commit, and whether that instructional copy works.
2. **Opening report:** start with the Rectangle menu closed. Choose **Enable
   recognition diagnostics** → **Capture Rectangle dropdown**. Within 20 seconds,
   manually open the actual dropdown arrow. If no observable transition appears,
   wait for timeout; v2 retains the bounded input context anyway.
3. Choose **Copy Rectangle dropdown report** (or copy the read-only field if
   clipboard access fails). Save the sanitized report locally for review as
   `rectangle-opening.json`. Record whether the menu visibly opened.
4. **Option-click report:** with the menu visibly open, arm **Capture Rectangle
   dropdown** again, then manually click **Corner rectangle**. Copy and locally
   review this separate report as `rectangle-option-click.json`. Record whether
   the tool actually selected and whether the group icon changed. If clicking
   Leqad closes the menu, report that; do not label an unavailable menu OPEN.
5. If DOM state remains UNKNOWN, the existing manual fallback is available:
   close the menu → **Capture manual before snapshot (I report closed)**; open
   it → **Capture manual after snapshot (I report open)**. Those state labels
   remain user-reported. These document snapshots still have the 6,000-element
   bound; they may remain incomplete and do not replace the local input evidence.
6. Share the two sanitized reports and short observations after local review.
   Do not commit live captures to GitHub. No URLs, document/account IDs, raw HTML,
   screenshots, CAD content, cookies, credentials or tokens are needed.

The diagnostic preserves normal clicks and keys. It never selects a CAD tool for
the student. It is one opt-in capture session, ends on a relevant bounded
observation or timeout, and removes observation hooks on completion/cancellation,
navigation, hidden tab, or panel lifecycle cleanup.

## Reading the v2 report

- `version: leqad-rectangle-dropdown/2` explicitly changes the output contract.
  `baseline` remains the document-wide bounded observation; global incompleteness
  is retained in `truncated`/status even when local evidence is usable.
- `interactions[].path` and `localBefore` record the indicated input path/context
  **before** its handler runs. Pointer/key paths are not overwritten by later
  clicks. `clickObserved`, `clickedLabel` and `clickPathMatchesInput` separately
  describe an actual click on that target; a changed or incomplete path cannot
  establish identical context. A click is not evidence of tool selection or CAD
  geometry.
- Transition `before`/`after` snapshots are local observations, linked by
  `inputSequence`, with `scope: INPUT_AND_MUTATION_LOCAL`. Their scan bounds are
  independent of the baseline. `inputAssociation: UNPROVEN` means that timing
  alone cannot prove the input caused a menu change. An unrelated changed known
  label may be recorded as an uncertain temporal observation.
- Candidate `inputRelation` records only path membership, bounded sibling offset,
  or an explicit ARIA reference. `relationship` describes physical DOM branches;
  it does not establish a dropdown association or an actionable row. Naming
  references do not prove menu ownership. Nonsemantic labels alone remain UNKNOWN.
- `connected`, `enabled`, visibility and duplicate-label ambiguity are observations
  of the inspected nodes. Detached/hidden/disabled/inert nodes cannot establish
  usable OPEN evidence. `changedCandidateCount` counts bounded signature changes,
  not menu items, clicks, selections or successful steps.
- Bounds remain: 6,000 document elements; 256 local elements/mutation nodes per
  batch; 12 candidates per snapshot; 10 path entries; four interactions and four
  transitions; 20 seconds; 24,000 exported JSON characters. Local snapshots use
  up to two ancestor summaries and one sibling per side. Name inspection counts
  up to 64 nodes/64 characters, including empty wrappers. Export reductions and
  inspection limits are flagged; never reinterpret INCOMPLETE as absence.
- Serialization rebuilds allowlisted fields only. Exact known CAD labels and
  structural metadata can be exported; IDs/classes/arbitrary text/HTML/URLs/key
  values are omitted. Reports remain local until the owner copies/shares them.

## Remaining acceptance gate

Fresh authorized Onshape capture and independent human review remain required.
The historical Step 4 SHOW failure and Top/Sketch live successes remain historical
reports. New automated tests are simulations, not live compatibility or verified
geometry. After the new capture, follow Issue #3 Task C with a capture-backed RED
regression before changing any production adapter. Keep all PRs open/unmerged;
do not mark Issue #3 resolved or Phase 1 accepted from diagnostic or CI results.
