# Leqad — Unified System Architecture (Design for Owner Review)

**Date:** 2026-10-15  
**Status:** Written architecture specification for owner review — **not implementation approval**  
**Architecture branch:** `design/leqad-unified-architecture-2026-10-15`  
**Scope:** Long-term system contracts, public V1 boundaries, and phased validation; no Phase 1 code changes  
**Primary platform:** Onshape via Chrome/Edge extension; independently validated adapters may follow

## 1. Intent and success

Leqad helps a beginner move from *"I have an idea but do not know how to model it"* to *"I can design, explain, correct, independently modify, and export this part myself."* It teaches inside the student's actual CAD workspace. It is neither an autonomous CAD generator nor a standalone chatbot.

**Public V1:** an end-to-end, beginner-controlled design journey within validated part families, including (a) flexible Foundations or project-first onboarding, (b) clarifying requirements and meaningful concept alternatives when necessary, (c) tracing critical measurements, (d) student approval of a feasible plan, (e) guided student-performed CAD actions, (f) independently verified critical modeling outcomes, (g) constructive instruction, and (h) independent modification and appropriate export review.

**Out of V1 scope:** arbitrary complex mechanism/assembly certification, silent CAD edits, unrestricted screenshot monitoring, verified engineering strength/function from geometry alone, and unvalidated adapters for other CAD products. Future open-ended design and multi-CAD support are strategic goals, not compatibility claims.

**Product-level success** includes real-CAD correctness and learning outcomes, not only automated test passes. Existing aspirations of ≥80% qualified novices completing the reference bracket without live expert help and ≥80% subsequently modifying a driving dimension remain targets, **not achieved or automatically validated thresholds**; study inclusion/exclusion and measurement definitions need review before release.

## 2. Authority and non-negotiable invariants

1. **Student owns engineering decisions and CAD actions.** Leqad suggests, explains, highlights, and verifies; never silently clicks, changes geometry, or approves a plan.
2. **Evidence is scoped.** A UI control highlight is not proof a tool was used; an observed click is not a committed feature; screenshot-based localization is not verified tool identity or geometry; a model feature is not proof of learning; a valid CAD model is not proof of physical safety.
3. **Truthfulness by design.** Only supported, fresh evidence can produce a PASS or FAIL for the facts it actually covers. Missing, conflicting, stale, or inaccessible evidence yields UNKNOWN or an explicitly unsupported result. User reports retain a self-reported label.
4. **AI may explain and propose, not certify.** The Teacher cannot override verification, lesson completion, skill-stage determinations, capability declarations, or accepted design inputs.
5. **Requirements have provenance.** No silently invented critical dimension, coordinate, tolerance, material guarantee, source citation, or tool selector.
6. **Local-first/minimal observation.** Continuous screenshots, ambient cross-site observation, automatic screen capture, broad mouse recording, and unnecessary CAD-document uploads are excluded. A screenshot requires its own explicit consent.
7. **No false release claims.** CI fixtures, managed Chromium smoke tests, owner-reported observations, live model integration, and learner studies are distinct evidence classes.
8. **Platform-neutral concepts with platform-specific evidence.** Onshape is first; never claim feature parity for unbuilt adapters.

## 3. Agreed owner decisions (from architecture refinement)

| Area | Agreed decision |
| --- | --- |
| Public V1 | Complete beginner design journey, not lessons-only |
| Onboarding | Adaptive hybrid: choose Foundations or a supported project; recommendations are nonbinding |
| Teacher timing | Quiet-first; intelligent checkpoints and on-demand help |
| Proactive intervention | One subtle, dismissible warning when sufficiently verified errors would compound; do not interrupt normal exploration |
| Feedback pedagogy | Progressive help **plus** Socratic reasoning; effectiveness must be tested |
| Assistance level | Adaptive recommendations with student override and non-punitive preference tracking |
| Skill assessment | Verified natural project work, plus occasional **optional** transfer challenges |
| Mastery | Skill-specific published rubrics and independence/transfer evidence, not arbitrary scores or click counts |
| Design Studio V1 scope | Flexible original parts within verified families; future progressively open-ended support |
| Unsupported designs | Explore the larger idea and propose individually supported subprojects; disclose remaining limitations |
| Concept timing | Clarify essential purpose/interfaces/constraints first; collect detailed dimensions after choosing a direction |
| Design revisions | Analyze impacts and create a proposed revision; student approves changes to an accepted plan |
| V1 verification | Every declared **critical modeling objective** in a fully guided/verified project must have a validated independent verification method |
| Vision-assisted calibration | Preserve prior design: semantic recognition first; opt-in, one-shot screenshot visual grounding as fallback; no automatic clicking or persistent unvalidated coordinates |

