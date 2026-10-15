# Leqad roadmap

This roadmap preserves the original product direction while separating implemented behavior from planned work.

The October 15 reliability sprint keeps Foundations as Phase 1. See the
[feature and acceptance matrix](docs/product/phase-feature-matrix.md) for
implemented, simulated, and live-validation status. Phase 1 requires a fresh
owner-run Onshape acceptance and owner approval; CI alone cannot complete it.

## Phase 1 — Foundations extension

- [x] WXT Manifest V3 extension with React in a Shadow DOM
- [x] Draggable, collapsible, keyboard-movable Leqad panel
- [x] Deterministic lesson engine and evidence-aware transitions
- [x] Conservative Onshape context detection
- [x] Semantic recognition, highlights, and local cursor intent
- [x] Complete eight-step **Your First Sketch** lesson
- [x] Per-document persistence and reload recovery
- [x] Chrome and Edge production packages and controlled browser tests
- [ ] Live validation in an authorized disposable Onshape document
- [ ] Fix selectors or behavior discovered during live validation
- [ ] Record a supported browser/Onshape compatibility result

## Phase 1.5 — AI interaction prototype (not implemented)

- Conversational teaching grounded in the supported First Sketch lesson context
- Optional screenshot-assisted Sketch control grounding
- Explicit one-shot screenshot permission and external-service disclosure
- Local/backend credentials, abstention, stale-result rejection, and manual fallback

The [October 15 First Intelligent Interaction design](docs/superpowers/specs/2026-10-15-first-intelligent-interaction-design.md)
is preserved as a future implementation candidate. It is not authorization to add
AI calls or screenshot permissions during the current reliability sprint.

## Phase 2 — Verified model progress

- Supported Onshape API or metadata integration
- Revision-aware sketch, feature, parameter, and intended-feature identity checks
- Secure authentication and least-privilege credential handling
- Recovery guidance based on verified model facts
- Connecting confirmed evidence to constructive teacher feedback

Phase 2 will retain the current evidence contracts. Mock or inferred data will not be promoted to real API evidence.

## Phase 3 — Custom Part Studio (not implemented)

- Clarifying a student's physical design idea and intended interfaces
- Generating alternative concept images for student selection, combination, and correction
- Gathering measurements and constraints with explicit sources and assumptions
- Validated modeling plans whose CAD actions remain controlled by the learner

## Later product work (not implemented)

- More Foundations lessons and structured practice
- Robotics-oriented projects and assemblies
- Manufacturing, FDM print review, and export guidance
- Additional CAD platforms through separate adapters
- Adaptive learning profiles, distinct from existing local hint/practice counters
- Privacy/export/deletion, accessibility, security, usability studies, and release readiness

Dates are intentionally omitted until Phase 1 completes live validation and the project has maintainer capacity.
