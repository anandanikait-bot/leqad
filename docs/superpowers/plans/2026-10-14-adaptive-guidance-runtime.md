# Adaptive Visual Guidance Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed, student-controlled HINT/SHOW/GUIDE runtime for the existing Sketch, Rectangle tool-group, Dimension, and Finish Sketch targets without changing CAD verification.

**Architecture:** A closed local registry validates action requests and maps each action to existing target recognition, context, content, and supported levels. A separate state runner uses injected recognition/highlight/observation functions; the panel persists the selected help level. The production Rectangle GUIDE recipe remains unavailable until the owner supplies authenticated Onshape dropdown evidence; a test-only simulated recipe proves the runner.

**Tech Stack:** TypeScript, React, Vitest, Playwright, WXT, existing semantic target highlighter.

**Spec:** [`docs/superpowers/specs/2026-10-14-adaptive-guidance-design.md`](../specs/2026-10-14-adaptive-guidance-design.md)

## Global Constraints

- Guidance requests use version `1` and the closed levels `HINT`, `SHOW`, and `GUIDE`.
- The learner performs every CAD action; the runner never calls `.click()` or dispatches input events.
- A guidance result, UI transition, or highlight never updates lesson completion or model evidence.
- The runner contains no DOM selector or DOM traversal; it calls injected registry-backed host functions.
- `rectangle-tool-group` is distinct from any individual Rectangle variant. No variant target is registered before a real Onshape capture confirms it.
- Reuse the current single pointer-events-none highlight with its reduced-motion handling and lifecycle cleanup.
- Preserve HINT support for validated general toolbar-area targets through closed registry identities.
- Reuse the existing five-second highlight expiration. Replace or clear the prior highlight and its timer on each guide transition; clear it immediately on pause, collapse, step change, navigation, target removal, menu close, retry, cancellation, or replacement. Do not implicitly renew highlights; a learner may explicitly retry.
- Keep the existing Top-plane resolver/highlight path unchanged.
- Missing, ambiguous, closed, or timed-out targets clear temporary state and return to written instructions with an explicit reason and user-controlled Retry.
- Registered wait steps are bounded to 10 seconds; each wait timeout returns to the written instruction and requires a manual Retry.

## Review Focus

- An already-open menu must skip the trigger/open wait; a keyboard-opened menu must advance through the same observed-state path as a pointer-opened menu. Test both in `guidanceRunner.test.ts`.
- A changed Rectangle tool selection may finish a guidance observation but must clear its highlight and never update lesson completion; HINT/SHOW/GUIDE never changes lesson outcomes. Test `SELECTED` handling and unchanged session state in `guidanceRunner.test.ts` and `AssistantPanel.test.tsx`.
- Missing and duplicate/ambiguous controls must never select a global first match. Test typed fallback and overlay cleanup in `guidanceRunner.test.ts` and `AssistantPanel.test.tsx`.
- A close or timeout while waiting must remove timers and subscriptions before offering Retry. Test exactly-once cleanup and stale callback rejection in `guidanceRunner.test.ts`.
- Old preference records without a selected help level must load as HINT without losing position, collapse, or onboarding state. Test migration in `progressStore.test.ts`.

---

## Files and Responsibilities

- Create `apps/extension/src/services/guidanceRegistry.ts` for the closed request schema and local action definitions.
- Create `apps/extension/src/services/guidanceRegistry.test.ts` for request, context, level, and identity validation.
- Create `apps/extension/src/services/guidanceRunner.ts` for lifecycle and state transitions behind injected host interfaces.
- Create `apps/extension/src/services/guidanceRunner.test.ts` for deterministic runner transitions with a simulated host.
- Modify `apps/extension/src/services/progressStore.ts` and its tests to persist the selected help level with a HINT default.
- Modify `apps/extension/src/components/panel/AssistantPanel.tsx`, its tests, and `apps/extension/src/styles/panel.css` for explicit level selection and fallback/retry copy.
- Modify `apps/extension/entrypoints/onshape.content.tsx` only to connect the registry/runner to existing highlighter and observers; it must not add Rectangle selectors.
- Modify `apps/extension/tests/e2e/fixture.tsx` and `apps/extension/tests/e2e/panel.spec.ts` for simulation-only browser coverage.

### Task 1: Define the typed guidance registry

**Files:**

- Create: `apps/extension/src/services/guidanceRegistry.ts`
- Test: `apps/extension/src/services/guidanceRegistry.test.ts`

**Interfaces:**