## 4. Logical architecture, not microservices

Five architectural areas; do not build separate services merely to reflect the diagram.

1. **Student Experience:** extension panel, Foundations, Ask Leqad, Design Studio, Learning Profile, consent and approval UI.
2. **Learning Intelligence:** deterministic lesson runner, learning objectives, AI Teacher, Intervention Engine, Learning Evaluator, adaptive teaching policy.
3. **Design Intelligence:** requirements parsing and clarification, concept visualization, design-brief store, provenance, dependency/revision handling, candidate feature planning.
4. **Evidence & Capability Core:** capability registry, typed runtime contracts, plan validator, CAD Verifier, evidence freshness/trust, approval rules.
5. **Platform & Infrastructure:** Onshape-specific observer/target resolver, later authorized model/API connector, **Visual Grounding & Calibration Engine**, permissioned AI gateway, session identity, privacy, persistence, telemetry controls and tests.

Proposed data flow:

```text
Student goal/choice ----------------------> Design Brief
    |                                           |
Lesson/task objective                     Concept alternatives (if needed)
    |                                           |
    +--> learning guidance                Provenanced dimensions
    |                                           |
    |                                      Proposed Feature Plan
    |                                           |
    |                           Capability Registry + Plan Validator
    |                                           |
    |                                 Student approval (versioned)
    +------------------------+------------------+
                             |
                     Student acts in CAD
                             |
                   Onshape / platform adapter
                          /         \
            UI visual grounding    Supported model/API observations
                          \         /
                     CAD Verifier
                      |        |
                Evidence Report  -> learning rubric evaluator -> skill evidence
                      |
               Intervention Engine
                      |
                  AI Teacher -> bounded, honest explanation
                      |
                 Student next action
```

The Teacher and Design Planner consume facts and declared capability boundaries, not unrestricted browser DOM or arbitrary CAD document contents.

## 5. Capability Registry and adapter boundary

The registry describes **validated behavior under named conditions**, not merely commands known to exist in a CAD application's menus.

A versioned `CapabilityRecord` must identify:

- `platform`, `adapterVersion`, operation/target identity and relevant application/version constraints;
- separate abilities for **semantic tool localization**, **vision-assisted suggested localization**, **guidance**, **UI-state observation**, **committed-model verification**, **modification verification**, and **recovery**;
- permission/document prerequisites, available evidence sources, known limitation states, verification/test scenarios, and evidence date;
- `VALIDATED`, `PARTIAL`, `UNKNOWN`, or `UNAVAILABLE` per capability, **not** a single undifferentiated "supported" flag.

Runtime negotiation checks current page, permission, model-document identity, revision, UI freshness and adapter conditions. A test on a previous browser build or Onshape UI variant cannot by itself establish current support.

When a required capability is unavailable, downgrade the particular workflow to partial guidance or concept exploration. Never automatically reinterpret a visual highlight as committed geometry evidence.

A future Fusion/SOLIDWORKS/FreeCAD adapter implements the *shared contracts* and earns its own acceptance evidence; it need not share the Onshape delivery technology. No speculative adapters in the current sprint.

## 6. Visual Grounding & Calibration Engine (explicit inclusion)

### 6.1 Why it exists

Earlier owner testing found reliable Top-plane highlight in one Onshape session, while Sketch SHOW displayed an **approximate** highlight and opened manual calibration. This is evidence of a real usability gap, not acceptance of precise Sketch recognition.

**Goal:** automatically locate the requested CAD control accurately enough to guide a student, particularly when semantic UI information is insufficient. "Automatic calibration" here means *automatically proposing the visual highlight location*, **not** selecting/clicking the control, modifying the model, or proving completion.

### 6.2 Layered strategy

