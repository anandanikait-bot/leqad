# Desktop beginner copy review

The owner approved the desktop-only review at `201a30f`, with the final refinements applied here. This change updates presentation strings in the existing React components. It does not change the lesson engine, controller, IDs/version, stored records, outcomes, shared curriculum, browser extension, CSS, fonts, SVGs or desktop capabilities.

## What changed

- All eight steps use desktop-only headings, goals, actions, five ordered hints, common mistakes and recovery instructions.
- Why it matters stays inside the existing Help disclosure. Each explanation is one or two sentences, at most 40 words. Steps 1 and 4 are shorter; Step 8 explains how practice helps the learner remember tools and find where they get stuck.
- The fifth Top-plane hint gives manual list-scrolling guidance. No desktop copy promises Show me or automatic highlighting.
- The header says written lesson / no screen capture and asks the learner to follow along in Onshape. Progress says marked complete. The footer and summary distinguish the learner's report from checked work without repeating the same warning in every region or summary row.
- Ask remains an authored local prototype with no AI. It shows a readable step number instead of an internal ID. Settings and error messages use plain English.
- Independent review caught an inaccurate fresh-start guarantee in the approved draft. The final warning explains the existing behavior: if saving the fresh lesson works, it replaces prior progress; if saving fails, Leqad offers retry. No persistence behavior changed. A transient-read-failure regression covers that case.

## Screenshots

These are actual local Linux Electron captures of the written desktop UI, opened for visual review. They are not Windows 10/11 owner acceptance or live CAD evidence. At 200% text, the pictures show selected scroll positions in the existing whole-content fallback; content remains reachable rather than truncated.

| View                           | 365 × 600, 100%                                     | 320 × 400, 200%                                       |
| ------------------------------ | --------------------------------------------------- | ----------------------------------------------------- |
| Rectangle instructions         | [Normal](desktop-beginner-rectangle-365-100.png)    | [Enlarged](desktop-beginner-rectangle-320-200.png)    |
| Optional practice explanation  | [Normal](desktop-beginner-practice-why-365-100.png) | [Enlarged](desktop-beginner-practice-why-320-200.png) |
| Completion and evidence labels | [Normal](desktop-beginner-summary-top-365-100.png)  | [Enlarged](desktop-beginner-summary-top-320-200.png)  |
| Completion actions             | [Normal](desktop-beginner-summary-365-100.png)      | [Enlarged](desktop-beginner-summary-320-200.png)      |

The before-copy layouts are in [the previous review](../final-cleanup/README.md). The approved before/after wording remains in [the copy review](../../../superpowers/specs/2026-10-26-desktop-milestone1-copy-review.md). Current Windows Server CI screenshots and results are linked from draft PR #19 and are separate from these local captures.

The same four size/scale combinations were also inspected across Settings, Ask and Completion. All twelve cases had one active scrolling surface and no text outside the window horizontally; Settings return focus, completion focus and Review steps keyboard reachability passed.

## Regression evidence

- The new rendering test failed against the old instructions before the desktop catalog was bound. The native enlarged-text test also failed against the old built application. Both pass with the desktop copy.
- Component coverage walks all eight steps, all 40 hints, optional Why, mistakes/recovery and the original two acknowledgement / six self-report outcomes. It checks the shared definition is unchanged and no CAD command is called.
- Native Electron coverage walks every step and Help topic at 365 × 600 / 100% and 320 × 400 / 200%. It checks actual rendered lines, horizontal and vertical clipping ancestors, covered text, keyboard reachability/focus, font size, one scroller and the completion categories.
- Two negative controls intentionally clip and cover text in isolated Leqad test windows. Both failed against the weaker checker and pass with the stronger checks. They do not alter production styling or represent Onshape evidence.
- The existing eight size/text-scale cases, keyboard, pointer-hover contrast, persistence and lesson-summary navigation regressions remain.

Local validation passed 702 unit/component tests, including 70 desktop tests; the full native Electron suite passed 20 tests, and the final screenshot/guard subset passed four. Hosted CI results are reported against the exact pushed commit in PR #19.

## Owner review

Read the revised steps and Help in Windows 10/11. Check that a first-time learner can find Top, open Sketch, choose Corner Rectangle from its arrow, place two opposite corners, enter 40 mm and 30 mm with Dimension, and choose Finish sketch. Confirm the flat sketch / solid part distinction is clear. Check 320 × 400 with 200% text, Ask, Settings and completion with keyboard scrolling. This is a wording acceptance review, not a claim that Leqad observes CAD work. PR #19 stays draft and unmerged; Milestone 2 is not started.
