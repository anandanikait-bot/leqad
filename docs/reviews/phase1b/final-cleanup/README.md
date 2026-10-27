# Milestone 1 final UI cleanup

## Confirmed corrections

- At 365 × 600 and 100% text, Ask's answer exceeded its clipped workspace without a user-scrollable surface. Ask now selects the existing single-workspace scrolling mode. The compact/enlarged-text whole-panel fallback remains unchanged. [Before](before-ask-365x600-100.png) · [After](after-ask-365x600-100.png).
- Completing step 8 removed the focused action without handing focus to the summary. The summary heading now receives focus, using the existing Settings heading pattern.
- Return to Learn and Review steps removed their focused buttons. Both now restore focus to the persistent lesson-menu control, matching Settings return behavior.

Each correction was reproduced with a failing native Electron keyboard regression before its fix. The Ask regression checks rendered answer bounds above the footer, keyboard PageDown scrolling, Tab/Shift+Tab order, focus outline, return focus, and unchanged lesson progress. The existing eight-step regression now also checks completion entry and review-return focus. No recognition or evidence classifications changed.

## Screenshot review

Native Linux Electron captures below were opened for visual inspection. Each sheet shows Settings, Ask, and Completion, with top and lower scroll positions. These are written-lesson application screens, not authenticated CAD observations or Windows 10/11 acceptance.

- [320 × 400, 100%](comparison-320x400-100.png)
- [320 × 400, 200%](comparison-320x400-200.png)
- [365 × 600, 100%](comparison-365x600-100.png)
- [365 × 600, 200%](comparison-365x600-200.png)

All twelve state/size/scale combinations were inspected for text extending horizontally outside the window, sequential header/status/navigation/body/footer bounds, and one active scrolling surface. Settings return focus, completion-heading focus and keyboard reachability of Review steps were checked at each size/scale. At normal size, Settings and Completion retain their existing internal scrollers; compact/enlarged layouts use whole-content scrolling. Text cut by a viewport edge is reachable by scrolling; essential instructions are not truncated or reduced in size. No palette, font, official SVG or CSS changes were made.

The successful clean-cache Windows installation at exact baseline source `0db10cdb342fc33dbeed08c6fa4307226bd4f31c` is documented in [the Windows testing guide](../../../testing/desktop-milestone1.md). New cleanup CI results and Windows screenshots are linked from PR #19, separately from that baseline. Passing Windows artifacts contain screenshots and the Playwright report; traces are retained only on failure when generated.

## Owner acceptance still required

On Windows 10/11, follow the fresh setup instructions including `pnpm exec install-electron`. At 320 × 400 and 365 × 600, check Settings, both local Ask answers and Completion at 100% and 200% text. Use keyboard scrolling and confirm visible focus through Settings return, Ask return, completion and Review steps. Confirm saved preferences/progress survive restart. Check Windows display scaling, Narrator and multiple monitors separately. Record PASS/FAIL/BLOCKED with the observed result. No CAD capture, recognition or native highlight capability is claimed in Milestone 1.
