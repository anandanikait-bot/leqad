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

Follow the [live setup guide](live-setup.md) to build and load the extension in Chrome or Edge and create the disposable `Leqad Phase 1 Validation` document. Then use the test groups below.

## Context tests

Record PASS, FAIL, or BLOCKED plus a short observed result for each in the [acceptance report](results/phase1-live-acceptance.md):

1. Workspace permission begins UNKNOWN. A recognized Part Studio tab can identify element type, but visible Sketch/Part Studio controls alone never claim editability. A shared read-only workspace with those controls must stay UNKNOWN or read-only, never editable.
2. Version and microversion routes remain read-only.
3. Switching documents, workspaces, and elements replaces the prior panel state without duplicates.
4. Browser back/forward and reload preserve the correct document identity.
5. Unsupported and malformed pages do not retain a stale panel.
6. Delayed storage or rapid navigation does not mount an obsolete session.

## Your First Sketch

Run all eight steps without developer tools changing the page:

1. Read and acknowledge the introduction.
2. Use Show me for Top plane. Record whether recognition is correct, ambiguous, missing, or rejected. Select Top plane. If edit permission is unknown, expect Check progress to be hidden and use I've finished this step (recorded as self-reported).
3. Use Show me for Sketch and enter sketch editing. Record whether plane selection disappears and whether editing controls are visible. Confirm earlier selection is not described as proof of actual sketch plane association. Use unverified continuation when the permission gate remains unknown.
4. Use Show me for Rectangle and draw a closed rectangle. Confirm the limitation explanation and the I've finished this step action appears without requiring Check progress; completion stays self-reported.
5. Add 40 mm and 30 mm dimensions. Confirm the values remain unknown without model evidence.
6. Finish the sketch and continue without verification directly. Confirm leaving sketch mode is not described as verified committed geometry.
7. Acknowledge the 2D sketch and extrusion explanation.
8. Complete independent practice with I've finished this step and confirm the underlying outcome remains SELF_REPORTED/UNKNOWN.

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

- PASS, FAIL, and BLOCKED counts, and a short observed result for every required test
- Per-step observations and selector provenance
- Screenshots labeled live Onshape only when genuinely captured there
- Bugs discovered and the commit that fixes each
- A conclusion stating whether Phase 1 acceptance criteria are met for the tested environment

Do not mark Phase 1 live validation complete while any required step is blocked or while a fixture is the only evidence.
