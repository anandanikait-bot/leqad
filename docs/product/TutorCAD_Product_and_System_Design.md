# TutorCAD — Product and System Design

**Initial platform:** Onshape in Chrome and Microsoft Edge\
**Initial manufacturing focus:** FDM 3D printing\
**Audience:** Beginners aged 13+, including makers and student robotics teams\
**Status:** Product specification. The described application and Onshape integration still require implementation and validation.

## 1. Product definition

TutorCAD helps people turn a physical need into an editable CAD model, even if they have never used CAD before.

It runs alongside Onshape, understands the user’s current task, explains concepts in ordinary language, points to relevant controls, checks the resulting model, and reduces assistance as the user gains confidence.

TutorCAD serves three related purposes:

1. **Foundations:** Teach the minimum skills needed to begin modeling.
2. **Custom Part Studio:** Help a beginner clarify, measure, plan, build, review, and export a personally useful part.
3. **Help Me Now:** Answer questions and diagnose problems in an existing Onshape project without requiring a lesson.

The first release focuses on single parts. Assemblies and mates are a later phase.

The product promise is:

> Describe what you need. TutorCAD helps you figure out the design, gather the important measurements, build it yourself in Onshape, recover from mistakes, and prepare it for printing.

## 2. Product principles

### 2.1 Keep the learner in control

TutorCAD explains, highlights, observes, and verifies. The learner performs the CAD actions.

V1 does not silently click controls, create features, change dimensions, or undo work. Every model change should remain understandable and attributable to the learner.

### 2.2 Verify results with evidence

A click is not proof that a feature is correct.

Clicking Extrude may open a dialog. It does not confirm the selected profile, depth, operation, direction, or final result.

TutorCAD labels evidence as:

| Evidence level | Meaning                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| API-confirmed  | The committed Onshape model contains the expected fact.                       |
| UI-confirmed   | A recognized Onshape interface state confirms an immediate action or mode.    |
| Inferred       | Several signals suggest a conclusion, but direct confirmation is unavailable. |
| Unknown        | TutorCAD cannot inspect enough information to reach a conclusion.             |

Each guided step declares which evidence it needs. Unknown state never becomes automatic success.

### 2.3 Never invent critical measurements

Every important dimension must be:

- Supplied by the user
- Retrieved from an identified, vetted source
- Derived from confirmed values
- Explicitly marked as a provisional assumption

Concept images communicate shape and intent. They provide no reliable dimensional evidence.

### 2.4 Stay quiet when progress is clear

The default interface is compact. TutorCAD adds detail when requested, when the user appears stuck, or when evidence identifies a likely error.

It should not constantly animate, highlight unrelated controls, or interrupt valid exploration.

### 2.5 Make uncertainty visible

When recognition, model access, or AI services are unavailable, TutorCAD explains what it cannot inspect and offers a useful next step.

It must not compensate for missing evidence with confident guesses.

### 2.6 Use deterministic code for deterministic decisions

Ordinary code handles:

- Cursor geometry
- Target ranking
- State transitions
- Units and dimension validation
- Document revision checks
- Supported feature checks
- Completion rules
- Geometric printability rules

AI handles:

- Natural-language interpretation
- Clarification
- Explanations
- Concept generation
- Structured plan proposals
- Grounded contextual answers

AI cannot directly mark a CAD step complete.

## 3. V1 goals and scope

### 3.1 User capabilities

V1 must help a beginner:

- Learn or demonstrate basic Onshape skills
- Describe a physical need without CAD vocabulary
- Compare visual interpretations of an unclear idea
- Identify important interfaces and measurements
- Review an understandable modeling plan
- Build a supported single part
- Ask questions in an unrelated Onshape project
- Recover from common sketch and feature problems
- Change a driving dimension
- Review basic print risks
- Export the finished model
- Resume after reload or interruption

### 3.2 Supported modeling operations

The initial support envelope includes:

- Sketches on default planes and planar faces
- Lines, rectangles, circles, arcs, and construction geometry
- Common sketch constraints
- Linear, angular, radius, and diameter dimensions
- Extrude add and remove
- Symmetric or mid-plane extrusion where validated
- Simple holes
- Fillets and chamfers
- Linear and circular patterns
- Mirrors
- Editing earlier features and dimensions

