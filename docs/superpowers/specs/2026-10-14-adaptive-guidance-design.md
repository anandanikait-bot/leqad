# Adaptive Visual Guidance Design

**Status:** approved for implementation planning. This document records the design direction and is not an implementation plan.

## Goal

Add a small reusable guidance layer to the existing Phase 1 extension. Students choose HINT, SHOW, or GUIDE assistance. A future AI teacher may submit a validated action identifier and level, but the extension owns all supported guidance content, target matching, UI observations, and transitions.

The learner continues to perform every CAD action. A guidance request, an observed menu transition, or a highlight never verifies that the learner performed an action or changed model geometry.

## Repository audit

- `AssistantPanel` renders one **Show me** action for a step and forwards its lesson `semanticTarget` to the content-script highlighter. The current highlighter uses a single pointer-events-none outline, revalidates its target, and removes it on DOM changes, navigation lifecycle cleanup, or timeout.
- `I’m stuck` advances a stored progressive text hint. It is not a selectable assistance level. No guide sequence runner exists.
- The target registry contains `sketch`, `rectangle`, `dimension`, and `finish-sketch`. The current Rectangle label set combines `Rectangle`, `Corner rectangle`, and `Center point rectangle`; it must not be used as proof that those variants exist in Onshape.
- The lesson has UI observers for Top-plane selection and current sketch-editing controls. Rectangle geometry, dimension values, and committed sketch state remain unverified and continue to allow explicit self-reported completion.
- The existing diagnostics are opt-in, bounded, structurally sanitized, and use passive capture listeners. Their DOM fixtures are explicitly marked simulations. The repository has no captured Rectangle dropdown structure. The owner reports that Top highlighting now works in an authorized Onshape session; preserve the existing resolver and overlay behavior.

## Design options

1. **Put recipes in lesson definitions.** This colocates teaching content with step state, but mixes help progress with lesson completion and evidence handling.
2. **Put sequencing in the semantic target resolver.** This reuses recognition code, but makes target matching responsible for UI state, timeouts, and cancellation.
3. **Use a typed guidance registry and a separate runner (recommended).** The registry declares supported action identities and recipes. The runner owns only guidance state and transitions. The runner calls injected target and observation interfaces; it contains no DOM selectors. The panel and existing resolver/highlighter remain separate.

## Public request contract

Expose a versioned, runtime-validated request with a small closed vocabulary:

```ts
type GuidanceLevel = 'HINT' | 'SHOW' | 'GUIDE';
type GuidanceActionId =
  'sketch' | 'rectangle-tool-group' | 'dimension' | 'finish-sketch';

interface GuidanceRequest {
  version: 1;
  level: GuidanceLevel;
  actionId: GuidanceActionId;
}
```

Only this request crosses the future teacher boundary. It carries no CSS selector, DOM node, JavaScript, free-form recipe, or executable text. Unknown properties, levels, and action IDs are rejected. Display text and recipes are looked up locally.

Each `GuidanceActionDefinition` declares:

- Its exact registered target identity. `rectangle-tool-group` identifies the toolbar group; individual Rectangle variants have separate target identities and are registered only after a real capture confirms each exact label and structural relationship.
- Required current UI context, represented by a closed enum such as `PART_STUDIO` or `SKETCH_EDITING`.
- Which of HINT, SHOW, and GUIDE are supported.
- Static hint content, an optional validated region target, and an optional declarative GUIDE recipe.
- Required UI observations for guidance eligibility and target display. These are interface requirements only; there is no `completionEvidence` field that could promote help to lesson verification.

HINT may explain an action and optionally highlight a validated general toolbar region. SHOW calls the existing exact-target resolver and highlight service. GUIDE runs only a registered recipe. An unsupported level returns a typed unsupported result and a plain explanation.

## Guide runner

The runner is independent of DOM recognition. It receives host functions through a narrow interface: `resolveTarget(targetId)`, `highlightTarget(targetId)`, and `observe(transitionId)`. Each function delegates to existing recognition or a registered observer; the runner does not construct selectors or inspect DOM directly.

A recipe is a fixed ordered list of typed steps, for example:

```ts
type GuidanceStep =
  | { kind: 'INSTRUCT'; contentId: GuidanceContentId }
  | { kind: 'HIGHLIGHT'; targetId: GuidanceTargetId }
  | {
      kind: 'WAIT_FOR_UI_STATE';
      observationId: GuidanceObservationId;
      expected: 'OPEN' | 'CLOSED' | 'SELECTED';
      timeoutMs: number;
    };
```

The runner may report `READY`, `WAITING`, `UNSUPPORTED`, `MISSING`, `AMBIGUOUS`, `TIMED_OUT`, or `CANCELLED`. At start, it resolves the current UI state: if a validated menu is already open, it skips the trigger and open-wait steps. Registered observers report the same open transition whether it followed a pointer or keyboard action. A guide step completing means only that its instruction or UI observation completed; it never updates the lesson step state. The runner never calls `.click()` or dispatches input events.

Only one highlight is active. Advancing to another target calls the existing highlighter, which clears the previous overlay. Cancel timers, subscriptions, and highlights on pause, collapse, step change, navigation, target removal, menu close, retry, cancellation, or replacement. A missing or ambiguous target, a closed menu during a wait, or a timeout clears transient guidance and returns to written instructions with an explicit reason and a user-controlled Retry option. A menu transition may advance the guide after it is observed, but the message must describe the observed UI state rather than claim who caused it.

## Student controls and stored preferences

