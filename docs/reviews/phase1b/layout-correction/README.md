# Desktop enlarged-text correction

The baseline screenshot was reproduced locally in Electron at 320 × 400 and 200% text before the fix. The regression failed because session and navigation text escaped their measured regions. The original test checked scrolling but not text/region containment.

[Before](before-320x400-200.png) · [After](after-320x400-200.png). These checked-in images are Linux Electron captures. Current Windows Server 2025 screenshots are in the Windows workflow artifact linked from PR #19. Neither is Windows 10/11 owner acceptance.

The fix prevents chrome flex-shrink and uses one whole-panel scroller in short/narrow or enlarged-text layouts. Inner scrollers are disabled in that fallback. Normal desktop text retains the existing internal layout where it fits. Text scale, SVGs and palette are unchanged.

Eight native regressions cover 365 × 600 and 320 × 400 at 100%, 125%, 150% and 200%. Checks include text-line containment, sequential region bounds, unmodified computed text size, full viewport/clipping-ancestor containment after scrolling, unobscured controls and keyboard focus. Numeric bounds use a one CSS pixel rounding tolerance instead of an IntersectionObserver ratio, which rounded below 1 despite full containment. Only one vertical scroll surface may exist.

Local validation: focused 8/8; full desktop Electron 15/15; desktop unit/component 65/65; typecheck, lint, format and desktop build passed. The primary visually inspected before/after 320 × 400 at 200%. Windows clean-cache installation and updated CI results are recorded in PR #19 after the runs finish, not inferred from these local checks.

Windows artifacts contain screenshots and the Playwright HTML report on success. Traces are retained only for failures under retain-on-failure and only when generated. Historical successful runs at e7e8dd1 are recorded separately in the testing guide; they do not prove this correction.

Owner checklist: use a fresh Windows 10/11 setup including install-electron; exercise both sizes at all four text sizes; scroll from header to final action with keyboard; confirm visible focus and no overlap; test Help, Settings Back, local Ask, save/reload and completion review; record PASS/FAIL/BLOCKED and observed result. DPI scaling, Narrator and multiple displays remain separate manual checks.