Simple revolve workflows can follow after the core sketch and extrusion flow is reliable.

Support for any operation depends on the capability prototype proving that TutorCAD can guide and verify it.

### 3.3 Initial custom-part families

Start with:

- Brackets
- Plates
- Spacers
- Simple mounts
- Sensor mounts
- Bearing supports
- Simple hubs
- Protective covers

Requests outside these families can be supported only if they fit the validated feature set.

### 3.4 Exclusions

V1 does not promise:

- Assemblies or mates
- Motion simulation
- Advanced surfacing
- Sheet metal
- Organic modeling
- Complex mechanisms
- Automatic one-click model generation
- Structural certification
- Guaranteed print success
- Automatic reverse engineering from photographs
- Other CAD platforms
- Under-13 accounts

TutorCAD may explain excluded topics, but it must not initiate a guided workflow it cannot support.

## 4. Success criteria

The main outcome is independent capability.

A first-time user should produce a useful part and understand the model well enough to modify it.

Release targets include:

- At least 80% of qualified novice study participants finish the primary bracket task without live expert help.
- At least 80% successfully edit a driving dimension afterward.
- No critical dimensions are silently invented in the evaluation set.
- Every automatic step completion has the required evidence.
- Low-confidence recognition never produces a confident “click here” instruction.
- Unsupported states produce a limitation, recovery action, or focused question.
- The overlay remains usable at supported zoom levels and display scales.
- The overlay never blocks the control required by the current step.
- Users can export and delete their TutorCAD data.
- Fixed foundations remain usable during an AI-provider outage.

## 5. First-run experience

On first use, TutorCAD:

1. Identifies a supported Onshape document.
2. Checks whether the user is in an editable workspace.
3. Explains what document information it reads and sends to the backend.
4. Connects Onshape through the supported authorization flow.
5. Offers guidance-intensity preferences.
6. Offers a short orientation and practical diagnostic.
7. Starts at the earliest missing skill.

Users can skip the diagnostic. Skipping leaves skill state unknown; it does not mark skills mastered.

The extension must not require the user to install Python, Node.js, or a desktop process.

## 6. Foundations mode

Foundations teaches the concepts needed for supported projects:

1. Documents, Part Studios, and the feature tree
2. Selecting a plane and entering a sketch
3. Sketch geometry and design intent
4. Constraints versus dimensions
5. Under-, fully-, and over-constrained sketches
6. Extrude add and remove
7. Holes, fillets, and chamfers
8. Editing earlier features
9. Naming features and maintaining readable history
10. Basic print-oriented choices

Each task follows this loop:

1. Show the physical goal.
2. Introduce one concept in plain language.
3. State the next action.
4. Observe without interrupting clear progress.
5. Reveal help when requested or needed.
6. Verify the result.
7. Ask for a small variation.
8. Record evidence of understanding.

The small variation matters. Repeating instructions is weaker evidence of learning than successfully changing a dimension or choosing an appropriate feature.

## 7. Custom Part Studio

### 7.1 Capture the need

Begin with:

> What are you trying to make, and what does it need to connect to or hold?

Convert the conversation into a visible design brief containing:

- Purpose
- Connected objects
- Interfaces and mounting points
- Available space
- Expected loads
- Desired movement
- Manufacturing method
- Material assumptions
- Appearance preferences
- Known measurements
- Missing measurements
- Assumptions
- Acceptance criteria

Every field records its source. User facts and TutorCAD assumptions must look different.

Reflect the brief back after meaningful changes. Users can correct any field.

### 7.2 Resolve shape ambiguity with images

When a description supports several reasonable designs, generate up to three visual interpretations.

For example, “a clip for this tube” could mean:

- A snap-fit clip
- A two-piece clamp
- A saddle with zip-tie slots

Each concept must:

- Show a distinct interpretation
- Use simplified geometry
- Label interfaces and major features
- Explain what differs between alternatives
- Avoid fake Onshape interface elements
- Avoid fabricated precision
- Display “Concept — not to scale”

Users can select an option, combine features, or explain the mismatch.

The chosen image becomes part of the brief. It does not override later dimensional or model evidence.

### 7.3 Collect dimensions

