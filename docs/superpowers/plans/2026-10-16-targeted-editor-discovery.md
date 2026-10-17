# Targeted editor discovery implementation plan

Scope: execute the owner's staged outline on PR #8, baseline `3957b57`.

1. Reproduce prefix starvation with simulated dialogs and non-ARIA SVG clusters after 6,500 unrelated elements. Preserve the 6,000 detailed-element budget.
2. Discover candidate roots through generic dialog/toolbar semantics, exact allowlisted name attributes, and SVG ancestor structure. Native selector discovery is not a hard-bounded browser-engine traversal; disclose that separately from capped candidate enumeration and local inspection. Never turn these diagnostic candidates into production recognition.
3. Allocate bounded inspection to each candidate before spending the remaining budget on the broad fallback. Keep inherited editable/Leqad exclusions, unknown visibility, ambiguity and report-size limits. Detect DOM changes and discard inconsistent snapshots. Disclose unvisited shadow roots and all truncation.
4. Add late-dialog, unnamed cluster, ambiguity, privacy, shadow, removal/rerender and mutation regressions plus a browser capture regression. Record RED and GREEN results.
5. Audit existing registry → context → resolver → eligibility → overlay boundaries. Propose family reuse; only implement additional production changes if independently justified by evidence. Preserve current Top/Sketch behavior.
6. Run reference validation/tests, unit/component tests, lint, types, formatting, browser fixtures and Chrome/Edge packaging. Push current PR branch; inspect hosted CI and artifact metadata.
7. Deliver one owner-run Sketch/Extrude capture. Stop at this live evidence boundary. No production Sketch/Circle support claim, model verification, CAD clicks, new dependency or merge.
