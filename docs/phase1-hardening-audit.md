# Phase 1 hardening audit

**Audit date:** 2026-10-13  
**Repository:** `anandanikait-bot/leqad`  
**Remote:** `https://github.com/anandanikait-bot/leqad.git`  
**Working branch:** `phase1-hardening`  
**Audited base:** `afce72a3fa6ddf0f48d7503c7cc1ca1ee7eb8e04`

This audit covers the repository state before the Phase 1 repair sprint. The
three product documents under `docs/product/` are present and were read as the
authoritative product and scope sources. The current WXT, React, TypeScript,
and pnpm monorepo is a useful working foundation and will be repaired in
place.

## Repository and validation baseline

- `origin/main`, local `main`, and the repair branch all started at the audited
  base commit after a successful fetch.
- The worktree was clean before the repair branch was created.
- `pnpm install --frozen-lockfile` completed with pnpm 11.25.0.
- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and `pnpm build` passed.
- `pnpm test` passed 52 tests in 10 files.
- `pnpm test:e2e` passed three manifest/fixture tests and skipped one direct
  unpacked-extension test. The host's managed Chromium policy blocks all
  extension installation, so the skipped test is not a successful extension
  load.
- The most recent GitHub Actions results could not be inspected. Both the
  GitHub CLI and the public GitHub API returned HTTP 403 from this environment.
  Local checks are recorded separately and are not presented as CI results.

## Confirmed defects

### Verification trust boundaries

- `evaluateFeatureCondition` can return `PASS` for a `MOCK` snapshot. The
  returned evidence is labeled `INFERRED`, but no completion policy prevents
  that decision from completing a production lesson requirement.
- Lesson transitions accept a bare `VerificationStatus`. They cannot inspect
  evidence level, document identity, revision, observation time, or missing
  requirements before marking a step complete.
- The verification result contract does not expose all required decision
  facts as validated top-level fields. In particular, observed fact, relevant
  identity, observation timestamp, revision, and missing requirements are not
  consistently represented.
- Feature conditions match any committed feature of a requested type. They
  cannot require the identity of the intended feature, so an unrelated
  matching feature can produce success.
- Parameter comparison is exact and rejects different units as unknown, but
  it has no explicit numerical-tolerance policy. Multiple same-type features
  can also allow one matching feature to hide contradictory supported facts.

### Onshape context and sketch observations

- Page parsing represents editability as a boolean inferred from a workspace
  URL. It cannot distinguish `editable`, `read-only`, and `unknown`, and it
  does not expose the element type or confirmed Part Studio capability.
- The first-sketch evaluator treats a selected accessible `Top plane` control
  plus a visible `Finish sketch` control as enough to pass. Those observations
  support selected-plane UI state and probable sketch mode, but they do not
  prove that the active sketch is associated with that plane.
- The content script can mount on version and microversion document routes,
  while the current model identity and persistence paths assume a workspace.
  The UI has no explicit read-only/unknown capability state for this case.

### Persistence and recovery

- All progress is stored at one global key, so different Onshape documents do
  not have isolated sessions.
- Stored data has no schema version or migration/invalid-record fallback.
- Learning history and model-dependent verification state are combined. A
  revision change invalidates the session wholesale instead of preserving
  learner progress while resetting only model-dependent facts.
- Storage writes have no sequencing guard, so a delayed older write can
  overwrite newer state.

### Lesson, guidance, and panel behavior

- The Foundations lesson has one operational step rather than the required
  eight-step guided experience.
- Semantic targeting supports only three controls and returns the first
  eligible match. It has no typed found/missing/ambiguous result, no confidence
  or provenance, and no controlled policy for resolving multiple candidates.
- A separate body-wide `MutationObserver` is created for every active
  highlight. This is avoidable work and is not a shared, throttled observation
  service.
- Cursor tracking remains active whenever the panel is mounted, including
  collapsed, paused, and non-learning modes. It can schedule React state work
  for pointer samples that do not change the cue.
- Panel boundary clamping uses hard-coded dimensions instead of measured panel
  geometry and does not reclamp on viewport resize.
- The header always reports `Limited access`; it does not reflect detected
  page capability or whether guidance is paused.
- There is no first-run onboarding or complete/resume/restart lesson
  experience.

### Test and release coverage

- Browser fixture tests mount the React component directly. They do not prove
  that the built content script mounts correctly or only once.
- The direct unpacked-extension test is skipped under the managed browser
  policy. There is no recorded successful Chrome or Edge extension load.
- CI omits `pnpm format:check` and does not report the distinct browser test
  tracks required by the sprint.