1. **Semantic first.** Inspect bounded, allowed UI evidence: accessible roles/names, tooltips, labels, validated relationships and known command context. Require a unique eligible target. Prefer this low-latency, no-image route.
2. **Vision fallback by express consent.** If recognition fails or is ambiguous, offer screenshot-assisted locating. For Phase 1.5, retain the approved sequence **SHOW → Leqad Chrome toolbar icon → confirm one screenshot**. Semantic recognition runs first.
3. **Model-produced location is only a proposal.** Input: authorized visible screenshot, actual pixel dimensions and a closed allowlisted target identity (initially `sketch-toolbar-control`). Output: `FOUND | NOT_FOUND | UNCERTAIN`, a bounded reason and a bounding rectangle **only** for FOUND.
4. **Independent validation.** Enforce strict schema, target identity, finite bounds, screenshot containment, plausible control dimensions, capture/viewport mapping, tab/document identity, UI generation, freshness and permitted current context. Abstain when a conversion, overlap, or identity cannot be trusted; do not silently clamp or reuse an old rectangle.
5. **Temporary UX.** Display a subtle click-through outline marked **"AI-suggested location — confirm it surrounds Sketch."** Clear after a short period (Phase 1.5 proposes ≤5 seconds) or immediately after relevant UI, zoom, scroll, focus, tab, document or step changes.
6. **Fail-safe fallback.** On ambiguity, denial, timeout, stale state or unavailable AI, use truthful text guidance and existing optional manual calibration. A vision proposal never becomes semantic `FOUND`, feature PASS or persistent coordinate calibration.

### 6.3 Privacy and deployment

Phase 1.5 is a **developer prototype** using the already-designed consented browser capture and local server; it is not a requirement for end users to install Node. A production service needs independently reviewed authentication, least-privilege permissions, rate limits, image handling, retention disclosures, security controls and consent design. No background capture, implicit re-capture, screenshots on installation, or screenshot retention in lesson progress. No generic arbitrary-page monitoring.

The Phase 1.5 exact consent and validation contract in `docs/superpowers/specs/2026-10-15-first-intelligent-interaction-design.md` remains authoritative for that narrow prototype. The unified design **does not expand** it to arbitrary controls or authorise automatic capture.

### 6.4 Future evolution, gated

After collecting approved reference examples and validating precision, uniqueness and abstention rates, consider more commands, transient auto-repositioning from fresh UI evidence, and friendlier calibration. Any vision auto-capture or persisted recognition learning needs **a new privacy design, user review, and real-world testing**. A success on one Sketch screenshot does not establish universal recognition.

## 7. CAD Verifier and EvidenceReport

Verifier inputs: a bounded task objective and rubric-relevant geometric target, a current document/feature identity, adapter observations and their provenance, and declared capability. It does not receive an AI answer as a trusted fact.

The `EvidenceReport` contract includes:

- `objectiveId`, `documentIdentity`, `revision/feature identity`, `observedAt`, evidence source/method and adapter version;
- `PASS | FAIL | UNKNOWN` **per check**, not an aggregate invented boolean;
- only supported observed values with explicit units and trust classification: API/model-confirmed, UI-confirmed, inferred, self-reported, unknown;
- contradictions, validity window, stale state and diagnostic explanation, plus recoverable next checks.

A UI-observed Sketch click can support a UI claim, not a committed 40 × 30 rectangle. An opt-in screenshot can suggest where Sketch is, not whether the student created a valid sketch. A verified 40 × 35 rectangle may permit a specific correction for a 40 × 30 objective **only if those facts are actually exposed and fresh**.

On a document switch, model revision change, permission loss, stale evidence or conflicting sources, affected checks are invalidated and must be reacquired. Do not silently advance on self-report.

## 8. Learning Intelligence

### 8.1 Intervention Engine

Deterministic policy; inputs include objective, trusted EvidenceReport, task checkpoint, consequential dependency risk, prior alerts, mute/dismissal state and explicit student requests.

- Default: **quiet** during ordinary exploration.
- At a checkpoint: verify silently; update only evidence-supported progress.
- For an evidence-supported mistake that would compound: show at most one initially subtle, dismissible and relevant warning; suppress repeats until a meaningful state change.
- For an inconclusive observation: no speculative correction.
- For help requests: respond at the student's chosen depth without blocking work.

Do not infer confusion from elapsed time alone or ignore the student's decision to mute proactive help.

### 8.2 AI Teacher and assisted learning

The Teacher uses a constrained evidence packet, lesson/project context, verified curriculum facts, teaching policy and student preferences; it does not set PASS or mastery. Preserve access to HINT/SHOW/GUIDE and a direct explanation on request.

Provisional educational strategy: **progressive help plus targeted Socratic reasoning**, not a compulsory fixed sequence. The first clue may be a prompt to notice an issue, followed by a focused question, explanation/highlight and optional stepwise GUIDE. When the critical error and safe correction are established, do not withhold important information just to maintain Socratic style.

