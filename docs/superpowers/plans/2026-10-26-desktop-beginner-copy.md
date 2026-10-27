# Desktop beginner copy implementation plan

> Use Superpowers executing-plans and test-driven-development. Implementation is approved by the owner.

**Goal:** Apply the approved desktop-only copy from `201a30f` with the owner's final refinements.

**Architecture:** A typed desktop presentation catalog keyed by existing step IDs supplies display text only. Existing React components render it without changing the shared curriculum, controller, stored records, component structure or CSS.

**Spec:** `docs/superpowers/specs/2026-10-26-desktop-milestone1-copy-review.md`, plus the owner's final approval and refinements.

## Constraints and review focus

Preserve all eight steps and five ordered hints each, three course objectives, accurate tool names, two opposite Corner Rectangle clicks and 40 mm × 30 mm. Why it matters remains optional inside Help; explanations are generally one or two sentences. Step 8 explains the value of practice. Top hint five gives manual troubleshooting. Avoid repeating verification disclaimers in header/progress/footer/Help. Preserve acknowledgement versus self-report, unavailable AI/capture/recognition, shared source bytes, IDs/version, transitions, persistence, branding, fonts, CSS and layout. Keep PR #19 draft and unmerged, stop at Milestone 1.

Review for shared-copy leakage, false checked outcomes, optional explanations exposed by default, shortened text losing CAD details, and enlarged-text overflow or unreachable controls.

## Task 1. Desktop catalog and lesson bindings

- [x] Add failing `desktopCopy.test.ts` assertions for eight entries, five hints, short optional explanations, practice rationale, manual Top recovery, CAD details, and display-only fields.
- [x] Add an App regression that walks every step and all hint levels, checks optional Why disclosure and records the original outcome categories.
- [x] Run tests and confirm RED before implementation.
- [x] Add `desktopCopy.ts` and use it only in LessonWorkspace, ContextualHelp, AskLocal and CompletionSummary. Keep lessonController unchanged.
- [x] Run focused tests, preserve shared engine and storage regressions.

## Task 2. Remaining desktop messages

- [x] Update existing wording assertions before changing App/Settings/Ask/status strings; confirm RED.
- [x] Apply approved labels/messages, reduce repeated warnings, keep all conditions and actions unchanged.
- [x] Verify acknowledgement, self-report, errors/retry, local-only Ask, summary, settings and focus tests.

## Task 3. Native layout, review and delivery

- [x] Add native Electron checks for all eight steps and Help topics/hints at 320 × 400 and 200%, text/control bounds, one scroller, keyboard access and honest completion labels. Preserve existing eight size/scale cases.
- [x] Update existing desktop test locators for accepted wording without weakening behavior assertions.
- [x] Run full affected local tests, formatting/lint/typecheck and shared/reference regressions. Build and package Chrome/Edge unchanged.

Hosted General and Windows CI results are recorded in PR #19 for the pushed source commit.

- [x] Capture and visually inspect screenshots; independently review the complete diff.
- [x] Prepare the reviewed commit and screenshots for the existing PR #19 branch. Report hosted CI results and owner limitations in the handoff. No merge/deploy or Milestone 2.
