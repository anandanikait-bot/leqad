# Phase 1B Compact Companion implementation plan

> For agentic workers: REQUIRED SUB-SKILL: use superpowers:subagent-driven-development for the approved three workstreams; primary agent owns integration. Checkboxes describe future work, not completed implementation.

**Goal:** Deliver a runnable Windows written-lesson companion, then independently qualify permission-scoped visual guidance.

**Architecture:** Electron main owns OS state, consent and native windows. A sandboxed React renderer receives bounded lesson/session view models through a narrow preload bridge. Shared lesson contracts and the pure overlay policy remain independent of Electron and CAD adapters.

**Tech stack:** Electron, React, TypeScript, Vite, existing pnpm/Vitest/Playwright. Pin a supported Electron release and compatible Vite version during Task 2; record the selection and security review before installing. No new native dependency without the Task 9 feasibility decision.

**Spec:** [Final Compact Companion design](../specs/2026-10-25-desktop-compact-companion-design.md). Read its final-cleanup section as the refinement of earlier layout descriptions.

Status: planning only, awaiting owner approval. No implementation agents launched. No new runtime dependencies installed.

## Global constraints

- Windows first; no website edits, extension orchestration imports, browser selector ports, AI, automatic CAD clicks, model edits, unattended capture, installer or updater.
- Official circular SVGs from main are immutable. Navy #0E2943, ivory #F5EFE7, Hay's Russet #793327. Bundle licensed Manrope and Space Grotesk locally.
- Teaching window 365 × 600 DIP; width 320–480, height 400–760 subject to work area. Collapsed 280 × 112. Maintain 8px work-area margin.
- Help falls back to a single body scroller below six rendered line heights, 126px at 100% text. Settings has one return action with focus restoration.
- Ten-second focus handoff, five-second observation ceiling, 750ms evidence freshness are prototype parameters requiring live usability testing. Known invalidation cancels immediately.
- Highlighting never produces verified geometry or changes progression. UNKNOWN and SELF_REPORTED stay distinct.
- All screenshots/semantic inspection require explicit session consent and a bounded user request. Window metadata monitoring is separate. Never persist raw images, OS handles, URLs, titles, credentials or consent.
- No merges/deployment. No real-CAD PASS from synthetic fixtures.

## Current repository evidence and exact branch strategy

Inspected October 25, 2026 through GitHub PR metadata and fetched commit trees:

| Reference | Head                                     | Status / implication                                                     |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| main      | df1879e                                  | Official branding source; older lesson engine than PR #15                |
| PR #15    | 5dbd09dd8d2be1ce2080834dfad5e3cbc9a67be4 | Draft/open, base test/reduce-manual-onshape-testing, currently mergeable |
| PR #17    | d5f182a6f9cff4a14689d72e11f3779688dcaaa0 | Draft/open, base main, currently conflicting                             |

Read both versions of the roadmap. Main retains historical Phase 1.5 AI wording; PR #17 reconciles Phase 1.5 as teaching UI, Phase 1B as desktop, and Phase 2A as future AI. Follow the approved Phase 1B brief and corrected PR #17 roadmap for planning; do not silently rewrite unrelated main documents.

A read-only three-way inspection identifies README.md as PR #17's textual conflict: preserve main's current branding/navigation references and add the desktop link when that PR is separately resolved. No merge was performed. The pure overlay policy and its tests are added files and can be independently reviewed. PR #17 has no Electron host.

PR #15 versus main differs in 12 shared package files, including lesson transitions/session, Foundations content, evidence contracts and cad-core verification. Treat those as a real behavioral dependency, not a CSS-only cherry-pick.

Recommended execution strategy:

1. Recheck the pinned heads once at execution start. If changed, summarize differences before adapting tasks.
2. Create `feat/phase1b-compact-companion` from PR #15's pinned head in a new worktree. New draft PR targets `design/approved-v1-lesson-ui`. Explicitly describe the combined dependency on PR #15 and its PR #14 stack. No independent merge to main.
3. Import only the two pure `packages/desktop-core/src/overlayPolicy*` files from pinned PR #17 with provenance and tests. Do not merge PR #17, copy its README conflict, or cherry-pick unrelated history. Later changes to the policy must be reviewed against its original safety contract.
4. Copy the four official SVGs byte-for-byte from pinned main into desktop brand assets. Use current main branding even though the implementation base is PR #15. Do not replace the extension's brand files in this desktop PR.
5. Bring finalized design/plan docs as documentation-only changes, retaining source hashes. Current design branch is based on PR #17 and is not a suitable runtime merge base.
6. Agent branches `work/phase1b-teaching`, `work/phase1b-host`, and `work/phase1b-overlay` start from the same integrated contract commit. Primary reviews and transfers their scoped commits into the desktop branch. No shared lockfile edits by agents.
7. After underlying PRs are resolved by the owner, review combined diffs before retargeting. Never force-push an existing PR branch or merge dependencies to simplify planning.

