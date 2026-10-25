# Phase 1.5 Teaching Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after owner approval. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Polish the existing lesson panel with bounded inline help, honest evidence feedback, and a local-example-only Ask prototype.

**Architecture:** Retain `AssistantPanel` as the behavioral orchestrator. Extract only help presentation and the local Ask prototype; retain lesson context, action selection, and evidence summaries in the existing panel to avoid creating a second state machine. Use existing CSS, persistence, guidance callbacks, and browser fixtures.

**Tech Stack:** Existing WXT, React, TypeScript, CSS, Vitest/Testing Library, Playwright, pnpm. No new dependencies.

**Spec:** [Approved Phase 1.5 design](../specs/2026-10-24-phase-1-5-teaching-experience-design.md), approved at `b2e03e9ae5d0d9e03c20ec09d1dcb2cb17f643b2`.

**Authorization:** Planning only. All execution checkboxes remain unchecked until the owner approves this plan. No merge or deployment.

## Global constraints

- Preserve recognition, verification, lesson transitions, eight-step content, existing persistence schemas, and appearance/assistance preferences.
- Keep the marketing website separate; no website edits.
- Use the existing 365px default expanded width and viewport clamp, 280px collapsed width, and an 8px minimum viewport margin.
- Help cap: `min(240px, 30dvh)` and no more than remaining space; panel maximum `100dvh - 16px`.
- Use navy `#0E2943`, russet `#793327`, and ivory `#F5EFE7`; preserve approved logo geometry and Space Grotesk/Manrope usage, including dark/system themes.
- No new panel resize handle, dependencies, browser permissions, AI/network calls, screenshots collected from users, or model-data collection.
- No automatic CAD clicks, geometry inference, automatic advancement, or manufactured verification.
- Simulated test data/screenshots must be labeled fixtures; CI cannot establish live Onshape acceptance.
- Keep existing diagnostics opt-in and separate from ordinary lesson help.

## Review focus

1. Long objectives/recovery text at short heights or 200% enlargement: controls remain reachable without competing scrollbars (Task 4).
2. Document changes while help is open: close transient content without losing saved hints or retaining stale observations (Tasks 2–3).
3. Save failures while navigating/helping: preserve existing retry/error UI and persistence callbacks (Tasks 3, 6).
4. Disabled, paused, unknown, or previously completed steps: exactly one appropriate primary emphasis without changing permitted actions (Task 3).
5. Keyboard focus inside help when it closes or the step changes: predictable focus, no passive update focus theft, no hidden tabbables (Tasks 2, 4).

## File map and interfaces

Modify:

- `apps/extension/src/components/panel/AssistantPanel.tsx`: retain state/evidence/action owners; compose help, layout, and Ask.
- `apps/extension/src/styles/panel.css`: bounded layout, restrained styling, responsive fallback, focus treatment.
- `apps/extension/src/components/panel/AssistantPanel.test.tsx`: integrated regressions using existing fixtures/callback spies.
- `apps/extension/tests/e2e/fixture.tsx`: only minimal fixture state controls needed for repeatable visual cases, if existing hooks cannot express them.
- Existing E2E selectors only where the approved presentation changes; do not delete behavioral assertions.

Create:

- `apps/extension/src/components/panel/ContextualHelp.tsx` and `.test.tsx`: controlled disclosure and mutually exclusive content views.
- `apps/extension/src/components/panel/AskPrototype.tsx` and `.test.tsx`: typed local examples and read-only context, with no service/provider layer.
- `apps/extension/tests/e2e/phase15-ui.spec.ts`: layout, keyboard, lifecycle and screenshot coverage using the existing shadow-root fixture.
- `docs/reviews/phase-1-5/README.md`: baseline, result matrix, limitations, screenshot index and manual acceptance instructions.
- `docs/reviews/phase-1-5/screenshots/`: only deterministic, sanitized fixture screenshots for review.

Keep context/instruction/actions/evidence as semantic sections in `AssistantPanel`; a component per visual row is unnecessary. Do not move its recognition callbacks, reducers, session writes, or preference hook into presentation components.

## Task 1 — Baseline and reproducible review cases

**Files:** Existing panel/E2E tests (read); new review README and before screenshots.

**Consumes:** Approved spec and baseline code at `286ccb311a93ae3583d02e894b210cf1768251e3`; documentation commit `b2e03e9` does not change application behavior.
**Produces:** A repeatable case matrix and before artifacts used by Task 6.

