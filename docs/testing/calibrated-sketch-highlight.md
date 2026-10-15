# Calibrated Sketch highlight: owner acceptance

Status: ready for an owner-run test; actual Onshape acceptance remains **BLOCKED** until observed by the owner. Browser fixtures are simulations.

## Install in regular Chrome on Windows

1. Download the `leqad-browser-packages` artifact from this change's successful GitHub Actions run. Extract the artifact, then extract `leqadextension-0.1.0-chrome.zip` into a permanent folder.
2. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**. Select the extracted folder containing `manifest.json`. Keep only one installed copy of Leqad. If replacing an existing unpacked build in the same folder, click its **Reload** button.
3. Reload your authorized disposable Onshape **workspace Part Studio** in this regular Chrome profile. The independent recorder starts Chrome with extensions disabled and cannot test this extension.

To build from source instead, use Node.js 22.12 or newer and run in PowerShell from the repository root:

```powershell
git switch phase1-hardening
git pull --ff-only origin phase1-hardening
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @leqad/extension run build:chrome
```

Load `<repo>\apps\extension\.output\chrome-mv3` through **Load unpacked**.

## Test Sketch only

Record **PASS**, **FAIL**, or **BLOCKED**, plus one short observed result for each item.

| Test           | Owner action                                                                                                              | Expected result                                                                                                                              | Result                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Loading        | Open the workspace and First Sketch lesson.                                                                               | One usable Leqad panel.                                                                                                                      | BLOCKED — owner test pending |
| Calibration    | Advance to **Enter sketch-editing mode (Step 3)** and choose **Calibrate Sketch highlight**.                              | A temporary approximate outline and percentage editor appear.                                                                                | BLOCKED — owner test pending |
| Adjustment     | Adjust Left, Top, Width, and Height around the visible Sketch toolbar button. Use **Preview outline** if it expires.      | One click-through outline; invalid/offscreen rectangles cannot be saved.                                                                     | BLOCKED — owner test pending |
| Save and SHOW  | Save, then press **SHOW**.                                                                                                | A unique recognized semantic control takes precedence. Otherwise the saved rectangle appears with the explicit approximate-location message. | BLOCKED — owner test pending |
| Click-through  | While the outline is visible, manually click the Sketch control beneath it.                                               | Onshape receives the normal click. Leqad performs no click.                                                                                  | BLOCKED — owner test pending |
| Manual context | Enter Sketch and select Top plane as appropriate. If the active UI is unrecognized, press **I'm already in Sketch mode**. | Copy says the state is user-reported and directs you toward the Rectangle instruction. The step remains unfinished.                          | BLOCKED — owner test pending |
| Progress       | Press **I've finished this step**, then **Next**. Reload the same workspace.                                              | Step and self-reported progress restore; no geometry verification is claimed.                                                                | BLOCKED — owner test pending |
| Persistence    | Return to Start Sketch outside active Sketch mode, reload, and press SHOW.                                                | The saved calibration remains available if semantic recognition is unavailable and viewport metadata still matches.                          | BLOCKED — owner test pending |
| Resize/zoom    | Change the window dimensions by more than 5%, or change browser zoom. Try SHOW after semantic recognition is unavailable. | The old calibration is rejected and the editor requires explicit preview/save. Active approximate outlines clear on resize.                  | BLOCKED — owner test pending |
| Reset/cleanup  | Open calibration, reset it, cancel a new preview, change lesson step, or navigate away.                                   | The saved calibration resets and temporary outlines clear.                                                                                   | BLOCKED — owner test pending |

The initial 8.9%, 5.8%, 6.5%, 4.4% rectangle is an **unverified starting preview**. It becomes saved calibration only when you press Save. Each preview or SHOW outline expires after five seconds.

Calibration is stored separately from lesson progress and panel preferences, with only a fixed Sketch target/scope, coordinates, and viewport size/scale metadata. It is shared across supported Onshape workspaces in the local Chrome profile and is unavailable on version/microversion routes or known non-Part-Studio tabs. No document IDs or CAD content are stored in the calibration record.

Viewport dimensions may differ by at most 5%; zoom/display scale may differ by at most 1%. Layout changes that retain the same viewport metadata cannot be detected automatically. Recalibrate if the toolbar moves. A coordinate outline never establishes that a control exists, is enabled, or was used, and the manual Sketch-mode report never establishes editing permission, plane association, or CAD correctness.
