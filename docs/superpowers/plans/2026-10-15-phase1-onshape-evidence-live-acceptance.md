# Phase 1 Onshape Evidence & Live Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish real Onshape evidence for Sketch-control recognition, make only evidence-justified narrow corrections, and obtain honest owner-recorded live acceptance of the existing Phase 1 First Sketch experience.

**Architecture:** Use the current read-only Sketch diagnostic to collect sanitized evidence from a user-authorized disposable Part Studio. If that evidence identifies an actionable recognition defect, reproduce it in the existing semantic resolver tests and fix only the justified rule; then test the packaged extension and have the owner run the full live acceptance matrix. There is no broad redesign, screenshot/AI implementation, or new geometry-verification promise.

**Tech Stack:** TypeScript, WXT Manifest V3 extension, React, pnpm 11.25.0, Node >=22.12.0, Vitest, Playwright, Chrome and Edge, existing GitHub Actions CI.

**Spec:** `docs/superpowers/specs/2026-10-15-leqad-unified-system-architecture-design.md` (architecture branch `design/leqad-unified-architecture-2026-10-15`), Sections 2, 5–7 and 12–13. Current implementation/testing source: `phase1-hardening`; `docs/testing/sketch-control-capture.md`; `docs/testing/results/2026-10-15-foundations-live-acceptance.md`; `docs/testing/results/phase1-live-acceptance.md`. The existing Phase 1.5 vision spec is **not** permission to build vision-assisted screenshot capture now.

## Global Constraints

- PR #1 remains open and unmerged until real acceptance and explicit owner sign-off.
- Current observed head at plan creation: `90710f3f423d85ea418c0b0012d1b5eb3a2db780`; always confirm the active HEAD, Actions run and artifact before testing. Older documents and the PR body may name stale commits/artifacts.
- Use an authorized **disposable** Onshape Part Studio. Never share document IDs/URLs, account identifiers, cookies, tokens, raw DOM/HTML, private geometry or screenshots.
- A sanitized diagnostic is not proof of full resolver uniqueness, successful Sketch activation, model geometry, or permission to edit.
- No silent CAD clicks or edits; no added production selectors without capture-backed justification; no arbitrary manual-coordinates-as-semantic-PASS.
- `40 mm × 30 mm` is the instructional target; without official model evidence, those CAD dimensions remain UNKNOWN/SELF_REPORTED.
- Automatic recognition must be independently checked against false positives, especially Finish Sketch, Top view versus Top plane, disabled/inert/hidden targets, DOM ambiguity and stale highlights.
- Preserve existing deterministic HINT/SHOW/GUIDE fallbacks, timeout/cleanup, calibration UI, and current privacy limits.
- The owner (or authorized tester) conducts actual Onshape UI tests. An agent cannot relabel simulated Chromium fixtures as live Onshape acceptance.

## Review Focus

These five failure modes deserve explicit tests or documented live observations:

1. **Wrong Sketch target:** The UI contains Sketch and Finish Sketch; resolver highlights only the unambiguous actionable Sketch command, or abstains.
2. **No usable semantic name:** A clicked Sketch-looking control has unsupported or missing semantics; return UNKNOWN/fallback, not invented high-confidence FOUND.
3. **Re-render/zoom/navigation:** A previously highlighted control moves or disappears; stale overlay clears and cannot remain attached to the wrong node.
4. **False progress:** Drawing or clicking Dimension and Finish Sketch must not imply committed geometry or a verified 40 mm × 30 mm result.
5. **Browser and permission differences:** Real Chrome/Edge, unknown edit permission, read-only views and changed UI structure must not be silently classified as fully supported.

---

### Task 1: Capture Actual Sketch Toolbar Identity (Owner-Gated)

**Files:**
- Read: `docs/testing/sketch-control-capture.md`
- Read: `apps/extension/src/services/sketchControlCapture.ts`
- Read: `apps/extension/src/components/panel/SketchControlDiagnostic.tsx`
- Reference: `docs/testing/results/2026-10-15-foundations-live-acceptance.md`
- **No source-code changes and no live report committed.**

**Interfaces:**
- Consumes: the exact version-matched Chrome package from an Actions run on `phase1-hardening`, installed unpacked.
- Produces: an **owner-reviewed sanitized JSON diagnostic** plus the owner's yes/no observation whether clicking the intended Sketch control opened Sketch; record tested browser/version/zoom/commit without private IDs.

