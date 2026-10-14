# Rectangle Dropdown Diagnostic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add an opt-in, privacy-bounded diagnostic that captures Rectangle dropdown structure before and after a user-operated state change and produces a copyable sanitized report.

**Architecture:** A standalone capture service builds capped structural snapshots and observes DOM-backed changes without interpreting clicks as proof of an open menu. The existing diagnostics panel starts/cancels the task and copies its report; no production Rectangle target or selector is added. Tests use explicitly simulated controls, and the report stays diagnostic-only until an authenticated owner capture validates the real structure.

**Tech Stack:** TypeScript, DOM APIs (`MutationObserver`, passive event listeners), React, Vitest, Playwright, WXT.

**Spec:** [`docs/superpowers/specs/2026-10-14-adaptive-guidance-design.md`](../specs/2026-10-14-adaptive-guidance-design.md)

## Global Constraints

- Capture only exact allowlisted CAD tool labels, safe tag/role enums, accessibility-attribute presence, allowlisted ARIA state values, and bounded relationships. Include `Aligned Rectangle` as a diagnostic-only/unverified label, never a production identity.
- Capture bounded structure for unlabeled potential triggers and user-operated event-target ancestor chains without claiming JavaScript actionability that the DOM does not expose.
- Never serialize arbitrary text, HTML, classes, IDs, URLs, credentials, account data, or CAD content; compare raw relationship values only in memory and discard them.
- Bound scan size, candidate count, ancestor depth, sibling count, observation duration, and report size; every bound reports truncation/incompleteness.
- Pointer and keyboard actions remain native. Listeners are passive and never cancel or synthesize user input.
- A click/key event alone never means the menu opened. Capture the resulting DOM state and report UNKNOWN when the state cannot be established. If state remains UNKNOWN, offer manual before/after snapshots and store user-reported state separately from DOM-observed state.
- Handle an already-open menu at capture start; to obtain both CLOSED and OPEN snapshots, ask the user to close/reopen it manually when the baseline is OPEN.
- Cleanup listeners, observers, timers, and pending tasks on success, timeout, cancel, diagnostics-off, panel unmount, and navigation.
- Diagnostic output does not run production recognition and does not enable production highlighting or GUIDE support.
- Only a sanitized capture produced by the owner's local Chrome session is Onshape DOM evidence; do not use Work/cloud-browser output or an outdated branch audit for this purpose.

## Review Focus

- The user starts capture with an already-open menu; record that OPEN/UNKNOWN baseline and wait for a user-operated close then reopen instead of asking for an automatic click. Test in `rectangleDropdownCapture.test.ts`.
- A pointer or keyboard event occurs but the DOM does not open a menu; report no OPEN transition. Test both in `rectangleDropdownCapture.test.ts`.
- The menu is nested or appears elsewhere in the document, or has duplicate exact labels; report observed DOM relationships/ambiguity, never claim framework-level portal behavior or select a global first match. Test snapshot/diff behavior in `rectangleDropdownCapture.test.ts`.
- The scan/report limit is reached; mark the report incomplete and never claim a missing label. Test truncation at each bound in `rectangleDropdownCapture.test.ts`.
- Capture is canceled or the panel unmounts while waiting; remove each resource once and leave the page click/keyboard behavior unchanged. Test service and panel cleanup in `AssistantPanel.test.tsx` and `panel.spec.ts`.

---

## Files and Responsibilities

- Create `apps/extension/src/services/rectangleDropdownCapture.ts` for allowlisted bounded snapshots, safe diffs, and a cancellable capture task.
- Create `apps/extension/src/services/rectangleDropdownCapture.test.ts` for pure snapshot/diff and session lifecycle tests.
- `rectangleDropdownCapture.ts` serializes a standalone `leqad-rectangle-dropdown/1` report with no `productionRecognition` field.
- Modify `apps/extension/entrypoints/onshape.content.tsx` to provide the document-scoped capture factory; do not add recognition or selector logic there.
- Modify `apps/extension/src/components/panel/AssistantPanel.tsx` and `.test.tsx` to expose the opt-in button and status/cancel/copy flow.
- Modify `apps/extension/tests/e2e/fixture.tsx` and `apps/extension/tests/e2e/panel.spec.ts` for simulation-only capture and click-through coverage.

### Task 1: Define the bounded sanitized snapshot format

**Files:**

- Create: `apps/extension/src/services/rectangleDropdownCapture.ts`
- Test: `apps/extension/src/services/rectangleDropdownCapture.test.ts`

**Interfaces:**

