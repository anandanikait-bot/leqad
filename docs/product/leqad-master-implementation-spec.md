# LEQAD — Master Engineering and Implementation Specification
**Version:** 1.0  
**Project:** Leqad  
**Pronunciation:** Leh-kad  
**Development approach:** Open-source, production-minded side project  
**Primary integration:** Onshape  
**Initial release:** Chrome and Microsoft Edge  
**Primary audience:** Beginner CAD users, student robotics teams, makers, and engineering students

---

# 0. YOUR ASSIGNMENT

You are the lead software engineer responsible for implementing Leqad.

Your job is to build the product described in this document, not continuously brainstorm alternative architectures.

The original `TutorCAD Product and System Design` specification is the source of truth for product requirements. This document defines the implementation decisions, structure, priorities, and development process.

Where requirements conflict, prioritize:

1. User safety, security, and honest verification
2. Explicit requirements in the original product specification
3. This implementation blueprint
4. Existing repository conventions, where compatible

Preserve the original specification in the repository for historical reference.

Rename the **public-facing product** to Leqad. Internal references to TutorCAD may remain in archived documents and migration history.

Do not assume functionality is complete simply because documentation exists.

## Engineering operating rules

- Do not repeatedly ask for technology-stack decisions already settled here.
- Implement straightforward choices directly.
- Favor working software over elaborate architecture diagrams.
- Preserve existing repository work.
- Write modular, maintainable TypeScript.
- Avoid premature abstractions and infrastructure.
- Add automated tests alongside functionality.
- Verify external API behavior before depending on it.
- Never fabricate integration results.
- Do not store credentials in the repository.
- Never automatically manipulate the user's CAD model in V1.
- Record implementation progress in a persistent file.
- Continue through independent tasks when one task is blocked.
- Never bypass a verification failure simply to advance development.

Stop for user input only when credentials, permissions, real browser access, an unavoidable product decision, or a significant conflict requires it.

---

# 1. PRODUCT DEFINITION

## What Leqad is

Leqad is an interactive CAD learning platform that helps users turn ideas into editable 3D designs.

Unlike conventional CAD tutorials, Leqad guides users inside their modeling workflow.

The platform should understand:

- What the user wants to build
- What CAD concept they are learning
- Which operation they should perform
- What their current Onshape model contains
- Whether the required operation succeeded
- What they are struggling with
- How much assistance they need

The initial product is a teaching assistant, not an automatic CAD generator.

The user performs CAD operations themselves.

Leqad explains, guides, observes, checks, and helps users recover from mistakes.

## Core product experiences

### A. Foundations

Structured lessons teaching essential CAD concepts.

Examples:

- Sketches
- Geometric constraints
- Dimensions
- Extrusions
- Holes
- Fillets
- Editing features

### B. Guided Projects

A user builds a practical component with step-by-step assistance.

Eventually, users will be able to describe their own desired parts.

### C. Ask Leqad

Contextual assistance inside Onshape.

Examples:

- Why won't my sketch extrude?
- What does fully constrained mean?
- How can I change this dimension?
- How should I design a motor mount?

### D. Learning Progress

Track demonstrated understanding rather than merely counting completed clicks.

The first release must prioritize Foundations and one complete Guided Project.

---

# 2. TECHNOLOGY STACK

Use the following default stack unless an existing implementation provides a clearly better compatible foundation.

## Monorepo

- TypeScript
- pnpm workspaces
- Strict TypeScript configuration
- Shared ESLint configuration
- Prettier
- GitHub Actions for CI

## Extension

- React
- TypeScript
- Vite
- Manifest V3
- Chrome Extension APIs
- Shadow DOM for the in-page interface
- Tailwind CSS for the application UI

Use a maintained Manifest V3 build integration compatible with Vite. Validate its current version before installation.

Keep the Chrome/Edge integration isolated from application logic.

## Backend

- Node.js active LTS
- TypeScript
- Fastify
- Zod for request validation
- Onshape REST API adapter
- PostgreSQL when server-side persistence becomes necessary
- Drizzle ORM for database access

