# Contributing to Leqad

Thank you for helping build an honest, accessible CAD learning tool.

## Before opening a change

1. Read the [Phase 1 scope](docs/product/phase-1-scope.md), [architecture overview](docs/architecture/overview.md), and [testing limitations](docs/testing/limitations.md).
2. Search existing issues and pull requests.
3. Keep changes within the current product stage. Label future AI, custom-design, robotics, and printability work as roadmap proposals.
4. Never include credentials, private CAD documents, account identifiers, or proprietary Onshape data.

## Development workflow

Create a focused branch, install the pinned dependencies, and run the relevant checks:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
pnpm build:edge
pnpm test:e2e
```

Add regression coverage for behavior changes. Keep fixture, unpacked-extension, and live-Onshape results separate. A fixture can prove deterministic Leqad behavior; it cannot prove that an Onshape selector works in production.

## Evidence and lesson rules

- Preserve `UNKNOWN` when a required fact is unavailable.
- Never let mock, inferred, stale, wrong-document, or insufficient evidence satisfy a stronger production requirement.
- Keep model verification independent from React and content-script code.
- Do not automatically operate Onshape on the learner's behalf.
- Describe unsupported recognition or verification in language that helps the learner continue honestly.

## Pull requests

Use the pull request template. Explain the learner-visible behavior, evidence implications, validation performed, skipped or blocked checks, and documentation changes. Keep commits small enough to recover and review.

## Live Onshape work

Follow [docs/testing/live-onshape.md](docs/testing/live-onshape.md). Use an authorized disposable document, record the browser and Onshape state, redact identifiers, and avoid personal or production CAD projects.

## Licensing

The repository owner has not yet approved an active license. Apache-2.0 is documented as a proposal. Do not assume that public source alone grants reuse rights. Contribution terms may be updated when the owner makes the final license decision.