- [x] Check current branch, remote PR head/comments and outstanding relevant issues once. If application changes landed after the audited baseline, reconcile affected files before proceeding. Use an isolated execution worktree per repository workflow; do not modify the unfinished website tree.
- [x] Inspect `v1-ui.spec.ts`, `settings.spec.ts`, `panel.spec.ts`, `reliability.spec.ts`, `fixture.tsx`, and `AssistantPanel.test.tsx` for existing initialization, storage and state controls. Reuse them rather than creating another application harness.
- [x] Run `pnpm exec vitest run --config vitest.config.ts apps/extension/src/components/panel/AssistantPanel.test.tsx apps/extension/src/components/panel/PanelSettings.test.tsx` and record the baseline result. Record pre-existing failures separately.
- [x] Capture before cases with the current fixture: desktop 1440×900; narrow viewport 320×720; expanded hint/explanation; collapsed panel; unable-to-verify; short viewport 1024×480. Use the same step/data/theme for paired after captures. Existing pre-redesign help is the before counterpart of expanded help.
- [x] Document exact fixture setup, viewport, theme, state, commit and capture command in the README. Exclude private page data and generated browser profiles. Commit only baseline review artifacts: `docs: record Phase 1.5 interface baseline`.

## Task 2 — Bounded progressive help component

**Files:** Create `ContextualHelp.tsx`, `ContextualHelp.test.tsx`; integrate in `AssistantPanel.tsx` and its test; CSS classes introduced here, sizing finalized in Task 4.

**Interfaces:** Export `type HelpSection = 'hint' | 'guidance' | 'why' | 'uncertainty'`. Export `ContextualHelp(props: ContextualHelpProps): React.JSX.Element` where props contain `open: boolean`, `section: HelpSection`, `onOpenChange(open: boolean): void`, `onSectionChange(section: HelpSection): void`, and `content: Partial<Record<HelpSection, React.ReactNode>>`. The component renders no action or persistence logic. `AssistantPanel` owns transient open/section state and passes existing controls/content as nodes.

- [x] Add failing component tests named `starts closed`, `shows only the chosen section`, and `Escape closes and returns focus`. Assert `aria-expanded`, missing hidden controls in tab order, one named scroll region, and no callbacks other than disclosure/section callbacks.
- [x] Run `pnpm exec vitest run --config vitest.config.ts apps/extension/src/components/panel/ContextualHelp.test.tsx`; confirm failures reflect absent behavior.
- [x] Implement the disclosure with native buttons, stable IDs/relationships, and one selected section. Escape is handled only inside open help; restore disclosure focus on Escape. Focus must not jump during passive content updates.
- [x] Integrate existing hints, explanation, recovery, native-search fallback and HINT/SHOW/GUIDE controls as content. Hint is the initial section. “More help” uses existing hint progression; opening a hint for the first time uses existing hint accounting, reopening does not increment it. Keep SHOW/GUIDE explicit and preserve unsupported-GUIDE text.
- [x] Add integration tests: opening help requests no highlight/check; subsequent hints preserve order and maximum; reopening retains current hint count; explanation switching does not alter guidance level; page identity change, step change, restart and collapse close transient help. Use existing in-memory page identity solely as a reset dependency; do not export/store it. Retain existing written-fallback lifecycle behavior outside help when required.
- [x] Run both new help and existing panel tests; update tests to open help before querying relocated controls, retaining original assertions. Commit `feat: add bounded progressive lesson help` after green results.

## Task 3 — Context, action hierarchy, and evidence feedback

**Files:** `AssistantPanel.tsx`, `AssistantPanel.test.tsx`, `panel.css`.

**Consumes:** Task 2 controlled help. Existing `describeProgress`, `outcomeLabel`, completion predicates, session state and handlers.
**Produces:** Named sections `Lesson context`, `Next action`, `Lesson help`, `Lesson progress`, and `Lesson actions`, with existing callback signatures unchanged.

