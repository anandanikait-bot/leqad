# Leqad agent instructions

These instructions apply to Codex and any delegated coding agent working on this repository.

## Scope and source of truth

- Continue the existing WXT/React/TypeScript extension on the current branch. Do not restart the architecture.
- For behavior, consult the relevant modules/tests first, then `docs/product/phase-1-scope.md` and the original product specification if a product decision is needed.
- Phase 1 is **not complete** without observed live Onshape acceptance. Fixture tests, package builds, passing CI, and self-reports are not evidence of live CAD correctness.
- Phase 2 model verification, AI generation, and custom-part design are out of scope for Phase 1. Do not add network/AI calls to the current deterministic lesson.
- Do not merge PR #1, add a root license, or publish a release without explicit owner approval.

## Efficient execution (minimize tool calls, tokens, and rework)

1. At the start of a task, check the current branch, PR head, and recent changes **once**. Read only affected files and their tests. Do not repeatedly read entire specs or reproduce old audits.
2. State the smallest reproducible acceptance criterion. Prefer one focused failing test and the minimal fix over broad speculative refactors.
3. Run focused checks during iteration; run the full lint/typecheck/test/build/browser suite at the delivery boundary and in CI. Do not rerun the entire suite after every one-line edit.
4. Reuse existing fixtures, helpers, components, build artifacts, and validated selectors. Batch independent read operations where supported. Never trade evidence correctness for speed.
5. Avoid repeated CI polling and unchanged retries. For flaky failures, record the failure and evidence, reproduce locally where possible, and only add mitigation justified by diagnosis.
6. Report compactly: changed files, actual regression, tests run, verified result, blockers, and exact commit/CI links. Do not fill logs or progress reports with repeated status narration.
7. An unavailable authenticated Onshape session is an **external gate**. Prepare the installation steps and acceptance checklist once, then stop claiming further live progress; do not simulate a pass or bypass managed policies.

## When to use subagents

- Delegate only when at least two **independent, bounded** investigations can run in parallel and their results would save time (for example: semantic-targeting review vs. persistence/CI review).
- Use at most **two concurrent subagents by default**. Give each exact files, one question, an acceptance criterion, and an expected concise finding with file/line and evidence. One agent owns each edited file.
- Keep orchestration, shared architectural decisions, final integration, CI review, and PR status with the primary agent.
- Do not spawn subagents for trivial edits, routine tests, repeated reviews of the same code, or tasks blocked by the same missing live Onshape access. The overhead must be justified.
- If subagents are unavailable in a given runtime, proceed directly rather than treating delegation as a blocker.

## Trust and privacy invariants

- Do not infer write permission from visible toolbar controls, infer model geometry from clicks, or certify CAD correctness from mock/UI-only observations.
- Accept only evidence allowed by the step's declared trust level and scoped to the active document and current revision. Stale, contradictory, unsupported, or ambiguous signals remain UNKNOWN.
- Do not highlight low-confidence semantic matches as definite controls; prefer explicit missing/ambiguous/low-confidence guidance.
- Never transmit or record Onshape credentials, tokens, cookies, private CAD content, or unredacted identifiers. Use a disposable document for authorized live testing.

## Handoff

- Keep PR #1 open until live tests and owner decisions are documented.
- When blocked, tell the owner exactly which short human action is needed; otherwise finish the available independent work without an extra planning cycle.
