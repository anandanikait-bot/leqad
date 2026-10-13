# Phase 1 final validation report

**Report date:** 2026-10-13  
**Candidate branch:** `phase1-hardening`  
**Candidate commit:** `850aabe726313d87ff674122b19785153d7781da`  
**Phase 1 status:** **INCOMPLETE — live Onshape acceptance is blocked**

## Environment

- Local system: Debian GNU/Linux 13 (trixie)
- Local Chromium: 154.0.8037.57
- Node.js: 24.19.0
- pnpm: 11.25.0
- GitHub Actions used Ubuntu 24.04.5 and Node.js 24.21.0. Its Playwright Chromium was Chrome for Testing 156.0.8078.4.
- No Microsoft Edge runtime or authenticated Onshape session was available locally.

## Automated results

| Check                                                   | Result                                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Frozen dependency install                               | Passed with `CI=true pnpm install --frozen-lockfile`                             |
| Lint                                                    | Passed                                                                           |
| Typecheck                                               | Passed                                                                           |
| Formatting                                              | Passed                                                                           |
| Unit and component tests                                | 154 passed, 0 failed across 12 files; includes 29 AssistantPanel component tests |
| Chrome production build                                 | Passed; 398.02 kB total output                                                   |
| Edge production build                                   | Passed; 398.02 kB total output                                                   |
| Chrome ZIP                                              | `leqadextension-0.1.0-chrome.zip`, 120.58 kB                                     |
| Edge ZIP                                                | `leqadextension-0.1.0-edge.zip`, 120.58 kB                                       |
| SHA-256 for both ZIPs                                   | `9867e28a882fb562a46d997c2f8eacaffcf535190248b8c002e69e9530f1dde5`               |
| Local Playwright                                        | 5 passed, 0 failed, 1 skipped                                                    |
| GitHub Actions Playwright on the pull request merge ref | 6 passed, 0 failed                                                               |

The five local passes cover the Chrome and Edge MV3 manifests and three browser-fixture flows. The one local skip is the test that loads the unpacked production extension; the machine's Chromium policy blocks all unpacked extensions. GitHub Actions ran that test successfully against the controlled Onshape-like fixture. This is not a live Onshape result.

The GitHub Actions run for `850aabe` passed install, lint, typecheck, unit tests, formatting, Chrome and Edge builds, packaging, and all six Playwright tests. Artifact upload then failed because `pnpm test:e2e` rebuilt `.output` after packaging and removed the ZIPs. The workflow now packages after the E2E rebuild, and the run must be checked again on the updated pull request before CI can be reported green.

## Live Onshape results

No real Onshape session was available, and the managed local browser policy disallows unpacked extensions. The live acceptance cases remain **blocked**, not passed:

- Extension mount, duplicate prevention, page navigation, read-only state, and supported-page detection in Onshape
- Recognition of Top plane, Sketch, Rectangle, Dimension, and Finish Sketch against the current Onshape UI
- Completion of all eight **Your First Sketch** steps in a real editable Part Studio
- Wrong-plane and wrong-tool recovery, reload persistence, pause/resume, and document isolation
- Highlight position, click-through, and panel reachability at 80%, 100%, 125%, and 150% browser zoom
- Chrome and Edge runtime compatibility in normal supported browser installations

No real Onshape selectors or accessible labels were observed during this validation. The only screenshot in the repository is explicitly labeled as a [controlled browser fixture](../../images/fixture-foundations-panel.png). It is not live Onshape evidence.

## Defects and fixes

- The existing hardening branch contains fixes for evidence trust and lesson completion, context detection, per-document persistence, the complete eight-step lesson, page lifecycle, semantic recognition, panel positioning, and CI coverage. Regression tests cover these behaviors; see the branch history and `docs/implementation-progress.md`.
- This validation found a release workflow defect: packaging ran before Playwright rebuilt the output directory, so artifact upload could not find the ZIPs. The workflow order has been corrected; hosted CI must confirm the correction.
- No live integration defect could be reproduced without an Onshape session. Do not infer live correctness from local fixtures.

## Security, documentation, and licensing

The repository's dated security review records the current-source and available-history scan, minimal `storage` permission, absence of telemetry, and bounded local cursor data. It does not claim penetration testing or live Onshape security validation. Public setup, architecture, contribution, security, roadmap, and capability documentation are present.

Apache-2.0 remains a proposal in `docs/legal/apache-2.0-proposal.md`. There is no root `LICENSE` file. The owner must decide whether to apply it before the project is described as licensed open source.

## Compatibility conclusion and remaining actions

Automated checks and both browser targets build successfully. Local fixtures and the hosted CI browser test pass, while the live Onshape acceptance requirement has not been exercised. Phase 1 therefore remains incomplete.

To close the gate, use an unrestricted supported Chrome or Edge installation and an authorized Onshape session with a disposable document. Follow `docs/testing/live-setup.md` and `docs/testing/live-onshape.md`, record sanitized observations, and update this report. Keep licensing as a separate owner decision. Do not merge or announce Phase 1 completion while the live test gate remains blocked.

## Phase 2 handoff

The Phase 1 contracts, evidence policy, and deterministic transitions are reusable foundations, but there is no Onshape API connection or production snapshot provider. Phase 2 depends on an approved authentication and least-privilege design, secure credential handling, and live model observations. Its first technical milestone should verify one committed extrusion and driving depth, then invalidate that verification after the feature changes or is deleted.
