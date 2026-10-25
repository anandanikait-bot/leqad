# Leqad Phase 1.5 — Teaching experience design

Status: proposed specification for owner review. The inline-help direction is approved; this complete specification is not yet approved for implementation.

## Intent and scope

Polish the actual Onshape extension's eight-step Your First Sketch lesson. Keep students oriented while they request progressively stronger help. Prepare an explicitly local Ask prototype without introducing AI, screenshots, CAD automation, new browser permissions, or model verification.

The marketing website is outside this work. No merge or deployment is authorized. Real Onshape acceptance remains distinct from fixture tests.

## Baseline audit

Inspected extension branch `design/approved-v1-lesson-ui`, local and remote head `286ccb311a93ae3583d02e894b210cf1768251e3`.

- `AssistantPanel.tsx` already coordinates lesson progression, five ordered hints, explanation/recovery content, HINT/SHOW/GUIDE requests, evidence feedback, pause/resume, restart, dragging, collapse, and Learn/Projects/Ask modes.
- The existing evidence presentation distinguishes acknowledgement, UI verification, model verification, self-report, and inability to verify. Tests already protect these distinctions, unknown progress, active Sketch updates, and dimensions that cannot be verified by interface evidence.
- Progress and preferences have existing persistence. `usePreferencePersistence.ts` debounces writes, flushes on page exit/unmount, exposes save failure, and supports retry. Preserve its contract and stored schemas.
- The expanded panel is normally 365px wide, constrained by viewport width; collapse uses 280px. Height is viewport-constrained, but the whole body scrolls. Expanded hints, explanations, recovery, diagnostics, and controls can compete for space and push the primary action away.
- Existing pointer and keyboard dragging, highlight cleanup, settings, themes, assistance preferences, and approved logo are functional integration points, not mockups to replace.
- Ask currently contains placeholder copy. Projects is also a preview. Neither establishes an implemented contextual AI service.
- Existing panel CSS includes a decorative shadow. This phase removes it from the teaching shell in favor of the approved restrained border treatment.

This audit establishes code behavior, not fresh live Onshape compatibility. No current authenticated session was inspected. Before implementation, inspect PR comments and outstanding issues for newer constraints and recheck baseline divergence; do not silently overwrite subsequent work.

## Approaches and decision

1. **Inline bounded help:** preserve the lesson context and primary action while help occupies a capped internal region. Selected by the owner. Requires deliberate height budgeting and a compact-height fallback.
2. **Temporary help screen:** gives explanations more room but hides the current task and requires returning to the lesson. Rejected in favor of continuous context.
3. **Separate floating help window:** creates another obstruction and additional focus/position state. Does not fit the requested minimal interface.

Reuse the current WXT/React/TypeScript architecture. Extract presentation components only where they clarify responsibilities; keep recognition, verification, lesson transitions, and persistence in their existing owners.

## Component hierarchy

```text
AssistantPanel (existing orchestration, callbacks, persistence)
  PanelHeader (existing brand, drag handle, settings, collapse)
  Existing mode navigation
  LearningWorkspace
    LessonContext (lesson, current step, objective, compact progress)
    StepInstruction (current action)
    ContextualHelp (disclosure and selected content, bounded scrolling)
    EvidenceFeedback (concise current state, evidence scope)
    LessonActions (existing primary action and navigation callbacks)
  AskPrototype (existing Ask mode only)
  Existing settings / opt-in diagnostics
```

Names describe responsibilities, not a requirement to create one file per line. Keep existing diagnostics behind their existing opt-in controls. They must not become ordinary lesson guidance. Settings and diagnostics may retain their dedicated scrolling surfaces.

## Learning workspace and action hierarchy

The context region identifies Your First Sketch, current step and total count, objective, and completion progress. Preserve the progress calculation and its caveat that completing steps does not necessarily verify CAD work.

One action receives primary visual emphasis. Use existing availability predicates and callbacks: acknowledge an informational step, check progress when supported, or mark done with a self-report explanation when verification is unavailable. Once the current step is completed, Next becomes visually primary if already allowed. Paused lessons offer Resume. Do not change progression gates or introduce automatic advancement.

Back, Pause, and Restart remain secondary controls. Preserve existing restart and resume semantics, including saved progress and preferences. Do not introduce a new persistence schema or silently reset settings. Keep the existing disabled reasons and navigation boundaries accessible.

## Inline contextual help

