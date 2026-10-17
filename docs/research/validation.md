# Research delivery validation

Baseline: PR #8 at `4be3602fa322a744e720723175b90c14b65c105a`.
Research branch: `research/existing-cad-guidance`.

The first validation record below describes research commit `88ec6df`. The supplemental record at the end describes the follow-on Search Tools panel prototype on branch `integrate/native-search-guidance`; its checks do not promote simulated results to live Onshape evidence.

## Scope

Changes are three research reports, this validation record, one isolated static instruction-card experiment, and CI commands exercising that experiment. No production extension, recognition, lesson, dependency, permission or model-verification code changed. No upstream implementation was copied.

## Completed checks

- Read actual implementation and license files at the source revisions in the reports. Checked 88 pinned GitHub blob references against local read-only clones; corrected two SeeClick path/case errors found by that check.
- Independent review of recognition claims and the experiment found no unsupported identity, live-compatibility, licensing or acceptance promotion. The reviewer requested this validation record; it is now supplied.
- RED: both new Node tests failed because `index.html` did not exist. GREEN: both pass after the static card was added.
- Prototype Chromium test: 1 passed. It renders the actual static HTML in memory, checks content, keyboard access, absence of executable/active controls and external requests, and viewport overflow at 320/1280px. It does not test native Onshape or actual browser toolbar zoom.
- The initial `file://` browser attempt was blocked by managed-browser policy. No policy was changed. In-memory rendering tests the card without requiring filesystem navigation. Owner instructions still describe ordinary local browser use; that workflow has not been tested in an authenticated Onshape session.
- Explicit experiment ESLint and standalone TypeScript checks passed. The standalone TypeScript invocation requires `--ignoreConfig --types node` under TypeScript 6; the initial command without those flags failed configuration/type lookup, not application execution.
- Reference validation passed with **zero approved reference captures**. This establishes repository integrity checks only, not live evidence.
- Reference tests: **45 passed**.
- Existing unit/component tests: **531 passed**.
- Existing lint, typecheck and formatting checks passed.
- Chrome and Edge builds passed.

- Existing local browser suite: **47 passed, 1 skipped**. The existing unpacked-extension mounting test detects managed Chromium `ExtensionInstallBlocklist=*` and skips; no policy was changed. This is not a local extension-runtime pass.
- Chrome and Edge packaging passed. These packages contain unchanged production code and are not presented as recognition fixes.

Hosted CI is associated with the research PR's exact commit; do not substitute PR #8's historical run for this research change. Its result will be visible on the research PR and linked in the delivery handoff.

## Interpretation

All extension browser fixtures are simulated controls. The instruction card has no Onshape DOM, search, dropdown or geometry access. No new live Onshape acceptance result exists. The current live checklist and PR #8 recognition blockers remain unchanged. No fresh extension artifact is presented as an Onshape recognition fix.

Owner next step at the research commit was the [native-search card trial](../../experiments/native-search-fallback/README.md). The required automatic SHOW acceptance remains in force.

## Follow-on panel prototype validation — 2026-10-17

Branch: `integrate/native-search-guidance`, based on research commit `88ec6df` and the stated PR #8 baseline. No change was made to `semanticTargets.ts`, Sketch context recognition, model verification, permissions, or lesson evidence levels. The added code is a manually operated Search Tools instruction card shown only after the Step 4 Rectangle SHOW path abstains; no tool is opened or selected by Leqad.

- Focused unit/component tests: **66 passed** across `AssistantPanel.test.tsx` and `nativeSearchGuidance.test.ts`.
- Full unit/component suite: **537 passed** across 29 files. One initial concurrent run timed out in the pre-existing 6,500-node DOM stress test; it passed in isolation (1.5 s) and in the clean full rerun (the full suite passed).
- Full browser suite: **48 passed, 1 skipped**. The skipped test is the built-extension mount test, which detects managed Chromium `ExtensionInstallBlocklist=*`; no policy was changed. All extension UI/control fixtures are simulations.
- Focused Search Tools browser regression: passed. It covers missing-target fallback, keyboard expansion, exact wording, no CAD action/progress change, collapse/re-expand, panel drag and one-panel behavior in a simulated fixture.
- Static fallback browser check: **1 passed**; it remains a content/privacy preview, not live Onshape validation.
- Reference tests: **45 passed**. Reference validation: PASS with **zero approved Onshape captures**; result explicitly says no live evidence exists.
- Lint, typecheck and Prettier check: passed.
- Chrome and Edge production builds and packaging: passed; each current zipped package is **160.79 kB**. Package hash comparison was not run against earlier artifacts; these are current local packages only.
- Hosted CI for the follow-on implementation is tracked on its dependent PR. The earlier research PR's run and artifact are not substitutes for this implementation build.

Live status: **BLOCKED / not tested**. Owner trial needs the current local Chrome package in a regular profile and an authorized disposable Onshape Part Studio. Automatic SHOW remains the acceptance path; the manual fallback is supplementary and does not satisfy it.
