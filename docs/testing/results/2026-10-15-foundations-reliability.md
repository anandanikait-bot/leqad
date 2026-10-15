# Foundations reliability sprint — October 15, 2026

## Starting state and scope

Branch `phase1-hardening`, PR #1, baseline
`c64c70195626e1f768a2439a1124b479799f9272`. Both remote branch and PR head matched.
The eight-step lesson, semantic and calibrated highlights, typed guidance runner,
manual Sketch-mode report, progress storage and bounded diagnostics already
existed. This sprint implements no AI, screenshot capture, API integration or
new production GUIDE recipes. The October 15 AI design and original product
specifications remain unchanged.

Fresh baseline: frozen install succeeded; **323 unit/component tests**, **45
reference tests**, and **21 browser tests** passed. One unpacked-extension browser
test was skipped because local managed Chromium blocks extension installation.
Reference integrity validation passed with **zero approved capture hashes** and
explicitly reported **NO LIVE EVIDENCE**.

## Reproduced gaps and targeted corrections

No currently reproducible normal-path P0 false-geometry-verification defect was
found. The priority fixes below address wrong guidance, stale observations and
silent progress loss. These reproductions use synthetic controls/storage/evidence;
they are not claims about observed Onshape markup or a live failure.

| Priority                    | Reproduced defect                                                                                                      | Correction / regression                                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 recognition              | A command with an explicit conflicting name (for example Delete) and fallback Sketch title/text was returned as Sketch | Exact bounded accessible name takes precedence; conflicting, partial, empty or unresolved explicit names cannot fall through. Referenced names follow precedence. Negative/positive unit and browser coverage |
| P1 lifecycle                | Inert targets retained outlines; naming-reference changes left highlights and context observations stale               | Observe the attributes already used for eligibility, including inert/reference IDs. Regressions mutate only those attributes and require revocation                                                           |
| P1 persistence              | A rejected session write was swallowed while the UI looked successfully completed                                      | Forward save result to panel; generic warning and explicit retry preserve self-report status. Generation guard ignores stale save settlements; component and real-browser simulated storage-failure tests     |
| P1 defensive trust boundary | An invalid Date bypassed expiry comparisons in two shared evidence helpers                                             | Return UNKNOWN/false when evaluation time is invalid. Two failing-before-fix regressions; no claim this occurred in live callers                                                                              |
| P2 bounded work             | Cursor target processing continued after a step was completed                                                          | Stop cursor listener/processing on completed steps as on pause/collapse/inactive modes                                                                                                                        |

All reproduced defects were first exercised by failing unit/component tests. A
follow-up review caught the accessible-name reference invalidation edge and it
also received a failing regression before correction. No existing tests were
deleted. New browser regressions cover identity conflicts, inert/replaced/moved
targets, SHOW/GUIDE → keyboard HINT, no false advancement, and save retry/reload.

The source changes stay in the existing panel/content lifecycle, semantic naming
and observation modules, plus two guards in shared verification. Shared packages
remain independent of browser APIs and CAD-platform selectors. No non-ARIA
feature-list geometry or Top-plane selectors were changed. The bounded shared
name helper now respects explicit-name precedence, with existing plane
regressions retained.

## Delivery verification

All requested commands completed successfully on the delivered source:

| Command                          | Result                                                                 |
| -------------------------------- | ---------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | PASS; lockfile unchanged                                               |
| `pnpm lint`                      | PASS                                                                   |
| `pnpm typecheck`                 | PASS                                                                   |
| `pnpm format:check`              | PASS                                                                   |
| `pnpm test`                      | PASS — 344 tests, 23 files (21 added cases)                            |
| `pnpm reference:validate`        | PASS — zero approved captures; NO LIVE EVIDENCE                        |
| `pnpm reference:test`            | PASS — 45 tests, four files                                            |
| `pnpm build`                     | PASS — Chrome MV3                                                      |
| `pnpm build:edge`                | PASS — Edge MV3                                                        |
| `pnpm test:e2e`                  | PASS — 24 passed, one skipped, zero failed (three added browser tests) |
| `pnpm package:browsers`          | PASS — Chrome and Edge ZIPs                                            |

The local browser skip is the existing built-MV3 panel-mount test: managed
Chromium's `ExtensionInstallBlocklist=*` prohibits installing it. All passing
browser interactions use controlled fixtures; none is live Onshape acceptance.
Hosted CI may execute the packaged-extension test against its fixture when its
browser permits installation. That is still not a live Onshape test.

Both locally generated inner ZIPs are **142,814 bytes** with SHA-256
`0ff91e214406fab2c41fcba67d5cb534f8bdf1c5ad05277bd37548e7402ff22a`:
`leqadextension-0.1.0-chrome.zip` and `leqadextension-0.1.0-edge.zip`. These are
freshly measured local package hashes, not a claim about the hosted outer artifact
or byte identity with a subsequently downloaded CI package. Both manifests still
request only `storage`, with no host permissions or AI/screenshot permission.

The delivery commit is the commit containing this report; select its successful
PR Checks run and verify the run's source SHA before downloading packages.
The handoff identifies that exact commit/run/artifact. No older artifact digest
is reused for this build.

## Unverified capabilities and next gate

- Current Onshape/Chrome/Edge live acceptance remains BLOCKED. Historical Top-plane
  success is retained as historical evidence only.
- Production GUIDE and Rectangle variants remain unsupported pending authenticated
  menu evidence. The browser dropdown recipe is a labeled simulation.
- Positive edit permission, actual sketch plane association, rectangle geometry,
  40 mm × 30 mm values and committed model state remain UNKNOWN without supported
  evidence. Self-reported progress is not verified CAD work.
- Calibration cannot detect toolbar rearrangement at unchanged viewport metadata;
  the owner must recalibrate when needed.
- No unrestricted Chrome/Edge session or authenticated disposable Onshape
  workspace is available here. No managed policy was bypassed.

Use the new [dated live checklist](2026-10-15-foundations-live-acceptance.md),
separately in Chrome and Edge. Follow the [Windows setup](../live-setup.md).
The [feature matrix](../../product/phase-feature-matrix.md) separates implemented
Foundations from deferred AI (1.5), model verification (2), custom design (3), and
later platform/manufacturing work. Preserve the earlier acceptance reports.

Phase 1 is **not accepted** until required current-build live tests pass and the
owner approves. PR #1 remains open and unmerged.