- [x] Add failing regressions asserting a single visually primary eligible action in active acknowledgement, supported check, self-report, unknown/manual, paused/resume and completed/next cases. Assert disabled reasons and original Back/Next/Restart behavior remain intact. Use `within` for groups rather than selectors tied to copy layout.
- [x] Add an evidence matrix test covering NONE, ACKNOWLEDGED, SELF_REPORTED, UI_VERIFIED, MODEL_VERIFIED, UNKNOWN and NEEDS_CORRECTION. Assert literal “CAD work unverified” or existing equivalent for self-report, UI scope for UI verification, and no verified presentation for unknown/stale/ambiguous observations. Model-verified input is a labeled synthetic test only, not a new producer.
- [x] Run the panel test file and confirm the intended new hierarchy assertions fail before editing.
- [x] Reorganize markup into context, instruction, help, concise evidence and actions; retain calculations and handlers. Apply emphasis according to existing eligibility. Keep essential uncertainty outside help. Derive observed-action wording only from already available current supported observations; otherwise use waiting/unknown. Do not add an evidence normalizer that could strengthen outcomes.
- [x] Keep lesson-completion presentation qualified by the existing per-step outcomes. Preserve pause, resume, acknowledgement, self-report, retry and navigation. Focus the new step heading only after learner-initiated navigation, not on observer updates.
- [x] Test retained save failure/retry messages with help open, document switch without stale feedback, and saved session/preferences across remounts. Run panel and `apps/extension/src/services/progressStore.test.ts` tests; commit `refactor: clarify lesson context and evidence presentation` when green.

## Task 4 — Responsive layout and keyboard accessibility

**Files:** `panel.css`; new `phase15-ui.spec.ts`; minimal measurement/layout code in `AssistantPanel.tsx` if necessary.

**Consumes:** Task 3 semantic regions and Task 2 help.
**Produces:** One bounded ordinary help scroller and an explicitly tested single-scroller compact-height fallback.

- [x] Write browser tests at 1440×900, 320×720, 1024×480 and 320×360. With longest lesson help, assert panel within viewport margin, no horizontal overflow, context/actions visible at ordinary heights, and help `scrollHeight > clientHeight` without body scrolling. At compact heights assert help has no independent scroll and all controls are reachable through the body scroller.
- [x] Run `pnpm exec playwright test apps/extension/tests/e2e/phase15-ui.spec.ts` against existing fixture; record the layout failures before styling.
- [x] Implement flex/grid rows with `min-height: 0`, capped help and fixed context/actions at ordinary heights. Preserve width/clamping and use dynamic viewport height with a compatible fallback. Remove shell shadow, use existing theme tokens and spacing. Do not shrink text to pass bounds tests.
- [x] Determine compact mode from available space relative to measured non-help regions, allowing at least 96px for help. Use a single local `ResizeObserver` only if CSS cannot reliably implement this content-dependent condition; disconnect on unmount and avoid observer oscillation by measuring stable non-help regions. In compact mode use body scrolling with non-obscuring action placement; if the footer itself cannot fit, let it scroll into view rather than clip. No new persisted layout state.
- [x] Add browser assertions for keyboard reachability, Escape/focus return, no hidden collapsed tabbables, retained keyboard dragging, resize position clamp, passive updates not stealing focus, reduced motion, long recovery content, and light/dark/system themes. Check text/focus contrast against AA thresholds and record measured pairs.
- [x] Test real 200% browser zoom where available and 200% text enlargement/reflow. A smaller viewport or deviceScaleFactor alone is not proof of browser zoom; document any actual zoom check requiring owner validation. Check wheel behavior inside help and outside the panel, with no page-wide interception.
- [x] Run focused browser tests plus existing `panel.spec.ts`, `v1-ui.spec.ts`, and `settings.spec.ts`; commit `style: keep lesson context usable with expanded help` when green.

## Task 5 — Local contextual Ask prototype

**Files:** Create `AskPrototype.tsx` and `.test.tsx`; integrate only the existing Ask mode in `AssistantPanel.tsx`.

**Interfaces:** Reuse `GuidanceLevel` and the existing closed `GuidanceTargetId` type from `guidanceRegistry.ts`. Define local `AskPrototypeContext` with lesson ID/title, step ID/title, requested help level, supported target identity or null, and already-sanitized display summaries of current observations with explicit unknown state. Define `LocalExampleResponse` with `kind: 'LOCAL_EXAMPLE'`, a stable example ID, a question label, explanation, hint, evidence, and uncertainty strings. `AskPrototype({ context, examples }: { context: AskPrototypeContext; examples: readonly LocalExampleResponse[] }): React.JSX.Element`. Example selection is local component state; no free-form question endpoint, provider, transport, or persistence.

