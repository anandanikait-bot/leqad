# Testing limitations

Leqad uses distinct test tracks because they establish different facts.

| Track              | What it establishes                                                                                 | What it does not establish                                       |
| ------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Unit               | Deterministic contracts, evidence policy, lesson transitions, parsing, persistence and cursor logic | Browser integration or Onshape compatibility                     |
| Component          | React controls and interaction state in jsdom                                                       | Browser layout fidelity or Onshape DOM behavior                  |
| Browser fixture    | Real Chromium, Shadow DOM, highlights, panel interaction and controlled UI observations             | Live Onshape selectors, permissions, timing or CAD correctness   |
| Unpacked extension | Production MV3 package can load and mount in a compatible unrestricted browser                      | Authenticated Onshape lesson compatibility unless run on Onshape |
| Live Onshape       | Behavior in the recorded browser and Onshape environment                                            | Universal or future-version compatibility                        |

## Current blockers

- The managed local Chromium policy blocks unpacked extension installation, so the production-load test is skipped locally. It is not counted as passed.
- No authenticated editable Onshape Part Studio is available in the current environment.
- No supported API supplies current model revision, committed sketch geometry, or exact dimension values.

## Fixture policy

Fixture data is labeled `MOCK` or controlled UI state. It can test deterministic behavior but cannot satisfy production evidence requirements. Screenshots from fixtures are labeled as fixtures.

## Compatibility claims

Do not state that Leqad supports a live Onshape workflow until [the live procedure](live-onshape.md) passes. Record browser version, extension commit, date, route/capability state, lesson steps, recognized targets, reload behavior, and failures.