Do not introduce Redis, Kafka, Kubernetes, microservices, or a distributed job system for the MVP.

Keep local development possible without PostgreSQL for functionality that does not require server persistence.

## Testing

- Vitest for unit and contract tests
- React Testing Library for components
- Playwright for browser tests
- Real Onshape tests for integration validation
- TypeScript compiler checks
- ESLint

## State management

Use lightweight React state and context for UI state.

Use a separate deterministic lesson state machine.

Do not make React components responsible for interpreting CAD API responses or deciding whether operations succeeded.

## Authentication

During development:

- Use the existing secure, read-only Onshape API diagnostic.
- Keep API credentials server-side.
- Never expose an Onshape secret to extension code.

For a public multi-user release:

- Implement an appropriately scoped OAuth2 authorization flow.
- Store credentials securely on the backend.
- Associate credentials with the correct user.
- Support revocation and session expiration.
- Do not reuse the developer's personal API key for users.

---

# 3. REPOSITORY STRUCTURE

Use this structure, adapting existing files without unnecessary rewrites.

### Root

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.gitignore`
- `.env.example`
- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `ROADMAP.md`

### Applications

`apps/extension/`

- `src/entrypoints/` — Browser injection and lifecycle
- `src/components/` — Reusable UI components
- `src/components/panel/` — Main Leqad assistant
- `src/components/guidance/` — Highlights and guidance
- `src/components/lessons/` — Lesson UI
- `src/components/help/` — Contextual assistance
- `src/components/onboarding/` — First-run experience
- `src/components/settings/` — Preferences
- `src/hooks/` — React hooks
- `src/state/` — Presentation state
- `src/services/` — Extension communications
- `src/styles/` — Theme and typography
- `src/assets/` — Brand assets
- `src/utils/` — UI utilities

`apps/api/`

- `src/server.ts`
- `src/routes/`
- `src/modules/onshape/`
- `src/modules/verification/`
- `src/modules/lessons/`
- `src/modules/projects/`
- `src/modules/help/`
- `src/modules/ai/`
- `src/modules/auth/`
- `src/modules/privacy/`
- `src/db/`
- `src/config/`

### Shared packages

`packages/contracts/`

Shared Zod schemas and TypeScript API contracts.

`packages/cad-core/`

- Model normalization
- Feature identity
- Dimension handling
- Unit conversions
- Verification rules
- Revision comparison

`packages/lesson-engine/`

- Lesson definitions
- Lesson states
- Transition rules
- Hint progression
- Recovery behavior

`packages/onshape-adapter/`

- Browser recognition
- Semantic target descriptions
- UI observation
- Capability registry

`packages/ui/`

Shared design tokens and reusable components.

### Testing and documentation

- `tests/fixtures/`
- `tests/integration/`
- `tests/e2e/`
- `docs/architecture/`
- `docs/onshape/`
- `docs/product/`
- `docs/development/`
- `docs/testing/`

Retain existing Phase 0 documents.

---

# 4. BRAND AND DESIGN SYSTEM

The application name is **Leqad**.

Do not use TutorCAD as the public-facing name.

## Official working colors

**Primary: Dull Violet Black**

- RGB: 13, 28, 67
- HEX: `#0D1C43`

**Secondary: Hay's Russet**

- RGB: 121, 51, 39
- HEX: `#793327`

**Supporting neutral**

- Warm off-white: `#F5EFE7`

Additional neutral grays may be used for readability, borders, and disabled elements.

Treat the two requested colors as immutable brand tokens, not approximate suggestions.

## Visual direction

The interface should feel:

- Precise
- Minimal
- Technical
- Modern
- Calm
- Approachable
- Premium without unnecessary decoration

Use:

- Thin geometric outlines
- Occasional curves
- Clean typography
- Generous spacing
- Rounded corners used consistently
- Restrained animations
- Subtle borders
- Clear hierarchy

Avoid:

- Heavy gradients
- Generic glowing AI designs
- Excessive shadows
- Decorative animations
- Constantly moving indicators
- Crowded interfaces

