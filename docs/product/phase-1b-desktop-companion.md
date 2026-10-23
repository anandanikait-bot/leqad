# Leqad Phase 1B — Screen-aware desktop companion alpha

**Decision date:** October 22, 2026  
**Status:** Desktop feasibility sprint approved in direction; implementation and real-CAD acceptance NOT complete.  
**Initial OS:** Windows; add macOS only after a proven Windows slice.  
**Target:** A CAD-agnostic teaching companion with independently validated application adapters, starting with Onshape in Chrome and one native CAD editor.

## Why change
The existing WXT/React extension and its eight-step Foundations engine are substantial work. However, some real Onshape controls are not reliably identifiable through DOM-based semantic matching. An independent desktop application can show an overlay on the selected CAD window, use user-authorized window capture plus native accessibility information, and stop guidance when the user leaves the current CAD context.

This is a **feasibility hypothesis**, not evidence that screenshot-based detection is reliable or that all CAD applications are supported. An independent app does not automatically know the active browser tab, control identity, selected tool, or committed model geometry.

## Reuse rather than restart
Keep these shared components: `packages/lesson-engine`, `packages/contracts`, lesson content, deterministic evidence levels, HINT/SHOW/GUIDE concepts, privacy policies and test fixtures.

Do not merge, discard or change the current extension branches merely to start this sprint. The earlier eight-step Foundations alpha remains unaccepted in real Onshape; desktop Phase 1B has its **own** acceptance gate. The public website demo is a separate simulation.

## Proposed architecture
- **Windows desktop host:** Electron + TypeScript initially, using a Vite-based hot-reload development workflow. A Windows-native capture/foreground/accessibility adapter can be introduced where Electron APIs alone cannot establish the required facts. Keep Electron APIs out of shared lesson and overlay-decision code.
- **Teaching UI:** reuse React components where portable; an independently movable panel and a separate transparent, click-through highlight window.
- **Target context:** user explicitly selects a CAD window; the host tracks foreground application/window, selected tab identity if browser-based, DPI/display and window/content bounds.
- **Observation:** first try allowed platform accessibility cues and known visual context. If still ambiguous, offer a bounded, on-demand window screenshot for local visual matching. Cloud-assisted analysis must require a separate express approval and clear retention disclosure; default is no upload.
- **Localization:** detection returns a proposed target rectangle plus capture timestamp, unique target identity, window identity, screenshot dimensions, confidence and adapter capability. Unknown or duplicate targets must not yield a highlight.
- **Overlay policy:** only render on the intended active window/tab with permission and fresh, unique, sufficiently reliable evidence. Revalidate after move, resize, zoom, display scaling, toolbar/ribbon rearrangement, tab or app switch; clear immediately on uncertain context, minimized/closed windows or capture revocation. An active browser window is **not** proof the Onshape tab is active. See `packages/desktop-core/src/overlayPolicy.ts`.
- **Evidence:** a correctly placed outline is not proof of a CAD click, saved geometry, correct dimension or learning. Keep unsupported verification in UNKNOWN/SELF_REPORTED.
- **Interference:** the highlight surface must not intercept CAD mouse/keyboard input; the teaching panel remains interactable and separately focus-managed.

## Phase 1B test slice
1. A local Windows development session launches the assistant with one command; Vite hot reload for React, safe restart when host/preload code changes. No reinstall for ordinary code edits.
2. A deterministic simulated CAD window proves selected-window capture/permission workflow and positions a single temporary highlight with a visible explanation.
3. Switching focus away, switching browser tabs without reliable tab identity, minimizing, losing permission, receiving stale/out-of-bounds frames or ambiguous recognition hides the highlight. No background capture outside the explicitly selected window.
4. Test a disposable authorized Onshape Part Studio, then one native CAD application (proposed: FreeCAD) using supported, visible, fresh controls.
5. Re-check 100%, 125%, 150% scaling, resizing, moving between displays, occlusion, and CAD input click-through. Include negative-coordinate multi-monitor arrangements.
6. Work through the First Sketch educational steps with explicit UNKNOWN where committed model evidence is not available. No false progression.
7. Log real observed PASS/FAIL/BLOCKED, version, screenshot provenance (non-sensitive), and limitations. Synthetic fixture success is not real-CAD acceptance.

## Non-goals in this sprint
No unattended desktop observation, continuous cloud screenshots, arbitrary app monitoring, automatic CAD clicking, geometry guarantees, general AI teacher, multi-platform release claim, account credentials collection, web-scale distribution or forced updates.

## Gate to continue
**GO** only when a tester can perform the selected tool-guidance slice in two different kinds of CAD environment and show reliable focus-loss hiding, correct target placement, click-through, recovery, and documented UNKNOWN behavior.

If vision cannot uniquely locate controls, prefer written guidance or manual user confirmation. Keep the existing extension as fallback until an alternative actually passes.

## Release constraints
Development hot reload, packaged beta updater, and public distribution are three separate stages. Packaged updates must be optional, authentic, verified, rollback-capable and should never silently escalate screen permissions. Windows signing and an update channel require a dedicated security/release review. 
