# Live browser setup

This guide prepares Leqad for the separate live Onshape procedure. A successful build or browser fixture does not establish Onshape compatibility.

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
4. Choose `apps/extension/.output/chrome-mv3`.
5. Confirm that Leqad appears in the installed extensions list and is enabled.
6. Open a new, disposable Onshape document named **Leqad Phase 1 Validation** with an empty Part Studio.
7. Confirm that exactly one Leqad panel appears and that the Onshape page remains usable.
8. Follow the [live Onshape validation procedure](live-onshape.md).

## Load in Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose `apps/extension/.output/edge-mv3`.
5. Confirm that Leqad appears in the installed extensions list and is enabled.
6. Open a new, disposable Onshape document named **Leqad Phase 1 Validation** with an empty Part Studio.
7. Confirm that exactly one Leqad panel appears and that the Onshape page remains usable.
8. Follow the [live Onshape validation procedure](live-onshape.md).

## Capture observations safely

Record the test date, browser name and full version, operating system, extension source commit, target package, document route type, and pass/fail/blocked outcome for each scenario. Record actual accessible labels or stable attributes only after observing them in Onshape.

Do not record credentials, cookies, account email, document or workspace identifiers, private geometry, or unredacted screenshots. Mark a test blocked when the account, document, or browser policy prevents the test. Do not bypass a managed extension policy or treat a fixture as live evidence.

The first-lesson example uses a 40 mm by 30 mm rectangle; no extrusion is required. Remove or disable the extension afterward if desired.