The deterministic lesson experience continues to function when the AI provider is unavailable. Provider failures never change CAD correctness or completion status.

### 8.3 Learning Evaluator and Skill Profile

Skill states: `NOT_ASSESSED`, `PRACTICING`, `DEMONSTRATED`, `TRANSFERRED`. They summarize evidence, not the student's worth or an irreversible ranking.

`SkillEvidence` includes skill/rubric/task/version, independent CAD evidence references, kind of assistance relevant to the assessed action, independent modification or transfer context, source/time and assessment explanation. Separate:

- correctness of CAD result;
- reliability of the supporting evidence;
- independence **for that specific skill**;
- application in a distinct, meaningful context.

Skill-specific published rubrics set requirements. Conceptual questions or help preference alone never lower proficiency. One harder failure does not erase a past verified demonstration; it may trigger practice recommendations. Historical skill evidence remains historical even if the present CAD revision invalidates a *current geometry* check.

Project work may supply natural skill evidence; optional independent transfer challenges provide stronger evidence of flexible understanding. Do not force quizzes or block projects for declining them.

Keep learning records minimal, understandable, reviewable and resettable, initially local-first. Durable cross-device sync, educator views and profile analytics require later privacy, identity, consent, export/deletion and study review.

## 9. Design Studio — bounded creativity, honest capability

### 9.1 Student flow

1. Student describes any idea, including ideas beyond V1 supported scope.
2. Requirements Engine clarifies purpose, interfaces and important constraints **one meaningful question at a time**; distinguish unknowns from decisions.
3. When shape is ambiguous, Concept Engine shows up to three meaningfully different, **not-to-scale** concept illustrations, explains trade-offs and allows choosing, combining or revising.
4. Student selects a direction; Leqad collects relevant detailed measurements with units, rationale, sources, tolerance intentions when supplied, and an "I don't know" path.
5. Candidate Feature Planner proposes a human-readable, typed, bounded feature DAG.
6. Capability Registry + deterministic Plan Validator classify readiness and verification gaps.
7. Student reviews and approves the initial plan. Student performs CAD steps. Verifier checks actual supported model state; Teacher offers need-based help.
8. Student reviews limitations, corrects an error, independently modifies a parameter where supported, and exports via a validated workflow.

A clear sketch or single choice may skip unnecessary concept generation. No need to generate exactly three images. V1 validates one bracket or mounting-plate reference workflow first, then adds families based on evidence.

### 9.2 `DesignBrief` and provenance

Each important parameter has a stable ID, value/units when known, constraint severity, source type (`MEASURED`, `SOURCED`, `DERIVED`, `STUDENT_DECISION`, `AI_SUGGESTED`, `UNKNOWN`), source citation or student declaration, confirmation state, revision, dependencies and tolerances where applicable.

A student-reported measurement is not a certified physical measurement. Derived values point to current inputs and calculation. AI suggestions are provisional even if plausible. Conflict detection is scoped to explicit implemented geometric/constraint rules; it does not certify function, stress, fit or manufacturing quality.

`ConceptRevision` references the brief version and student choice/feedback, labels images non-dimensional, and preserves prior alternatives for reasoning and audit. Imagery never supplies hidden engineering dimensions.

### 9.3 `FeaturePlan` and deterministic validation

A plan identifies project ID, plan/brief/concept versions, platform capability snapshot, ordered dependencies, known feature types, parameter references, expected user action, teaching objective, critical modeling check and verification method.

The validator uses explicit rules for:
- schema/type/units and allowed operation IDs;
- sourced inputs and critical unknowns;
- feature dependency order and cycles;
- current adapter guidance and **independent verification** capabilities;
- implemented bounded geometric checks and known requirement conflicts;
- revision consistency and explicit student approval.

Output `READY_FULL`, `READY_PARTIAL`, `NEEDS_INFORMATION`, `CONFLICTING`, or `UNSUPPORTED`, with per-operation reasons. READY_FULL means prerequisites for a fully supported **plan** are satisfied; it is **not** runtime evidence that the CAD model was constructed correctly.

**Critical modeling objectives** are objective-specific, declared before building, necessary for the project's stated geometric success criteria or for its required independent modification. A V1 project may be advertised **fully guided and verified** only if a validated independent method exists for *every* critical objective under the active runtime conditions. An UNKNOWN after execution is not a PASS and must be visibly unresolved. Noncritical checks and unsupported physical performance must be disclosed.