- Produces `GuidanceLevel`, `GuidanceActionId`, `GuidanceTargetId`, `GuidanceUiContext`, `GuidanceRequest`, `GuidanceActionDefinition`, `GuidanceRegistry`, `validateGuidanceRequest(value: unknown): GuidanceRequest | null`, and `guidanceActionForSemanticTarget(target: string | null): GuidanceActionId | null`.
- `GuidanceActionId` is exactly `'sketch' | 'rectangle-tool-group' | 'dimension' | 'finish-sketch'`.
- `GuidanceTargetId` is a closed union of explicitly registered identities. It includes `rectangle-tool-group` as the group identity. Do not use a template-string variant type or accept arbitrary Rectangle variant identifiers. Add a specific variant identifier and production registry entry only after authenticated evidence confirms that exact variant. A clearly named simulated variant may exist only in the test-only registry. The compatibility adapter may call the existing `SemanticTargetId` `'rectangle'` for legacy SHOW behavior, but that does not assert an exact Onshape group or variant match.
- Each definition has `actionId`, `targetId`, `requiredContext`, `supportedLevels`, local `hintContentId`, and optional `guideRecipeId`. It has no lesson-completion or model-evidence field.
- For this first release, each production action supports HINT and SHOW; GUIDE is unavailable unless that action has a validated registered recipe. No production Rectangle GUIDE recipe exists before the authenticated capture.
- Required contexts are `PART_STUDIO` for Sketch and `SKETCH_EDITING` for Rectangle tool group, Dimension, and Finish Sketch.

- [ ] **Step 1: Write failing registry tests** for exact registered IDs, separation of group and variant identities, required context, supported levels, and rejection of extra keys, selectors, scripts, and unknown variants.
- [ ] **Step 2: Run the focused registry test** with `pnpm exec vitest run apps/extension/src/services/guidanceRegistry.test.ts --config vitest.config.ts`; confirm it fails because the registry is absent.
- [ ] **Step 3: Implement the closed registry and runtime validator.** Keep `rectangle-tool-group` as its own action/target ID; the compatibility adapter may route legacy SHOW through the existing `rectangle` semantic target without adding a selector or registering a variant. Treat that legacy path as compatibility behavior, not evidence of a validated group/variant. Keep production GUIDE unsupported until live capture.
- [ ] **Step 4: Run the focused registry test** and confirm all validation and registry assertions pass.
- [ ] **Step 5: Commit** as `feat: define typed guidance registry`.

### Task 2: Implement the separate guide runner

**Files:**

- Create: `apps/extension/src/services/guidanceRunner.ts`
- Test: `apps/extension/src/services/guidanceRunner.test.ts`

**Interfaces:**

- Consumes Task 1 request and registry types.
- Produces `GuidanceObservedState = 'OPEN' | 'CLOSED' | 'SELECTED' | 'UNKNOWN'`, `GuidanceRunStatus = 'IDLE' | 'READY' | 'WAITING' | 'UNSUPPORTED' | 'MISSING' | 'AMBIGUOUS' | 'TIMED_OUT' | 'FALLBACK' | 'CANCELLED'`, `GuidanceRunnerHost`, and `createGuidanceRunner(host, registry = GUIDANCE_REGISTRY): GuidanceRunner`.
- `GuidanceRunnerHost` exposes only `getContext()`, `resolveTarget(targetId)`, `highlightTarget(targetId)`, `clearHighlight()`, and `observe(observationId, onState)`; `observe` returns `{ current, unsubscribe }`. Registry injection is internal and used by tests for a clearly simulated Rectangle recipe; it is never part of `GuidanceRequest`.
- `GuidanceRunner` exposes `request(request)`, `retry()`, `cancel()`, and `dispose()`; `request` never accepts selectors, arbitrary recipes, DOM nodes, or callback code from the caller.

- [ ] **Step 1: Write failing tests** for supported HINT/SHOW, unsupported GUIDE, already-open skip, open transition after a simulated keyboard action, SELECTED after a simulated tool change, missing and ambiguous targets, close-while-waiting, timeout, Retry, and disposal.
- [ ] **Step 2: Run the focused runner test** with `pnpm exec vitest run apps/extension/src/services/guidanceRunner.test.ts --config vitest.config.ts`; confirm the tests fail before implementation.
- [ ] **Step 3: Implement the runner state machine.** On every new request or Retry, dispose the prior timer/subscription/highlight before resolving context and state. If the menu is already OPEN, skip its trigger/open-wait steps. Treat keyboard and pointer transitions identically once the observer reports OPEN. A `SELECTED` observation clears the highlight and ends guidance without changing lesson state. Route missing, ambiguous, unexpected CLOSED, timeout, or unsupported states to `FALLBACK`, clear transient effects, and expose the static written instruction and Retry affordance.
- [ ] **Step 4: Run focused runner tests** with fake timers and assert each cleanup callback runs exactly once, stale observation callbacks cannot advance a replacement run, and SELECTED does not invoke any lesson/session callback.
- [ ] **Step 5: Commit** as `feat: add deterministic guidance runner`.

### Task 3: Add stored assistance level and panel controls

**Files:**

- Modify: `apps/extension/src/services/progressStore.ts`
- Test: `apps/extension/src/services/progressStore.test.ts`
- Modify: `apps/extension/src/components/panel/AssistantPanel.tsx`
- Test: `apps/extension/src/components/panel/AssistantPanel.test.tsx`
- Modify: `apps/extension/src/styles/panel.css`

