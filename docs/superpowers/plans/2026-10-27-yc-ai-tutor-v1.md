# YC AI Tutor V1 Implementation Plan

> Execute with Superpowers test-driven development and two Luna implementation agents; primary owns integration and review.

**Goal:** One usable desktop conversation flow, with bounded local learning history and honest capability labels.

**Baseline:** Milestone 2 `5737611724db1d8392a676fcba56fcdee4fda58d`; General CI 40607085719 and Windows CI 40607085753 both successful.

**Authority:** Owner's YC AI Tutor V1 brief authorizes implementation and mocked automated testing until credentials are available. No additional design approval or credential provisioning is needed for this deliverable.

## Design and scope

Reuse the Ask page and existing Electron isolation. A separate narrow tutor bridge validates requests at both boundaries. Main owns conversation history, prompt construction, provider configuration, cancellation, and profile persistence. OpenAI is the first adapter; the provider interface accepts messages plus an AbortSignal. No renderer networking, configurable renderer endpoints, tools, screenshots, CAD access, or geometry/progress mutation.

Compared with a separate local server, main-process requests avoid another service for Windows users while keeping secrets out of the renderer. Compared with renderer requests, they preserve the existing CSP and credential boundary. Use one configured fast model per question. Future planning models require only configuration, not another call now.

Retain at most 20 conversation messages in memory (not disk) and 30 allowlisted topic events locally. Record explicit explanation preference through a labeled student control, never infer ability. Profile shows removable topic events and an editable preference. Lesson progress is read from the existing store with its original evidence outcomes; never written by the tutor. Only student-authored questions, bounded conversation, allowlisted learning history and lesson content go to the provider. Warn before sending not to include private CAD details. No automatic page/window data collection.

## Task 1 — Shared contract (primary)

- [ ] RED: bounded, strict request/profile/reply schema tests, including arbitrary fields and invalid evidence.
- [ ] GREEN: separate tutor contract module and narrow bridge types; freeze before parallel work.

## Task 2 — Provider, memory and conversation (Agent 1)

- [ ] RED/GREEN: step-aware prompts, repeated dimensioning help, explicit preference, return-session memory, failed/cancelled requests, bounds and no invented verification.
- [ ] Implement main-only OpenAI adapter with timeout, cancellation, fixed HTTPS endpoint, bounded response, fixed safe errors, no logs/secrets returned. Mock only by test injection.
- [ ] Atomic bounded profile store, corruption/write failure handling, inspect/correct/delete support; no raw chat persisted.

## Task 3 — Ask interface (Agent 2)

- [ ] RED/GREEN: free text, suggested questions, conversation, loading, retry, cancellation and unavailable mode.
- [ ] Keep existing layout/colors/fonts. Add inspectable/deletable learning history and explicit preference; accessible keyboard controls, safe plain text responses.
- [ ] Replace only desktop Ask integration and update affected authored-prototype tests honestly.

## Task 4 — Host integration (primary)

- [ ] RED/GREEN: trusted sender/main frame only, strict arity/payloads, rejection of forged/system messages, reload cleanup and stale completion suppression.
- [ ] Separate preload bridge and host registration; load credentials only from main environment; no secret setup or live call during this task.

## Task 5 — Validation and delivery (primary + cross-review)

- [ ] Review privacy, concurrency, evidence boundaries, failure handling and architecture.
- [ ] Desktop and full unit tests, lint, typecheck, format, desktop build, Electron UI tests; preserve Windows session coverage.
- [ ] Capture real rendered screenshots with explicit unavailable/test labels, inspect narrow/large text layouts.
- [ ] New stacked draft PR; report exact commit, CI, Windows launch/configuration and owner live-provider acceptance steps. Stop for review.

## Review focus

Cancellation or deletion must prevent late replies/history resurrection. Retry must not duplicate learning events. Unavailable provider must never return scripted answers. Malformed/oversized provider output must fail safely. Navigating to another lesson step must preserve conversation but use fresh step context. Self-reported progress must never become verified evidence. No credentials or window metadata may reach renderer messages, profiles, logs or screenshots.
