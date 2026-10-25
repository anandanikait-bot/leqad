# Phase 1.5 teaching experience review

All screenshots and browser states here are deterministic extension fixtures, not authenticated Onshape evidence.

Baseline application: `286ccb311a93ae3583d02e894b210cf1768251e3`; approved spec `b2e03e9`, plan `c89c358`.

Before screenshots use `/fixture.html?unknown-permission=1`, light theme, initial step; help opens I’m stuck, uncertainty advances to step 2 with unknown permission. Sizes: desktop 1440×900, narrow 320×720, short 1024×480. Collapsed and expanded help use desktop size. Captured with Playwright and local Chromium before product edits. Baseline panel/settings: 88 tests passed.

Implementation and validation results will be recorded below.

## Implementation

`AssistantPanel` retains existing lesson, recognition, guidance, evidence, session and preference ownership. Two presentation components were added: controlled `ContextualHelp` and deterministic `AskPrototype`. There are no production recognition, verification, storage-schema, permission, dependency, logo-geometry or website changes.

Help defaults closed. Opening requests the first existing hint and records hint usage; reopening does not increment it. Detailed guidance retains explicit HINT/SHOW/GUIDE requests, including unavailable-action explanations. Only one help topic is displayed. Important uncertainty and guidance fallbacks remain outside the disclosure. Next gets primary emphasis only when permitted; the original action callbacks and progression gates are retained.

Ordinary viewports cap help at `min(240px, 30dvh)`. Short/narrow screens use one body scroller. A single cleaned-up ResizeObserver enables the same fallback when content enlargement or long context makes the desktop layout clip. It also protects closed help; no layout state is persisted. The fallback is latched until a viewport/help/step lifecycle change to avoid oscillation.

Ask is labeled “Local prototype — no AI connected”; each selected response says “Local example”. The read-only context uses existing lesson/evidence summaries, fixed supported target identities and explicit uncertainty. Examples never call a service or completion/highlighting callback, and questions are not logged or persisted.

The shell uses approved navy `#0E2943`, russet `#793327` and ivory `#F5EFE7`, with existing dark/system preferences. Font stacks name Manrope and Space Grotesk with system fallbacks. This repository has no bundled font files; tests check declared stacks, not guaranteed rendering of those faces on every machine. No external font request was introduced. Decorative shell shadow removed; official SVG geometry unchanged.

## Visual comparison

| Fixture state                          | Before                                            | After                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop 1440×900                       | [Before](screenshots/before-desktop.png)          | [After](screenshots/after-desktop.png)                                                                                                |
| Narrow 320×720                         | [Before](screenshots/before-narrow.png)           | [After](screenshots/after-narrow.png)                                                                                                 |
| Expanded help                          | [Before](screenshots/before-help.png)             | [Desktop](screenshots/after-help-desktop.png), [narrow](screenshots/after-help-narrow.png), [short](screenshots/after-help-short.png) |
| Collapsed                              | [Before](screenshots/before-collapsed.png)        | [After](screenshots/after-collapsed.png)                                                                                              |
| Unable to establish editing capability | [Before](screenshots/before-unable-to-verify.png) | [After](screenshots/after-unable-to-verify.png)                                                                                       |
| Short 1024×480                         | [Before](screenshots/before-short.png)            | [After](screenshots/after-short.png)                                                                                                  |
| Ask prototype                          | Existing placeholder                              | [Local example](screenshots/after-ask-local-example.png)                                                                              |

The capability-unknown screenshots show the manual/unverified continuation path, not a fabricated failed model check. Before images are immutable baseline captures. After images were regenerated after the independent review fixes. At short heights, scrolling to the footer is intentional; all controls are reachable. Screenshots do not establish keyboard behavior or real CAD acceptance.

Reproduce after captures with the existing fixture server at port 4173:

```sh
pnpm --filter @leqad/extension exec vite --config tests/e2e/fixture-vite.config.ts --host 127.0.0.1 --port 4173 --strictPort
# In another terminal:
node docs/reviews/phase-1-5/capture.mjs
```

## Independent review

A fresh reviewer inspected code and Chromium fixtures. Findings corrected with regressions:

1. 200% text enlargement could hide navigation with help closed: the fallback now inspects body overflow too.
2. HINT from Detailed guidance could leave its text hidden: it now selects Hint and moves keyboard focus to the response region.
3. Detailed guidance was empty on informational steps: it now retains their existing written instruction.
4. A test-edit loop accidentally repeated only help opening: braces restore repeated SHOW calls and the one-overlay assertion inside every iteration.

No new evidence-strengthening or persistence-schema issue was found. The existing lack of bundled fonts is documented above. Actual browser zoom and authenticated Onshape acceptance remain unverified.

## Owner acceptance and installation

Use the newly tested Chrome package from this PR's CI artifact (or `apps/extension/.output/leqadextension-0.1.0-chrome.zip` after the commands below). Extract it into a new folder in Windows File Explorer. In a regular Chrome profile, open `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose the extracted folder containing `manifest.json`. Disable the previous Leqad instance first. Use the equivalent Edge package with `edge://extensions` for Edge. The independent recorder runs with extensions disabled and is not this product test.

In an authorized disposable Onshape Part Studio, record PASS, FAIL or BLOCKED and a short observation for each:

- One panel loads; current lesson/step/objective/progress remain readable.
- All eight steps, Back/Next, pause/resume and restart retain expected behavior and honest outcome labels.
- Help opens one topic at a time; long content scrolls; primary controls remain visible when space permits and reachable in compact fallback.
- Existing Top/Sketch/Rectangle SHOW highlights or abstains as before; GUIDE remains gated by existing evidence and never clicks controls.
- Keyboard Help/Escape, movement and collapse work; dark/system settings and reduced motion remain usable.
- Browser resize, actual 200% Chrome zoom and narrow workspace keep every control reachable.
- Ask stays labeled local; examples produce no CAD actions or completion changes.
- Reload retains lesson progress/preferences; changing documents clears stale transient help/highlights.

Do not export credentials, session files, private CAD data or document identifiers. Report only the interface result and sanitized observations. Keep PR #15 draft, open and unmerged pending owner review; no deployment is authorized.

## Final local validation

- Formatting, lint and TypeScript: PASS.
- Unit/component tests: **632 passed** across 38 files.
- Independent reference tests: **45 passed**. Integrity validator passed with **zero approved captures**; no live evidence is implied.
- `pnpm test:e2e --workers=2`: **82 passed, one skipped** (83 total). The existing managed-Chromium unpacked-extension installation case was skipped locally; fixture browser tests passed. Hosted CI must establish its own result for the packaged-extension case.
- `pnpm build`, `pnpm build:edge`, `pnpm package:browsers`: PASS. Chrome and Edge ZIPs generated from the final application code.
- New coverage: **10 unit/component cases** and **seven Phase 1.5 browser cases**. Existing behavioral assertions retained, with explicit help opening for relocated controls.
- Browser coverage includes 320×360, 320×720, 1024×480 and 1440×900, plus existing 100/125/150% effective-zoom/theme fixtures and a new 200% text-enlargement case. Text enlargement and effective viewport checks do not prove actual browser zoom.

Commands ran at the delivery boundary, with no production edits afterward. Source commit and CI/artifact links belong to the PR handoff so the report does not copy hashes from older packages.
