# Independent Onshape Validation Harness — Implementation Spec

## Goal

Add an independent, privacy-bounded way to capture real Onshape UI structure and compare Leqad observations against reviewed evidence. Automated fixtures and passing CI must never imply live compatibility.

## Components and boundaries

1. **Reference capture (`tools/onshape-reference`)** launches a headed, clean Chrome profile in a temporary directory. The owner signs in manually and opens an authorized disposable Part Studio. Capture is explicit, bounded, read-only, and stops on request or timeout; profile and listeners are removed in `finally`. It does not import app code, selectors, guidance, or fixtures.
2. **Reference records (`validation/onshape-reference`)** have a strict allowlisted schema. Only bounded labels, roles/states, relationship indices, relative geometry, visibility, interaction categories, environment support, and separate enumerated human observations are exportable. No URL, free text, IDs, HTML, credentials, storage state, geometry, or screenshots are retained. New records are pending; approval appends a SHA-256-addressed record and never overwrites an approved file.
3. **Independent evaluator** validates schema, provenance, hashes, freshness state, and dependency boundaries, then reports `PASS`, `FAIL`, `NOT_RUN`, or `INSUFFICIENT_EVIDENCE`. Simulated and capture-derived results cannot become `LIVE_VERIFIED`; only a separate fresh owner-run authenticated product test can establish that status. Missing, ambiguous, stale, or incomplete evidence does not pass.

## Scope and scenarios

The initial recorder workflow is one two-snapshot Sketch capture: a Part Studio state with the Sketch command available, followed by the owner manually opening Sketch and capturing the resulting UI. It uses a fresh local Chrome profile with extensions disabled, a bounded allowlist scan, and manual capture. It never clicks controls. If no exact Sketch dialog label is exposed, retain a bounded sanitized structural sample and attribute-presence counts with an `UNKNOWN` result. Existing Top-plane production behavior and all extension code remain untouched.

The strict schema keeps previously approved target identities closed, but the MVP recorder does not expose non-Sketch scenarios. Rectangle variants remain unsupported until real evidence identifies them. The approved manifest starts empty. CI runs offline integrity and tests only; no dashboard, historical acceptance store, or current live-acceptance claim is produced.

## Validation and delivery

Add independent schema/privacy/integrity/boundary tests, deliberately incorrect and missing target checks, useful `UNKNOWN` and incomplete-capture checks, and clearly marked synthetic-only fixtures. The offline evaluator compares a manually observed Leqad result with an owner-approved capture. Add `reference:validate`, `reference:test`, `reference:capture`, `reference:approve`, and `reference:evaluate` commands. CI runs offline checks only. No credentials or authenticated sessions enter CI.

Add an owner review path for approved evidence and document that CODEOWNERS alone is not enforcement: required review and branch protection must be verified by the repository owner before treating the dataset as protected. Keep PR #1 open and unmerged. Once the safe Sketch capture tool is ready, stop engineering and ask the owner to collect the first authenticated capture.

## Time target and stopping rule

The initial MVP targets 6–8 focused engineering hours. This does not permit skipping privacy or correctness checks. Checkpoints are: hours 0–2, recorder boundary and schema; hours 2–4, clean Chrome capture and privacy tests; hours 4–6, owner review/integrity and evaluator negative tests; hours 6–8, integration, instructions, and CI.

Until the first successful real capture, defer a full dashboard, support for every Onshape tool, advanced browser automation, a separate data repository, generalized replay infrastructure, extensive history management, and complex approval systems. Do not continue expanding the harness while waiting for the owner capture.

## Explicit non-goals

No production selector or recognition changes, no Onshape API integration, no authentication automation, no CAD actions or geometry verification, no fake Onshape clone, no silent fixture updates, and no live-compatibility claim from CI or replay.
