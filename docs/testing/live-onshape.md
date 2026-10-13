# Live Onshape validation

This is the final Phase 1 gate. It requires explicit authorization, an unrestricted compatible browser, an authenticated Onshape account, and a disposable test document. It is currently open and unverified.

## Safety and privacy

- Use a new disposable document with no private, customer, employer, school, or production CAD content.
- Do not record credentials, cookies, account email, document IDs, workspace IDs, element IDs, or private geometry.
- Redact identifiers from screenshots and logs.
- Do not enable broad browser or extension permissions.
- Keep fixture results and live results in separate records.

## Record before testing

- Date and tester
- Leqad commit and Chrome or Edge package filename
- Browser name and full version
- Operating system
- Onshape environment/version information visible to the tester
- Whether the route is workspace, version, or microversion
- Whether the account can edit the disposable document

## Setup

1. Build the target package with `pnpm build` or `pnpm build:edge`.
2. Load the unpacked directory using [local setup](../development/local-setup.md).
3. Create a disposable Onshape document with an empty Part Studio.
4. Open the Part Studio workspace route.
5. Confirm exactly one `leqad-assistant` host and one visible Leqad panel.
6. Confirm the panel remains reachable and does not cover essential controls after resize, zoom, collapse/expand, and keyboard repositioning.

## Context tests

Record pass, fail, skipped, or blocked for each:

1. Workspace route begins unknown and claims editability/Part Studio only after a supported observation.
2. Version and microversion routes remain read-only.
3. Switching documents, workspaces, and elements replaces the prior panel state without duplicates.
4. Browser back/forward and reload preserve the correct document identity.
5. Unsupported and malformed pages do not retain a stale panel.
6. Delayed storage or rapid navigation does not mount an obsolete session.

## Your First Sketch

Run all eight steps without developer tools changing the page:

1. Read and acknowledge the introduction.
2. Use Show me for Top plane. Record whether recognition is correct, ambiguous, missing, or rejected. Select Top plane and check progress.
3. Use Show me for Sketch, enter sketch editing, and check progress. Confirm plane selection and sketch editing are reported separately.
4. Use Show me for Rectangle and draw a closed rectangle. Confirm tool recognition does not claim geometry exists.
5. Add 40 mm and 30 mm dimensions. Confirm the values remain unknown without model evidence.
6. Finish the sketch. Confirm leaving sketch mode is not described as verified committed geometry.
7. Acknowledge the 2D sketch and extrusion explanation.
8. Complete independent practice and confirm the outcome is labeled self-reported.

For every recognized control, test visible/enabled state, ambiguity, replacement after UI refresh, scroll, resize, browser zoom, and pointer pass-through. Record exact accessible labels or validated stable attributes observed in live Onshape before adding selectors to source.

## Persistence and recovery

1. Pause on a middle step and reload.
2. Confirm lesson position, hints, and pause state restore for the same context.
3. Change documents/elements and confirm model progress does not transfer.
4. Return to the original context and record restored learning state.
5. Make an intentional wrong-plane or wrong-tool choice and confirm recovery works without a full lesson restart.

## Chrome and Edge

Repeat the smoke flow in a supported Chrome version and a supported Edge version. A successful Edge build alone is not an Edge compatibility result.

## Acceptance record

Store a sanitized report under `docs/testing/results/` with:

- Passed, failed, skipped, and blocked counts
- Per-step observations and selector provenance
- Screenshots labeled live Onshape only when genuinely captured there
- Bugs discovered and the commit that fixes each
- A conclusion stating whether Phase 1 acceptance criteria are met for the tested environment

Do not mark Phase 1 live validation complete while any required step is blocked or while a fixture is the only evidence.