Rejected for this sprint: a clean main branch with an ad hoc lesson-engine rewrite. It would duplicate unmerged behavior and its safety tests. A future standalone main-based port requires a separately reviewed dependency extraction, not an undocumented shortcut.

## Ownership and file map

Exactly three implementation workstreams, plus primary integration duties:

| Owner             | Exclusive files / responsibilities                                                                                                                                            | Dependencies                                                              | Acceptance                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Agent 1, teaching | apps/desktop/src/renderer/{App,LessonWorkspace,ContextualHelp,AskLocal,Settings,CompletionSummary}.tsx; renderer/desktop.css; renderer/lessonController.ts and adjacent tests | Shared contracts and mock bridge from primary; host preference API        | Eight steps, honest outcomes, authored Ask, accessible Help/Settings and theme states         |
| Agent 2, host     | apps/desktop/src/main/{index,session,ipc,preferences,windowPlacement,windowCatalog}.ts; preload/index.ts; adjacent tests                                                      | Contract freeze; renderer entry for launch                                | Secure runnable host, consent lifecycle, durable preferences, no capture by default           |
| Agent 3, visual   | packages/desktop-core/src/{requestLifecycle,overlayPolicy}.ts and tests; apps/desktop/src/main/visual/{provider,context,overlay,adapter}.ts; tests/fixtures/*                 | Host session generation/events; primary contract; native feasibility gate | Safe abstention, cancellation, verified synthetic bounds, isolated native acceptance evidence |
| Primary           | packages/desktop-contracts/_; root/package/lock/config/CI; desktop package/build/dev scripts; tests/integration/_; docs/testing/desktop-acceptance.md                         | All workstreams                                                           | Cross-workstream tests, security/diff review, dependency audit, complete validation           |

File names are proposed new files unless explicitly identified as reused policy. Do not extract one component per visual label or create a generalized provider framework. Agent 1 may adapt portable ContextualHelp/Ask presentation but must remove extension service imports; no import of AssistantPanel, WXT, DOM recognizers, browser storage hooks, or browser positioning code.

At implementation dispatch, use exactly three agents configured as `gpt-6-luna` with `reasoning_effort: xhigh`, as the owner's latest instruction requires. Do not substitute another model. Verify the configuration is available and accepted at launch; if unavailable, report the blocker. No agents are launched or model selections claimed during planning. The primary owns integration, review, cross-workstream tests and final validation. No nested implementation agents.

## Shared TypeScript interface proposal

Freeze this boundary before parallel work. It is a proposal in Markdown, not production source. Main validates runtime input; TypeScript alone does not make IPC safe.

```ts
type RequestId = string;
type SessionToken = string; // opaque session-local alias; not an OS window ID
// Instruction identities only. Existence never implies recognition support.
type ActionId =
  | 'reference.top'
  | 'sketch.start'
  | 'rectangle.corner'
  | 'dimension'
  | 'sketch.finish';
type VisualState =
  'idle' | 'waiting' | 'inspecting' | 'highlighted' | 'unavailable';
type Reason =
  | 'unsupported'
  | 'permission-required'
  | 'window-lost'
  | 'context-unknown'
  | 'ambiguous'
  | 'stale'
  | 'expired'
  | 'canceled'
  | 'invalid-bounds'
  | 'occluded'
  | 'provider-failed';
type WindowChoice = Readonly<{
  token: string;
  label: string;
  kind: 'browser' | 'native';
}>;
type SessionView = Readonly<{
  token: SessionToken | null;
  generation: number;
  binding: 'unbound' | 'selected' | 'disconnected';
  consent: 'off' | 'on-request';
  paused: boolean;
  visual: VisualState;
  reason: Reason | null;
  availableActions: readonly ActionId[]; // empty until independently supported
}>;
type Command =
  | { type: 'select'; windowToken: string }
  | { type: 'consent'; allow: boolean }
  | { type: 'pause'; paused: boolean }
  | { type: 'show'; requestId: RequestId; action: ActionId; generation: number }
  | { type: 'cancel' | 'revoke' | 'disconnect' | 'reset-position' | 'close' };
type DesktopPreferences = Readonly<{
  appearance: 'system' | 'light' | 'dark';
  textScale: 1 | 1.25 | 1.5 | 2;
  keepVisible: boolean;
  reduceMotion: 'system' | 'reduce';
}>;
type DesktopBridge = Readonly<{
  listWindows(): Promise<
    Readonly<{ windows: readonly WindowChoice[]; incomplete: boolean }>
  >;
  command(value: Command): Promise<SessionView>;
  subscribe(listener: (view: SessionView) => void): () => void;
  loadPreferences(): Promise<DesktopPreferences>;
  savePreferences(value: DesktopPreferences): Promise<void>;
  loadLesson(): Promise<unknown>; // parsed via existing lesson schema/adapter
  saveLesson(value: unknown): Promise<void>; // bounded schema validation in main
}>;
```

Production schemas reject extra properties, unknown action IDs, invalid ranges, stale generations and arbitrary strings exceeding limits. Request IDs max 64 characters, opaque window/session tokens max 128, alias labels max 80; allowlisted application names plus ordinals, no private title in exported state. Clamp window catalog to 50 explicit entries with incomplete indication in the host view if needed; do not silently choose a default. The catalog result includes `incomplete` so truncation cannot imply complete enumeration.

Host-only types: `ContextProvider.read(session, signal)` returns a validated context or UNKNOWN; `VisualProvider.observe(action, context, signal)` returns a current candidate or fixed rejection reason. Neither is exposed to the renderer. Candidate includes request/session generation, source window/tab binding, timestamp, exact target identity, uniqueness, measured screenshot dimensions and target/content bounds. Adapt it into PR #17's existing OverlayInput; never let renderer coordinates or confidence authorize a highlight. Context provider must prove selected-window and browser-tab identity independently of image similarity.

Lesson integration consumes the existing `createInitialLessonStepState`, `transitionLessonStep`, `advanceHint`, `reconcileSession`, and approved Foundations lesson. A desktop controller wraps existing state/events; it does not add a geometry verifier. Parse saved records with the existing semantics and an explicit desktop envelope, without persisting visuals/consent. Unknown load records become a visible recovery state, not a silent completed lesson.

## Review focus

- A delayed recognition result after revoke or window reuse must never revive the overlay: Tasks 7, 10.
- Renderer reload/crash cannot leave capture running or persist a grant: Tasks 3, 7.
- Same Chrome window with another tab is not the same CAD context: Task 9.
- Large text and long uncertainty copy must not reduce Help to a sliver or hide Settings recovery: Task 5.
- Save failure or corrupt data must not silently reset or claim persisted lesson progress: Task 6.

## Task sequence and common RED → GREEN discipline

For each task: write the named regression first; run the listed focused command and confirm failure for the intended missing behavior; implement only that task; rerun to pass; inspect its diff; commit with the listed intent. All steps below are future unchecked work. Task 1 precedes all parallel branches. Milestone gates precede native capability enablement.

### Task 1 — Freeze shared boundaries and reuse baseline (primary)

Files: create packages/desktop-contracts/{package.json,src/index.ts,src/index.test.ts}; import packages/desktop-core/src/overlayPolicy.ts and overlayPolicy.test.ts; update workspace/TS aliases only as required.

- [ ] Write schema tests: reject unknown command, extra selector/JS, stale generation, arbitrary target ID, oversized token; accept each closed command. Assert empty availableActions for unsupported context.
- [ ] Run `pnpm exec vitest run packages/desktop-contracts/src/index.test.ts` and confirm RED.
- [ ] Implement runtime schemas for the proposal using the repository's existing schema library; replace catalog ambiguity with a fixed `{ windows, incomplete }` result. Export `parseCommand(input: unknown): Command` and typed DesktopBridge. Declare host-only candidate/context types separately.
- [ ] Run the contract tests and imported overlay tests. Inspect imports to prove no Electron/browser recognition dependency in shared contracts.
- [ ] Commit `feat: define bounded desktop contracts and preserve overlay policy`; publish the contract SHA to exactly three workstreams.

### Task 2 — Runnable development loop (primary bootstrap, Agent 2 host entry)

App.tsx ownership: primary creates only a minimal written-only bootstrap to prove launch. At the shared-contract/bootstrap commit, explicitly hand App.tsx and renderer entry ownership to Agent 1. Agent 2 never edits renderer files; subsequent integration requests go through Agent 1 or primary after handoff acknowledgment. No simultaneous App.tsx ownership.

Files: create apps/desktop/{package.json,index.html,vite.config.ts}; scripts/desktop-dev.mjs; root package scripts; desktop main/index.ts, preload/index.ts, renderer/App.tsx entry. Primary owns dependency/lock changes.

- [ ] Add tests/integration/desktop-launch.spec.ts: launch built Electron, assert one 365×600 companion window, official logo, no screenshot/recognition calls and a written-only state. Renderer must have no require/process or arbitrary IPC.
- [ ] Add `desktop:test:e2e`, `desktop:build`, `dev:desktop` scripts. Run launch test to demonstrate RED before host exists.
- [ ] Pin audited Electron/Vite versions; implement one command that builds preload/main, starts Vite, launches Electron only when ready, reloads renderer edits and safely restarts main/preload edits. Stop both child processes on exit. Bind dev server to localhost only.
- [ ] Use contextIsolation, sandbox and nodeIntegration false; reject unexpected navigations/new windows and IPC senders. Production uses bundled local content, no arbitrary URL input.
- [ ] Run build and launch test, manually edit a renderer label to demonstrate HMR then restore it. Verify main restart revokes session. Commit `feat: launch written-only desktop development shell`.

### Task 3 — Bridge security and window lifecycle (Agent 2)

Files: main/ipc.ts, main/session.ts, preload/index.ts; adjacent unit tests.

- [ ] Test invalid sender frame, unsupported command, prototype-polluted payload, repeated subscribe/unsubscribe, renderer crash, and close. Assert no unsafe host operation and zero retained subscribers.
- [ ] Run `pnpm exec vitest run apps/desktop/src/main/ipc.test.ts apps/desktop/src/main/session.test.ts` for RED.
- [ ] Implement `createSessionController(deps)` with command dispatch and read-only SessionView; preload exposes only DesktopBridge. Close/crash/restart cancels work and revokes consent before disposing resources.
- [ ] Run focused tests and launch smoke. Commit `feat: isolate desktop session IPC and lifecycle`.

### Task 4 — Eight-step written teaching and local Ask (Agent 1)

Files: renderer/lessonController.ts, LessonWorkspace.tsx, AskLocal.tsx and tests. Reuse existing shared engine/content; no changes to its outcomes.

- [ ] Write tests for all eight steps using actual allowed events: acknowledgement, explicit continue without verification/self-report, Back/Next boundaries, ordered hints, Pause/Resume and confirmed restart. Assert no MODEL_VERIFIED result from rendering, Mark done, Ask or SHOW.
- [ ] Run `pnpm exec vitest run apps/desktop/src/renderer/lessonController.test.ts apps/desktop/src/renderer/AskLocal.test.tsx` for RED.
- [ ] Implement `createDesktopLessonController(saved: unknown)` exposing current view and typed manual events backed by the existing engine. Adapt authored local example content; clear answer on step change. Do not copy AssistantPanel or introduce AI/network calls.
- [ ] Assert Ask keeps current context and progress; no simulated action enters the evidence store. Run focused tests. Commit `feat: teach the existing lesson in desktop written mode`.

### Task 5 — Finalized presentation and accessibility (Agent 1)

Files: renderer/ContextualHelp.tsx, Settings.tsx, CompletionSummary.tsx, desktop.css; assets/brand/_; assets/fonts/_; adjacent tests and tests/integration/desktop-layout.spec.ts.

- [ ] Test 365×600 Help with <126px available uses one body scroller; 200% text uses six line heights; no nested scrolling. Test Settings recovery actions, one contextual Back and focus restoration. Test End reaches outcome 8 without progress mutation.
- [ ] Run relevant component tests for RED; build host and run `pnpm desktop:test:e2e --grep layout` for initial failure.
- [ ] Implement CSS-first layout and only one overflow measurement if needed. Bundle official assets byte-for-byte from main and licensed fonts. Preserve default dimensions and minimal styles. Add actual enabled hover contrast checks using the existing measurement approach, plus dark ivory/light-text negative control.
- [ ] Cover light/dark/system, 320px width, short height, text scale 200%, reduced motion, focused scrollbar, disabled reasons and Help Escape. Keep immutable SVGs exempt from destructive format changes with a narrow documented rule.
- [ ] Compare screenshots with final design boards, verify asset hashes and contrast >=4.5:1. Commit `feat: render accessible compact desktop teaching views`.

### Task 6 — Preference/lesson persistence and placement (Agent 2)

Files: main/preferences.ts, windowPlacement.ts and tests; renderer uses bridge only.

- [ ] Test corrupt schema, interrupted atomic write, disk error, retry, offscreen saved bounds and removed display. Assert no silent reset/Saved claim; clamp within work area; never restore consent or OS handles.
- [ ] Run `pnpm exec vitest run apps/desktop/src/main/preferences.test.ts apps/desktop/src/main/windowPlacement.test.ts` for RED.
- [ ] Implement `loadDesktopState()` / `saveDesktopState(value)` with versioned validated envelopes and atomic replacement. Persist only permitted lesson/preferences and safe panel placement. Preserve in-memory progress on write failure.
- [ ] Test reset panel position without CAD movement, collapse preserves pause state, native Move/Size, and reload progress. Commit `feat: persist desktop learning and safe panel placement`.

### Milestone 1 gate

- [ ] Primary runs `pnpm dev:desktop`, desktop build/component/host smoke and existing shared engine tests. Demonstrate full written lesson, authored Ask, fonts/brand, move/resize, help/settings and persistence. Capture fixture screenshots. Report runnable desktop only; visual guidance remains unavailable. No installer.

### Task 7 — Explicit selection, consent and request lifecycle (Agent 2 with Agent 3 request state)

Files: main/windowCatalog.ts, session.ts; desktop-core/src/requestLifecycle.ts with tests. Ownership: Agent 2 session/catalog, Agent 3 pure request reducer.

- [ ] Test no default selection, vanished choice, reused native handle, no thumbnail calls before consent, and no capture/control inspection between requests. Consent denial must retain written lessons.
- [ ] Test `transitionRequest(state,event,nowMs)` with a fake clock: 10,000ms pending expiry; validated handoff starts a new 5,000ms ceiling; cancel/revoke/pause/disconnect/step-change/settings invalidate generation; late result ignored. Freshness is not extended by repaint.
- [ ] Run catalog/session/request tests for RED. Implement metadata-only catalog provider with no screenshots; if enumeration cannot be done without capture, report unavailable instead of silently prompting.
- [ ] Connect stop/revoke, change window, reset placement, report action and cancel status. Report first clears overlay, previews bounded non-sensitive data locally; no automatic upload/export.
- [ ] Run focused tests plus renderer/host integration. Commit per owner `feat: scope visual consent and cancelable requests`.

### Milestone 2 gate

- [ ] On Windows, demonstrate selection of an actual local disposable fixture window, explicit consent, no observation on decline, pause/revoke/disconnect and crash cleanup. If no safe catalog provider is ready, retain an honest BLOCKED native-selection result; simulated lifecycle tests alone do not pass this milestone.

### Task 8 — Synthetic visual adapter and overlay integration (Agent 3)

Files: main/visual/provider.ts, context.ts, overlay.ts, adapter.ts; tests/fixtures/synthetic-cad.html; adjacent tests. No real-CAD support enabled.

- [ ] Test synthetic unique target, duplicates, hidden/disabled target, stale generation/frame, different source window, invalid/NaN/out-of-frame boxes, occlusion and negative monitor coordinates. Assert correct policy reasons and no lesson outcome changes.
- [ ] Run `pnpm exec vitest run packages/desktop-core apps/desktop/src/main/visual` for RED.
- [ ] Implement mock provider only in explicit fixture builds; production provider defaults unsupported. Map validated candidates through the existing policy. One non-focusable overlay window, no controls, with OS-level ignoreMouseEvents; use showInactive semantics and confirm API behavior on Windows later.
- [ ] Add primary-owned tests/integration/desktop-overlay.spec.ts: selected fixture receives real pointer input through outline; Leqad panel remains interactive; late event after cancel cannot recreate overlay. Commit `feat: exercise desktop overlay through explicit synthetic fixtures`.

### Task 9 — Native context/capture feasibility decision (Agent 3 investigation, primary gate)

Files: docs/testing/desktop-native-feasibility.md; main/visual/provider.ts, context.ts only after evidence supports a provider; tests for selected provider.

- [ ] Record actual Windows version, Electron version, architecture, foreground/window identity API, selected-window capture source mapping, content-bound origin, occlusion limits and per-monitor DPI semantics. Investigate Windows accessibility using an authorized disposable app; do not save raw trees/private labels.
- [ ] Test whether Electron enumeration can avoid thumbnails and whether capture excludes unrelated windows/panel overlays. Stop if the user cannot consent before any frame. Reject a screen-wide fallback.
- [ ] Investigate browser tab identity separately. Window title, same process, and image similarity are insufficient. Do not add an extension bridge, browser automation or DOM selectors implicitly; if a new trusted bridge is needed, return a specific proposal for approval and keep Onshape SHOW unsupported.
- [ ] Gate each provider: document observed API semantics and tests; test failures before implementation; implement only proven boundaries. Native dependency selection requires primary security review and owner scope approval if it changes the approved architecture. AbortSignal and session generation guard every async result.
- [ ] Record GO/BLOCKED for capture, identity, accessibility and mapping independently. Commit `docs: record Windows visual guidance feasibility evidence` and only separately reviewed evidence-backed provider changes. No guessed recognition adapter.

### Task 10 — Freshness, DPI, foreground and revocation hardening (Agent 3)

Files: visual/context.ts, overlay.ts; desktop-core/requestLifecycle.ts; tests/integration/desktop-invalidation.spec.ts.

- [ ] Add RED cases for app switch, same-browser tab switch, target close, native handle reuse, minimized window, toolbar/layout change, monitor move/removal, DPI/zoom change, provider crash, revoked access and renderer reload.
- [ ] Assert known invalidation hides immediately on host event; no current observation survives beyond 750ms; pending/inspection deadlines expire and do not auto-retry. Use fake clock in unit tests and measured real timings on Windows.
- [ ] Implement only supported native invalidation sources; unsupported events mean context UNKNOWN and no live overlay. Coordinates must derive from measured capture-content bounds, never guessed titlebar offsets.
- [ ] Run pure tests and native fixture host tests. Commit `fix: invalidate desktop overlays on context and permission changes`.

### Milestone 3 gate

- [ ] Require real Windows proof of selected-window authorization, correct mapping, native click-through, focus-loss hiding and cleanup before enabling a live target. Synthetic PASS does not satisfy this gate. Onshape tab identity and native CAD adapters have independent statuses. Keep written lessons usable if blocked.

### Task 11 — Independent CAD acceptance (primary with owner)

Files: docs/testing/desktop-acceptance.md and sanitized pending-review reports, excluded from automatic commits until reviewed.

- [ ] Prepare a checklist keyed by app/OS/build/fixture-or-live provenance, test name, PASS/FAIL/BLOCKED, short observed result, and evidence limitations. Do not include document IDs, titles, URLs, credentials or raw images.
- [ ] Run serially in an authorized disposable Onshape Part Studio: window/tab binding, manual SHOW, correct target bounds or safe abstention, tab/app switching, text/zoom/layout changes, cancellation, capture revocation and no CAD input interception. No automation beyond separately authorized scope.
- [ ] Test FreeCAD separately with a disposable document and native context. Reuse safety contracts, not Onshape assumptions. Failure in either app cannot be masked by success in the other.
- [ ] Owner performs 100/125/150% display scaling, 200% text, mixed monitors/negative coordinates, keyboard/Narrator, pin/minimize/collapse, and restart persistence. Mark unavailable hardware scenarios BLOCKED.
- [ ] Prioritize demonstrated failures with failing regression → narrow fix → full checks → native retest. Commit only sanitized owner-reviewed evidence. Stop for missing native access or required evidence, rather than expanding infrastructure.

### Task 12 — Integrated review and delivery (primary)

Files: root CI configuration for Windows desktop fixture lane; desktop acceptance docs; approved code from all three owners.

- [ ] Review imports/dependencies, IPC sender/schema checks, navigation restrictions, disposal, native memory lifetimes, evidence integrity, text contrast and interface consistency. Verify no website/extension behavioral changes.
- [ ] Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm reference:test`, `pnpm reference:validate`, `pnpm test:e2e`, `pnpm build`, `pnpm build:edge`, `pnpm package:browsers` on the PR #15-based branch; these scripts exist on that baseline, not all on main.
- [ ] Run new `pnpm desktop:build`, `pnpm desktop:test`, `pnpm desktop:test:e2e` on supported runners. Add Windows fixture jobs without CAD credentials or saved profiles. Record actual versions, counts, failures, commit and CI URLs.
- [ ] Compare final screenshots to approved boards, publish a reviewable draft PR and development instructions; distinguish fixture, Windows runtime, and live CAD results. No installer or updater. Preserve BLOCKED evidence and leave all PRs unmerged.

## Milestone acceptance matrix

| Milestone | Required positive result                                                                      | Required negative result                                                         | Stop condition                                                 |
| --------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1         | dev:desktop launches, HMR works, eight steps and local Ask, official assets, durable progress | no network AI/capture; corrupt/save error visible; unsupported SHOW honest       | runtime cannot launch securely or lesson semantics differ      |
| 2         | explicit actual window binding, consent, pause/revoke/disconnect                              | denied permission still permits teaching; no thumbnail/inspection before consent | provider cannot enforce consent or lifecycle                   |
| 3         | measured native mapping and click-through with current context                                | stale/ambiguous/wrong window/tab never highlighted; no progress mutation         | any native context/capture safety gap                          |
| 4         | independently recorded Windows, Onshape and FreeCAD acceptance; accessibility results         | negative cases actually exercised; unavailable cases BLOCKED                     | live access/evidence missing; no false completion announcement |

## Risk register

| Risk / owner                                            | Mitigation and evidence needed                                                  | Default until resolved           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------- |
| Unmerged shared packages / primary                      | Stack on pinned PR #15; review combined diff before retargeting                 | no independent main merge        |
| PR #17 README conflict / primary                        | Reuse pure files only; preserve main branding when conflict separately resolved | leave PR #17 unchanged           |
| Capture catalog secretly creates frames / Agent 2       | Trace API calls before consent in Windows fixture                               | selection unavailable            |
| Active Chrome tab not known / Agent 3                   | trusted independently validated identity provider, separately reviewed scope    | Onshape SHOW unsupported         |
| UI Automation does not expose unique controls / Agent 3 | bounded authorized observed evidence and negative cases                         | written fallback, no guessed IDs |
| Foreground/occlusion events delayed / Agent 3           | native measurements, generation invalidation and freshness deadline             | overlay hidden                   |
| DPI/content mapping wrong / Agent 3                     | 100/125/150%, negative coordinates, mixed monitors, zoom                        | invalidate and abstain           |
| Transparent window steals input / Agent 3               | actual native pointer and keyboard pass-through test                            | no live overlay                  |
| Panel/capture leaks private data / Agent 2              | selected-window-only provider, buffer disposal, no automatic export             | no capture                       |
| Font/layout growth hides recovery / Agent 1             | six-line fallback, 200% text and keyboard scroll tests                          | accessible whole-body scroll     |
| Electron/native dependency lifecycle / primary          | pinned supported versions, audit/licensing, narrow IPC, native module review    | no unreviewed dependency         |
| Owner hardware/auth unavailable / primary               | prepare one concise smoke protocol; stop and request access                     | live acceptance BLOCKED          |

## Plan self-review

Coverage checked against final design: selection/consent Tasks 7/9; teaching/Ask Task 4; responsive Help/Settings/completion Task 5; persistence/placement Task 6; overlays/context Tasks 8–10; accessibility Tasks 5/11; phases and delivery Task 12. Exactly three implementers with primary ownership of shared contracts, lockfile, integration tests and review.

Correction made during review: catalog return includes incomplete status, rather than silently truncating WindowChoice[]. Freeze that proposal in Task 1 before dispatch. Native provider selection is deliberately an evidence gate with an explicit BLOCKED outcome; it is not permission for agents to invent working recognition. No implementation work is authorized until the owner approves this plan.

Execution amendment: the owner later limited active implementation to two GPT-6 Luna extra-high agents at regular speed. Renderer and host remain agent-owned; the primary takes over the third workstream’s integration tests and review. No additional agents or capture/overlay implementation are authorized in Milestone 1.