- Public project documentation, contribution/security/community templates,
  architecture/setup/testing documents, license proposal, roadmap, and honest
  working-software screenshots are missing.

## Potential defects requiring targeted tests

- Navigation/remount generation guards appear designed to reject delayed
  storage reads, but delayed restore, rapid route changes, duplicate mounts,
  and stale cleanup need isolated regression tests before this can be trusted.
- Current semantic-target eligibility checks visibility, enabled state,
  ownership, viewport position, and center-point occlusion. Nested elements,
  dynamic replacement, ambiguity, and target movement need additional tests to
  establish safe behavior under Onshape-like DOM churn.
- Keyboard drag support exists, but measured bounds, zoom, resize, very small
  viewports, and collapsed/expanded size changes need browser coverage.
- The cursor estimator bounds its sample input, but listeners, discovery work,
  and UI updates need instrumentation tests to establish that inactive modes
  produce no tracking work.
- The fixture shows that host controls remain clickable. More complete
  pointer, focus, Escape, reduced-motion, and contrast checks are required for
  the panel's accessibility acceptance criteria.

## Implemented and tested capabilities

- A WXT 0.21.4 Manifest V3 Chrome build with React, TypeScript, and a
  Shadow-DOM content UI.
- A Leqad-branded draggable and collapsible panel with Learn, Projects, and Ask
  modes, progressive help controls, keyboard movement, and reduced-motion CSS.
- Exact-origin Onshape document-route recognition for workspace, version, and
  microversion URL shapes, including lookalike-host rejection.
- Basic semantic recognition for `Top plane`, `Sketch`, and `Finish sketch`,
  eligibility filters, and a removable pointer-transparent highlight.
- A bounded local cursor-intent scoring function with proximity, direction,
  and dwell inputs. Samples remain local.
- A deterministic lesson state machine, a one-step Foundations lesson, and
  local extension-storage restoration with basic identity reconciliation.
- Zod contracts for normalized model snapshots, evidence, and decisions plus a
  pure feature-condition evaluator.
- Unit, component, manifest, and Onshape-like fixture tests for the preceding
  behaviors. Fixture coverage is not live Onshape compatibility evidence.

## Missing Phase 1 requirements

- A production-safe evidence satisfaction policy enforced by all completion
  transitions.
- Typed Onshape capability and observation contracts that preserve unknown and
  read-only states.
- Honest first-sketch verification that separates supported UI observations
  from unverified model facts.
- Versioned per-document persistence, separate learning/model state, safe
  revision reconciliation, and ordered writes.
- The complete eight-step Foundations lesson with navigation, hints, recovery,
  independent practice, and honest continuation where verification is not
  available.
- Broader typed semantic targeting, stable highlighting, inactive-mode cursor
  suspension, measured panel positioning, onboarding, useful capability state,
  and lifecycle hardening.
- Chrome and Edge packaging/load evidence plus live Onshape validation.
- The documentation, templates, security review, license proposal, roadmap,
  and screenshots required for open-source preparation.

## Unverified live Onshape behavior

No authenticated, editable Onshape Part Studio is available in this
environment. The following remain unverified until Delivery 8:

- Current accessible names and DOM structures for every lesson target.
- Reliable element-type and editability detection in real workspaces, versions,
  microversions, shared documents, and insufficient-permission states.
- Plane selection, sketch entry/exit, rectangle and dimension observations,
  highlight positioning, DOM replacement handling, and reload recovery in the
  live application.
- Successful installation and use of the built extension in supported Chrome
  and Edge browsers.

## Deferred Phase 2 and later product work

This sprint does not implement the complete model-verification backend,
Onshape OAuth/API integration, AI-controlled lesson decisions, automated CAD
operations, arbitrary custom-part generation, robotics workflows, or
printability analysis. The product vision for custom-part design, contextual
AI assistance, robotics applications, and printability guidance remains in the
authoritative product documents.

## Phase 0 artifact recovery status

The accessible `/workspace` tree, repository branches and history, supplied
attachments, and tracked filenames were searched for the reported earlier
repository audit, Onshape capability matrix, integration decision, real
Onshape procedure, and secure diagnostic scripts. The originals were not
found. They will not be described as recovered. Delivery 7 will add a new,
clearly labeled capability matrix and testing guidance containing only facts
supported by this repository and current validation.

## Security baseline

Tracked files and reachable Git history were scanned for common private-key,
GitHub-token, AWS-key, and API-key signatures without printing secret values.
No matches, secret configuration files, test credentials, or private CAD data
were found. The extension currently requests only the `storage` permission and
contains no telemetry. A full security statement and final repeat scan remain
part of Delivery 7.
