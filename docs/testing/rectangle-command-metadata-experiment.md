# Rectangle command metadata experiment

Status: **owner capture required; production recognition unchanged**

Baseline: PR #10, tested remote commit
`499bbbca7e4bceb5fffc5340abaf325622ac96f7`. The local baseline commit has
the same tree.

## Root-cause investigation

The latest owner test established that Step 4 automatic SHOW abstained while
Onshape's native Search Tools could find and activate Corner rectangle. It did
not establish which production gate rejected the real toolbar.

Leqad currently discovers a Rectangle dropdown only below `[role="toolbar"]`
and only admits a named `button[aria-haspopup]` or
`[role="button"][aria-haspopup]`. The earlier authenticated v3 Rectangle
capture found nonsemantic `div`/`svg`/`span` structures and exact variant
labels, but its privacy schema did not inspect `command-id`,
`.os-element-toolbar`, `.dropdown-arrow`, or `.os-tool-dropdown-content`.
Consequently that capture cannot prove those attributes are present or absent.

| Hypothesis          | Existing evidence                                                                                             | Missing evidence                                                                              | Smallest test                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Toolbar identifier  | Production lookup reports `NO_TOOLBAR_SEMANTICS`; Onshape MX queries `.os-element-toolbar [command-id]`       | Whether the owner's current Onshape build exposes either marker                               | Capture allowlisted command IDs and marker presence while Sketch is open |
| Sketch context      | Leqad requires supported active-Sketch evidence; prior Sketch/Extrude captures showed similar generic dialogs | Whether `LINESEGMENT` is exposed only on the active Sketch toolbar in the owner's build       | Compare the same bounded command observations in Sketch and Extrude      |
| Rectangle ownership | The v3 capture observed variant labels but did not establish the group/arrow/menu owner                       | Whether the current face and arrow share a parent, and whether the menu is nested or portaled | Compare closed toolbar, open dropdown, and a changed last-used variant   |

## Source references and limits

The reviewed Onshape MX revision
[`d1024ea`](https://github.com/xfanta/onshape-mx/blob/d1024ea299f57893387c9c03a26bc41abe9ea144/extension/content.js)
uses these private DOM hypotheses:

- `toolbar()` selects `.os-element-toolbar`; `toolbarTools()` finds visible
  `[command-id]` descendants.
- `contextOf()` treats `LINESEGMENT` as a Sketch clue and `newSketch` as a Part
  Studio clue.
- `faceOf()` looks for a `[command-id]` under a dropdown arrow's parent.
- `openDropdownItems()` selects
  `.os-tool-dropdown-content [command-id]`.
- Its profile source names `RECTANGLE_TWO_CORNERS`, `RECTANGLE_CENTER`, and
  `RECTANGLE_ALIGNED`.

These are third-party implementation claims, not authenticated evidence for
the owner's current Onshape build. Leqad does not import the source, click its
targets, or use these selectors in production recognition.

## Diagnostic design

The opt-in **Rectangle command metadata experiment** takes four explicit,
manual snapshots. Each state name is owner-reported. DOM fields remain separate
observations and `productionRecognition` remains `NOT_RUN`. State B is armed
while the menu is closed, then observes the owner's next Onshape pointer
interaction and the bounded DOM transition. This avoids clicking back into the
Leqad panel after the menu opens, which could close a portaled menu before it is
recorded. The listener is one-shot and time-bounded; it never prevents,
repeats, or synthesizes the owner's input.

The fixed allowlist contains only:

- `LINESEGMENT`
- `newSketch`
- `extrude`
- `RECTANGLE_TWO_CORNERS`
- `RECTANGLE_CENTER`
- `RECTANGLE_ALIGNED`

The report records safe tag categories, marker counts, bounded command counts,
visibility, enabled/active marker state, menu placement, and same-parent
face/arrow relationships. It records only a capped count for other command IDs;
their values are never exported. It omits classes, IDs, URLs, page text, SVG,
HTML, account data, CAD content, credentials, and authentication state.

Traversal and report records are bounded. Reaching a bound sets `INCOMPLETE`
and prevents a positive identity classification. Hidden, disabled, duplicate,
missing, and ambiguous observations stay explicit. The capture dispatches no
events and performs no CAD action.

## Owner capture procedure

Use an authorized disposable Part Studio in the Chrome profile where Leqad is
installed. Do not share document or account identifiers.

1. Enable **recognition diagnostics** in Leqad.
2. Enter Sketch on the Top plane and leave the Rectangle menu closed. Select
   **Record metadata State A — Sketch editing**.
3. Select **Arm metadata State B — then open Rectangle dropdown**. After Leqad
   says State B is armed, click the Rectangle dropdown arrow once in Onshape.
   Do not return to the Leqad panel until it reports that State B was saved. If
   no allowlisted menu marker is observed, the report records that uncertainty
   instead of inventing an open menu.
4. Manually choose a different Rectangle variant and return to the same Sketch
   toolbar. Select **Record metadata State C — Another Rectangle variant**.
5. Exit Sketch and manually open Extrude. Select **Record metadata State D —
   Extrude editing**.
6. Select **Copy command metadata report**, review the JSON locally, and share
   only that sanitized report.

Leqad never opens the dropdown, selects a variant, exits Sketch, starts
Extrude, or verifies any geometry during this experiment.

## Decision gate

Current result: **B — command metadata and ownership remain unresolved**.

After the owner capture:

- Implement a narrow resolver only if the report establishes a unique, visible,
  enabled Rectangle group and arrow owner, a stable result after the last-used
  variant changes, and a Sketch signal absent from Extrude.
- If command identity exists but one relationship remains unknown, request only
  that missing observation.
- If the attributes are absent or cannot establish uniqueness, stop this DOM
  path and retain the native Search Tools fallback. A separate consented visual
  localization benchmark can then be considered; it is outside this task.

Passing fixtures or CI cannot satisfy live Onshape acceptance.
