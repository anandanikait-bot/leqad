# Evidence-gated control-family reuse

## Decision

Reuse the existing five boundaries. The diagnostic discovery repair does not
justify a second production registry, generalized workflow generator, or overlay
rewrite. Diagnostic candidates must not become production targets by sharing a
function or assigning a numerical confidence score.

| Responsibility                   | Existing implementation                                       | Reuse boundary                                                                         |
| -------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Feature definition               | `guidanceRegistry.ts`                                         | Closed action/target IDs, contexts, evidence requirements and local recipes            |
| Context                          | `onshapePage.ts`, `sketchGuidance.ts`                         | Part Studio, permission and observed Sketch state; missing evidence stays UNKNOWN      |
| Discovery / command identity     | `semanticTargets.ts`, `referencePlanes.ts`, Rectangle adapter | Family-specific evidence adapters; no arbitrary selectors from callers                 |
| Eligibility                      | `semanticTargetDom.ts` plus resolver                          | Naming, visibility, enabled state, uniqueness, current DOM and correct target boundary |
| Highlight and guidance lifecycle | `createSemanticHighlighter`, `guidanceRunner.ts`              | Shared measured overlay, cancellation, expiration and written fallback                 |

The new `editorRegionDiscovery.ts` is diagnostic-only. It shares bounded discovery
within the paired capture, not acceptance rules with production recognition.

## Families and next proof of reuse

- **Standalone command:** reuse current exact identity and eligibility checks. Line
  is a future evidence task, not a new supported entry.
- **Dropdown:** Rectangle remains the first integration. Maintain distinct evidence
  for main button, dropdown arrow, expanded menu, exact option and selected variant.
  A group name or SVG does not identify its arrow or prove menu ownership.
- **Second dropdown:** after Rectangle has live acceptance, compare Circle's captured
  control/menu relationships against the same adapter contract. Register no Circle
  action or variant until evidence supports it. Reuse the resolver/renderer when
  relationships match; retain a narrow adapter when they do not.
- **Annotation:** Dimension uses the existing context and target eligibility path.
- **Feature dialog:** Extrude is currently an owner-reported comparison state, not a
  verified production editor identity. Shared dialog layout cannot distinguish it
  from Sketch.

Future adapters should return a unique eligible target or a structured reason
(missing context, unsupported identity/ownership, ambiguity, hidden/disabled,
stale DOM). Guidance requests remain closed and registry-validated. No UI result
changes permission, lesson completion, or CAD verification.

## Highlight review

Keep the existing renderer. It already measures `getBoundingClientRect`, uses
`pointer-events: none`, expires, revalidates on DOM/resize/scroll changes and cleans
up through navigation and content-script teardown. Rectangle fixtures cover popup
changes, replacement DOM, disappearance of supported Sketch context, expiration,
and click-through. The runner already separates user instruction from CAD actions.

Existing 80/100/125/150 percent fixtures use CSS transforms or stubbed rectangles.
They are **not real browser-zoom acceptance**. Owner testing must still cover actual
Chrome zoom at those settings, scrolling, an occluding popup, Sketch closing and
navigation. A code audit also found coverage gaps for panel movement over an
existing target, root/visual-viewport changes, and retained Dimension controls after
Sketch context disappears. No live failures were established here; these are
focused future regression candidates, not claims fixed by this delivery.

Driver.js was considered as a replacement layer. It would not supply evidence of
correct Onshape command identity or resolve the discovery failure. No dependency
is adopted, so package/license verification is deferred to any future adoption
proposal. Keep current styling, reduced-motion behavior and control focus untouched.

Search Tools integration is deferred: documented native behavior has not been
verified in this sprint. Existing manual written guidance remains available.

## Live boundary

First obtain a useful new Sketch/Extrude pair with the repaired diagnostic. Review
whether a static discriminator is both specific and revoked when Sketch closes.
Then unblock active context and Rectangle arrow targeting with regression tests
and owner acceptance. Circle follows Rectangle; broad tool support does not.