Use a modern, accessible sans-serif typeface with appropriate licensing.

## Logo

The logo has not yet been finalized.

For development, use a simple Leqad text wordmark or clearly temporary geometric icon.

Do not treat AI-generated concept images as finalized brand assets.

Organize brand tokens so the logo can later be replaced without modifying application logic.

## Accessibility

Meet WCAG 2.2 AA where applicable.

Do not rely on the two brand colors alone for all text and status indicators.

Maintain sufficient contrast, particularly where russet is used against dark navy.

Respect reduced-motion preferences.

Provide visible keyboard focus.

Use thin decorative strokes without sacrificing readability or small-size icon recognition.

---

# 5. EXTENSION USER EXPERIENCE

The main Leqad panel appears inside supported Onshape pages.

## Default panel

A compact floating panel in the lower-right region where space permits.

It must be:

- Draggable
- Collapsible
- Keyboard accessible
- Responsive
- Able to reposition away from essential controls
- Resistant to host-page CSS interference

Use Shadow DOM to isolate styles.

The panel must not prevent normal Onshape interaction.

## Header

Display:

- Leqad wordmark
- Current mode
- Connection status
- Collapse control
- Settings control

Connection statuses:

- Connected
- Connecting
- Limited access
- Disconnected
- Unsupported document

Do not report Connected merely because the Onshape website loaded.

## Main navigation

Three modes:

1. Learn
2. Projects
3. Ask

A small progress/settings area can be accessed separately.

## Guided step layout

Each step shows:

**Goal**

What should be accomplished.

**Next action**

The immediate CAD operation.

**Reason**

An optional explanation of why the operation matters.

**Help controls**

- Show me
- Why?
- I'm stuck
- Pause

**Verification**

One of:

- Verified
- Checking
- Needs correction
- Unable to verify

Do not display misleading success checkmarks for unverified work.

## Assistance behavior

Use five assistance levels:

0. Silent observation
1. Short instruction
2. Identify relevant interface region
3. Highlight a recognized control
4. Detailed explanation
5. Diagnosis and recovery

Help should become more detailed when requested.

Do not interrupt users merely because they spend time thinking.

## Example

User goal:

"Create a sketch on the Top plane."

Leqad displays:

"Select the Top plane and start a sketch."

If the user clicks Show me, Leqad highlights the relevant recognized region.

When sketch mode opens:

"I can see that you're editing a sketch. Add the base profile next."

Do not mark the entire sketch complete until the required committed model facts are verified.

---

# 6. ONSHAPE INTEGRATION

## 6.1 Adapter architecture

Implement a versioned Onshape UI adapter.

UI identification priority:

1. Accessible roles and names
2. Tooltips and titles
3. Visible text
4. Validated stable attributes
5. Structural relationships
6. Optional visual recognition in later releases

Never use permanent screen coordinates as control identity.

Calculate screen geometry only after identifying the actual target.

A target is eligible only if it is visible, enabled, connected to the current document, and not obscured where detection is possible.

## 6.2 Supported-page detection

Detect:

- Supported Onshape origin
- Document identity
- Workspace identity
- Part Studio identity
- Current active document URL
- Whether the environment appears editable

If the user navigates to an unsupported state, suspend operation-specific guidance.

## 6.3 DOM observation

Use bounded MutationObservers and debounced rescanning.

Do not continuously scan the entire DOM on every mouse movement.

Exclude Leqad's own interface.

Invalidate recognized targets after significant document or UI changes.

## 6.4 Cursor handling

The MVP does not need predictive cursor intelligence.

Implement basic target proximity and highlighting support, but defer advanced cursor-intent scoring.

Do not transmit continuous cursor traces to the backend.

## 6.5 API adapter

Reuse the secure Onshape diagnostic where possible.

Support read-only retrieval of:

- Document information
- Workspace information
- Part Studio features
- Supported feature parameters
- Committed sketches
- Extrusions
- Parts and supported geometry facts
- Available revision or microversion information

Use the current officially documented endpoint versions.

The documented feature-list endpoint has a form similar to:

`GET /api/v9/partstudios/d/{did}/{wvm}/{wvmid}/e/{eid}/features`

Verify the actual endpoint and returned payload against current official documentation and live API responses before relying on it.

Avoid relying on undocumented fields.

## 6.6 Rate limiting and caching

Implement:

- Request deduplication
- Bounded retries
- Exponential backoff for transient errors
- Per-session API request counts
- Document-aware caching
- Request timeouts
- Explicit handling of rate-limit responses

Never implement an unlimited polling loop.

Do not retry authentication failures indefinitely.

---

# 7. MODEL TRUTH AND VERIFICATION

This is Leqad's most important technical subsystem.

An observed click is not proof of a completed CAD feature.

## 7.1 Normalized model snapshot

Create a typed `ModelSnapshot` containing:

- Document ID
- Workspace ID
- Element ID
- Snapshot timestamp
- Revision or microversion information where supported
- Feature list
- Feature IDs
- Feature types
- Supported parameters
- Supported sketch facts
- Part facts
- Retrieval warnings
- Capability flags

Preserve the original API response only within the adapter or diagnostic layer.

Application logic should work with normalized records.

## 7.2 Evidence structure

Create a typed `Evidence` record containing:

- ID
- Observed fact
- Source
- Document identity
- Model revision
- Observation timestamp
- Detector version
- Confidence where applicable
- Expiration policy

Evidence levels:

- `API_CONFIRMED`
- `UI_CONFIRMED`
- `INFERRED`
- `UNKNOWN`

## 7.3 Verification results

Use:

- `PASS`
- `WARNING`
- `FAIL`
- `UNKNOWN`

A result also contains:

- Evidence used
- Expected condition
- Actual observed value, if available
- Explanation
- Recommended recovery action

## 7.4 Completion rules

Steps declare explicit completion conditions.

Support:

- ALL required conditions
- ANY permitted alternatives

For example:

Extrusion completion requires:

- Correct document
- Committed extrusion feature
- Correct supported operation type
- Correct supported extrusion depth
- Current non-stale model snapshot

If depth cannot be inspected, do not assume success.

If a verification capability is unavailable, mark that portion unknown.

## 7.5 Revision consistency

Discard or reconcile verification data when:

- Document changes
- Workspace changes
- Active element changes
- Features are edited
- Features are deleted
- Undo changes the committed model
- An older API response arrives after a newer one
- A saved lesson is resumed after reload

## 7.6 AI restrictions

AI is never allowed to:

- Mark steps completed
- Fabricate model facts
- Invent important dimensions
- Override verification results
- Execute generated CAD code
- Manipulate the model silently

Verification remains deterministic.

---

# 8. LESSON ENGINE

Create a deterministic lesson state machine.

## States

- `NOT_STARTED`
- `READY`
- `AWAITING_ACTION`
- `ACTION_OBSERVED`
- `VERIFYING`
- `COMPLETED`
- `NEEDS_CORRECTION`
- `UNKNOWN`
- `PAUSED`

## Lesson structure

Each lesson contains:

- Lesson ID
- Version
- Title
- Description
- Learning objectives
- Prerequisites
- Steps
- Completion criteria

Each step contains:

- Step ID
- Physical goal
- CAD operation
- Beginner explanation
- Required dimensions
- Required evidence
- Semantic UI target
- Ordered hints
- Common errors
- Recovery actions
- Optional alternate workflows

## Hint progression

Hint 1: Explain the immediate goal.

Hint 2: Identify the relevant Onshape tool or area.

Hint 3: Highlight the specific tool if reliably recognized.

Hint 4: Explain the operation in detail.

Hint 5: Help diagnose and recover.

## Persistence

Persist:

- Lesson identity
- Lesson version
- Current step
- Verified completions
- Hint usage
- Document identity
- Relevant model revision
- Updated timestamp

When resuming, reconcile saved progress against the current document before reusing completed-state evidence.

---

# 9. FIRST COMPLETE PROJECT — MOUNTING PLATE

Build this before arbitrary AI-generated projects.

The first complete demonstration is a rectangular mounting plate representing a simple mounting-bracket component.