For ambitious unsupported designs, Leqad keeps the high-level idea, distinguishes concept exploration from verified construction, and proposes supported subprojects. An independently verified component never means the overall mechanism is certified.

### 9.4 `PlanRevision` lifecycle and approval

```text
DRAFT -> VALIDATING -> PROPOSED -> APPROVED
                                  |
                     approved input or capability changes
                                  v
                          REVISION_PROPOSED
                              |        |
                      APPROVE / EDIT / REJECT
                              |
                      REVALIDATE if needed
                              |
                      new APPROVED version
```

A requirement change triggers dependency impact analysis and re-evaluation of affected calculations, concepts, features and checkpoints. Show the difference, preserve valid unaffected work, mark affected plan checks unverified, and request student approval before changing the accepted plan. If the student rejects, retain the original approved version and identify the incompatibility of the new request. Updating a draft preview needs no approval. **No plan approval automatically mutates geometry.**

When actual CAD changes diverge from the approved plan, re-check identity/revision and provide a review/reconciliation flow rather than pretending the model still matches the plan.

## 10. Cross-contract trust and runtime behavior

**Trust boundaries:**

- AI model output: untrusted proposal; schema validation and policy checks mandatory.
- Browser/DOM data: platform-scoped, possibly ambiguous; never silently elevated to model fact.
- Model/API facts: scoped to verified document, feature, revision and accessible fields only.
- Student statements: helpful context and authorizations, not independent confirmation.
- Generated concepts: discussion aids, not dimensional drawings.

**Permission/consent:** explicit one-shot screenshot permission; model/API access uses an appropriate authenticated and least-privilege connector; client secrets do not live in the page; no end-user local Node requirement. The exact hosted/authentication solution is a future implementation spec decision.

**Privacy:** reasonable data minimization, consent status, retention, deletion/export controls, and age-appropriate disclosure for student users. Never include raw screenshots in GitHub diagnostics. Any persistent student profile or external processing requires a separate risk review before public rollout.

**Failure behaviors:**

| Event | Required behavior |
| --- | --- |
| Semantic control ambiguous | Abstain; offer consent-based vision or manual fallback |
| Vision output malformed/stale | Discard and ask for fresh consent on retry |
| CAD API unavailable/insufficient | Per-check UNKNOWN; continue only clearly labeled instruction |
| AI provider unavailable | Deterministic Foundations lesson/HINT remains usable |
| Conflicting dimensions | Ask focused clarification; do not invent correction |
| Student changes approved requirement | Prepare impact summary; require approval to replace plan |
| CAD document/revision changes | Invalidate affected live evidence; reconcile plan with new state |
| Missing mastery evidence | Keep skill NOT_ASSESSED or PRACTICING; do not infer mastery |
| Unsupported design family | Conceptual help and supported subproject suggestion |
| Privacy consent denied | No capture; offer non-image help without penalty |

## 11. Experiments and release evidence

**Technical evaluations** (phase-specific, environment and commit recorded):
- UI recognition precision, ambiguity detection, safe abstention, overlay viewport/zoom freshness (including 80/100/125/150% where required);
- opt-in screenshot flow, correct target proposal, malformed/false-match rejection, screenshot consent race and retention behavior;
- authenticated Onshape model/feature/dimension reads, document identity, revisions, stale evidence, permission failure, PASS/FAIL/UNKNOWN correctness;
- plan validator schema/units/dependency/conflict tests and honest partial-support classification;
- end-to-end reference part: brief → concept (if needed) → confirmed inputs → approved plan → actual model → verified critical results → independent modification → export review.

**Educational evaluations**:
- Supervised Progressive Direct vs Progressive Socratic pilot on comparable CAD tasks, with counterbalanced order where feasible; record error correction, independence, transfer, completion, frustration, interruptions and unsupported AI claims. Pilot results are preliminary.
- Compare skill rubric classifications with independently reviewed learner task performance; emphasize false declarations of DEMONSTRATED or TRANSFERRED.
- Beginner usability studies, accessibility, privacy usability and unsupported-project handoff. Document negative and inconclusive outcomes.
- The original study proposal of at least 20 novice participants and 80% goals remain **proposals** for study planning, not completed research.

Do not use automated CI or simulated UI fixtures as substitutes for approved live CAD acceptance. Each capability needs declared test evidence, conditions and failure modes.