**Interfaces:**

- Consumes Task 1 definitions and Task 2 runner.
- Adds `helpLevel?: GuidanceLevel` to `PanelPreferences`; loaded legacy preferences default to `'HINT'` while preserving existing fields.
- The panel exposes explicit accessible HINT/SHOW/GUIDE buttons; clicking one invokes that level for the current action. HINT uses existing static lesson guidance, SHOW uses the current highlighter, and GUIDE starts only a registered recipe. `I’m stuck` remains the progressive-HINT action; selecting a saved level on load never auto-runs it.
- The panel shows a reason plus a manual Retry button when GUIDE is unsupported or a target is missing/ambiguous.
- `guidanceActionForSemanticTarget` maps the current `sketch`, `rectangle`, `dimension`, and `finish-sketch` lesson targets to their action IDs; `top-plane` returns `null` and stays on its existing path.
- `AssistantPanelProps` accepts typed `guidanceRegistry` and `guidanceRunner` dependencies. The production entrypoint injects the closed registry; browser fixtures may inject a test-only simulated registry. Neither dependency is part of the external request contract.

- [ ] **Step 1: Add failing preference tests** for restoring an old preference envelope without `helpLevel`, saving/loading each valid level, and rejecting an invalid value without dropping existing fields.
- [ ] **Step 2: Run the focused preference tests** with `pnpm exec vitest run apps/extension/src/services/progressStore.test.ts --config vitest.config.ts`; confirm the new assertions fail.
- [ ] **Step 3: Add the optional validated `helpLevel` preference** with HINT as the load default; preserve the existing storage key and schema envelope.
- [ ] **Step 4: Run the preference tests** and confirm legacy and new preference cases pass.
- [ ] **Step 5: Add failing panel tests** for mode selection, current action/context, HINT versus SHOW behavior, unsupported GUIDE explanation, missing/ambiguous fallback, Retry, and unchanged lesson outcome.
- [ ] **Step 6: Run the focused panel tests** with `pnpm exec vitest run apps/extension/src/components/panel/AssistantPanel.test.tsx --config vitest.config.ts`; confirm the new behavior fails before implementation.
- [ ] **Step 7: Wire the panel to the registry and runner.** Keep Top-plane Show me on the existing path. Make Rectangle GUIDE unavailable in production pending evidence; retain its existing Show me path. Add one calm status/live-region message and no more than one overlay.
- [ ] **Step 8: Run focused panel and storage tests** and confirm selecting help level does not alter the lesson session, status, evidence, or completion outcome.
- [ ] **Step 9: Commit** as `feat: add student-selected guidance levels`.

### Task 4: Prove the simulated Rectangle guide path in browser tests

**Files:**

- Modify: `apps/extension/tests/e2e/fixture.tsx`
- Modify: `apps/extension/tests/e2e/panel.spec.ts`
- Modify: `apps/extension/src/components/panel/AssistantPanel.test.tsx` if an uncovered panel edge case remains.

**Interfaces:**

- Consumes the production runner API; the fixture injects a test-only recipe for trigger highlight → observed OPEN → exact simulated menu-item highlight.
- No simulated target or label is added to the production registry.

- [ ] **Step 1: Write a failing Playwright test** that labels its dropdown fixture as a simulation, opens via pointer and keyboard in separate cases, starts with the menu already open in one case, and checks that only one overlay exists.
- [ ] **Step 2: Run the focused browser test** with `pnpm exec playwright test -c playwright.config.ts apps/extension/tests/e2e/panel.spec.ts`; confirm it fails before fixture wiring.
- [ ] **Step 3: Wire the test-only simulated host** without production selectors or lesson-completion callbacks.
- [ ] **Step 4: Run the focused browser test** and verify close, replacement, navigation, timeout/fallback, Retry, and unmount clear the overlay and observer.
- [ ] **Step 5: Commit** as `test: cover simulated dropdown guidance in browser`.

### Task 5: Validate the implementation branch

**Files:**

- No new files; run repository validation and update the existing PR branch.

- [ ] **Step 1: Run** `pnpm format:check`.
- [ ] **Step 2: Run** `pnpm lint` and `pnpm typecheck`.
- [ ] **Step 3: Run** `pnpm test` and `pnpm test:e2e`.
- [ ] **Step 4: Run** `pnpm package:browsers` and confirm Chrome and Edge packages are produced.
- [ ] **Step 5: Push the tested commits to PR #1**, verify the GitHub Actions result when available, and keep the PR open and unmerged. Do not claim production Rectangle GUIDE compatibility; the authenticated capture remains a release gate for that behavior.

## Evidence Gate After This Plan

The owner must provide the sanitized authenticated Onshape Rectangle dropdown capture before production GUIDE is registered for `rectangle-tool-group` or an individual variant. The follow-up change may add only the exact observed trigger, menu-state observer, and confirmed item identities; all absent or ambiguous observations remain unsupported.
