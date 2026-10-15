# Phase 1 final validation report

> Historical compatibility report. The newer [Top-plane recognition sprint](top-plane-recognition.md) starts at reviewed commit `d2186423ecb3faefe6e93dde3f69b72c81659052` and records the owner’s confirmed live recognition failure. The historical runs, test counts, and package hashes below apply only to their pinned revisions. Use PR #1’s **Top-plane diagnostic build** for the new tested commit/artifact.

**Report date:** 2026-10-13

**Branch / PR:** `phase1-hardening` / [PR #1](https://github.com/anandanikait-bot/leqad/pull/1), open and unmerged.

**Phase 1 acceptance:** **INCOMPLETE — real Onshape acceptance is BLOCKED.**

## Revision and build provenance

| Revision                                                      | Source commit                                                                                    | Evidence                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Earlier validation candidate                                  | `db7b243ccaec0d02fb22f648e16ffc736a724d4c`                                                       | [Actions run 38432996233](https://github.com/anandanikait-bot/leqad/actions/runs/38432996233); historical evidence only.                                                                                                                                                             |
| Incoming PR head before compatibility fixes                   | `85927ae1a9ec65e1fa51873ba15ea20bd561c44b`                                                       | [Successful run 38433445327](https://github.com/anandanikait-bot/leqad/actions/runs/38433445327), artifact `11830789903`; 154 unit/component and 6 browser tests.                                                                                                                    |
| Compatibility source candidate                                | `f4450c4b3b6b53d1219294d187680d680223b9ab`                                                       | [Actions run 38475535722](https://github.com/anandanikait-bot/leqad/actions/runs/38475535722); PASS on attempt 2: 162 unit/component and 7 browser tests; artifact `11854470815`. Local results below are for this source.                                                           |
| Latest independently tested PR revision at this report update | `c3a0346a1d4089e421984f7b3c17ccad68fa2105`                                                       | [Successful run 38476549346](https://github.com/anandanikait-bot/leqad/actions/runs/38476549346), attempt 1: 162 unit/component and 7 browser tests; artifact `11854411254`. This revision adds acceptance documentation to the compatibility source.                                |
| Current PR head                                               | [Current phase1-hardening head](https://github.com/anandanikait-bot/leqad/tree/phase1-hardening) | This report is carried by a later reporting-only commit; its own SHA is available in the PR. The package source and tested head above are pinned separately. Check its current SHA and CI in PR #1; the pinned candidate above identifies the code and build covered by this report. |

The earlier candidate is not the latest PR commit. Historical runs and artifacts identify their own source revisions; their hashes are not reused for the compatibility build.

## Confirmed defects and unverified concerns

| Concern                                      | Reproduced result and fix                                                                                                                                                                                                                                                            | Practical boundary                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit permission inferred from controls       | Regressions reproduced a false editable result for a shared workspace with Part Studio and Sketch controls, including overriding read-only state. Removed the positive permission inference.                                                                                         | Part Studio can still be recognized. No positive permission observer or Onshape API is connected; workspace permission remains UNKNOWN in the production extension. Read-only routes/recognized indicators remain read-only.                                                                                                                      |
| Top selection required during sketch editing | A constructed UI transition selected Top, entered sketch mode, and cleared selection. The old sketch check returned UNKNOWN solely because selection disappeared. The sketch step now checks current editing controls separately from the plane-selection step.                      | This verifies only supported current UI state in an already-confirmed editable context. Active/committed sketch plane association, geometry, and committed state remain UNKNOWN. Contradictory selected planes, stale evidence, and wrong context still block a pass. Whether this exact transition occurs in current Onshape remains unverified. |
| Check required when no verifier exists       | Component and browser regressions reproduced the missing direct continuation on rectangle, dimensions, and finish steps. Panel and content script now share the two implemented observers; unsupported steps show a limitation explanation and direct Continue without verification. | Completion persists SELF_REPORTED with UNKNOWN verification; callbacks cannot generate PASS for unsupported steps. Pause/resume and the eight-step flow remain covered.                                                                                                                                                                           |

No actual live integration failure has been reproduced. No new DOM selectors, screen coordinates, API capability assertions, Phase 2 functionality, or license were added. A separate code-review agent inspected the nine changed code/test files and reported no findings.

## Environment and automated results

- Local system: Debian GNU/Linux 13; managed Chromium 154.0.8037.57.
- Node.js 24.19.0; pnpm 11.25.0. Hosted CI: Ubuntu 24.04.5, Node.js 24.21.0, Chrome for Testing 156.0.8078.4.
- Local Chromium policy: `ExtensionInstallBlocklist: ["*"]`; no supported unrestricted Chrome or Edge runtime is available.
- Managed outbound policy does not allow `cad.onshape.com`; no authorized authenticated Onshape session was provided. No policy bypass was attempted.

| Check                           | Compatibility result                                                                                                                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen install                  | PASS: `CI=true pnpm install --frozen-lockfile`                                                                                                                                                                                                                                         |
| Lint / typecheck / formatting   | PASS                                                                                                                                                                                                                                                                                   |
| Unit/component tests            | PASS: 162 tests across 12 files, including 33 AssistantPanel tests; 8 new regressions. Baseline was 154.                                                                                                                                                                               |
| Browser regressions             | The new direct-continuation regression failed before the fix and passed afterward. All four panel-fixture flows pass.                                                                                                                                                                  |
| Local complete Playwright suite | 6 PASS / 0 FAIL / 1 SKIPPED. The production extension load is skipped under the managed install policy. Baseline was 5 PASS / 1 SKIPPED.                                                                                                                                               |
| Chrome / Edge production build  | PASS: 398.44 kB each                                                                                                                                                                                                                                                                   |
| Chrome / Edge ZIP packaging     | PASS: 120,728 bytes each                                                                                                                                                                                                                                                               |
| Hosted CI                       | PASS on run 38476549346, attempt 1, for tested PR head c3a0346: frozen install, lint, typecheck, 162 tests, formatting, Chrome/Edge builds, 7 browser tests with 0 failures or skips, packaging, and artifact upload. The compatibility source also passed run 38475535722, attempt 2. |

The local browser results cover controlled HTML and manifests. They are not live Onshape acceptance results. The unit/component count increased while retaining the prior suites; tests for plane state and dimensions were updated to match the corrected separation and direct continuation behavior.

## Compatibility packages

The local ZIPs were rebuilt after the complete browser suite. Each has freshly measured SHA-256 `9f8203ebda3fe1a40b78d97edb3056d6f7b85caab6fcbfcfd3004897a6be68d4`:

- `leqadextension-0.1.0-chrome.zip` — 120,728 bytes
- `leqadextension-0.1.0-edge.zip` — 120,728 bytes

The compatibility artifact and the later artifact for tested head c3a0346 were both downloaded and inspected. Both inner extension ZIPs are byte-for-byte identical to these local ZIPs, and both contain `manifest.json` at their root. These freshly verified inner package checksums differ from the earlier report's package checksum.

- Download: [leqad-browser-packages artifact 11854411254](https://github.com/anandanikait-bot/leqad/actions/runs/38476549346/artifacts/11854411254)
- Package source: tested PR head `c3a0346a1d4089e421984f7b3c17ccad68fa2105`; successful run 38476549346, attempt 1. Runtime code is unchanged from compatibility commit `f4450c4b3b6b53d1219294d187680d680223b9ab`.
- Outer artifact archive: 241,714 bytes, SHA-256 `5abb5633b70610620927ab75beb733cedea7bb95a290abd78e16e5b97e8ee8fe`; downloaded bytes match GitHub's recorded digest

The outer archive digest identifies the downloaded bundle, while the inner ZIP checksums identify the actual extension packages. Any later artifact must be measured independently before reusing a checksum.

## CI timeout observation

Attempt 1 of run 38475535722 passed the 162 unit/component tests, static checks, both builds, and six browser tests, but the existing production-extension load test hit its 60-second test deadline. The log did not identify a failing API call. An unchanged attempt 2 passed all seven browser tests and uploaded both packages. This is an intermittent automated-test concern with an unverified cause, not a reproduced live Onshape defect. The initial failure is preserved here and in Actions history.

## Real Onshape results

[The ready-to-fill live report](phase1-live-acceptance.md) records **PASS 0 / FAIL 0 / BLOCKED 24**. It covers extension loading, one panel, Part Studio and read-only recognition, all five named controls, each of the eight lesson steps, wrong-plane/tool recovery, pause/reload, document switching, zoom, and separate Chrome/Edge runtime checks. Every row requires PASS, FAIL, or BLOCKED plus a short observed result.

No real Onshape labels or selectors have been observed. The repository screenshot remains explicitly labeled as a controlled fixture. No runtime compatibility claim is made from ZIP generation or browser fixtures.

The owner can use the [download, extraction, and installation guide](../live-setup.md) in an unrestricted supported browser with an authorized disposable Part Studio. Workspaces currently show Limited observation until edit permission can be established by supported evidence. Steps 2–3 can continue unverified when that gate is unknown; steps 4–6 offer direct self-reported continuation.

When sanitized observations arrive, reproduce each demonstrated failure, identify the cause, add a failing regression, fix only the affected integration, run the complete suite, retest in real Onshape, then commit and update PR #1. Keep the failing row FAIL or BLOCKED until its real retest passes.

## Owner decisions and acceptance

The [Apache-2.0 versus source-available comparison](../../legal/apache-2.0-proposal.md) is ready for the owner's commercial licensing decision. No root LICENSE exists and no license is approved.

**Phase 1 acceptance has not passed.** Required real Chrome/Edge Onshape results and owner sign-off are outstanding. Keep PR #1 open and unmerged; do not publish a Phase 1 completion announcement while this gate remains incomplete.
