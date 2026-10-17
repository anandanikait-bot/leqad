# Research delivery validation

Baseline: PR #8 at `4be3602fa322a744e720723175b90c14b65c105a`.
Research branch: `research/existing-cad-guidance`.

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

Owner next step: the short [native-search card trial](../../experiments/native-search-fallback/README.md), followed by an explicit product choice if manual assistance is to count toward a new milestone. Required automatic SHOW acceptance stays in force meanwhile.