Expose HINT, SHOW, and GUIDE as explicit student choices. Keep progressive hint text separate from the selected help level: requesting another HINT may advance the existing hint count, while selecting SHOW or GUIDE does not mutate lesson progress. Persist the selected help level in the versioned panel preferences with a safe default of HINT and preserve old preference records.

An unsupported GUIDE level is visibly unavailable with a reason. Keep the existing Show me behavior and Top-plane target unchanged. The panel must not describe a menu as open until the registered observer reports it.

## Rectangle dropdown diagnostics and first recipe

The first multi-step recipe is for the Rectangle tool group, whose identity is separate from its individual menu variants:

1. Identify the exact Rectangle dropdown trigger.
2. Wait for an observed open transition.
3. Highlight one exact allowlisted menu item after its real identity is confirmed.

The repository does not establish that Onshape exposes this dropdown, its trigger semantics, its menu structure, or any individual Rectangle variant. Therefore:

- Add an opt-in **Capture Rectangle dropdown** diagnostic that requires the user to open the menu manually.
- Capture a baseline and bounded structural diff showing which controls appeared, disappeared, changed, or moved to another document branch. If capture starts with the menu already OPEN, report that baseline and ask the user to close/reopen manually when both CLOSED and OPEN states are needed.
- Reuse the existing bounded structural diagnostic patterns. Record only allowlisted tool labels and structural metadata. Never export arbitrary text, HTML, class names, element IDs, URLs, credentials, account data, or CAD content.
- Use explicit scan, ancestor, sibling, label, time, and report-size limits. Any limit produces an explicit incomplete/truncated status, never an absent-control claim.
- Mark a snapshot OPEN/CLOSED only from observed DOM state; otherwise retain the structural baseline/transition and report UNKNOWN.
- Use one-shot passive pointer/keyboard event capture per user-operated transition, paired with DOM-state observation; do not infer that a menu opened from an event alone. Listeners must not cancel, stop, or replace user events. Cancel listeners and observers on success, timeout, user cancellation, navigation, or panel unmount.
- Until the owner supplies a sanitized real capture, the production Rectangle dropdown recipe and all variant targets remain unsupported. Simulated fixtures may exercise the runner but must say they are simulations. Do not alter production Rectangle recognition based on those fixtures.

The capture should report whether menu descendants are nested under the trigger or rendered elsewhere. Describe a non-descendant as a separate document branch; do not infer framework-level portal behavior. A relationship may be described as associated only when observed from DOM relationships or matching accessibility references; otherwise report UNKNOWN. Attribute values that can contain IDs or private text are never serialized.

## Privacy and observability contract

Use explicit allowlists for tag/role enums and tool-label identities. Serialize attribute-presence booleans and allowlisted state values only. Do not serialize raw `aria-controls`/`aria-owns` values; they may be compared in memory for a relationship, then discarded. Cap every traversal and serialized report. If an option label is not allowlisted, omit its text and increment an `unlistedLabelCount` field. Keep `productionRecognition` out of this report; diagnostic observations do not assert production recognition.

## Styling and accessibility

Reuse the current calm outline and its reduced-motion handling. Keep pointer events transparent, avoid flashing, and show at most one outline. Announce HINT/SHOW/GUIDE status and observed transitions through the panel's polite live region. Guide controls remain operable by keyboard. A timeout or unsupported observation returns to the written instructions without changing lesson progress.

## Validation

### Unit tests

- Request schema accepts only registered level/action IDs and rejects selectors, scripts, unknown IDs, and unexpected fields.
- Registry definitions declare target identity, required context, supported levels, and guidance-only evidence requirements.
- Runner transitions deterministically through instruction, highlight, wait, timeout, ambiguity, cancellation, and close/reopen events without invoking clicks or lesson transitions.
- An already-open menu skips the opening wait, and state transitions observed after keyboard interaction follow the same path as pointer interaction. Missing, ambiguous, closed, and timed-out states clear resources and offer written-instruction fallback plus explicit retry.
- Preference migration preserves existing panel preferences and defaults help to HINT.
- Rectangle capture enforces allowlisted labels, bounded scans, truncation, safe state diffing, and redaction of arbitrary text, IDs, attribute values, URLs, and private text.
- Capture timeout, cancellation, navigation, and completion remove every listener and observer; a click still reaches the host page unchanged.

### Integration and browser tests

- HINT, SHOW, and GUIDE are student-selectable, produce distinct behavior, and do not change CAD completion outcomes.
- Existing Top-plane highlighting continues to use the current resolver and overlay; regression tests protect its identity and cleanup.
- A simulated Rectangle trigger/menu fixture demonstrates trigger highlight → observable menu-open state → exact menu-item highlight, menu close, changing target, replacement, and cleanup. Label the fixture as a simulation, never authenticated Onshape evidence.
- The opt-in diagnostic UI captures simulated CLOSED/OPEN/TRANSITION states, copies only its sanitized bounded report, and preserves actual click handling.
- Reduced motion, pause, collapse, step change, navigation, rerender, timeout, unsupported menu semantics, and ambiguous labels are covered.

### Live acceptance

The diagnostic build is not a production compatibility claim. Owner testing in an authorized Onshape sketch session must capture the closed/open dropdown and provide the sanitized report. Only then may a separate narrow change register the observed trigger, menu transition, and exact menu-item identities. Test the latest build in real Onshape, verify the existing Top highlight is preserved, and record unsupported/ambiguous outcomes without claiming success from fixtures.

## Out of scope

- AI tutoring, model geometry verification, Onshape API integration, automatic CAD actions, and generalized workflow generation.
- Speculative DOM selectors, guessed Rectangle variants, and unverified menu-open assumptions.
- Changes to permission inference, lesson completion evidence, or the existing Top-plane production resolver.
