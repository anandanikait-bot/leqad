# Automatic Sketch recognition: local evidence handoff

## Status and known cause

Baseline audited: `18e30fe`, branch `phase1-hardening`, PR #1.

The owner observed Step 3 SHOW opening manual calibration instead of identifying
the real Sketch command. `AssistantPanel.showTarget` opens calibration when the
semantic resolver cannot return a connected, usable Sketch target and no valid
saved calibration is available. The approximate outline is the calibration
preview, not evidence of automatic recognition.

The exact live rejection remains unconfirmed. We do not have the real Sketch
control's sanitized DOM identity. Existing matching requires a candidate with a
supported exact name/title/tooltip or role and label; unsupported explicit names
cannot fall back to another command's text. Missing, low-confidence, hidden,
disabled, inert or ambiguous matches cannot establish a usable target. There is
no justified new Onshape selector yet.

This build adds **Capture Sketch control** to existing opt-in diagnostics.
Production target matching, Top-plane recognition, calibration and lesson
verification behavior are unchanged. The exported local matcher inspection is
read-only and uses the current matching rules; it does not scan for uniqueness.
The independent reference recorder is unchanged and remains independent.

## Install in normal local Chrome (Windows)

1. Open the successful GitHub Actions run linked in the delivery message. Under
   **Artifacts**, download **leqad-browser-packages** while signed into GitHub.
2. Right-click the downloaded artifact ZIP → **Extract All**. Then extract
   `leqad-0.1.0-chrome.zip` into its own folder. The unpacked extension folder is
   the one containing `manifest.json` directly, not the outer artifact folder.
3. Open `chrome://extensions`, enable **Developer mode**, and choose **Load
   unpacked** → that folder. Disable/remove any previous Leqad copy to avoid
   testing the wrong build. If replacing files in an already installed folder,
   click its **Reload** button instead.
4. Refresh the authorized disposable Onshape Part Studio tab. Use regular local
   Chrome with Leqad enabled, not the independent recorder's extension-disabled
   profile. Do not use a private production CAD document for this test.

Edge: extract `leqad-0.1.0-edge.zip` and use **Load unpacked** at
`edge://extensions`. Packaging is checked; this is not a live Edge runtime claim.

Local build alternative (PowerShell, Node >=22.12, pnpm 11.25.0):

```powershell
git clone --branch phase1-hardening https://github.com/anandanikait-bot/leqad.git
Set-Location leqad
pnpm install --frozen-lockfile
pnpm --filter @leqad/extension run build:chrome
```

Load `apps\extension\.output\chrome-mv3`. For an existing checkout, pull the
branch first and confirm `git rev-parse HEAD` matches the delivery commit.

## Capture the actual Sketch command

1. Open a disposable Part Studio **outside active Sketch editing** with its real
   Sketch toolbar control visible. Keep normal browser zoom initially.
2. In Leqad, select Step 3 → **SHOW**. If calibration opens, click **Cancel**.
3. Click **Enable recognition diagnostics** → **Capture Sketch control**.
4. Within 20 seconds, click the real Onshape Sketch toolbar control once. Do not
   click a viewport label or Leqad button. Your normal CAD click proceeds; the
   diagnostic does not click for you and observes before the click handler runs.
5. Click **Copy Sketch diagnostic**. If clipboard access is denied, select the
   read-only report field and copy manually. Save the sanitized JSON locally
   for review before sharing it here; do not commit live captures to GitHub.
6. Send that JSON plus whether your click actually opened Sketch. That written
   observation is owner-reported, not programmatically verified.

No password, cookie, token, screenshot, document identifier, full HTML or DevTools
export is needed. The extension does not persist or transmit the report. Turning
off diagnostics discards it. Cancellation, timeout, panel unmount, step/mode
change, pause, navigation and hidden-tab events cancel a pending capture.

## How to read the report

- `captureSource: USER_INDICATED_CONTROL` means the owner identified the clicked
  location; it does not independently establish that it is the Sketch command.
- `productionRecognition: NOT_RUN` and `uniqueness: NOT_EVALUATED` are deliberate.
  `LOCALLY_ELIGIBLE` only means this individual node passes the inspected local
  selector, name, visibility and enabled checks. It is not a full resolver PASS.
- `NO_SUPPORTED_COMMAND_NAME`, `EXCLUDED_BY_CANDIDATE_SELECTOR`, `WEAK_TEXT_ONLY`,
  `NOT_VISIBLE`, `DISABLED` and `INSPECTION_INCOMPLETE` distinguish local reasons.
  Individual fields retain visibility/enabled evidence even with another reason.
- Names, title and `data-tooltip` values export only exact known CAD labels;
  unsupported names become `UNLISTED`, absent names `NONE`, and incomplete name
  inspection `UNKNOWN`. IDs, class names and arbitrary attributes are omitted.
- The clicked node and up to nine ancestors take priority over immediate
  neighbors of the first three branches. No full-document candidate scan runs.
  At most 16 records, 64 descendant nodes / 128 text characters per inspected
  name, three bounded name references, and 32 ancestors per context inspection
  are examined. Relative geometry is rounded/capped, with no absolute positions.
  Total JSON is limited to 24,000 characters. Capture timeout is 20 seconds.
- `incomplete` is expected when a surrounding container exceeds a bound. It does
  not invalidate complete local observations. Deep eligibility remains UNKNOWN.
  JavaScript event handlers are not inspected; absence of actionable markup does
  not establish that a nonsemantic control is noninteractive.

## Acceptance boundary

All automated fixtures are simulations. Historical Top live success is preserved
as historical evidence, not a fresh validation of this build. Automatic Sketch
recognition remains **BLOCKED pending the owner capture**, and Phase 1 is not
complete. After capture, implement only a correction justified by the actual
identity/relationships, then ask the owner to retest Step 3 SHOW, Top-plane SHOW,
manual clicking, fallback, navigation, resize, zoom and pause cleanup. Stop
adding diagnostic infrastructure while waiting for that evidence.
