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
- Evidence records must carry the same revision in their outer field and nested document identity. A stale embedded revision is rejected by the shared contract before it can satisfy CAD policy or complete a lesson transition.
- Deterministic lesson transitions receive the complete decision and declared evidence requirement. A bare status, stale evidence, insufficient trust level, or mock evidence cannot complete a production step.
- WXT Chrome Manifest V3 build, Onshape-only content entrypoint, React mounted in a Shadow DOM, and a branded draggable/collapsible Leqad panel.
- Exact Onshape origin and workspace/version/microversion route recognition without inferring editability or element type from a workspace URL. Context-matched UI/API observations can identify editable, read-only, Part Studio, and other states; unknown remains explicit.
- Foundations UI decisions use scoped, expiring observations that distinguish target recognition, plane selection, sketch controls, sketch-plane association, geometry, and committed state. Wrong-document, stale, ambiguous, hidden, disabled, and contradictory plane evidence remains unknown. “Top view” is not treated as the Top plane.
- A shared navigation generation guard rejects stale asynchronous initialization after document, workspace, element, history, or content-context changes.
- Content lifecycle listeners are registered before asynchronous initialization, and the live route is rechecked before UI creation and activation. Onshape capability observations refresh after relevant DOM changes and again at verification time, so editability can be revoked rather than remaining captured from startup.
- Cursor-intent tracking reuses the recognized target and retries discovery at most twice per second when no target is available.
- Bounded local cursor-intent estimator and schema-versioned extension persistence. Model sessions are isolated by document/workspace/element, learning history and preferences are independent, and per-key write queues prevent delayed older writes from winning.
- Persistence reads wait for in-flight writes to the same key. Restored UI observations are reconciled against their expiry even when the document revision is unchanged, and invalidation preserves an explicitly paused lesson.
- Persisted model state separates expiring UI observations, verified model facts, evidence references, freshness, and uncertainty. Unknown or changed revisions clear this state while retaining the lesson location, hints, visits, concepts, and attempts.
- The complete eight-step Foundations lesson, “Your First Sketch,” covers Part Studio and sketch concepts, Top-plane selection, sketch mode, rectangle creation, 40 mm by 30 mm design intent, finishing, the 2D-to-3D relationship, and independent practice.
- Lesson progress distinguishes acknowledgement, supported UI verification, model verification, inability to verify, and self-reported continuation. Next, Back, Show me, Why, I’m stuck, Pause, Resume, Restart lesson, and explicit continuation without verification are implemented without converting unverified actions into passing evidence.
- Typed semantic recognition reports its target, strategy, confidence, visibility, enabled state, ambiguity, and rejection reason. The first-lesson tools are recognized by accessible labels and related semantics; no unvalidated Onshape selectors or fixed screen coordinates are claimed.
- Highlights track target and ancestor layout with throttled, bounded observers; handle resize, scroll, replacement, removal, hidden/disabled state, and reduced motion; and allow all pointer input through to the CAD page.
- Local cursor intent is capped at 20 samples, analyzed at most 20 times per second, limited to active lesson targets, stopped during pause/inactive modes/unmount, and never used as verification evidence.
- Panel positioning observes measured content-size changes and reclamps within the viewport; it also handles viewport resize, pointer cancellation, keyboard movement, accessible status text, Phase 1 preview labels, and first-run onboarding.
- A page lifecycle coordinator keys each mount to the full Onshape route identity, rejects delayed stale initialization, prevents duplicate mounts for repeated context events, and disposes the prior React root before context changes.
- Public project documentation now covers architecture, local development, Chrome/Edge loading, test-track limits, live Onshape validation, contribution and conduct rules, security reporting/review, the product roadmap, and a newly created evidence-labeled Onshape capability matrix. The reported Phase 0 originals remain explicitly unavailable.
- A genuine Chromium screenshot of the controlled fixture is published with a fixture label. No screenshot is represented as live Onshape.
- Apache-2.0 is prepared as a documented proposal. No root license has been added because the assignment requires explicit owner approval for the final license decision.
- Chromium fixture tests against an Onshape-like page. These verify the fixture behavior only.

