# Leqad Phase 1 Extension Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline. Work test-first and commit meaningful increments. This plan records the user's chosen execution method: continue autonomously.

**Goal:** Deliver a runnable Manifest V3 extension with one useful, locally guided Foundations lesson inside Onshape.

**Architecture:** WXT builds the MV3 extension and React content UI into a Shadow DOM. Pure packages own lesson transitions and basic CAD evidence contracts; extension services detect Onshape pages, recognize semantic targets, show local highlights, estimate cursor proximity locally, and persist lesson state in extension storage. No Phase 2 API/backend is part of this plan.

**Tech Stack:** TypeScript, pnpm, WXT, React, Shadow DOM, Tailwind CSS, Vitest, React Testing Library, Playwright, Chromium.

**Product sources:** `docs/product/TutorCAD_Product_and_System_Design.md` is the preserved original design. `docs/product/leqad-master-implementation-spec.md` is the implementation blueprint. `docs/product/phase-1-scope.md` records the user's current scope corrections.

## Global Constraints

- Keep public product branding as Leqad and preserve brand colors `#0D1C43`, `#793327`, and `#F5EFE7`.
- Use WXT, React, TypeScript, and Manifest V3 for the extension.
- Mount in a Shadow DOM; keep page interaction available outside Leqad controls.
- Keep cursor samples local and bounded; do not transmit them.
- Never report a click as verified CAD progress. The current extension has no model verification service; unavailable evidence remains unknown.
- Keep the user in control; Leqad does not click, modify, or undo CAD operations.
- Browser fixtures validate extension behavior only; they do not establish Onshape compatibility.

## Review Focus

- Lookalike hosts and unsupported Onshape routes must not start operation-specific guidance.
- Hidden, disabled, obscured, detached, or Leqad-owned elements must not be highlighted.
- The Foundations step must not pass from a visible Finish sketch control alone; it needs explicit selected Top-plane UI evidence and an editable workspace.
- A click or missing model evidence must not complete a lesson step.
- Extension storage with a changed document/revision must not restore stale progress.
- Dragging, collapsing, keyboard controls, and page interaction must work in a real Chromium fixture.

---

### Task 1: Preserve product sources and align Phase 1 scope

**Files:** `docs/product/TutorCAD_Product_and_System_Design.md`, `docs/product/phase-1-scope.md`, `docs/implementation-progress.md`, this plan.

- [x] Preserve the attached original design document without editing it.
- [x] Record the source authority and Phase 1 corrections. Explicitly defer the full Phase 2 model verification backend and retain the future product vision.
- [x] Record the intended repository, current `main` branch, configured remote, current validation and live Onshape gaps.
- [x] Commit the docs correction.

### Task 2: Build a runnable WXT Manifest V3 extension

**Files:** `apps/extension/package.json`, `apps/extension/wxt.config.ts`, `apps/extension/entrypoints/onshape.content.tsx`, root scripts and lockfile.

- [x] Remove the unused CRXJS dependency and empty API shell.
- [x] Add a WXT Chrome MV3 content entrypoint limited to supported Onshape pages and storage permission.
- [x] Verify `pnpm --filter @leqad/extension build` produces a Chrome MV3 manifest and content script.

### Task 3: Mount the Leqad panel in Shadow DOM

**Files:** `apps/extension/src/components/panel/AssistantPanel.tsx`, panel styles, content entrypoint, component tests.

- [x] Test and implement Learn/Projects/Ask navigation, honest limited-access status, accessible collapse/expand, and drag by pointer and keyboard.
- [x] Mount React through WXT `createShadowRootUi`; exercise the host fixture in Chromium and ensure host controls still receive events.
- [x] Keep brand tokens and reduced-motion behavior in the isolated stylesheet.

### Task 4: Onshape recognition and local visual guidance

**Files:** `apps/extension/src/services/onshapePage.ts`, semantic target/highlight services, cursor-intent service, unit tests.

- [x] Test exact origin and route parsing, including unsupported route and lookalike-host cases.
- [x] Test semantic accessible-name recognition and visibility, enabled, ownership, and occlusion filters before implementation.
- [x] Test bounded local proximity/dwell scoring; it never verifies lesson progress.
- [x] Implement a removable, pointer-transparent highlight positioned from current target geometry and cleared when its target is replaced.

### Task 5: Foundations lesson and reload recovery

**Files:** `packages/lesson-engine/src/lessons/foundations.ts`, extension lesson/progress state, storage adapter and tests.

- [x] Add one beginner lesson with a concrete goal, next action, progressive hints, and recovery guidance.
- [x] Drive it with the deterministic engine; UI action observation alone leaves verification unknown.
- [x] Persist session and panel preferences locally; reconcile document/revision identity on reload.

### Task 6: Browser validation and onboarding

**Files:** `apps/extension/tests/e2e/panel.spec.ts`, `playwright.config.ts`, `README.md`, `.github/workflows/ci.yml`, onboarding configuration draft.

- [x] Exercise Shadow DOM panel and lesson interactions in Chromium against a local Onshape-like fixture, including target highlight and continued host-page interaction.
- [x] Attempt direct load of the built extension in Chromium. The managed policy at `/etc/chromium/policies/managed/extensions.json` blocks all unpacked extensions, so the test records this environment blocker; the MV3 manifest is checked separately.
- [x] Run frozen install, lint, typecheck, 52 unit tests, Chromium fixture tests, and production build; fix the case-sensitive brand-color assertion, tighten lesson evidence after review, cache cursor-intent target discovery, and revalidate cached targets.
- [ ] Complete direct extension loading in an unrestricted Chrome/Edge environment and live Onshape validation; the current managed Chromium policy blocks unpacked extension installation.
- [x] Commit implementation and push `main` without force-pushing; verify the remote commit SHA after the final status update.

**Local verification result:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (52 tests), and `pnpm format:check` pass. `pnpm build` produces `.output/chrome-mv3/manifest.json`, `onshape.js`, and `onshape.css`. `pnpm test:e2e` reports 3 passed and 1 skipped; the skipped case attempts direct loading of the built extension and is blocked by `/etc/chromium/policies/managed/extensions.json` with `ExtensionInstallBlocklist: ["*"]`. The Foundations check requires an explicitly selected accessible Top-plane control, visible Finish sketch control, and editable workspace; tests use semantic fixtures. Cursor-intent discovery caches its target, revalidates it, and retries discovery at most twice per second when absent. Live Onshape compatibility remains unverified.
