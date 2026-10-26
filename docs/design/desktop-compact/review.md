# Independent desktop design review

Date: October 25, 2026. Scope: design specification, static mockup source, and existing PR #17 pure overlay policy. No implementation, production tests, native host, or CAD inspection.

A separate reviewer agent reviewed the initial design, then reread the corrections. The primary agent rendered the boards and inspected the comparison and selected full-size PNGs. The reviewer found no fundamental conflict with PR #17's safety policy or architecture.

## Findings and disposition

| Finding                                                                                                                        | Severity       | Resolution                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SHOW/GUIDE controls and permission setup were absent from the initial help boards; request handoff/Cancel had no visual design | High           | Added board 16 for supported and permission-required help; board 17 for waiting/inspecting with Cancel. Deadline semantics explicitly separate ten-second handoff from the five-second observation ceiling.         |
| Collapse/minimize were grouped with Pause, creating contradictory lesson semantics                                             | Medium         | They cancel visual work but preserve prior lesson active/paused state. Explicit Pause is separate. Header collapse and native minimize are distinguished. Board 14 no longer labels every collapsed lesson Paused.  |
| Resume, acknowledgement, self-report, and final summary lacked approval surfaces                                               | Medium         | Added boards 18–19 and exact copy/transitions. Final Review steps retains progress; restart requires confirmation. Outcomes remain engine-driven.                                                                   |
| Native accessibility inspection had no explicit consent/time boundary                                                          | Medium         | Semantic control/tree inspection requires consent and occurs only within a bounded SHOW request. Binding liveness/foreground metadata is separately scoped. Consent now names both interface inspection and images. |
| Some compact controls were 32px despite the generic 40px rule                                                                  | Low            | Documented intentional 32px compact exceptions and 36px navigation; primary actions remain 40px. All must grow with text and meet target-size requirements.                                                         |
| Initial window list appeared preselected                                                                                       | Low            | Initial board now has no chosen window and Use selected window is disabled.                                                                                                                                         |
| Self-reported Step 4 board showed stale 3-of-8 progress                                                                        | Low, follow-up | Corrected to 4 steps / 50% after Mark done. The next step remains explicit.                                                                                                                                         |

The focused rereview reported no remaining material blocker in consent, timing, collapse, or completion behavior, and identified the progress-count mismatch corrected above.

## Primary visual QA findings

The permission-required detailed-help state initially left only 16px of help content. Applied the already specified single-body scroll fallback in that board. It now keeps all written guidance reachable without nested help scrolling. This is a static demonstration, not a production overflow implementation.

Removed a redundant implementation-oriented Retry explanation from the product panel and kept it in the board annotation. The default teaching state uses unavailable visual guidance honestly; hypothetical supported states are labeled outside the panel.

Rendered boards use the official circular logo without byte changes and actual locally bundled Manrope and Space Grotesk. All 12 opaque text palette pairs meet 4.5:1; minimum 6.884:1. This is token arithmetic, not comprehensive computed-style contrast, accessibility certification, or native Windows acceptance.

## Complexity and feasibility conclusions

Keep one teaching window and one passive overlay. Do not add a separate help window, chat service, dashboard, automatic updater, or generalized workflow layer. Component reuse requires removing extension service imports from portable presentation boundaries. Do not copy AssistantPanel's browser orchestration into Electron.

Capture providers, active-tab identity, reliable foreground/occlusion, coordinates, and native pass-through remain unimplemented feasibility gaps. The design intentionally falls back to written lessons when these cannot be established. No claimed desktop compatibility or recognition accuracy follows from these boards.

Owner approval is still required before implementation planning. The three-agent implementation team has not been started. No merge, PR creation, or deployment occurred.

## Official branding correction

The active design uses the official circular emblem and custom vector wordmark from `main` at `df1879e223b055583a0a8d150438483afebdb085`, governed by `docs/branding/official-logo.md`. Horizontal light/dark lockups occupy a 132 × 36 DIP object-fit box, aligned left in the existing 56px header. The collapsed header uses the 33 × 33 DIP symbol. No font-generated wordmark remains. All four SVG files retain exact source bytes. The older square asset is removed from the design pack. Layout, Settings, Help scrolling, SHOW deadlines, and completion navigation are retained.

## Final planning cleanup

Owner-requested changes are incorporated: main is the sole authoritative SVG source; Settings exposes stop/revoke, change window, reset position and report actions with one contextual Back; default expanded Help uses one body scroller when fewer than six text lines fit; completion provides a named keyboard-focusable region and visible scrollbar. SHOW deadlines are explicitly prototype parameters, with expiry, explicit retry and cancellation documented. No SVG bytes or production files changed.

Implementation planning inspected current remote main and PR #15/#17. PR #17's README conflict and PR #15's unmerged shared-engine changes are accounted for through a pinned stacked branch strategy without merging branches. The plan was self-reviewed for coverage, interface consistency, ownership and evidence gates. Three future implementers are restricted to GPT-6 Luna at max reasoning by the latest owner instruction. They have not been launched.

Final documentation QA: regenerated all 19 boards and comparison; retained all official asset hashes. Reused the existing Phase 1.5 computed/composited text contrast helper against the static panels: 387 samples, minimum 6.884:1. Keyboard End reached the completion region's full 187px scroll range while focus remained on that region; additional screenshot records the final entries. Settings places all four recovery actions before appearance preferences. Formatting and whitespace checks passed. These are static design checks, not native Electron or CAD acceptance.