- Produces `RectangleDropdownState = 'OPEN' | 'CLOSED' | 'UNKNOWN'`, `RectangleDropdownCaptureStatus = 'CAPTURED' | 'INCOMPLETE' | 'TIMED_OUT' | 'CANCELLED'`, and `RectangleDropdownCaptureReport` with `version: 'leqad-rectangle-dropdown/1'`.
- Each snapshot contains only state, allowlisted candidate summaries, bounded parent/sibling relations, visibility/context booleans, safe ARIA-state enums, and `truncated`/`unlistedLabelCount` indicators.
- `CAPTURED` means the baseline and a user-operated DOM transition were captured; the per-snapshot state may still be UNKNOWN. `INCOMPLETE` means a scan/report bound prevented complete observations, and `TIMED_OUT` means no transition snapshot was observed before the deadline.
- `inspectRectangleDropdown(document, limits?): RectangleDropdownSnapshot` is synchronous and does not install listeners.
- The exact normalized diagnostic label allowlist contains `rectangle`, `corner rectangle`, `center point rectangle`, and `aligned rectangle`. The last label is explicitly diagnostic-only/unverified. All labels are diagnostic values only; their presence does not prove a matching Onshape variant exists or register it for production use.
- Include a bounded set of unlabeled potential triggers, using only tag/role enums, attribute-presence booleans, safe ARIA states, visibility/clipping, geometry, and local parent/sibling relationships. A passive pointer/keyboard event may mark a bounded event-target path as observed input structure but does not establish that an element is actionable.
- Reuse `FEATURE_LIST_CAPTURE_LIMITS` for local relationships (`ancestorLevels: 8`, `siblingRadius: 2`, `inspectedElements: 256`, `labelMatches: 24`, `matchesPerSibling: 8`) and `RECOGNITION_DIAGNOSTIC_LIMITS` for global/report bounds (`scannedElements: 6000`, `candidateRecords: 12`, `capturedAncestors: 10`, `captureTimeoutMs: 20_000`, `reportChars: 24_000`). Report every reached bound as truncation/incomplete.
- Scan the document once for the baseline; after that, inspect only bounded mutated/added subtrees and their local ancestor/sibling relationships. Coalesce mutation processing to one pass per animation frame; never rescan the whole document for every mutation.
- Use a 64-character maximum label read. Only exact allowlisted strings may be serialized; longer or unlisted labels are omitted and counted.
- `serializeRectangleDropdownReport(report): string` emits only this standalone bounded report; it excludes `productionRecognition` and existing Top-plane diagnostic fields.
- The report separates `domObservedState` from optional `userReportedState`. Manual “Capture before”/“Capture after” controls save bounded snapshots when automatic state recognition stays UNKNOWN. A manual report can retain an UNKNOWN DOM state alongside a user-reported OPEN/CLOSED state; user input never upgrades DOM evidence.

- [x] **Step 1: Write failing snapshot tests** for nested text labels, role and ARIA presence, unlabeled potential triggers, diagnostic-only Aligned Rectangle, hidden versus visible candidates, parent/sibling/separate-document-branch relationships, duplicate labels, arbitrary CAD text, omitted production-recognition data, and each truncation limit.
- [x] **Step 2: Run the focused diagnostic test** with `pnpm exec vitest run apps/extension/src/services/rectangleDropdownCapture.test.ts --config vitest.config.ts`; confirm the tests fail because the service is absent.
- [x] **Step 3: Implement the allowlisted bounded scanner, diff types, and standalone serializer.** Use exact label comparison only, cap label reads, never include source attribute values or arbitrary strings in report objects, and return UNKNOWN/incomplete instead of a guessed state. Describe non-descendant controls as a separate DOM branch; do not infer a framework portal. Preserve diagnostic-only classification for Aligned Rectangle and include unlabeled potential-trigger structure without a claim of actionability.
- [x] **Step 4: Run focused snapshot tests** and assert serialized output omits private text, raw IDs, URLs, classes, HTML, and arbitrary ARIA values.
- [x] **Step 5: Commit** as `feat: add sanitized rectangle dropdown snapshots`.

### Task 2: Capture CLOSED/OPEN transitions with deterministic cleanup

**Files:**

- Modify: `apps/extension/src/services/rectangleDropdownCapture.ts`
- Test: `apps/extension/src/services/rectangleDropdownCapture.test.ts`

**Interfaces:**

- Produces `createRectangleDropdownCapture(document, options?): RectangleDropdownCaptureTask`, where `options` accepts bounded `timeoutMs` and injectable timer/observer factories for tests; the returned task has `promise` and idempotent `cancel()`.
- Capture starts with a baseline snapshot. When the baseline is CLOSED, capture OPEN after an observed DOM state transition. When baseline is OPEN, retain that OPEN/UNKNOWN baseline and ask the user to close then reopen manually to capture both transition snapshots. UNKNOWN remains UNKNOWN until DOM evidence changes it; a diff does not upgrade UNKNOWN to OPEN/CLOSED.
- The transition summary records appeared/disappeared/changed candidates and whether relationships are nested, separately rendered, ambiguous, or unknown.

