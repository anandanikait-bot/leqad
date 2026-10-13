# Leqad Phase 1 scope

This note reconciles the preserved TutorCAD product design, the Leqad implementation blueprint, and the user's explicit Phase 1 corrections. Direct user instructions set the current implementation scope where the attached documents describe later work or different sequencing.

## Product direction

Leqad is an interactive CAD teaching system. It guides learners inside Onshape, highlights recognized tools, teaches Foundations, adjusts assistance progressively, estimates cursor intent locally, records only appropriately verified CAD progress, and helps learners recover from mistakes. Custom-part design with AI assistance remains part of the longer-term product vision. Leqad must not become merely a model verification engine.

## Phase 1 sequence

1. Runnable Manifest V3 extension
2. React UI mounted in a Shadow DOM
3. Leqad-branded draggable and collapsible panel
4. Deterministic lesson engine
5. Onshape page detection
6. Semantic UI target recognition and visual highlights
7. Lightweight local cursor-intent estimator
8. First Foundations lesson
9. Persistence and reload recovery
10. Real browser and Onshape validation

The extension framework is WXT with React and TypeScript. CRXJS had only been initialized; no working behavior depended on it, so Phase 1 uses WXT.

## Explicit boundary

Basic CAD evidence contracts and tests stay in scope. The complete Phase 2 model-verification backend, Onshape API integration, AI provider, and custom-part generation backend do not. The extension must explain its limited access honestly and must never turn an observed click, an unrecognized UI state, or missing model evidence into verified progress.

Mock Onshape-like pages and DOM fixtures are useful for deterministic browser tests. They do not prove that semantic selectors or UI state detection work on the live Onshape application. Live compatibility remains unverified until tested in a real Onshape session.

## Source documents

- `TutorCAD_Product_and_System_Design.md` is the original product and system design supplied by the user and preserved unchanged.
- `leqad-master-implementation-spec.md` is the Leqad implementation blueprint supplied earlier.
- This file records the user's current Phase 1 corrections and should be read together with both source documents.
