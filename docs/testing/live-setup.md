# Live browser setup

This guide prepares Leqad for the separate live Onshape procedure. A successful build or browser fixture does not establish Onshape compatibility.

## Download and extract the tested build

1. Open the [tested browser package download](https://github.com/anandanikait-bot/leqad/actions/runs/38475535722/artifacts/11854470815) from successful [compatibility Actions run 38475535722, attempt 2](https://github.com/anandanikait-bot/leqad/actions/runs/38475535722). Its source commit is `f4450c4b3b6b53d1219294d187680d680223b9ab`; a newer PR commit may be a documentation follow-up. The [final validation report](results/phase1-final-validation.md) records the independently verified package and archive checksums.
2. Sign in to GitHub if the artifact download requires it. Under **Artifacts**, download **leqad-browser-packages**. The download is an outer ZIP containing two extension ZIPs, not a ready-to-load extension directory.
3. Extract the outer ZIP to a new folder. It contains `leqadextension-0.1.0-chrome.zip` and `leqadextension-0.1.0-edge.zip`.
4. For Chrome, extract the Chrome ZIP into a folder such as `Leqad-Chrome`. For Edge, extract the Edge ZIP into `Leqad-Edge`.
5. Locate `manifest.json` directly inside each extracted extension folder. Select that folder in **Load unpacked**, not either ZIP or the outer artifact folder. If extraction adds a containing directory, open it until `manifest.json` is directly inside the selected folder.
6. Record the Actions run, artifact ID, source commit, and the SHA-256 of the inner browser ZIP you downloaded. The artifact archive digest and each extension ZIP's checksum identify different files; do not substitute one for the other.

Use this download path for the owner acceptance run. The source-build alternative follows below.

## Build the unpacked extension

From the repository root, use the commit you intend to test and run:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm build:edge
```

The unpacked directories are:

- Chrome: `apps/extension/.output/chrome-mv3`
- Edge: `apps/extension/.output/edge-mv3`

To produce distributable ZIPs from the same source revision, run:

```sh
pnpm package:browsers
```

The ZIPs are written to `apps/extension/.output/`. A ZIP that builds is not a live-tested extension. Record the source commit SHA alongside each package.

## Load in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose the extracted `Leqad-Chrome` folder containing `manifest.json`, or `apps/extension/.output/chrome-mv3` if you built from source.
5. Confirm that Leqad appears in the installed extensions list and is enabled.
6. Open a new, disposable Onshape document named **Leqad Phase 1 Validation** with an empty Part Studio.
7. Confirm that exactly one Leqad panel appears and that the Onshape page remains usable.
8. Follow the [live Onshape validation procedure](live-onshape.md) and fill in the [acceptance report](results/phase1-live-acceptance.md).

## Load in Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose the extracted `Leqad-Edge` folder containing `manifest.json`, or `apps/extension/.output/edge-mv3` if you built from source.
5. Confirm that Leqad appears in the installed extensions list and is enabled.
6. Open a new, disposable Onshape document named **Leqad Phase 1 Validation** with an empty Part Studio.
7. Confirm that exactly one Leqad panel appears and that the Onshape page remains usable.
8. Follow the [live Onshape validation procedure](live-onshape.md) and fill in the [acceptance report](results/phase1-live-acceptance.md).

## Expected limitations during acceptance

A selected Part Studio tab and visible Sketch command do not prove editing permission. Workspace permission remains UNKNOWN unless a supported observation establishes it; no positive permission observer is currently connected. **Limited observation** and a disabled Check progress are therefore expected in that context. You can follow the written lesson and use Continue without verification. Do not change the page, inject capability flags, or use developer tools to manufacture a verified result.

Steps 4–6 offer Continue without verification directly because rectangle creation, driving dimensions, and finished sketch state have no implemented verifier. Continuation is self-reported and CAD state stays unknown. Top-plane selection and active sketch controls are separate observations; an earlier plane selection never verifies the actual sketch's plane association.

## Capture observations safely

Record the test date, browser name and full version, operating system, extension source commit, target package, document route type, and pass/fail/blocked outcome for each scenario. Record actual accessible labels or stable attributes only after observing them in Onshape.

Do not record credentials, cookies, account email, document or workspace identifiers, private geometry, or unredacted screenshots. Mark a test blocked when the account, document, or browser policy prevents the test. Do not bypass a managed extension policy or treat a fixture as live evidence.

The first-lesson example uses a 40 mm by 30 mm rectangle; no extrusion is required. Remove or disable the extension afterward if desired.
