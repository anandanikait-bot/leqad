# Rectangle offline regression environment

Status: **SIMULATED regression coverage; no authenticated Onshape result**

Baseline: PR #12 commit
`e91b9233e33889ae32c5b8a60319b7c980b5efba`.

## Purpose

This environment catches repeat failures before an owner installs Leqad in
Onshape. It exercises known command identities, local Rectangle group
relationships, negative states and highlight geometry without signing in to
Onshape.

It does not replace live acceptance. A passing fixture means Leqad behaves as
expected for the controlled DOM that the test creates.

## Evidence boundary

The owner supplied a summarized four-state command metadata report. The raw
sanitized JSON is not in this branch, so the fixture preserves only the facts
in that summary.

| State              | Owner-observed fact                                                | Still unknown                                          |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------------ |
| A: Sketch          | `LINESEGMENT`, `RECTANGLE_TWO_CORNERS`, a same-parent arrow branch | Eligibility, complete coverage, active Sketch identity |
| B: menu            | Three Rectangle command IDs in a menu nested in the toolbar        | Exact arrow-to-menu ownership and complete coverage    |
| C: changed variant | `RECTANGLE_CENTER` and a same-parent arrow branch                  | Eligibility, complete coverage, active Sketch identity |
| D: Extrude         | `newSketch`, `extrude`, no recorded Rectangle command              | Complete coverage and a unique context signature       |

The following fixture details are synthetic and are labeled that way in code:

- exact pixel bounds;
- State B's toolbar face, group and arrow scaffold;
- visible and enabled positive cases;
- hidden, disabled and duplicate controls;
- menu placement inside the candidate group or outside the toolbar;
- DOM replacement timing;
- click and event behavior;
- semantic toolbar/button roles used by older production tests.

These additions are test inputs. They are not reconstructed Onshape DOM and
must not be approved as reference evidence.

## Deterministic environment

The reusable test fixture is
`apps/extension/tests/fixtures/rectangleObservedFixture.ts`. It contains:

- a closed record of the owner-observed facts;
- one small builder for States A through D;
- explicit switches for synthetic negative conditions;
- helpers for simulated menu placement and arrow replacement.

The fixture imports no recorder code and changes no production recognition.
The independent reference recorder remains separate from Leqad's selectors,
recognition logic and registry.

Run the focused contract suite with:

```sh
pnpm vitest run --config vitest.config.ts \
  apps/extension/tests/fixtures/rectangleObservedFixture.test.ts
```

## Coverage map

| Requirement                   | Offline proof                                                                                                                        | Limit                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Command-ID resolution         | States A, B, C and D in `rectangleObservedFixture.test.ts`                                                                           | IDs are from the owner summary; DOM construction is simulated |
| Rectangle group and arrow     | A/C same-parent contract plus existing metadata-capture tests                                                                        | Does not prove the real arrow is eligible                     |
| Visibility and disabled state | Hidden/disabled contract cases and `rectangleMetadataEligibility.test.ts`                                                            | Browser styling differs from jsdom                            |
| Stale or duplicate controls   | Replacement and duplicate contract cases                                                                                             | Timing is deterministic                                       |
| Dropdown ownership changes    | Unowned observed-summary B case plus nested, portaled and replacement tests in `rectangleCommandMetadataCapture.test.ts`             | Real ownership remains unknown                                |
| Sketch versus Extrude         | A/D contract cases and existing negative-context tests                                                                               | `activeSketchState` remains `UNKNOWN`                         |
| Exact overlay position        | Neutral existing overlay around synthetic arrow bounds plus scale coverage in `semanticTargets.test.ts` and `rectangle-show.spec.ts` | Does not admit the nonsemantic arrow as a production target   |
| Manual fallback               | `rectangle-show.spec.ts` verifies Search Tools instructions and no automatic CAD input                                               | Owner still checks the wording in real Onshape                |

The existing browser experiment in
`apps/extension/tests/e2e/rectangle-command-metadata.spec.ts` also runs all four
states through the extension panel and verifies privacy-bounded output. It is
explicitly simulated.

## What this removes from manual testing

The owner no longer needs to repeat a live capture to check generic handling of
hidden, disabled, duplicate, stale, replaced or portaled controls, overlay
padding, cleanup, manual fallback, or the allowlisted command-ID matrix. CI
checks those cases.

The owner still needs one live acceptance run for the claims that only Onshape
can establish:

1. The current build sees one eligible Rectangle face and the actual arrow.
2. State B establishes arrow-to-menu ownership.
3. Sketch is independently distinguishable from Extrude.
4. SHOW outlines only the real arrow at current zoom and scroll.
5. The overlay clears on real rerendering and navigation.

Until those observations exist, automatic Rectangle highlighting remains
unverified.