- [x] **Step 1: Write failing lifecycle tests** for closed→open by pointer, closed→open by keyboard, no-DOM-change-after-event, already-open baseline followed by manual close→open, automatic UNKNOWN followed by manual before/after snapshots, timeout, cancel, repeated cancel, and listener/observer cleanup.
- [x] **Step 2: Run only the new lifecycle tests** with `pnpm exec vitest run apps/extension/src/services/rectangleDropdownCapture.test.ts --config vitest.config.ts`; confirm the expected transitions and cleanup fail.
- [x] **Step 3: Implement the capture task.** Install one-shot passive pointer and keyboard listeners for the next candidate transition, plus a 20-second scoped-duration `MutationObserver`. After the baseline scan, inspect only changed/added subtrees (maximum 256 elements per update) and coalesce work to one pass per animation frame. Record event category only, never key value. Resolve OPEN/CLOSED from observed DOM state; if it stays UNKNOWN, retain the before/after structural diff while keeping DOM state UNKNOWN and expose manual before/after capture. Manual state is recorded only as a separate user report.
- [x] **Step 4: Run lifecycle tests** with fake timers and assert normal clicks/key actions still reach the host page, observers disconnect, listeners are removed, and stale callbacks cannot complete a canceled capture.
- [x] **Step 5: Commit** as `feat: capture rectangle dropdown state transitions`.

### Task 3: Add the standalone report and diagnostics-panel controls

**Files:**

- Modify: `apps/extension/entrypoints/onshape.content.tsx`
- Modify: `apps/extension/src/components/panel/AssistantPanel.tsx`
- Test: `apps/extension/src/components/panel/AssistantPanel.test.tsx`

**Interfaces:**

- `AssistantPanelProps` gains `onCaptureRectangleDropdown?: () => RectangleDropdownCaptureTask`; capture is available only while diagnostics are enabled.
- The copy action serializes the task through `serializeRectangleDropdownReport`; it does not merge the report with `collectRecognitionDiagnostics` or include `productionRecognition`.

- [x] **Step 1: Add failing panel tests** for diagnostics-off gating, start/status, already-open instructions, cancel, timeout, standalone copy, diagnostics-off cancellation, and unmount cleanup.
- [x] **Step 2: Run the panel tests** with `pnpm exec vitest run apps/extension/src/components/panel/AssistantPanel.test.tsx --config vitest.config.ts`; confirm capture controls and lifecycle assertions fail.
- [x] **Step 3: Add `Capture Rectangle dropdown` beside the existing Top-row control.** Explain that an already-open menu is recorded and the user may close/reopen manually to capture both states; when automatic state stays UNKNOWN, expose explicit manual before/after snapshot buttons, label user-reported state as unverified, start one task only, retain explicit cancel, and copy only its standalone bounded report.
- [x] **Step 4: Run panel tests** and confirm existing Top-row capture tests remain unchanged and Rectangle diagnostic data never enters lesson verification.
- [x] **Step 5: Commit** as `feat: expose opt-in rectangle dropdown diagnostics`.

### Task 4: Verify the diagnostic in browser fixtures and package it

**Files:**

- Modify: `apps/extension/tests/e2e/fixture.tsx`
- Modify: `apps/extension/tests/e2e/panel.spec.ts`
- No real Onshape fixture or selector is added.

- [x] **Step 1: Write failing Playwright tests** with clearly labeled simulated controls for closed→open by pointer, closed→open by keyboard, initially open→manual close→reopen, click-through, report redaction, absence of `productionRecognition`, and cleanup after navigation/unmount.
- [x] **Step 2: Run the focused browser tests** with `pnpm exec playwright test -c playwright.config.ts apps/extension/tests/e2e/panel.spec.ts`; confirm the diagnostic UI/test injection is absent.
- [x] **Step 3: Add the simulation-only capture wiring** and assert one report is copied with explicit simulated fixture metadata; it must not claim authenticated Onshape compatibility.
- [x] **Step 4: Run the focused browser tests** and verify no overlay, CAD click, lesson status, or completion evidence is changed by diagnostic capture.
- [x] **Step 5: Run full validation:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm package:browsers`.
- [x] **Step 6: Push to PR #1**, confirm available GitHub Actions results/artifacts, and keep the PR open and unmerged.

## Immediate Scope and Evidence Gate

**Implement immediately:** bounded sanitized CLOSED/OPEN/UNKNOWN snapshots, structural diff, pointer/keyboard observation, already-open handling, cancellation and timeout cleanup, opt-in panel controls, standalone copyable diagnostic report, and simulation-only tests/build.

**Requires an authenticated Onshape capture:** deciding the real menu-state evidence, trigger identity, whether menu items are nested or appear elsewhere in the document, which exact labels are actual menu items, production menu observer registration, and individual Rectangle variant identities. Do not add production Rectangle selectors, highlight targets, or GUIDE support before reviewing the owner-provided capture. The live acceptance step remains the owner opening Onshape and returning the sanitized report from this build.

The owner will run the diagnostic build in local Chrome with WebGL available. Do not use a cloud-browser failure or an outdated repository audit as Onshape DOM evidence.