## Validation and limits

- After Delivery 1, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (64 tests in 11 files), `pnpm format:check`, and `pnpm build` pass.
- After Delivery 2, the focused regression suites pass 41 tests. The full suite passes 87 tests in 12 files; lint, typecheck, formatting, and build pass. Local Playwright reports three passed and one skipped because of the managed extension-install policy.
- After Delivery 3, the full suite passes 100 tests in 12 files; lint, typecheck, formatting, and build pass. Local Playwright again reports three passed and one managed-policy skip.
- After Delivery 4, the full suite passes 115 tests in 12 files; lint, typecheck, formatting, and the WXT production build pass. Local Playwright passes three fixture/manifest tests and skips one direct extension-load test under the managed policy.
- After Delivery 5, the full suite passes 142 tests in 12 files; lint, typecheck, formatting, and the WXT production build pass. Local Playwright passes three fixture/manifest tests and skips one direct extension-load test under the managed policy.
- After Delivery 6, the full suite passes 142 tests in 12 files; lint, typecheck, formatting, and Chrome and Edge WXT production builds pass. Both browser packages zip successfully. Local Playwright passes five fixture/manifest tests and skips one direct extension-load test under the managed policy.
- After final independent review corrections, lint, typecheck, and formatting pass; the full suite passes 154 tests in 12 files. Chrome and Edge production builds each total 398.02 kB, and both 120.58 kB zip packages are produced. Local Playwright passes five fixture/manifest tests and skips one direct unpacked-extension test because the managed browser policy blocks extension installs.
- `pnpm test:e2e` builds both browser variants and reports five Chromium fixture/manifest tests passed. The direct unpacked-extension test is skipped because the managed browser policy blocks extension installs.
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
- Delivery 5, UI and guidance: complete and locally verified. It covers typed target recognition, ambiguity and rejection behavior, bounded highlights, local cursor intent, measured panel positioning, accessibility, accurate capability messaging, preview labels, structured errors, and first-run onboarding.
- Delivery 6, stability and testing: complete and locally verified. It covers lifecycle deduplication and cleanup, delayed storage/navigation races, bounded observers and cursor analysis, the full eight-step browser fixture, minimal-permission Chrome and Edge manifests, reproducible zip packages, and CI checks for frozen install, lint, typecheck, unit tests, formatting, both builds, browser tests, and uploaded artifacts.
- Delivery 7, open-source preparation: complete pending the owner's separate license decision. It covers the expanded README, contribution/community/security files, issue and pull-request templates, architecture/setup/testing documentation, roadmap, proposed Apache-2.0 implications, repeated current/history secret scans, manifest/telemetry/execution review, and an honestly labeled fixture screenshot.
- Independent final review: complete with no critical findings. All important findings were corrected with regressions covering embedded evidence revisions, initialization/navigation races, live capability revocation, unavailable-verification continuation, persistence read/write ordering, expired UI evidence, content-size panel clamping, and ancestor-driven highlight movement. The reported pause-on-reload issue was also corrected.
- Delivery 8: blocked until an unrestricted browser and authenticated editable Onshape Part Studio are available. Independent work continues before that gate.

## Final validation snapshot — 2026-10-13

See [`docs/testing/results/phase1-final-validation.md`](testing/results/phase1-final-validation.md) for the complete report and [`docs/testing/live-setup.md`](testing/live-setup.md) for the owner-executable setup.

- Local lint, typecheck, formatting, and all 154 unit/component tests pass on `850aabe`.
- Chrome and Edge MV3 builds and ZIP packages succeed. The local Playwright run reports five passes and one unpacked-extension skip under managed browser policy.
- The pull request's hosted Playwright run passed all six tests, including loading the built extension against the controlled fixture. The first Actions run failed only at artifact upload because the E2E rebuild had cleared the earlier ZIPs. Packaging now runs after E2E; the updated PR check must confirm the fix.
- Real Onshape validation and manual Chrome/Edge runtime checks remain blocked. Phase 1 is not signed off.