Ask one measurement question at a time.

Each prompt should include:

- What to measure
- Why it matters
- A diagram when useful
- Expected units
- Any relevant tolerance or fit intent
- An “I don’t know” path

For unknown measurements, TutorCAD can:

1. Explain how to measure them.
2. Retrieve a vetted manufacturer value.
3. Derive a value from confirmed dimensions.
4. Record a provisional assumption.

Critical assumed dimensions must be confirmed or explicitly accepted with a visible warning before final review.

Order questions by dependency. Resolve mounting interfaces and available space before cosmetic details.

### 7.4 Check feasibility

Before creating a plan, check:

- Whether the shape fits supported operations
- Whether critical dimensions are present
- Whether interfaces are defined
- Whether dimensions conflict
- Whether basic print constraints invalidate the concept
- Whether the result can be verified

Unsupported requests should be narrowed into a buildable first version.

### 7.5 Preview the feature plan

Show the sequence in beginner language and CAD language together.

Example:

| Physical step             | CAD operation                |
| ------------------------- | ---------------------------- |
| Make the mounting plate   | Rectangle sketch and extrude |
| Add the tube support      | Circle sketch and extrude    |
| Create the tube opening   | Extrude remove               |
| Add screw openings        | Hole features                |
| Strengthen the transition | Fillet                       |

The learner can revise the concept before modeling.

### 7.6 Guide the build

Each step contains:

- Physical goal
- CAD action
- Reason
- Semantic target role
- Expected temporary UI state
- Expected committed model change
- Ordered hints
- Common mistakes
- Recovery instructions
- Verification rules
- Safe rollback point

The default panel shows the goal and next action.

Controls include:

- **Show me:** Locate the relevant control.
- **Why?:** Explain the concept.
- **I’m stuck:** Diagnose current state.
- **Pause:** Stop active guidance.
- **Ask:** Open a contextual question.

Valid alternative workflows trigger plan reconciliation. Harmless exploration should not cause corrections.

### 7.7 Review, print, and reflect

After modeling:

1. Compare the committed part with the brief.
2. Check important dimensions and interfaces.
3. Identify unresolved assumptions.
4. Run supported printability checks.
5. Discuss orientation and supports.
6. Guide export.
7. Ask the learner to change one driving dimension.
8. Summarize the concepts used.

## 8. Help Me Now

Help Me Now works without a lesson.

Supported request categories include:

- Procedure: “How do I do this?”
- Diagnosis: “Why did this fail?”
- Design advice: “What shape should I use?”
- Concept explanation: “What does this constraint mean?”
- Print review: “Will this feature be difficult to print?”

When invoked, TutorCAD captures bounded context:

- Document and workspace identity
- Model revision
- Selected feature or geometry, where observable
- Active command or dialog
- Visible Onshape error
- Relevant committed model facts
- Recent semantic events
- User question
- Existing project brief, if present

The response begins with one concrete next action.

Additional reasoning, visuals, and teaching remain expandable.

If context is insufficient, TutorCAD asks for the smallest missing detail.

## 9. Assistance and interface

Assistance increases in levels:

| Level | Behavior                            |
| ----- | ----------------------------------- |
| 0     | Stay silent while progress is clear |
| 1     | Restate the immediate goal          |
| 2     | Identify the relevant UI region     |
| 3     | Highlight a recognized control      |
| 4     | Explain the action and purpose      |
| 5     | Diagnose and offer recovery         |

Time alone does not establish confusion.

Stuck detection combines elapsed active time, repeated attempts, relevant activity, lack of model progress, visible errors, and explicit requests.

The overlay must be:

- Compact
- Draggable
- Collapsible
- Keyboard accessible
- Readable at supported zoom levels
- Compatible with reduced motion
- Positioned away from required controls

Visual guidance uses `pointer-events: none`. Only TutorCAD’s interactive controls receive pointer events.

Use a restrained translucent appearance with sufficient contrast. Visual effects must not reduce readability.

## 10. System architecture

TutorCAD has three primary runtime boundaries:

```
Onshape browser tab
        ↕
TutorCAD extension
        ↕
TutorCAD backend
        ↕
Official Onshape API

TutorCAD backend
        ↕
Language and image providers
```

