# Foundations live acceptance — new October 15, 2026 run

**Status: BLOCKED — owner-run testing has not occurred for this delivery.**
This is a new run, separate from the preserved
[historical acceptance report](phase1-live-acceptance.md). Earlier owner-reported
Top success does not establish current compatibility and does not prevent new
tests. Do not replace these results with fixture or CI outcomes.

## Setup and identification

Use an authorized disposable Onshape workspace in **regular Chrome or Edge**.
The independent recorder uses an extension-disabled profile and cannot test Leqad.
Install the actual tested package using the [setup instructions](../live-setup.md).
Keep one enabled Leqad installation and reload the Onshape page after updating it.

Before testing, record date/tester alias, full commit SHA, successful Actions run
URL, artifact ID, inner ZIP filename/hash, browser/version and operating system.
Use one copy of the table for **Chrome** and a separate copy for **Edge**. Record
the tested commit and browser on every result (the columns below are deliberately
unfilled until the owner chooses the actual downloaded build).

Do not export credentials, cookies, tokens, account details, document URLs/IDs or
private CAD content. A brief sanitized observation is sufficient.

## Results (repeat for each browser)

Every row requires PASS, FAIL or BLOCKED and a short observed result. A missing
control may correctly trigger a fallback but does not pass that control's live
recognition test; record which behavior worked and which remains unverified.

| Case                         | Manual action / expected result                                                                               | Result  | Browser/version | Tested commit | Observed result                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ------------- | ------------------------------------------------------------ |
| Installation                 | Load extracted folder containing manifest.json; extension enabled without errors                              | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Panel                        | Exactly one panel; drag, keyboard move, collapse/expand; Onshape still usable                                 | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Step 1                       | Read introduction/Why; Got it then Next; ACKNOWLEDGED only                                                    | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Step 2 / Top                 | Expand Default geometry; Show me targets only Top plane, never Top view; manually select                      | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Step 3 / Sketch              | SHOW targets Sketch or gives honest fallback; manually enter Sketch; active-context copy updates              | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Calibration/manual mode      | If needed, calibrate/save/SHOW; approximate label shown; manual mode report never completes step              | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Step 4 / Rectangle           | HINT/SHOW Rectangle; manually draw; GUIDE limitation explicit; completion SELF_REPORTED                       | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Step 5 / Dimension           | HINT/SHOW Dimension; manually enter 40 mm × 30 mm; values remain unverified                                   | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Step 6 / Finish              | HINT/SHOW Finish; manually finish; committed geometry not certified                                           | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Step 7                       | Explain sketch versus solid, Why/hints; ACKNOWLEDGED only                                                     | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Step 8                       | Perform independent practice; self-report remains unverified                                                  | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Help switching               | SHOW → HINT → GUIDE → HINT; one outline maximum; unsupported GUIDE explains fallback                          | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Wrong plane                  | Intentionally choose Front/Right; use recovery to reselect Top without restarting lesson                      | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Wrong tool                   | Choose an unrelated sketch tool; use I'm stuck/Why to recover to Rectangle                                    | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Missing/disabled/ambiguous   | Hide toolbar or open conflicting UI; safe fallback, never highlight arbitrary matching text                   | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Movement/replacement/expiry  | Scroll or change UI after SHOW; outline tracks valid row or clears; expires within five seconds               | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Click-through                | Click the real highlighted control manually; no blocked click or automatic CAD action                         | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Pause/reload                 | Pause middle step, reload, resume; same position/hints/self-report restored                                   | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Save recovery                | If warning appears, keep page open and retry before reload; no fabricated save success                        | BLOCKED | Not run         | Not tested    | Owner test pending; do not force storage failure on real CAD |
| Back/restart                 | Back keeps recorded learning status; restart resets lesson and clears guidance                                | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Document/workspace switching | Use disposable contexts, browser back/forward; no transferred model progress, duplicate panels or old outline | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Read-only/unsupported        | Version/read-only context never becomes editable; unsupported routes remove old panel                         | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Zoom 80%                     | Panel reachable, keyboard focus visible, semantic outline aligned, stale calibration rejected                 | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Zoom 100%                    | Repeat panel/highlight/click-through checks                                                                   | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Zoom 125%                    | Repeat panel/highlight/click-through checks                                                                   | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Zoom 150%                    | Repeat panel/highlight/click-through checks                                                                   | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Reduced motion               | With OS reduced-motion enabled, no animated outline movement; controls remain usable                          | BLOCKED | Not run         | Not tested    | Owner test pending                                           |
| Verification boundary        | Highlights, UI transitions and self-reports never claim verified CAD geometry                                 | BLOCKED | Not run         | Not tested    | Owner test pending                                           |

Initial totals per browser: **PASS 0 / FAIL 0 / BLOCKED 28**. Conditional storage
failure recovery can remain BLOCKED when no failure is encountered; the automated
failure test is separate evidence. Any required live case still FAIL or BLOCKED
keeps Phase 1 acceptance incomplete. Owner approval is required before merging.

For a failure, record the case, browser/build, short reproduction, expected and
observed behavior. Do not guess selectors from appearance. Retest fixes with a new
identified build and preserve this run's results.
