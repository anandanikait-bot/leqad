# Issue #3: Rectangle diagnostic v3 capture handoff

## Scope and evidence

The [latest evidence review](https://github.com/anandanikait-bot/leqad/issues/3#issuecomment-6204552463)
found a diagnostic coverage gap, not a justified production selector change.
The actual Rectangle v1 report had an incomplete 6,000-element baseline and
UNKNOWN menu state. It observed three label strings and an unlabeled SVG input
path, without proving which command handled the input or which tool was selected.
The separate `leqad-recognition/3` semantic-tree report cannot establish a Top-plane
regression or a Rectangle result.

This workflow fix starts at PR #5's `b961636dd94d716036f5c3212271c9402fd5ea36`
and targets its branch for a separate stacked review. Task A's Corner Rectangle teaching
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

## One owner capture session

1. Manually enter Sketch editing and select Step 4. Start with the Rectangle
   dropdown **closed**. Note browser/version, zoom, and tested commit separately.
2. Choose **Enable recognition diagnostics** → **Capture Rectangle interaction**
   once. Within 20 seconds, manually open the actual Rectangle dropdown arrow.
3. **Do not return to Leqad while the menu is open.** Manually click **Corner
   rectangle** in Onshape. Normal clicks remain under your control. The recorder
   waits for this exact allowlisted variant click even if menu state stays UNKNOWN.
4. After selection, choose **Copy Rectangle dropdown report**, or copy the
   read-only output if clipboard access fails. Save it locally as
   `rectangle-interaction.json` and review it before sharing. Do not commit live
   reports to GitHub. No URLs, IDs, credentials, HTML, screenshots or private CAD
   content are needed.
5. Separately report: did the menu open, did Corner Rectangle actually activate,
   and did its toolbar icon change? The diagnostic cannot establish activation.
   Also report browser version and zoom and any premature cancellation.
6. With no option click, wait for timeout and copy the partial report. If cancelled,
   copy its report with `cancelReason`; do not assume what caused it. Explicit
   **Cancel Rectangle capture** also preserves a copyable cancelled report.

The old manual document snapshots remain an optional user-reported fallback, not
part of this workflow. Do not interrupt an open menu to take them. They cannot
prove the opening-to-selection relationship and may still hit the global scan bound.

The new `OPEN_THEN_SELECT_RECTANGLE` mode never completes merely because an
opening mutation occurred. It records the opening input separately, flushes its
pending mutations before attributing another input, and captures the option click
before the host handler can remove the menu. Report readiness follows the handler;
no CAD click is generated. Repeated opener clicks, unrelated sibling controls,
and conflicting path names do not count as option clicks. When a nonsemantic
option cannot be separated from the originally named opening branch, capture
remains uncertain and waits for timeout rather than guessing. A click-only keyboard activation is supported; raw keys
are not exported. Focus changes and ordinary menu dismissal do not cancel.

## Reading the v3 report

- `interactionMode: OPEN_THEN_SELECT_RECTANGLE` identifies the new panel workflow.
  The existing `OBSERVE_MENU` API mode is retained for compatibility; the panel
  no longer uses its one-transition completion behavior.
- `workflowState` and bounded `stateHistory` distinguish IDLE →
  WAITING_FOR_MENU_OPEN_INPUT → MENU_INTERACTION_OBSERVED →
  WAITING_FOR_VARIANT_CLICK → VARIANT_CLICK_OBSERVED → FINISHED. These are
  recording stages, **not** claims that the menu opened or the tool activated.
  Other terminal stages are TIMED_OUT and CANCELLED. Four interactions or four
  transitions are safety limits: reaching a limit finishes INCOMPLETE, potentially
  before a variant click; FINISHED alone does not imply a complete workflow.
- `cancelReason` is null except for CANCELLED: USER_STOP, REPLACED,
  PANEL_UNMOUNT, PAGE_HIDDEN, NAVIGATION, CONTEXT_CHANGED or UNKNOWN.
  It records the cancellation caller, never a retrospective inference. The prior
  owner's CANCELLED report does not identify its cause. Hidden tabs, navigation
  and extension teardown still cancel and remove all observation hooks.

- `version: leqad-rectangle-dropdown/3` explicitly changes the output contract.
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
  up to 64 nodes/64 characters, including empty wrappers. Export reductions prioritize distinct post-input option labels over repeated
  pre-snapshots, and may shorten input paths with explicit `pathTruncated` and
  null `clickPathMatchesInput`. CANCELLED/TIMED_OUT remain terminal statuses
  even when export trimming is needed. Export reductions and inspection limits
  are flagged; never reinterpret INCOMPLETE as absence.
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