### 10.1 Extension responsibilities

The extension owns:

- Supported-page detection
- UI observation
- Target collection and ranking
- Local cursor-intent calculations
- Relevant interaction events
- Shadow DOM overlay
- Session reconnect behavior
- Local preferences
- Keyboard and accessibility behavior
- Explicit screenshot capture
- Revision checks before displaying guidance

Continuous cursor data stays local.

### 10.2 Backend responsibilities

Use a TypeScript modular monolith with modules for:

- Identity and sessions
- Onshape authorization and connector
- Model normalization
- Projects and briefs
- Concept generation
- Dimension resolution
- Feature planning
- Plan validation
- Guidance orchestration
- Lesson content
- Learner profiles
- Contextual help
- Printability
- Robotics knowledge
- AI-provider adapters
- Consent and retention
- Export and deletion
- Diagnostics and telemetry

Modules communicate through typed interfaces. Keep ownership of database records clear.

### 10.3 Infrastructure

Use:

- PostgreSQL for structured records
- Object storage for approved images
- A durable job queue for image generation and heavier processing
- Structured, redacted logs and operational metrics

Introduce additional infrastructure only when needed.

The user-facing extension must work without a Python or Node runtime on the user’s machine.

## 11. Onshape recognition

Create a versioned Onshape adapter.

Identify controls using:

1. Accessible roles and names
2. Titles and tooltips
3. Normalized visible text
4. Validated stable attributes
5. Structural relationships
6. Optional visual recognition

Screen position is never control identity.

Candidates must be visible, connected, enabled, within the viewport, and have meaningful bounds. Where practical, verify that another element is not covering them.

Debounce DOM scans. Exclude TutorCAD’s own overlay from observation.

Invalidate geometry on resize, layout changes, and target replacement.

If recognition becomes uncertain, remove the highlight immediately.

## 12. Cursor intent

Use a bounded local sample buffer.

Calculate:

- Target proximity
- Movement direction
- Distance trend
- Dwell
- Visibility
- Current-step relevance
- Active-command compatibility

Intent estimation only influences assistance. It never verifies model completion.

Initial configurable intervention bands:

| Score      | Response                                                      |
| ---------- | ------------------------------------------------------------- |
| Below 0.50 | No intervention                                               |
| 0.50–0.69  | Weak regional cue                                             |
| 0.70–0.84  | Subtle target cue                                             |
| 0.85–0.94  | Clear target highlight                                        |
| 0.95+      | Direct instruction, provided target identity is also reliable |

These scores are initial heuristics, not calibrated probabilities. Validate them with user studies.

## 13. Model truth and revision consistency

Use official Onshape APIs for committed facts where available.

Normalize provider responses into a model snapshot rather than exposing raw API payloads throughout the system.

A snapshot includes:

- Document, workspace, element, and revision identifiers
- Capture time
- Connector version
- Feature order and types
- Supported feature parameters
- Sketch facts where available
- Part and geometry facts where available
- Capability flags
- Partial failures and warnings

Temporary and committed states are different.

An open Extrude dialog is a UI fact. A committed extrusion with the expected depth is a model fact.

Every response is tied to a model revision and client UI state. Stale responses must be discarded or reconciled before use.

After reload or reconnection, compare the current document with the saved session before resuming.

## 14. Domain records

### PartBrief

Stores purpose, interfaces, loads, space, manufacturing process, known values, unknowns, assumptions, and acceptance criteria.

Every fact has provenance. Revisions are retained.

### ConceptVariant

Stores a generated image, interpretation, labeled differences, and associated brief revision.

### DimensionSpec

Stores:

- Stable identifier
- Meaning
- Measurement endpoints
- Value
- Canonical unit
- Display unit
- Tolerance or fit intent
- Source
- Criticality
- Status
- Confirmation state
- Dependencies for derived values

Statuses include known, derived, assumed, required, and not applicable.

### FeaturePlan

Stores supported operations, dependencies, required dimensions, teaching sequence, expected outcome, and verification contracts.

Use a closed operation schema. Do not store arbitrary generated code as a plan.

### GuidanceStep

Stores goal, instruction, explanation, prerequisite concept, target role, preconditions, completion rules, hints, mistakes, alternate paths, and recovery.