Use a fixed educational design.

## Reference geometry

Use these example dimensions:

- Width: 40 mm
- Height: 30 mm
- Thickness: 5 mm
- Two mounting holes
- Hole diameter: 5 mm
- Hole centers: 24 mm apart
- Holes centered along the plate's height

These are educational preset values, not measurements inferred from a user's real object.

For a centered plate, the hole centers may be defined at x = −12 mm and x = +12 mm, with y = 0 mm, subject to a validated sketch coordinate system.

## Guided build sequence

### Step 1: Start the project

Open a supported editable Part Studio.

Check its identity.

Introduce the physical object.

### Step 2: Review dimensions

Show the example dimensions.

Explain why width, height, thickness, and hole placement matter.

### Step 3: Create the sketch

Guide the user to select a validated default plane.

Start a sketch.

Draw a rectangle.

Apply the specified dimensions.

Commit the sketch.

Verify available committed sketch facts.

### Step 4: Extrude

Guide the user through an additive extrusion.

Target thickness: 5 mm.

Verify the committed extrusion depth and operation where available.

### Step 5: Add holes

Use a validated beginner-friendly hole workflow.

Initially prefer sketch circles followed by extrude-remove, if this is more reliably supported than the dedicated Hole feature.

The resulting holes must match the accepted reference design.

Verify the supported hole-related facts.

### Step 6: Error recovery

Test:

- Wrong tool
- Wrong dimension
- Incorrect depth
- Missing feature
- Unexpected feature deletion
- Undo
- Unsupported dialog state

Never treat a guessed diagnosis as confirmed.

### Step 7: Independent modification

Ask the learner to change the plate width from 40 mm to 50 mm.

Guide only as needed.

Verify the changed driving dimension and updated committed model.

### Step 8: Print preparation

Display only validated checks.

Discuss orientation and basic risks without guaranteeing print success.

### Step 9: Export

Guide the learner through the supported Onshape export workflow.

Where export completion is not programmatically observable, say so clearly.

### Step 10: Completion

Summarize:

- Verified operations
- Independently completed tasks
- Hint usage
- Remaining unknowns

Do not mark the entire project fully verified if required facts remain unknown.

---

# 10. FOUNDATIONS CURRICULUM

Implement modular beginner lessons.

Initial modules:

1. Understanding documents and Part Studios
2. Selecting planes
3. Creating sketches
4. Lines and rectangles
5. Dimensions
6. Constraints
7. Extrusion
8. Removing material
9. Holes
10. Editing existing features

Each lesson follows:

Explain → Demonstrate guidance → User acts → Observe → Verify → Practice variation.

Use versioned deterministic lesson definitions.

Do not generate foundational lesson procedures dynamically with AI.

Make static lessons usable during AI-provider outages.

---

# 11. ASK LEQAD — CONTEXTUAL HELP

Implement after the first verified modeling experience works.

## Initial capabilities

- Explain CAD concepts
- Answer procedural questions
- Explain common feature errors
- Suggest simple recovery actions
- Explain basic print-oriented design choices

## Context packet

Include only available relevant information:

- User question
- Current document identity
- Active lesson
- Current lesson step
- Recognized active tool/dialog
- Selected feature if observable
- Relevant model snapshot
- Visible error if observable

Do not send entire project contents unnecessarily.

## Response format

Every answer should start with one useful next action.

Example:

"Check whether the sketch profile is closed."

Then expandable reasoning:

"Extrude generally requires an appropriate profile or region. I can see your current sketch context, but I cannot yet verify which boundary is open."

Use evidence-aware language.

## AI provider abstraction

Create an interface allowing supported AI providers to be changed without rewriting the application.

Use:

- Server-side API keys
- Structured output
- Input validation
- Output validation
- Request timeouts
- Basic usage controls
- Clear error handling

Never directly execute AI-generated code or selectors.

---

# 12. CUSTOM PART STUDIO — POST-MVP

Implement only after the first guided project and evidence system are reliable.

The full flow is:

1. Capture the physical need.
2. Identify connected objects.
3. Clarify interfaces.
4. Collect measurements.
5. Confirm materials and manufacturing method.
6. Resolve ambiguity with optional concepts.
7. Build a structured design brief.
8. Check supported modeling operations.
9. Generate a constrained feature plan.
10. Validate it.
11. Guide the user through the model.
12. Verify results.
13. Review printability.
14. Export.

## Design brief

Store:

- Purpose
- Connected objects
- Mounting interfaces
- Available space
- Loads
- Required movement
- Manufacturing method
- Material assumptions
- Known dimensions
- Missing dimensions
- Unresolved assumptions
- Acceptance criteria

Every value has provenance.

Do not invent critical measurements.

## Feature planning

AI proposes structured plans only.

A deterministic validator checks:

- Supported operations
- Valid parameters
- Required dimensions
- Operation dependencies
- Required verification capabilities
- Conflicting requirements

Reject unsupported plans.

Do not generate arbitrary executable CAD operations.

---

# 13. ROBOTICS KNOWLEDGE — POST-MVP

Keep robotics as a major future product advantage.

Initial topics:

- Motor mounting patterns
- Servo mounting patterns
- Sensor brackets
- Bearings
- Bushings
- Spacers
- Shaft interfaces
- Captured nuts
- Screw clearances
- Gussets
- Fillets
- Print orientation
- Dimensional tolerances

Use exact component identifiers where required.

Manufacturer specifications must be traceable.

Do not infer precise dimensions from vague descriptions.

Allow users to build their own verified component libraries later.

---

# 14. DATA AND PRIVACY

The product supports users aged 13+.

Use privacy-conscious defaults.

## Collect only what is needed

Permitted categories when necessary:

- Lesson progress
- Confirmed model facts
- User-provided project briefs
- Explicitly submitted questions
- Basic error diagnostics
- Opted-in usage telemetry

Do not collect:

- Unrelated browsing history
- Passwords
- Raw authentication credentials
- Continuous mouse recordings
- Background screenshots
- Unnecessary personal information

Require explicit user action for screenshot capture or image uploads.

## Storage

Store lightweight preferences locally.

Use PostgreSQL for server-side accounts, projects, and progress once those capabilities are needed.

Provide a documented retention policy.

Support data export and deletion.

Do not commit real user CAD models, document links, credentials, or screenshots to public fixtures.

---

# 15. ERROR HANDLING

Implement predictable recovery rather than generic failure messages.

### API unavailable

Show:

"Leqad can't verify the model right now."

Allow supported explanatory guidance to continue.

Do not automatically advance the lesson.

### UI target missing

Remove the highlight.

Show a textual instruction.

Offer to retry target recognition.

### AI unavailable

Continue deterministic lessons.

Disable only capabilities requiring AI.

### Document changed

Pause dependent verification.

Refresh the model snapshot.

Reconcile the saved lesson.

### Unsupported CAD operation

Explain the limitation.

Suggest the nearest supported manual workflow when appropriate.

Never pretend unsupported functionality is implemented.

---

# 16. TESTING REQUIREMENTS

## Unit tests

Test:

- Units and conversions
- Model normalization
- Document identity
- Revision consistency
- Evidence expiry
- Step transitions
- Completion requirements
- Plan validation
- Hint progression
- Recovery handling

## UI tests

Test:

- Extension loads
- Panel renders
- Panel drags
- Panel collapses
- Controls respond
- Keyboard navigation
- Focus handling
- Zoom behavior
- Reduced motion
- Target highlights
- No pointer-event obstruction

## Integration tests

Test:

- Authentication failure
- Missing permissions
- Rate limits
- Network interruption
- Invalid API responses
- Missing features
- Feature deletion
- Changed dimensions
- Stale snapshots
- Session restoration

## Real Onshape tests

Required before claiming real integration success:

1. Open a real editable Part Studio.
2. Verify document identity.
3. Retrieve committed features.
4. Read expected supported parameters.
5. Change a dimension.
6. Confirm the new model state.
7. Reload and resume.
8. Delete a feature.
9. Verify that old evidence becomes invalid.
10. Confirm recovery behavior.