- [ ] **Step 1:** Confirm PR head and most recent successful Actions build, and record exact commit/artifact identity. Never use the stale artifact quoted in the PR description.
- [ ] **Step 2:** Owner installs that unpacked Chrome extension in ordinary Chrome, disables previous Leqad installations, and refreshes a disposable authorized Onshape Part Studio.
- [ ] **Step 3:** Owner selects Step 3 → SHOW, cancels any calibration dialog, enables recognition diagnostics and clicks **Capture Sketch control**.
- [ ] **Step 4:** Within 20 seconds, owner clicks the real Onshape Sketch toolbar button once, then copies the sanitized JSON and checks it locally before sharing.
- [ ] **Step 5:** Owner reports whether Sketch actually opened; record any visible mismatch between approximate highlight and real button. No password, screenshot, full HTML, raw DOM or document URL is needed.
- [ ] **Step 6 — Gate:** If the report is absent, truncated around the crucial relationship, or cannot establish a likely failure mode, mark recognition diagnosis **BLOCKED** and request a focused additional observation; do not invent selectors or claim a fix.

**Expected:** A bounded, sanitized, nonpersistent Sketch-control report with `productionRecognition: NOT_RUN` and `uniqueness: NOT_EVALUATED`, plus an independently labeled owner observation.

### Task 2: Turn Evidence into a Narrow Testable Fix or a Safe Abstention (Conditional)

**Files:**
- Inspect and possibly modify: `apps/extension/src/services/semanticTargets.ts`
- Inspect and possibly modify: `apps/extension/src/services/semanticTargetDom.ts`
- Test: `apps/extension/src/services/semanticTargets.test.ts`
- Test: `apps/extension/src/services/sketchControlCapture.test.ts`
- Possibly adjust, only if supported: `apps/extension/src/components/panel/AssistantPanel.test.tsx`
- No unrelated new adapter, screenshot, geometry verification, or generalized selector framework.

**Interfaces:**
- Consumes: Task 1's sanitized evidence and a documented hypothesis explaining the actual rejection, false-positive or ambiguity.
- Produces: either (A) a narrow, regression-tested semantic correction with evidence-specific explanation or (B) a documented justified abstention and continued manual fallback.

