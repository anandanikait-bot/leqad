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
- Exact Onshape origin and document-route recognition; semantic target recognition and removable visual highlighting.
- Foundations UI decisions distinguish selected-plane and visible sketch-control observations from unverified sketch-plane association, geometry, and committed model state. “Top view” is not treated as the Top plane.
- Cursor-intent tracking reuses the recognized target and retries discovery at most twice per second when no target is available.
- Bounded local cursor-intent estimator and extension-storage persistence with document/revision recovery checks.
- One Foundations sketch lesson with progressive hints and mistake recovery.
- Chromium fixture tests against an Onshape-like page. These verify the fixture behavior only.

## Validation and limits

- After Delivery 1, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (64 tests in 11 files), `pnpm format:check`, and `pnpm build` pass.
- `pnpm test:e2e` builds the extension and reports three Chromium fixture/manifest tests passed. The direct unpacked-extension test is skipped because the managed browser policy blocks extension installs.
- GitHub Actions run #2 on `main` completed successfully with 52 unit tests and all four Playwright tests passing. This is distinct from the local managed-browser skip.
- This environment's managed Chromium policy at `/etc/chromium/policies/managed/extensions.json` blocks unpacked extensions (`ExtensionInstallBlocklist: ["*"]`). A direct built-extension load therefore cannot be completed here. The MV3 manifest and extension build can still be validated, and the browser fixture can still run.
- No live Onshape session or authenticated editable Part Studio is available. Onshape DOM recognition, actual highlights, lesson flow, and reload behavior still need live browser validation; fixture results are not compatibility claims.
- The complete Phase 2 model-verification backend and live Onshape API integration remain deferred.

## Current repair status

- Initial repository, source, test, history, secret, and missing-artifact audit: complete.
- Delivery 1, verification correctness: complete and locally verified. It covers evidence trust boundaries, completion policy, current evidence, feature identity, unit/tolerance behavior, contradiction handling, and regression tests.
- Deliveries 2 through 7: pending implementation and verification.
- Delivery 8: blocked until an unrestricted browser and authenticated editable Onshape Part Studio are available. Independent work continues before that gate.