Default: help is closed, with a concise Help disclosure. Opening it reveals the first short hint without advancing lesson progress. Existing stored hint usage remains authoritative; reopening help must not reset previously requested hints or count additional usage merely from rendering.

Within the open region, expose explicit choices:

- **Hint:** existing ordered hint content; More help advances through existing hints, with the existing maximum and recovery behavior.
- **Detailed guidance:** existing written action/recovery guidance and existing HINT/SHOW/GUIDE controls. Do not manufacture new control recognition. Unsupported GUIDE retains its explanation and fallback.
- **Why it matters:** existing engineering explanation for the step.
- **Unable to verify:** available when uncertainty requires it; explains what is observed, what remains unknown, and how to check manually using existing lesson content.

Show one content section at a time, not a stack of all sections. These are teaching presentation choices, separate from the existing HINT/SHOW/GUIDE assistance levels. Changing an explanation section must not trigger SHOW or GUIDE. Highlighting still requires the existing explicit action and safety checks.

The short evidence summary remains visible outside help. Do not hide essential uncertainty, self-report qualification, or unavailable-action reasons inside a closed disclosure.

Help opens/closes without changing the selected lesson step. Reset the open section on step change, restart, and document context change; retain persisted hint history. Collapse closes transient help and applies existing highlight lifecycle cleanup. On expansion, restore the lesson context without automatically reopening a highlight or running a check. Preserve existing written fallback retention where the guidance runner requires it.

## Size, scrolling, and responsive behavior

Use the existing 365px default expanded width and viewport clamp, 280px collapsed width, and an 8px minimum viewport margin. No new panel resize handle: support viewport resizing and browser zoom with existing position clamping.

On ordinary desktop heights, use a flex/grid shell with non-scrolling context and action regions and a flexible help region. Proposed help cap: `min(240px, 30dvh)` and no more than the space remaining after context/actions. The panel never exceeds `100dvh - 16px`. These are builder defaults to validate, not permission to truncate content.

Only help scrolls during the ordinary expanded-help workflow. Give it an accessible name, keyboard reachability when scrollable, visible focus, and contained overscroll. Do not intercept CAD wheel events outside the panel. Avoid stacked scrollbars for the normal learning view.

At very short effective viewport heights, keeping every region permanently visible is physically impossible. Use one accessible panel-body scroller, disable help's independent scrolling in that compact-height mode, and keep the primary-action footer visible where it can fit without obscuring content. All content remains reachable; no clipped controls or mandatory minimum help height. Determine the breakpoint from measured content, including text enlargement, rather than assuming a device type. This fallback is explicitly part of the proposed design for owner review.

Dragging remains manual and keyboard accessible. Clamp position after viewport changes. Do not attempt automatic repositioning based on guessed Onshape controls. A movable, collapsible bounded panel reduces obstruction; it cannot guarantee zero overlap with every third-party layout.

## Evidence and feedback states

Presentation derives from current lesson state and supported evidence; it never writes a stronger outcome.

| Presentation                  | Required source                                | Wording boundary                                                |
| ----------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Not started                   | Existing lesson not-started state              | Invitation to begin; no observed-action claim                   |
| In progress                   | Started lesson, incomplete steps               | Progress describes lesson activity                              |
| Waiting for learner           | Active step, no completion evidence            | Student performs the action in Onshape                          |
| Action observed, not verified | Actual supported current observation           | Name only the observed UI fact; no geometry claim               |
| UI verified                   | Existing UI_VERIFIED outcome                   | State which interface state was established; geometry unchecked |
| Model verified                | Existing MODEL_VERIFIED outcome only           | No new producer or inference introduced in this phase           |
| Unable to verify              | UNKNOWN/unavailable/ambiguous current evidence | Explain uncertainty and manual option                           |
| Marked done                   | SELF_REPORTED outcome                          | Explicitly learner reported, CAD work unverified                |
| Acknowledged                  | ACKNOWLEDGED outcome                           | Informational acknowledgement only                              |
| Lesson completed              | Existing completion rule                       | Completion summary preserves each step's evidence category      |

Paused and needs-correction states retain their existing behavior and recovery text. Current uncertainty remains visible even when historical progress includes a completed step. Do not relabel a stale observation as current verification. Use explicit text/icons, never color alone, and announce meaningful changes politely without repeating on every render.

## Ask prototype