- [x] Add failing tests asserting persistent `Local prototype — no AI connected`, `Local example` on responses, explicit unknown evidence, deterministic example switching, and reset of selection on step/context change. Assert no fetch, check, highlight, or session-write callback is invoked.
- [x] Run the new Ask test file and confirm expected failures.
- [x] Implement a small authored example set drawn from existing approved lesson explanation/hints, including Corner Rectangle rationale on its relevant step. Show only the selected example. Read-only context must omit document identifiers and private page text; unavailable observations remain unknown. Do not derive evidence from the example prose.
- [x] Replace the existing Ask placeholder with the component. Add integration tests that Learn → Ask → Learn preserves step, hints, progress/preferences and existing highlight cleanup. Ensure the existing primary lesson action is not duplicated in Ask and examples do not mutate progress.
- [x] Run Ask and panel tests. Commit `feat: add explicitly local Ask teaching examples` when green.

## Task 6 — Full regression, screenshots, and review handoff

**Files:** `phase15-ui.spec.ts`, minimal fixture additions if needed, review README and screenshots; relevant existing tests retain assertions.

**Consumes:** Completed Tasks 1–5. **Produces:** Reviewed implementation, exact checks/CI report, paired screenshots and owner live-test instructions, not live acceptance.

- [ ] Add integrated eight-step browser coverage using existing fixture observations: ordered hints, manual completion, supported checks, unknown fallback, pause/resume, Back/Next/Restart, reload persistence, preferences and save-failure retry. Preserve existing Top/Sketch/Rectangle highlight tests and no-automation assertions.
- [ ] Run focused integration cases; investigate failures without modifying production recognition, verification, or persistence to accommodate UI tests. If a non-UI blocker appears, report it as a scope issue.
- [ ] Capture after images matching Task 1, plus local Ask and short-height fallback. Keep “before” artifacts immutable. Record screenshot commands, fixture provenance and revision. Manually inspect text clipping, primary action reachability, spacing, contrast and scrollbars; screenshots alone do not prove interactive behavior.
- [ ] Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm reference:test`, `pnpm reference:validate`, `pnpm test:e2e`, `pnpm build`, `pnpm build:edge`, and `pnpm package:browsers`. Record actual exit status/counts. Fix regressions and rerun affected checks, then the required delivery checks after final changes.
- [ ] Review the diff for accidental changes to recognition, verification, persistence schemas, permissions, branding geometry and website code. Check there are no network calls or falsely verified examples. Review accessibility and lifecycle regressions alongside screenshots.
- [ ] Commit `test: validate Phase 1.5 teaching experience`; update the appropriate unmerged review PR after implementation approval and run existing CI. Report exact commit, run link and downloadable Chrome/Edge artifacts. Do not claim CI passed until the run finishes successfully; report infrastructure failures explicitly.
- [ ] Deliver the audit, paired screenshot index, local Ask example, regression results and remaining owner checks: authorized Onshape lesson flow, SHOW, expanded help, drag/collapse, zoom/resize, document navigation, and reload. Stop for review; no merge or deployment.

## Plan self-review

- **Coverage:** Baseline/audit and before images: Task 1. Progressive help: Task 2. Lesson context/evidence/actions: Task 3. Responsive/accessible visual design: Task 4. Local Ask: Task 5. Complete regressions, after images, packages and live-test handoff: Task 6.
- **Architecture:** Existing orchestrator and callback ownership retained; only two presentation components added. No duplicated lesson state machine, provider framework, generalized layout engine or new persistence.
- **Correctness:** Help sections are distinct from HINT/SHOW/GUIDE. Existing evidence outcomes remain authoritative. Compact mode measures available space rather than shrinking content; optional measurement is confined to the panel.
- **Compatibility:** Existing fixture and pnpm scripts reused. CSS/selectors may change in tests only where presentation changed; safety assertions remain. Existing themes, approved assets, preferences and cleanup remain covered.
- **Complexity:** No component for every visual row, no new dependencies, no resize handle, no generalized chat protocol or standalone testing harness. Ask contracts remain local to its module until a later approved integration needs them.
- **Review-focus closure:** All five listed risks have explicit task-level tests. Actual zoom and actual Onshape behavior remain separately reported manual gates if unavailable locally.

Execution authorized by the owner after plan commit c89c358. Tasks 1–5 complete; Task 6 local checks and independent review complete. Hosted CI and owner live acceptance are recorded in the review handoff.
