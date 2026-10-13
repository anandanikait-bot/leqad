# Leqad implementation progress

## Current milestone

The Phase 1 hardening sprint is active on `phase1-hardening`. The initial WXT Manifest V3 foundation remains buildable, and the required repository audit is recorded in `docs/phase1-hardening-audit.md`. The audit confirmed critical gaps in evidence enforcement, Onshape capability detection, per-document persistence, the eight-step Foundations experience, guidance lifecycle, and public documentation. These deliveries are being repaired in the assignment's required order before live validation.

## Product sources

- The original TutorCAD Product and System Design was supplied by the user and preserved byte-for-byte at `docs/product/TutorCAD_Product_and_System_Design.md`.
- The Leqad implementation blueprint is preserved byte-for-byte at `docs/product/leqad-master-implementation-spec.md`.
- User corrections to the Phase 1 sequence and boundary are recorded in `docs/product/phase-1-scope.md`.

## Repository and environment

- Intended repository: `anandanikait-bot/leqad`.
- Local repair branch: `phase1-hardening`, created from `origin/main` at `afce72a3fa6ddf0f48d7503c7cc1ca1ee7eb8e04`.
- Configured origin: `https://github.com/anandanikait-bot/leqad.git`.
- The GitHub remote contains the baseline on `main`. Repair commits will be pushed to `phase1-hardening` without force and proposed through a pull request.
- Runtime: Node 24.19.0, pnpm 11.25.0, Chromium at `/usr/bin/chromium`.
- The workspace uses WXT 0.21.4 and `@wxt-dev/module-react` 1.2.2 with React and TypeScript. CRXJS had only been initialized, so WXT is the selected framework. There is no Phase 2 API shell.

## Implemented

- Reproducible pnpm workspace, strict TypeScript, lint, test, browser fixture, and CI configuration.
- Validated evidence and verification-decision contracts expose trust level, observed fact, document identity, observation time, revision, missing requirements, explanation, and recovery. Source/level mismatches are rejected.
- The CAD evaluator enforces explicit production and fixture evidence policies, specific feature identity, current document/revision, evidence expiry, exact units, explicit numerical tolerances, and contradictory-evidence handling.
- Deterministic lesson transitions receive the complete decision and declared evidence requirement. A bare status, stale evidence, insufficient trust level, or mock evidence cannot complete a production step.
- WXT Chrome Manifest V3 build, Onshape-only content entrypoint, React mounted in a Shadow DOM, and a branded draggable/collapsible Leqad panel.
- Exact Onshape origin and workspace/version/microversion route recognition without inferring editability or element type from a workspace URL. Context-matched UI/API observations can identify editable, read-only, Part Studio, and other states; unknown remains explicit.
- Foundations UI decisions use scoped, expiring observations that distinguish target recognition, plane selection, sketch controls, sketch-plane association, geometry, and committed state. Wrong-document, stale, ambiguous, hidden, disabled, and contradictory plane evidence remains unknown. “Top view” is not treated as the Top plane.
- A shared navigation generation guard rejects stale asynchronous initialization after document, workspace, element, history, or content-context changes.
- Cursor-intent tracking reuses the recognized target and retries discovery at most twice per second when no target is available.
- Bounded local cursor-intent estimator and schema-versioned extension persistence. Model sessions are isolated by document/workspace/element, learning history and preferences are independent, and per-key write queues prevent delayed older writes from winning.
- Persisted model state separates expiring UI observations, verified model facts, evidence references, freshness, and uncertainty. Unknown or changed revisions clear this state while retaining the lesson location, hints, visits, concepts, and attempts.
- The complete eight-step Foundations lesson, “Your First Sketch,” covers Part Studio and sketch concepts, Top-plane selection, sketch mode, rectangle creation, 40 mm by 30 mm design intent, finishing, the 2D-to-3D relationship, and independent practice.
- Lesson progress distinguishes acknowledgement, supported UI verification, model verification, inability to verify, and self-reported continuation. Next, Back, Show me, Why, I’m stuck, Pause, Resume, Restart lesson, and explicit continuation without verification are implemented without converting unverified actions into passing evidence.
- Chromium fixture tests against an Onshape-like page. These verify the fixture behavior only.

## Validation and limits

- After Delivery 1, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (64 tests in 11 files), `pnpm format:check`, and `pnpm build` pass.
- After Delivery 2, the focused regression suites pass 41 tests. The full suite passes 87 tests in 12 files; lint, typecheck, formatting, and build pass. Local Playwright reports three passed and one skipped because of the managed extension-install policy.
- After Delivery 3, the full suite passes 100 tests in 12 files; lint, typecheck, formatting, and build pass. Local Playwright again reports three passed and one managed-policy skip.
- After Delivery 4, the full suite passes 115 tests in 12 files; lint, typecheck, formatting, and the WXT production build pass. Local Playwright passes three fixture/manifest tests and skips one direct extension-load test under the managed policy.
- `pnpm test:e2e` builds the extension and reports three Chromium fixture/manifest tests passed. The direct unpacked-extension test is skipped because the managed browser policy blocks extension installs.
- GitHub Actions run #2 on `main` completed successfully with 52 unit tests and all four Playwright tests passing. This is distinct from the local managed-browser skip.
- This environment's managed Chromium policy at `/etc/chromium/policies/managed/extensions.json` blocks unpacked extensions (`ExtensionInstallBlocklist: ["*"]`). A direct built-extension load therefore cannot be completed here. The MV3 manifest and extension build can still be validated, and the browser fixture can still run.
- No live Onshape session or authenticated editable Part Studio is available. Onshape DOM recognition, actual highlights, lesson flow, and reload behavior still need live browser validation; fixture results are not compatibility claims.
- The complete Phase 2 model-verification backend and live Onshape API integration remain deferred.

## Current repair status

- Initial repository, source, test, history, secret, and missing-artifact audit: complete.
- Delivery 1, verification correctness: complete and locally verified. It covers evidence trust boundaries, completion policy, current evidence, feature identity, unit/tolerance behavior, contradiction handling, and regression tests.
- Delivery 2, environment correctness: complete and locally verified. It covers explicit context capability states, exact observation scoping, workspace/version/microversion routes, conservative Part Studio/editability detection, separated first-sketch UI observations, and stale initialization rejection.
- Delivery 3, session correctness: complete and locally verified. It covers versioned storage and migration, independent learning history/model state/preferences, per-context sessions, revision reconciliation, invalid-data fallback, service-worker restart, ordered writes, pause recovery, and lesson-version rejection.
- Delivery 4, lesson correctness and completion: complete and locally verified. It covers all eight ordered Foundations steps, progressive assistance, navigation and restart, reload recovery, honest evidence outcomes, unverified continuation, separate Top-plane and sketch-mode observations, and model-dependent dimension verification boundaries.
- Deliveries 5 through 7: pending implementation and verification.
- Delivery 8: blocked until an unrestricted browser and authenticated editable Onshape Part Studio are available. Independent work continues before that gate.