Use disposable documents only.

## Automated quality commands

Make the repository support equivalent commands:

- `pnpm install`
- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`

Document any platform-specific prerequisites.

Every reported test result must distinguish mock results from live Onshape results.

---

# 17. OPEN-SOURCE RELEASE

Leqad is initially an open-source side project.

Prepare it as a repository others can understand and contribute to.

## README

Include:

- Leqad name
- One-sentence product description
- Problem being solved
- Main features
- Current implementation status
- Screenshots of working functionality
- Installation instructions
- Development instructions
- Current limitations
- Roadmap
- Contributing information
- License

Do not advertise proposed features as completed features.

## License

Prepare Apache License 2.0 as the proposed default, subject to final owner review before publication.

Do not represent this as a promise that future proprietary improvements will automatically remain exclusive.

## Contribution documentation

Create:

- Contribution guidelines
- Issue templates
- Pull request template
- Development setup
- Architecture overview
- Testing instructions
- Security reporting guidance

## GitHub Actions

On pull requests, run:

- Install
- Lint
- Typecheck
- Unit tests
- Production build

Never inject production credentials into ordinary pull-request workflows.

## Public release requirements

Before public release:

- No exposed secrets
- No personal test document data
- No broken installation steps
- Honest project status
- Working development setup
- Existing license
- Basic security review
- At least one demonstrated functional workflow

Do not publish a Chrome Web Store listing before extension requirements and relevant policies have been checked.

---

# 18. EXACT IMPLEMENTATION ORDER

Execute this sequence.

## Milestone 0 — Complete integration validation

Reuse existing Phase 0 work.

Tasks:

1. Confirm actual repository and Git state.
2. Preserve the original specification and implementation documents.
3. Verify the secure read-only diagnostic.
4. Test authenticated document reads when credentials are available.
5. Record supported and unsupported facts.
6. Test real UI recognition when browser access is available.
7. Finalize the integration decision using evidence.

**Gate:** Critical Onshape access and guidance assumptions are validated.

If external access is unavailable, continue with isolated scaffolding and mock-driven unit tests, but do not claim the milestone complete.

## Milestone 1 — Initialize the application

Build:

- Monorepo
- Extension shell
- Backend shell
- Shared packages
- Common tooling
- Environment configuration
- CI workflow

**Gate:** All applications compile and development commands work.

## Milestone 2 — Implement brand and interface

Build:

- Leqad theme
- Panel
- Navigation
- Button system
- Connection statuses
- Settings
- Draggable positioning
- Collapse/expand behavior

**Gate:** UI runs in the actual supported browser environment without interfering with normal page interaction.

## Milestone 3 — Implement lesson engine

Build:

- Lesson schema
- Step state machine
- Hint progression
- Session persistence
- Deterministic example lessons
- Unit tests

**Gate:** Lesson progression behaves correctly in isolated tests.

## Milestone 4 — Implement CAD integration

Build:

- UI target registry
- Onshape observation
- Secure API adapter
- Model normalization
- Snapshot reconciliation
- Rate limiting
- Caching

**Gate:** Supported committed model information can be retrieved in real Onshape.

## Milestone 5 — Implement verification engine

Build:

- Evidence records
- Verification contracts
- Revision checks
- Completion rules
- Unknown-state behavior
- Recovery guidance

**Gate:** Real supported CAD facts trigger correct pass/fail/unknown outcomes, without false success.

## Milestone 6 — Complete mounting plate tutorial

Build all ten guided steps.

Add:

- Hints
- Highlights
- Mistake recovery
- Independent dimension editing
- Export guidance

**Gate:** Complete a real modeling journey without manually falsifying progress.

## Milestone 7 — Add contextual help

Build:

- Help panel
- Context extraction
- Deterministic answers
- Optional AI
- Output validation
- Graceful AI failure

**Gate:** Supported questions receive useful, grounded guidance.

## Milestone 8 — Stabilize MVP

Complete:

- Accessibility checks
- Browser tests
- Failure testing
- API usage analysis
- Security review
- Performance improvements
- Usability testing
- Documentation

**Gate:** The first release satisfies its stated acceptance tests.

## Milestone 9 — Prepare public alpha

Create:

- Clean README
- Screenshots
- Example project
- Release notes
- Contributions guide
- Public roadmap

Release as an honest alpha rather than a finished commercial product.

---

# 19. PRIORITY CLASSIFICATION

## P0 — Must be implemented

- Running extension
- Working panel
- Secure backend connectivity
- Basic Onshape observation
- Model snapshot normalization
- Evidence engine
- Deterministic lessons
- First guided modeling project
- Revision-aware progress
- Error recovery
- Session persistence
- Automated tests

## P1 — Should follow

- Contextual Ask Leqad
- More foundations lessons
- Better visual guidance
- More comprehensive recovery
- Learning profiles
- Print review
- Export assistance
- Public alpha polish

## P2 — Future development

- Arbitrary custom part generation
- Generated concept images
- Robotics component libraries
- Advanced printability
- Personalized curricula
- Cursor-intent prediction
- Assemblies and mates
- Multiple CAD platforms
- Collaboration features
- More advanced AI planning

Do not prioritize P2 over incomplete P0 functionality.

---

# 20. CONTINUOUS DEVELOPMENT PROCEDURE

Maintain:

`docs/implementation-progress.md`

Record:

- Current milestone
- Completed tasks
- Files changed
- Tests run
- Test outcomes
- Real Onshape validation status
- Known blockers
- Next independent tasks

For each implementation increment:

1. Read the relevant specification requirements.
2. Inspect existing code.
3. Implement the smallest complete functionality.
4. Add tests.
5. Run checks.
6. Fix failures.
7. Update documentation.
8. Continue to the next task.

Do not ask for approval after every ordinary implementation step.

Do not mark a milestone complete without passing its acceptance gate.

Keep the application runnable throughout development.

---

# 21. DEFINITION OF DONE

Leqad's initial technical MVP is complete when:

1. A user can install the development extension.
2. Leqad appears inside supported Onshape pages.
3. The panel responds correctly.
4. A beginner can start a structured lesson.
5. Leqad provides useful contextual instructions.
6. Recognized UI controls can be highlighted reliably.
7. Committed model facts can be retrieved securely.
8. Required model conditions are checked deterministically.
9. Unsupported observations are reported as unknown.
10. The user can complete the reference modeling project.
11. The user can correct a mistake.
12. The user can independently modify a driving dimension.
13. Lesson progress survives reload with proper reconciliation.
14. The project builds and passes automated checks.
15. Critical behaviors have been tested in real Onshape.
16. The repository can be understood and run by another developer.

The goal is not to have the largest feature list.

**The goal is to ship a working, dependable CAD tutor that teaches people to build real things.**

---

# 22. IMMEDIATE CODEX INSTRUCTIONS

Start by inspecting the existing `/workspace/tutorcad2` checkout.

Do not assume any code or documentation exists without checking it.

Verify the current repository, branch, remote, and working tree before making changes.

Preserve existing Phase 0 files and previously created diagnostics.

Read both authoritative attachments.

Then:

1. Create `docs/implementation-progress.md`.
2. Assess which Phase 0 tasks are actually complete.
3. Reuse existing working code.
4. Set up the monorepo and developer tooling.
5. Implement the Leqad extension shell with the specified brand colors.
6. Implement a mockable lesson engine and its unit tests.
7. Implement the deterministic model and evidence contracts.
8. Prepare the backend adapter around the real Onshape diagnostic.
9. Continue offline-capable work while waiting for live integration access.
10. Validate the live Onshape integration once secure credentials and browser access are available.

Do not represent the MVP as complete until the real integration gates pass.

At the end of each meaningful increment, report concisely:

- What was implemented
- What tests passed
- What remains unverified
- What is next
- Whether any user action is required

Do not ask me to make routine architectural decisions already specified here.

**Begin implementation now, while preserving the Phase 0 validation gates and keeping claims about live compatibility accurate.**