Keep Ask in its existing mode. Display **Local prototype — no AI connected** persistently. Provide a small set of authored example questions tied to the current step, such as “Why use Corner Rectangle?” Examples use existing approved lesson explanations; no fabricated responses to arbitrary questions.

Show a read-only context summary: lesson, step, requested help level, and only supported current observations already available to the panel. Unknown values remain explicitly unknown. Do not collect additional page data for this view.

A future-facing internal TypeScript contract may describe lesson/step IDs, closed supported action identities, evidence summaries with scope, question text, and requested assistance level. Responses have separate explanation, hint, evidence, and uncertainty fields. For this phase, sample questions select deterministic local examples only. No arbitrary selectors, executable code, network calls, screenshots, document IDs, question logging, or persistence of questions. The interface does not start highlighting, verify steps, or modify progress. Do not build a chat service or generalized provider framework.

Every example response is labeled **Local example**, including examples of uncertainty. Any illustrative evidence must be labeled hypothetical and must never enter lesson state; prefer actual existing context or explicit unknown over hypothetical evidence. Returning to Learn preserves the current step and existing mode-switch cleanup behavior.

## Visual and accessibility rules

Preserve the approved SVG geometry, header dimensions, Space Grotesk/Manrope usage, and existing theme preferences. Use navy `#0E2943`, russet `#793327`, and ivory `#F5EFE7` with existing approved theme tokens. Preserve dark/system appearance choices, with contrast checked in each resolved theme.

Use spacing and restrained separators rather than extra cards, decorative shadows, glow, or gradients. Keep normal text readable; do not shrink instructions merely to fit. Target WCAG AA text contrast and visible keyboard focus. Disclosure controls expose expanded state and relationships; section controls use appropriate native button semantics. Escape closes help and returns focus to its disclosure without consuming Escape elsewhere. Step navigation places focus predictably on the new step heading when initiated by the learner; passive evidence updates never steal focus.

Honor reduced motion. Collapsed content is absent from tab order. Ask remains clearly a prototype for screen readers as well as visually.

## Validation and review artifacts

Before implementation, capture the existing UI with deterministic fixture data. Afterward capture matching desktop, narrow panel, expanded help, collapsed, and unable-to-verify states. Include a local Ask example and a short-height/zoom view. Clearly label screenshots as extension fixtures, not authenticated Onshape evidence. Use consistent dimensions and data for before/after comparisons.

Regression coverage must demonstrate:

- Original eight-step flow, acknowledgement, self-report, supported UI checks, pause/resume, back/next/restart, reload persistence, and preferences remain intact.
- Help starts closed, exposes one section at a time, preserves ordered hints, scrolls internally at ordinary heights, and keeps context/actions visible.
- Short-height fallback has no inaccessible content or competing nested scrollbars; viewport resize and zoom retain reachable controls.
- Uncertainty, stale/missing observations, observed UI facts, and self-reported completion cannot acquire verified styling or outcomes.
- Opening help or Ask does not click CAD controls, invoke recognition unnecessarily, advance steps, or send requests.
- Existing highlight cleanup on collapse, step/mode changes, navigation, and DOM changes remains covered.
- Keyboard disclosure, Escape/focus return, dragging, collapsed tab order, reduced motion, and theme contrast remain usable.

Run focused regressions during implementation, then formatting, lint, typecheck, unit/component tests, reference tests/validation, browser tests, Chrome/Edge builds and packaging at delivery. Preserve the existing suites. Validate viewports including 320px effective width, normal desktop, short height, and 200% zoom/reflow. Record exact commands, counts, failures, commit, and CI link; do not substitute a build for a browser test.

Owner live acceptance afterward: load the tested extension in an authorized disposable Onshape Part Studio, complete the lesson with honest evidence labels, open long help, drag/collapse/resize, exercise existing SHOW, navigate documents, and reload to confirm progress/preferences. No claim that fixture tests establish real Onshape compatibility.

## Boundaries and sequence

1. Owner reviews this complete specification, especially the compact-height fallback and local-example Ask scope.
2. After approval, write the implementation plan using Superpowers writing-plans.
3. Capture the baseline and implement presentation changes with focused regressions, preserving behavioral contracts.
4. Deliver tests, paired screenshots, audit, changed files, remaining limitations, and installation artifact for review.
5. Keep the PR unmerged and deployment blocked pending explicit owner approval.

No application code, dependencies, website files, recognition selectors, verification rules, or persistence migrations are authorized by the specification-writing step itself.