## 12. Phased roadmap, dependency gates and current status

| Phase | Focus | Exit evidence |
| --- | --- | --- |
| 0 (partially evidenced) | Validate Onshape UI/model/API assumptions | Confirm or explicitly limit prerequisites, especially authenticated model access |
| **1 (current)** | Existing WXT/React Foundations extension; eight-step First Sketch lesson; semantic guidance | Owner-authorized live Onshape acceptance including Top/Sketch/Rectangle/Dimension/Finish, recovery, browser/zoom cases, no false completion |
| **1.5 (design, not implementation)** | Narrow AI Teacher; optional **one-shot vision-assisted Sketch location** after SHOW + toolbar + screenshot consent | Grounded answer, correct temporary proposed outline, safe abstention, consent/error races and manual fallback in live UI |
| 2 | Authorized model/API connector, normalized evidence, deterministic verification, evidence-backed teaching | Real model PASS/FAIL/UNKNOWN, revisions and errors verified without false success |
| 3A–D | Provenanced briefs, concept iterations, capability-aware plans, first bracket, revision workflow and family expansion | Actual learner-directed reference build with independent modification and verified critical objectives |
| 4 | Audited robotics parts, basic printing/fit guidance and export | Traceable references and honest limits; no fabricated manufacturing guarantee |
| 5 | Novice beta, accessibility, privacy controls, adaptive teaching and mastery validation | Documented real-world learning and product acceptance evidence |
| 6 | Public V1 after owner review | Security, privacy, accessibility, real-CAD and learner outcome gates |
| Future | Broader part complexity and separately validated CAD adapters | Platform/operation-specific acceptance before compatibility claims |

Current owner-reported evidence: Top-plane highlight worked in an earlier live Onshape session; Sketch SHOW was approximate/manual calibration. The ongoing `phase1-hardening` work includes **an opt-in sanitized Sketch-control diagnostic**, not a proven production Sketch fix. No complete eight-step live acceptance or independent committed-geometry verification is established here. The diagnostics, AI teaching, vision fallback, learning profiles and Design Studio must not be represented as production-complete based on this architecture document.

Preserve Phase 1's active pull request, current branch and acceptance records. Do not merge, refactor broadly, or advance to Phase 1.5 implementation solely because this spec exists.

## 13. Implementation decomposition and review gates

This unified document is an **architecture charter**, deliberately **not** a one-shot implementation plan. Subsequent scoped specs should be created only when their phase prerequisites are satisfied:

1. Current Phase 1 control-recognition/live acceptance remains the immediate actionable effort.
2. Review and complete the pre-existing Phase 1.5 narrow teacher and consented vision-grounding specification after Phase 1 acceptance.
3. Define/test Onshape model connector and `EvidenceReport` contracts under Phase 2, including negative/unknown examples.
4. Define learning-rubric/teaching policy contracts bounded by verified evidence and privacy constraints.
5. Define Design Studio contracts and initial bracket reference project, then iterate individual supported features.

**Approval gate:** owner reviews this written file and requests revisions or explicitly approves it. Written-spec approval is **not** permission to implement a future phase; each scoped implementation plan requires its own review and accepted execution method.

## 14. Existing reference documents and change control

- Canonical mission and gates: `docs/product/leqad-master-vision-roadmap.md`.
- Historical specification: `docs/product/TutorCAD_Product_and_System_Design.md` (preserve unchanged).
- Engineering reference: `docs/product/leqad-master-implementation-spec.md`.
- Current phase matrix: `docs/product/phase-feature-matrix.md` on `phase1-hardening`.
- Current narrow image grounding spec: `docs/superpowers/specs/2026-10-15-first-intelligent-interaction-design.md` on `phase1-hardening`.
- Phase 1 current tests and live checklist: `docs/testing/results/phase1-live-acceptance.md` on `phase1-hardening`.
- Active development PR: https://github.com/anandanikait-bot/leqad/pull/1.

The master roadmap remains the canonical high-level product vision. If this owner-reviewed design is approved, reconcile any language differences through an explicit docs-only change with a decision log; do not silently overwrite historical text or expand active development scope.

**Design provenance:** approved owner decisions from the October 15, 2026 Leqad architecture brainstorming; visual grounding draws on the previously designed semantic-first and consented one-shot screenshot fallback. Detailed implementation viability remains subject to real platform evidence.