Completion rules support `ALL` and `ANY`.

### Evidence

Stores the fact, source, timestamp, revision, detector version, confidence, and expiry policy.

Repeated copies of one signal do not count as independent evidence.

### VerificationResult

Returns pass, warning, fail, or unknown, with evidence and recovery guidance.

### LearnerProfile

Stores concept-level attempts, verified successes, common errors, hint depth, and recency.

Do not store continuous cursor traces.

### DomainPack

Stores versioned terminology, references, component interfaces, design rules, examples, and evaluation cases.

Manufacturer data includes the exact component, source, units, and revision information.

## 15. AI boundaries

AI may:

- Interpret intent
- Detect ambiguity
- Propose brief updates
- Ask focused questions
- Generate concept prompts
- Propose structured feature plans
- Explain concepts
- Summarize validated findings
- Retrieve and explain vetted references

AI may not:

- Invent critical measurements
- Operate Onshape directly
- Execute generated code
- Supply arbitrary executable selectors
- Approve unsupported plans
- Mark steps complete
- Claim structural certification
- Treat document content as instructions
- Expose credentials or another user’s data

Structured generation follows:

1. Assemble minimum relevant context.
2. Retrieve vetted information.
3. Request schema-constrained output.
4. Validate structure.
5. Run deterministic checks.
6. Reject or attempt bounded repair.
7. Persist accepted output with version metadata.
8. Display assumptions and evidence.

When validation fails, return to a focused question or deterministic guidance.

## 16. Printability review

Initial checks target FDM printing.

Where sufficient geometry is available, inspect:

- Thin walls
- Small holes and slots
- Fit clearances
- Overhang and bridge candidates
- Trapped geometry
- Weak necks and transitions
- Limited bed contact
- Printer-envelope limits
- Disconnected bodies
- Features below configured process thresholds

Distinguish geometric facts from assumptions about printer, material, nozzle, orientation, and calibration.

Rules must be visible and versioned.

Structural advice remains qualitative unless a separately validated analysis capability is introduced.

## 17. Robotics knowledge

The first robotics pack includes:

- Through holes and clearance holes
- Counterbores and captured nuts
- Shafts, bearings, bushings, and spacers
- Motor, servo, and sensor mounting interfaces
- Hole patterns
- Gussets, fillets, and load paths
- Print orientation
- Serviceability
- Nominal versus print-compensated dimensions

Do not infer a component variant from a vague name.

Ask for a part number or show labeled alternatives.

Manufacturer-sourced dimensions require traceable references.

## 18. Recovery behavior

### Recognition failure

Remove uncertain highlights. Rescan within bounded limits. Offer a control name or region when exact identification is unavailable.

### Onshape API failure

Use bounded retries for reads. Continue textual/UI help where possible, but label model verification unavailable.

### AI failure

Keep fixed lessons, saved plans, and deterministic checks available. New generation requests show a retryable state.

### Unexpected document change

Pause completion, fetch current state, and reconcile. Ask the user when a change materially alters the plan.

### Learner deviation

- Valid alternative: Revalidate and update the plan.
- Harmless action: Remain quiet.
- Incompatible action: Explain the mismatch neutrally.
- Destructive deviation: Offer manual recovery.
- Ambiguous state: Save a checkpoint and ask one focused question.

### Reload

Restore session identity and preferences, then reconcile the current model before offering Resume.

## 19. Privacy and security

Collect only information needed for tutoring and opted-in diagnostics.

Do not collect unrelated browsing history, passwords, continuous mouse recordings, or background screenshots.

Image uploads and screenshot capture are explicit. Retention and deletion are available per project.

Keep provider credentials on the backend. Protect Onshape credentials according to the verified authorization flow.

Use minimum extension permissions, strict Manifest V3 policies, origin checks, schema validation, and sanitized rendering.

AI-generated text must never become executable code or unsanitized HTML.

V1 supports ages 13+. School deployment requires an appropriate consent and data-governance process.

## 20. Accessibility

All TutorCAD controls must support keyboard navigation and visible focus.

Provide screen-reader labels.

Do not steal normal Onshape shortcuts.

Respect reduced motion. Do not use color as the only indicator.

Support common browser zoom levels and display scaling.