- [ ] **Step 1:** Classify the report's clicked node, bounded ancestry, naming, visibility, enabled state and local eligibility; separately evaluate whether whole-document uniqueness is known. Never treat `LOCALLY_ELIGIBLE` as a global resolver PASS.
- [ ] **Step 2 — Design gate:** State the exact demonstrated issue and the proposed minimal rule change. If evidence does not support a unique safe target, choose safe abstention and **do not implement a guessed production matcher**. Obtain owner review if a new UI identity rule is required.
- [ ] **Step 3 (only with sufficient evidence):** Add the smallest sanitized DOM fixture reproducing that cause in `semanticTargets.test.ts`; assert `recognizeSemanticTarget(document, 'sketch')` returns `FOUND` only for a unique eligible target and does not return `FOUND` for disallowed/ambiguous contexts.
- [ ] **Step 4:** Run `pnpm exec vitest run apps/extension/src/services/semanticTargets.test.ts`. **Expected RED:** evidence-specific test fails on the current resolver without weakening existing safety assertions.
- [ ] **Step 5:** Implement only the evidence-backed candidate/semantic rule using existing `recognizeSemanticTarget(root: ParentNode, targetId: SemanticTargetId): SemanticTargetRecognition` and related local helpers. Do not modify lesson truth/completion semantics.
- [ ] **Step 6:** Run `pnpm exec vitest run apps/extension/src/services/semanticTargets.test.ts apps/extension/src/services/sketchControlCapture.test.ts`. **Expected GREEN:** new safe positive/abstention test and all existing cases pass.
- [ ] **Step 7:** Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm format:check`. Only make a scoped, reviewable commit on the **active development branch/worktree**, after its implementation approach is approved. No merge.
- [ ] **Step 8:** Report changed tests, exact commit and any remaining uncovered conditions. If no code change was justified, document the abstention instead of manufacturing a passing test.

**Review checks:** Include Sketch versus Finish Sketch, missing/unsupported names, duplicate eligible nodes, hidden/disabled/inert elements, altered ancestor relationships, and non-leaking diagnostic output. Existing privacy constraints and five-second overlay cleanup must remain intact.

**Important:** The exact positive selector or revised helper signature cannot be responsibly specified until Task 1 is complete. This plan expressly **stops at the Task 2 design gate** if the evidence cannot resolve it; revise this bounded task with the observed fixture before coding rather than pretending to have solved an unknown DOM structure.

### Task 3: Automated Regression and Real Onshape Retest

**Files:**
- Test: `apps/extension/tests/e2e/sketch-control-capture.spec.ts`
- Test: `apps/extension/tests/e2e/reliability.spec.ts`
- Test: `apps/extension/tests/e2e/panel.spec.ts`
- Read: `docs/testing/results/2026-10-15-foundations-live-acceptance.md`

**Interfaces:**
- Consumes: Task 2's tested commit or explicitly unchanged diagnostic build.
- Produces: a versioned Actions artifact and authorized real Onshape PASS/FAIL/BLOCKED observations.

- [ ] **Step 1:** Run `pnpm test:e2e` and `pnpm reference:test`; record actual pass/fail/skip counts. Simulated fixtures prove regression behavior, not live compatibility.
- [ ] **Step 2:** Build/package Chrome and Edge with `pnpm package:browsers` following the appropriate builds; verify the resulting packages correspond to the tested commit.
- [ ] **Step 3:** Have owner install the correct package, retest Step 3 SHOW and the real Sketch click. Record whether a unique precise highlight appears or a correct fallback persists; a fallback is **not** acceptance of automatic Sketch recognition.
- [ ] **Step 4:** Owner retests Top-plane SHOW, Rectangle, Dimension, Finish Sketch, all eight steps, HINT/SHOW/GUIDE fallback behavior, pause/reload/document-switch recovery, resize, and 80/100/125/150% zoom where applicable.
- [ ] **Step 5:** Owner records normal Chrome and Edge runtime observations separately. Use `PASS`, `FAIL` or `BLOCKED` per row, with short factual observations. Do not silently treat earlier owner observations as this build's results.
- [ ] **Step 6 — Gate:** Any failing or untested critical live scenario keeps Phase 1 **INCOMPLETE**. Fix only concrete failures with their own test cycle, then rerun affected live scenarios.

**Expected:** Testable, environment-scoped evidence that distinguishes actual UI recognition from self-report, permitted observation and geometry verification.

### Task 4: Reconcile Acceptance Records and Request Owner Sign-off

**Files:**
- Update only from verified observations: `docs/testing/results/2026-10-15-foundations-live-acceptance.md`
- Update/align as appropriate: `docs/testing/results/phase1-live-acceptance.md`
- Update/align as appropriate: `docs/testing/results/phase1-live-acceptance.csv`
- Update appropriate dated result or roadmap status only with verified commit/test evidence; avoid overwriting old history.

**Interfaces:**
- Consumes: Task 3's actual environment report and artifact/commit identity.
- Produces: traceable acceptance matrix and a clear owner decision on Phase 1 readiness.

- [ ] **Step 1:** Record the actual extension commit, Actions URL/artifact and browser versions. Correct misleading references to historical test builds in the new report rather than editing the past to suggest it never happened.
- [ ] **Step 2:** For each scenario, enter **PASS**, **FAIL** or **BLOCKED**, a brief observation, and the tested browser. Leave unsupported committed-geometry claims UNKNOWN and self-reported steps self-reported.
- [ ] **Step 3:** Check that Chrome/Edge, recognized controls, full lesson, read-only/unknown permission, reload/navigation, highlight cleanup and zoom requirements have not been omitted.
- [ ] **Step 4:** Run docs formatting checks relevant to touched files and review the diff for private identifiers, speculative claims and inconsistent statuses.
- [ ] **Step 5:** Present a final Phase 1 pass/fail/blocked summary to the owner and **stop for explicit sign-off**. Do not merge PR #1, call Phase 1 accepted, or start Phase 1.5 on your own.

**Expected:** Evidence-backed owner acceptance decision. If acceptance is incomplete, report exact remaining blockers rather than declaring completion.

---

## Self-review and decomposition notes

This is **one scoped acceptance and evidence-led correction cycle** for the existing Phase 1 subsystem. It does **not** purport to implement the many independent subsystems in the unified architecture specification. The owner must first provide a real Sketch capture; no implementer can manufacture that observation. If the capture points to a fundamentally new recognition approach instead of a local defect, stop and make a separate reviewed design/spec rather than expanding this task without approval.

The separate Phase 1.5 vision-assisted screenshot/AI Teacher work, Phase 2 authenticated model verifier, Design Studio, persistent learner profiles, and future CAD adapters each require their own phase-gated specs and implementation plans.
