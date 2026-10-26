# Desktop milestone 1 testing

This guide covers the written lesson desktop prototype. The Playwright suite launches the built Electron application, gives every test a fresh temporary user-data directory, and attaches UI screenshots to its report. It does not use a CAD account or real CAD window.

## Windows development

Use Windows 10 or 11 with Node.js 22.12.0 or later. The repository pins pnpm 11.25.0 and Electron 45. Use Node.js 24 LTS for the tested toolchain. In PowerShell, obtain the review branch:

```powershell
git clone --branch feat/phase1b-compact-companion https://github.com/anandanikait-bot/leqad.git
cd leqad
```

Then from the repository root:

```powershell
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev:desktop
```

`pnpm dev:desktop` starts Vite and watches the Electron main and preload entries. Close the app, then stop the development process with Ctrl+C.

## Windows tests

Build the packaged renderer and Electron host before running the Playwright suite. The E2E command launches `apps/desktop/dist/main.cjs` with the pinned Electron executable.

```powershell
pnpm desktop:build
pnpm desktop:test
pnpm desktop:test:e2e
```

The Playwright tests create one isolated profile under the Windows temporary directory for each test. The profile path uses the `leqad-desktop-test-*` prefix and is passed through `LEQAD_DESKTOP_USER_DATA` with `LEQAD_DESKTOP_TEST_MODE=1`. The tests remove their profiles when they finish.

Playwright writes traces, screenshots, and reports under `apps/desktop/test-results` and `apps/desktop/playwright-report`. Open a local HTML report with:

```powershell
pnpm exec playwright show-report apps/desktop/playwright-report
```

The CI job should retain the Playwright report and test results when a run fails. A local Linux or macOS result does not establish a Windows pass. Record a Windows result only with the runner log for the tested commit.

## Linux development checks

On Linux, build and run the same integration command only when a usable graphical display is available. `desktop:test:e2e` does not start Xvfb or switch Electron to a production-unsafe mode.

```bash
pnpm desktop:build
pnpm desktop:test:e2e
```

If Electron cannot open a window because the runner has no display, record the run as blocked by the environment. Do not count it as a passing desktop launch test.

## What the suite checks

- The built Electron executable opens one 365 by 600 content window. The renderer has no `window.require` or `window.process`, and starts with written lessons and capture off.
- The manual lesson reaches all eight steps. The summary retains two acknowledged instructions and six self-reported steps; it does not claim model or interface verification. The completion region can be reviewed by keyboard without changing progress.
- Local Ask returns the authored Corner Rectangle explanation without HTTP or HTTPS requests from the renderer.
- Appearance and text size survive an app restart and renderer reload. Completed lesson progress survives both reloads.
- Keyboard users can open Help and Settings, reach the 200 percent text setting, return focus to the invoking control, and scroll the constrained layout.
- Enabled controls meet 4.5:1 text contrast in actual pointer-hover and restored states in both light and dark themes. The helper uses the same ancestor-background composition and contrast calculation as the existing Phase 1.5 pointer-hover regression.

## Acceptance limits

These checks exercise the written desktop UI and local persistence in Electron. They do not establish selection of a real CAD window, capture permission handling, screenshots of CAD, recognition, overlays, click-through behavior, CAD geometry, Onshape or FreeCAD compatibility, Windows DPI behavior, mixed-monitor placement, Narrator behavior, or live accessibility acceptance. Visual help remains unavailable in this milestone. Fixture results and screenshots must not be described as live CAD evidence.

Windows test status: pending a Windows runner log for the implementation commit. No Windows success is claimed by this procedure.

## Validation record

Before the host build was available, the seven Playwright cases all stopped at Electron launch with `Cannot find module .../apps/desktop/dist/main.cjs`. Electron itself launched under the local Xvfb display. This RED run confirmed the test harness uses the built Electron entry; it did not reach the renderer assertions. The post-build integration result and Windows runner result must be recorded after those runs complete.

## Owner smoke after automated checks

1. Start dev:desktop; verify official branding and written-only status.
2. Work through all eight steps. Informational instructions are acknowledged; modeled work is self-reported.
3. Open Help, switch topics, request more help, close with Escape. Resize and test 200% text.
4. Open local Ask. Confirm Local prototype and Local example labels; return to Learn.
5. Use Settings, switch themes and pin preference, reset placement, return with keyboard focus. Capture/window selection/report actions remain explicitly unavailable.
6. Mark a step done, wait for saved status, close/relaunch. Choose Resume lesson; confirm progress and preferences. Restart requires confirmation.
7. Review completed steps and return to summary from step 8.
8. Record PASS/FAIL/BLOCKED and a short observed result. Test Windows display scaling, Narrator and multiple monitors separately; Linux/CI results cannot establish these manual outcomes.

Ordinary state is stored under the current user's appData/Leqad directory. Test profiles are isolated and removed. Unreadable files produce a visible error; a fresh in-memory lesson does not promise that an unreadable disk record was replaced. No authentication or CAD content is stored.
