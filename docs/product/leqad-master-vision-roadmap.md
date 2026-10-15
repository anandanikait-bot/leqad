# Leqad — Master Vision & Roadmap

> **Status:** Long-term product vision and phase-gating reference  
> **Updated:** October 15, 2026  
> **Initial product:** Onshape in Chrome / Edge  
> **Long-term product:** CAD-platform-independent education and design assistance through validated integrations  
> **Implementation status:** Phase 1 engineering/hardening in progress; live Onshape acceptance is not complete  
> **Repository:** [anandanikait-bot/leqad](https://github.com/anandanikait-bot/leqad)

## 1. Product statement

**Leqad is an AI-powered CAD learning platform that helps people learn 3D modeling directly inside the CAD software they use.** Starting with Onshape, Leqad replaces passive, disconnected tutorials with interactive, step-by-step instruction, contextual visual highlights, and eventually a collaborative **AI teacher + CAD verifier** that provides constructive feedback grounded in what the learner actually did.

Longer term, Leqad will help a learner describe an idea, compare AI-generated *concept illustrations*, clarify requirements and dimensions, approve a feasible design plan, build the model themselves, understand mistakes, modify the result independently, and prepare it for manufacturing. Its teaching and design intelligence should work across **supported CAD platforms**, each with a separately tested adapter.

**Short pitch:** *Learn CAD by building. Leqad guides you inside your CAD software, helps you understand your mistakes, and grows with your skills.*

**Product promise:** Help people progress from "I have an idea, but don't know how to model it" to "I can design, revise, explain, and make this part myself."

This document records the intended destination and development sequence. It is **not** a claim that planned AI, geometry verification, concept generation, or cross-CAD integrations are implemented today.

## 2. Why Leqad exists

### Problem

- Video tutorials do not know the learner's current CAD state or where they are stuck.
- Beginners may reproduce clicks without understanding sketches, design intent, constraints, features, and dimensions.
- Generic AI chat can explain CAD but may guess what is happening on screen and mistake an attempted action for a successful model change.
- Turning a physical need into a dimensioned model requires clarification, interface measurements, feasibility decisions, and iteration; beginners often need help with that *before* they draw.
- Learners working on projects such as robotics need conceptual understanding and engineering feedback, not only command discovery.

### Solution: an in-workflow learning partner

Leqad combines **teaching**, **grounded observation/verification**, and **design clarification**. It gives the next useful action and explains why; asks focused questions when evidence is insufficient; adapts how much help it gives; and gradually transfers decision-making to the learner.

The student stays in control: Leqad does not silently click, alter geometry, or manufacture a correct result.

### Initial audience

Beginners aged 13+, student makers and robotics teams, hobbyists, and people learning practical parametric CAD. Expand to educators and advanced workflows after the beginner experience is demonstrably reliable.

## 3. The three core systems

### A. Adaptive AI teacher (learning intelligence)

The teacher should:

- Explain concepts in plain language while retaining accurate CAD terminology.
- Offer progressive **HINT**, **SHOW**, and, when validated, **GUIDE** assistance.
- Answer in-context questions and help recover from confusion or errors.
- Explain what was correct, what needs work, **why** it matters, and one actionable next step.
- Adapt assistance based on demonstrated understanding, attempts, selected hint depth, and confirmed results — not simply elapsed time.
- Encourage independent practice, including changing a driving dimension or selecting a feature without copying instructions.
- Remain useful even when model verification is unavailable: clearly state the limits and ask a focused question rather than guessing.

First AI teacher interactions can be narrow and lesson-specific; broad personalized tutoring is a later capability. Deterministic Foundations lessons must remain available if the AI provider is down.

### B. CAD observer and verifier (source of evidence)

The verifier is **not the AI teacher**. It uses supported UI observations and, in later phases, official model/APIs or other validated CAD-specific integrations.

Its job is to answer evidence-scoped questions such as:

- Which tool/dialog/selection state is demonstrably active?
- Did the expected feature actually commit to the current model?
- Does the intended feature have the correct type, parameter, dimension, and revision?
- Did the learner change the required driving dimension?
- What remains unknown, ambiguous, contradicted, unsupported, or stale?

A standardized evidence packet is supplied to the teacher. The **verifier** owns completion decisions; the **teacher** turns trustworthy facts into constructive explanations and recovery guidance. The teacher cannot upgrade inferred or self-reported observations to confirmed CAD results.

**Example:** For an instructed 40 mm × 30 mm rectangle, a verified committed 40 mm × 35 mm rectangle would allow the teacher to explain that width is correct while height needs adjustment. If those dimensions cannot be read, the teacher must instead say it cannot verify them and guide the learner to inspect or supply the value.

Evidence vocabulary:

| Category | What it establishes | What it cannot establish |
| --- | --- | --- |
| API/model-confirmed | Supported committed features, parameters, dimensions, revision | Unexposed or unsupported model facts |
| UI-confirmed | A specific fresh, recognized interface state | Committed CAD geometry merely from clicking |
| Inferred | A plausible interpretation with limitations | Automatic verification of model completion |
| Self-reported | The student's assertion of progress | Independently confirmed CAD correctness |
| UNKNOWN | Evidence is missing, stale, contradictory, or unsupported | A silent PASS |

All decisions must respect document/feature identity, source, timestamps, revision, trust level, and contradiction handling. No made-up coordinates, selectors, dimensions, measurements, or model facts.

### C. AI design and concept visualization assistant (design intelligence)

**Later-stage Custom Part Studio**, not the current Foundations sprint:

1. Learner describes what they want to make and what it must attach to, hold, or do.
2. AI identifies unclear geometry, interfaces, requirements, movement, available space, material, and manufacturing assumptions.
3. When a description has meaningful ambiguity, show up to **three genuinely different concept illustrations** instead of guessing one form.
4. Label them **"Concept — not to scale"** and explain the main differences. Never represent generated imagery as an engineering measurement.
5. Learner selects the closest idea, combines elements, or gives correction feedback; iterate on the concept and structured design brief.
6. Ask **one relevant measurement question at a time** with units, reason, measurement guidance, and an "I don't know" path. Distinguish measured, sourced, derived, and provisional values.
7. Validate whether critical interfaces, dimensions, fit/tolerance intentions, operations, and model verification capabilities are sufficient.
8. Propose a human-readable, schema-constrained feature plan. The learner may revise and approve it.
9. Guide the learner through CAD. The verifier checks what can actually be checked; the teacher explains results.
10. Review supported print risks, export, independent modification, and learning outcomes.

Candidate initial part families: brackets, plates, spacers, simple mounts, sensor mounts, bearing supports, simple hubs, and protective covers, but only where the validated CAD capability envelope supports them.

**Important:** Do not confuse image generation with automatic CAD generation. Generated images clarify intent; they do not produce or certify dimensional geometry.

## 4. Student experiences

### Foundations — learn by doing

Small lessons that explain a concept, show a goal, guide the next action, let the student act, observe supported state, verify what can be verified, and ask for a practical variation. Introduce sketches, planes, geometry, constraints versus dimensions, features, editing history, and print-oriented thinking progressively.

### Ask Leqad / Help Me Now — contextual learning

A student can ask a question from an unrelated supported CAD project without entering a predefined lesson. Responses should use only available, consented, bounded context and begin with one concrete next action. When the application cannot inspect the model, clearly say so.

### Guided projects / Custom Part Studio — create something useful

Translate a physical need into an explicit, reviewable brief; clarify concepts visually; collect dimensions; plan supported features; guide modeling and mistake recovery; verify supported committed results; prepare for export; and have the student independently change part of the model.

### Adaptive learning — develop independence

Over time, reduce unnecessary hints as the learner demonstrates understanding. Learning profiles, educator views, and longer-term personalization require explicit privacy and quality safeguards and are **not** part of Phase 1.

## 5. Phase roadmap and acceptance gates

**Rule:** Phases are ordered by *dependencies and evidence*, not by arbitrary deadlines. Partial prototyping in a future phase may occur only without bypassing acceptance gates or silently changing current scope.

| Phase | Deliverable | Gate to advance |
| --- | --- | --- |
| **0 — Capability prototype** | Evidence for real Onshape access, UI observations, official model/API capabilities, revision behavior, and extension behavior; explicit capability matrix | Critical assumptions are confirmed or limitations documented; do not claim untested capabilities |
| **1 — Foundations alpha (CURRENT)** | Reliable WXT/React extension, lesson engine, evidence boundaries, HINT/SHOW/GUIDE, semantic highlights, local bounded cursor intent, eight-step First Sketch lesson, persistence, recovery, accessibility | Full required lesson and recovery scenarios tested in an authorized real Onshape session, across supported zoom/reload, without false advancement |
| **1.5 — First intelligent interaction** | Narrow conversational AI teacher for First Sketch; optional AI-assisted Sketch-tool location after explicit one-shot screenshot consent; manual fallback | Real question → grounded reply → authorized capture (if chosen) → correct temporary outline → student manual action; errors, consent and stale results tested |
| **2 — Model truth + collaborative feedback** | Secure Onshape connector, normalized model snapshots, committed-feature/parameter/revision verification, contextual diagnosis and evidence passed to teacher | Representative real model scenarios yield correct supported PASS/FAIL/UNKNOWN plus helpful evidence-grounded explanation; no false success |
| **3 — Custom Part Studio** | Structured need/brief, 2–3 concept images for ambiguity, learner selection and feedback, dimension provenance, feasibility rules, constrained feature planning and stepwise CAD guidance | Reference single-part builds work without invented critical dimensions; learner can inspect, revise, complete, and modify a validated plan |
| **4 — Robotics and manufacturing** | Vetted component references, basic FDM printability, fits/tolerances, part-specific domain guidance, print preparation and export | Reference models and manufacturer-source audits pass; unsupported engineering guarantees never made |
| **5 — Beginner beta** | Broader curricula, learner testing, feedback quality evaluations, accessibility, compatibility, performance, recovery, privacy/retention/export/deletion, educator capabilities where justified | Beginner usability and product acceptance targets met in documented environments |
| **6 — V1** | Reliable supported-platform product and user onboarding, deployment, support and release documentation | Security, accessibility, privacy, end-to-end real CAD validation and owner release review pass |
| **Future — Multi-CAD expansion** | Verified integrations for additional CAD applications, potentially Fusion, SOLIDWORKS, FreeCAD and others | Each adapter individually passes capability, usability, security and regression gates before compatibility is advertised |

### Phase 0: status and remaining dependency

Capability prototyping and some real-world recognition observations have occurred, but some original Phase 0 records were unavailable and official authenticated model/API verification is still not established. Record this as **partial**, not as completed validation.

### Phase 1: precise scope and current status

Existing repository work reports the following **implemented and automated-test-covered**:

- WXT Manifest V3 extension, React Shadow DOM panel, draggable/collapsible accessible UI.
- Eight-step **Your First Sketch** lesson.
- Semantic control recognition, calibrated/highlighted targets, local cursor-intent hints and progressive HINT/SHOW/GUIDE infrastructure.
- Conservative page/capability detection; evidence contracts; honest self-reported/unknown continuation.
- Per-document progress persistence, revision-sensitive invalidation, pause/reload handling and browser packaging.
- Bounded diagnostic tooling, including experimental Rectangle-dropdown observation.

**Not yet accepted:** Complete live compatibility across required Onshape flows. The recorded acceptance matrix still has blocked cases; prior owner observations of one control working do not establish all steps, browser versions, or modes work. The current work is on \`phase1-hardening\` / [PR #1](https://github.com/anandanikait-bot/leqad/pull/1), which must not be merged or announced as complete merely because automated tests pass.

Current user action sequence:

1. Let Codex finish the focused Phase 1 reliability/hardening sprint.
2. Review the actual changes, source commit, CI and regression results.
3. Test in an authorized **disposable** Onshape Part Studio in regular Chrome and Edge where available.
4. Validate Top plane, Sketch, Rectangle, Dimension, Finish Sketch, all eight steps, hints, highlights, recovery, reload, document switching, browser zoom, and no false completion.
5. Fix and retest demonstrated failures, update PASS/FAIL/BLOCKED rows with actual observations, and obtain owner sign-off.
6. Only then treat Phase 1 as accepted, consider PR merge, and start Phase 1.5 implementation.

Consult the live checklist in the development branch:
[Phase 1 acceptance record](https://github.com/anandanikait-bot/leqad/blob/phase1-hardening/docs/testing/results/phase1-live-acceptance.md).
Do not copy its historical counts into later reports without a fresh review.

### Phase 1.5: intentionally narrow, separate prototype

The [first intelligent interaction design](https://github.com/anandanikait-bot/leqad/blob/phase1-hardening/docs/superpowers/specs/2026-10-15-first-intelligent-interaction-design.md) proposes OpenAI through a **local development server** with configurable server-side models and credentials. The approved screenshot gesture is:

**SHOW → click Leqad Chrome toolbar icon → confirm one screenshot.**

The existing semantic resolver runs first; capture is an opt-in fallback. A single screenshot is transient, bounded, and consented. An AI-proposed rectangle is never treated as proven tool identity, model evidence, or permission to perform an action. No background capture. On failure, use manual calibration/text guidance.

The local Node server is a **developer prototype**, not a production installation requirement: end users must not need to install Node/Python. Design for later hosted service deployment with privacy, authentication, rate controls and user consent.

This milestone does **not** add arbitrary geometry recognition, automatic clicking, full model verification, general autonomous agents, or generated design concepts.

### Phase 2: verifier–teacher feedback contract

The first valuable integrated loop should be:

**Learner CAD action → platform adapter → normalized observed/model facts → deterministic verifier → evidence packet → teacher's bounded, helpful explanation → learner decides next action.**

Use a transparent distinction between confirmed facts and unknowns. A model response cannot determine its own verification status. Validate with a simple real part and errors such as wrong dimensions, incorrect depth, missing feature, undo/delete, or stale revision, but only for facts the official connector can actually see.

### Phase 3: first complete design project

Begin with one simple bracket or mounting plate, not unrestricted part generation. The student confirms dimensions and intent, approves a supported feature plan, creates a sketch, extrudes and makes openings as supported, corrects a mistake, changes a driving parameter, reviews print risks and exports. All committed/model verification claims require real supported evidence. Later add additional part families.

### Phases 4–6: productization

Robotics uses exact, traceable manufacturer component specifications, not guessed screw spacing, shaft dimensions, tolerances, or material properties. Print advice must indicate when geometry/print profile information is missing and never guarantee a print or structural safety.

For beta and V1, assess actual learner outcomes rather than only build status. Original product targets include **at least 80%** of qualified novices completing the primary bracket task without live expert help and **at least 80%** modifying a driving dimension afterward; these are aspirational release targets, **not achieved results**. Include novice user studies (original study plan proposed at least 20 participants), recovery, accessibility, platform/browser variation and confidence-calibrated responses.

## 6. Multi-CAD architecture: Onshape first, platform-independent core

**Strategic requirement:** Leqad must not become an Onshape-only teaching engine merely because Onshape is the first UI.

Conceptual layering:

\`\`\`text
Student / Leqad UI
        |
Teaching + lesson orchestration + design brief + feedback
        |
Validated shared actions, capability declarations, evidence contracts
        |
CAD-specific adapters
   |             |              |              |
 Onshape       Fusion       SOLIDWORKS       FreeCAD / others
 browser      future         future            future
        |
Official supported interfaces / validated UI observations
\`\`\`

- **Shared core:** CAD concepts, teaching objectives, lesson transitions, question interpretation, evidence levels, brief/dimension schemas, feature-plan validation, feedback, and privacy decisions.
- **Per-platform adapter:** Tool identifiers, menu/UI recognition, current state, document identity, permissions, feature types and mappings, revision information, CAD model reads, capabilities, and supported actions.
- **Explicit capability negotiation:** An adapter returns supported/partial/unknown/unavailable, with provenance. A concept may be taught everywhere while verification depth differs per platform.
- **Client delivery:** Onshape can use the Chrome/Edge extension. Desktop CAD tools may need vendor-supported plugins, a desktop companion, or different integration mechanisms. Do not pretend browser APIs work everywhere.
- **No premature generalization:** Preserve clean shared boundaries today but do not build speculative adapters or overhaul stable Phase 1 code before Onshape has passed acceptance.

Multi-CAD support is a strategic direction with platform-by-platform delivery; this is **not** a promise that every CAD product will support identical capabilities.

## 7. Design rules, safety and privacy

These are durable requirements across every phase:

1. **Student controls actions.** No silent CAD edits, automated clicking, arbitrary AI-executable code, or hidden model mutation in the initial product.
2. **Evidence before certainty.** A click is not an extrusion; a screenshot is not validated geometry; a missing verifier means UNKNOWN or clearly self-reported progress.
3. **No invented dimensions.** Every important value has source, units, dependencies, tolerance/fit context, and confirmation state. Label assumptions.
4. **Separate teaching from verification.** AI explains and proposes, code and supported model data determine permitted steps and actual pass/fail/unknown.
5. **Respect consent and data minimization.** Screen capture and sensitive context are opt-in, narrowly scoped and ephemeral where possible. Avoid unrelated browsing, credentials, whole project contents, and continuous mouse recordings.
6. **Learn by doing.** Keep explanations, staged help, student reflection, mistakes and independent modification central.
7. **Handle uncertainty well.** Unsupported operations, selector failures, provider outages and stale results lead to honest fallback instructions, not invented success.
8. **Accessible and calm.** Keyboard support, readable contrast, reduced-motion compatibility, nonblocking overlays, minimal distractions.
9. **Test honestly.** Separate unit tests, simulated browser fixtures, real extension loading, authenticated Onshape tests, and beginner usability evidence.
10. **Adaptation must be justified.** Personalization should support student autonomy, avoid unnecessary student-data collection and be evaluated for instructional quality.

## 8. Feature preservation matrix

| Feature | Target phase | Current characterization |
| --- | --- | --- |
| Onshape browser extension, panel, local state | 1 | Reported implemented; full live acceptance pending |
| First Sketch lesson, HINT/SHOW/GUIDE, highlights | 1 | Reported implemented/fixture-tested; live workflow pending |
| Local cursor intent and calibration | 1 | Reported implemented; not evidence of completed CAD |
| One-shot screenshot-assisted Sketch location | 1.5 | Design for review; not current production capability |
| Narrow conversational teacher | 1.5 | Proposed |
| Official CAD-model reads / committed geometry verification | 2 | Planned; evidence contracts exist earlier |
| Teacher collaboration with model verifier | 2 | Planned integration |
| Contextual diagnoses in an unrelated project | 2 onward | Planned/limited pilot may precede full support |
| Generated alternative concept images | 3 | Planned |
| Student selection/correction/combining concepts | 3 | Planned |
| Dimension questioning, traceability and validation | 3 | Planned |
| Approved feature plan and guided custom-part build | 3 | Planned |
| Robotics component libraries | 4 | Planned |
| Printability, fit/tolerance and export guidance | 4 | Planned (limited lessons earlier) |
| Learning profiles and educator tools | 5 or later | Planned with privacy review |
| Fusion / SOLIDWORKS / FreeCAD / other CAD adapters | Future | Planned individually; no compatibility claim |

Update implementation status in the living \`ROADMAP.md\`, \`docs/implementation-progress.md\`, and dated test reports on the active development branch. **Never silently change a feature from planned to implemented or live-verified.**

## 9. Brand direction (provisional, protected)

- Public-facing name: **Leqad**; *TutorCAD* names the preserved earlier product specification, not the shipped brand.
- Primary token **Dull Violet Black:** \`#0D1C43\`.
- Secondary token **Hay's Russet:** \`#793327\`.
- Warm off-white: \`#F5EFE7\`.
- Style: minimal, precise, modern, approachable, technical, calm; thin geometric lines, restrained curves, clean typography, spacing, minimal visual noise.

The user's preferred reference logo has an **isometric cube**, a **curved rising russet path/arrow**, and the **Leqad wordmark**. Explore minor geometry refinements and compact-size variations. The symbol and trademark status are **not finalized or legally cleared**. Perform visual similarity and official name/design-mark screening before commercial release. Do not replace it with unrelated generic artwork or claim an AI draft is a production-ready vector without owner approval.

## 10. Success metrics and quality gates

Measure both engineering reliability and *real learning*:

- Task completion and accuracy on real CAD models.
- Evidence-backed outcomes; **zero automatic completions from insufficient evidence**.
- Learner ability to recover from a mistake and explain why a correction works.
- Independent dimension/feature modification after coaching.
- Hint depth over time, with careful interpretation (fewer hints alone do not prove learning).
- Incorrect highlight rate, missing/ambiguous targets, and safe abstentions.
- Contextual answer quality: useful next steps, grounded claims, helpfulness, factual correctness.
- Concept-clarification effectiveness and reduction in misunderstood design requirements (after Phase 3).
- Accessibility, performance, privacy, user trust and browser/platform compatibility.

For each phase, define test scenarios and minimum passing criteria before accepting it. Passing CI means code checks passed; it is **not** proof that the extension works in live Onshape or that student learning improved.

## 11. Working agreement for Codex and contributors

Before changing code:

1. Read this vision, the original product specification and the currently approved phase scope.
2. Inspect current branch, code and tests. Distinguish reports from observations.
3. Preserve existing working features; correct verified deficiencies instead of rewriting.
4. Keep changes small, scoped and testable; add regressions and record results.
5. Keep future phases visible in the feature matrix, but do **not** implement them ahead of the current gate without explicit owner scope approval.
6. Never merge, claim a phase is complete, finalize branding/licensing, or announce CAD compatibility without required acceptance and owner approval.
7. Update documentation with exact commit, test evidence, live PASS/FAIL/BLOCKED cases and next action.
8. Do not overwrite the original historical specifications.

**Current instruction:** Finish Phase 1 reliability and real Onshape acceptance first. The October 15 AI interaction design is intentionally deferred to Phase 1.5; verified CAD feedback and AI concept design remain later work.

## 12. Source-of-truth and related documents

This file is the **canonical living reference for product mission, vision, features and high-level phase sequencing**. Detailed implementation and acceptance remain governed by approved phase specs and actual test evidence.

- [Original TutorCAD product and system design](TutorCAD_Product_and_System_Design.md) — preserved historical detailed product scope and principles.
- [Leqad master implementation specification](leqad-master-implementation-spec.md) — detailed engineering plan, not proof of implementation.
- [Current Phase 1 scope](phase-1-scope.md) — current narrow implementation boundaries.
- [Development branch roadmap](https://github.com/anandanikait-bot/leqad/blob/phase1-hardening/ROADMAP.md) — operational implementation status.
- [Phase 1 acceptance checklist](https://github.com/anandanikait-bot/leqad/blob/phase1-hardening/docs/testing/results/phase1-live-acceptance.md) — real CAD validation evidence, with potentially historical results.
- [Adaptive visual guidance design](https://github.com/anandanikait-bot/leqad/blob/phase1-hardening/docs/superpowers/specs/2026-10-14-adaptive-guidance-design.md).
- [First intelligent interaction design](https://github.com/anandanikait-bot/leqad/blob/phase1-hardening/docs/superpowers/specs/2026-10-15-first-intelligent-interaction-design.md) — proposed Phase 1.5 experiment.

### Change control

When updating the vision, record the decision, reason, date and affected phases. High-level direction can evolve; do not silently remove original goals such as **teacher–verifier feedback**, **concept selection and dimensions**, **student independence**, **robotics/printability**, or **future multi-CAD support**.

### October 15, 2026 — consolidated decisions

- Confirmed Leqad as an AI-powered **learning** platform, not merely a CAD operation agent or model checker.
- Preserved the collaborative **AI teacher + independent CAD verifier** architecture.
- Preserved generated design options, student choice/correction, and dimension gathering as a later Custom Part Studio workflow.
- Explicitly set future **multi-CAD** support as a core architectural goal while delivering Onshape first.
- Inserted a limited **Phase 1.5** AI teacher/consented screenshot prototype without bypassing unfinished Phase 1 live validation.
- Retained the original cube/path branding as a preferred concept, subject to refinement and originality review.
- Required phase-by-phase feature tracking and owner approval, with no simulated test treated as live acceptance.

---

**North star:** *Leqad succeeds when people can imagine a part, understand how to design it, build and improve it themselves, and carry those skills into future CAD projects and supported tools.*