Keep text and units ready for future localization. Preserve user display units while using canonical internal values.

## 21. Testing

### Unit tests

Cover geometry, units, target ranking, confidence thresholds, state transitions, evidence expiry, completion rules, plan validation, hints, print rules, positioning, and persistence migrations.

### Contract tests

Validate extension/backend schemas and stored-record compatibility.

### Mock Onshape tests

Build a deterministic fixture for toolbars, dialogs, selection, sketch mode, feature creation, errors, DOM replacement, resize, zoom, delays, and document revisions.

The fixture is a test tool. It does not prove real Onshape compatibility.

### Browser tests

Exercise first run, lessons, wrong-action recovery, custom projects, help mode, reload, stale responses, keyboard use, and reduced motion.

### Real Onshape tests

Use a dedicated development account and disposable documents.

Verify UI targets, model reads, parameters, revision behavior, recovery, and required operations.

### AI evaluations

Include vague requests, conflicting measurements, mixed units, impossible concepts, unsupported operations, ambiguous images, component variants, and hostile document text.

Measure unsupported-plan generation, dimension invention, grounding, assumption visibility, and valid structured output.

### Beginner usability tests

At least 20 participants aged 13+ should attempt the primary task, recover from a mistake, request contextual help, edit a dimension, review print risks, and export.

## 22. Build sequence

### Phase 0: Capability prototype

Prove:

- Official authorization
- API reads
- Model and parameter availability
- Revision behavior
- Extension injection
- Required target recognition
- Selection and dialog observability
- Overlay isolation

Produce a capability matrix with supported, partial, volatile, and unavailable facts.

Later implementation must follow this evidence.

### Phase 1: Foundations alpha

Build the extension, target registry, overlay, local intent estimator, lesson engine, persistence, accessibility, and one real Onshape lesson.

Gate: Complete the lesson after reload and at supported zoom levels without false advancement.

### Phase 2: Model truth and Help Me Now

Build the connector, model snapshots, evidence engine, revision handling, retrieval, and a limited set of grounded diagnoses.

Gate: Approved scenarios produce supported diagnoses or clear unknown states.

### Phase 3: Custom Part Studio

Build briefs, concept generation, visual confirmation, dimensions, constrained planning, validation, and guidance for brackets, plates, and spacers.

Gate: Reference projects succeed without invented critical measurements.

### Phase 4: Robotics and printability

Build vetted component knowledge, printer profiles, geometric checks, and export guidance.

Gate: Pass reference-model tests and source audits.

### Phase 5: Beginner beta

Complete diagnostics, retention, deletion, performance, content migrations, compatibility checks, and usability testing.

Gate: Meet the success criteria.

### Phase 6: V1

Publish after security, accessibility, privacy, recovery, and real Onshape compatibility checks.

## 23. First complete implementation scenario

The first working delivery should be a simple bracket journey:

1. Open a prepared Onshape Part Studio.
2. Start TutorCAD.
3. Gather confirmed bracket dimensions.
4. Review the feature plan.
5. Create and dimension the base sketch.
6. Extrude the plate.
7. Add mounting holes.
8. Encounter a wrong-tool action.
9. Recover with TutorCAD guidance.
10. Verify committed features and parameters.
11. Change a driving dimension.
12. Review supported print risks.
13. Export.

A fixed brief is acceptable for this first slice. General AI planning comes afterward.

The slice must work in real Onshape before it is declared complete.

## 24. Coding-agent instructions

Read this design before implementation.

Inspect the repository and preserve existing work.

Begin with the Onshape capability prototype. Verify official API and authorization behavior using current documentation and a controlled development document. Do not assume unfinished sketches or selections are available through the API.

Implement small, independently testable deliveries. Keep recognition, state machines, AI proposals, model verification, and React rendering separate.

For each delivery, report:

- What was built
- What automated checks ran
- What was tested in real Onshape
- What remains unsupported
- Which claims are still unverified

Do not call a simulated demo, compiled extension, or passing mock test suite a finished product.

TutorCAD is successful when a person with no prior CAD knowledge can describe a real need, confirm its visual interpretation, resolve the important measurements, build the part themselves, recover from confusion, modify the model, assess basic print risks, and export it.