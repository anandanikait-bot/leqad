# Desktop startup formatting correction

## Confirmed cause and correction

The saved-progress screen used an unstyled `.resume-body`: default browser heading font/margins, no content inset, and no layout tying its footer to the window. At 365 × 600 its content started at the left edge and its actions floated above a large empty lower area. Loading reused `.load-warning`, presenting an ordinary startup read as a small error-colored message without a heading. Preference application also waited for the lesson read, so a slow lesson load kept startup at default text size instead of the saved 200% setting.

The fix uses the approved 16px content inset, Space Grotesk 20/26 heading scale, inherited Manrope, and existing palette and button styles. Resume actions sit in the normal footer position. Compact/enlarged layouts retain one whole-content scroller. Loading has a clear heading and neutral status text; saved display preferences apply when their read resolves, while lesson actions still wait for both reads. Heading focus, keyboard access and resume focus handoff are explicit. Already completed lessons retain the completion heading's existing focus behavior.

No official SVGs, fonts, lesson definitions, lesson controller, state transitions, persistence schema, native host/preload, CAD capabilities, extension or website files changed.

## Actual Windows before / after screenshots

These PNGs were captured in Electron 45 on **Windows Server 2025**, reconstructed from the CI test's bounded PNG log records, and verified against the SHA-256 recorded by the Windows process. The primary opened and visually inspected both sets. They use synthetic lesson/preferences in isolated temporary profiles, not the owner's profile or CAD content. This is genuine Windows application rendering, not Windows 10/11 owner acceptance or Onshape compatibility evidence.

| View                                              | Windows comparison                                         |
| ------------------------------------------------- | ---------------------------------------------------------- |
| Loading, 365 × 600, 100%, light                   | [Before / after](comparison-loading-365x600-100-light.png) |
| Saved progress, 365 × 600, 100%, light            | [Before / after](comparison-resume-365x600-100-light.png)  |
| Loading, 320 × 400, 200% requested, dark          | [Before / after](comparison-loading-320x400-200-dark.png)  |
| Saved progress and actions, 320 × 400, 200%, dark | [Before / after](comparison-resume-320x400-200-dark.png)   |

The baseline loading screenshot correctly shows 100% text despite a saved 200% preference, because that was the observed bug. The after screenshot shows the actual saved 200%. Other enlarged screenshots show different scroll positions so the heading/content and both actions can be inspected without shrinking or truncating text. Focus outlines are real keyboard focus states, not decoration.

### Capture provenance

[Per-image hashes and provenance](capture-provenance.json) distinguish the capture source from subsequent commits.

- Before: `10ec4911b416791617a222397ff98591f2c6e76d`, a tests/workflow-only commit whose production App/CSS matched `1fba5bd`. [Windows run 40587117569](https://github.com/anandanikait-bot/leqad/actions/runs/40587117569), [artifact 12772128805](https://github.com/anandanikait-bot/leqad/actions/runs/40587117569/artifacts/12772128805). Existing 70 desktop tests and 20 UI tests passed; all 16 new startup assertions failed as expected on the unchanged layout. This is RED evidence, not successful acceptance.
- After layout: `32d72b7a1ddb8de8b25a4f669af7d9cc798f598c`. [Windows run 40588357489](https://github.com/anandanikait-bot/leqad/actions/runs/40588357489), [artifact 12772917444](https://github.com/anandanikait-bot/leqad/actions/runs/40588357489/artifacts/12772917444). Clean-cache Electron install, 72 desktop tests and 36 UI tests passed. The complete startup matrix is in that artifact; six representative PNGs are included here.
- The final follow-up preserves existing summary-heading focus when resuming an already completed lesson and adds that regression. It does not alter the pictured loading/in-progress-resume layout. Final-head CI results are recorded in PR #19 rather than attributed to the earlier capture source.

Passing artifacts contain screenshots and a Playwright report. Traces are retained on failure only, when generated. The requested 200% is the application text setting, not an OS DPI claim.

## Targeted regressions

- Sixteen startup cases cover loading/resume × 365 × 600 / 320 × 400 × 100% / 200% × light/dark.
- Loading is held with a test-process-only delayed lesson IPC read after the host reinstalls its handlers on navigation. Preferences still use the real store/preload. No production delay or test hook was added.
- Checks measure actual heading inset, font family/size/line height, resolved theme background, rendered text-line bounds and coverage, footer position, full button bounds, one scroller, keyboard scrolling, Tab/Shift+Tab/Enter and visible focus.
- Unit tests prove loaded preferences can display without enabling lesson actions, and that resuming the saved step does not call the save API. Native tests compare the unchanged saved lesson record. A completed-saved-lesson case preserves its summary focus and progress.
- The original teaching, eight-step lesson, hint, evidence-label, contrast and persistence regressions remain.

The independent reviews found no material layout/scope problem. A review observation about resume landing on the menu is consistent with existing return navigation for in-progress lessons; completed lessons keep their existing summary-heading focus. The new regression reproduced and then protected the completed-focus case.

## Owner check

On Windows 10/11, inspect loading and saved recovery with your normal theme/text preferences. Check both sizes at 100% and 200%; Tab between Resume lesson and Start again, use keyboard scrolling and confirm resuming keeps the saved step or completed summary. OS DPI, Narrator and multiple monitors remain owner checks. Keep PR #19 draft/unmerged/undeployed and stop at Milestone 1.
