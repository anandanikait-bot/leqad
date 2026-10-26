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
pnpm exec install-electron
pnpm dev:desktop
```

Run `pnpm exec install-electron` after every fresh dependency install. It installs the pinned Electron 45 runtime needed to launch the desktop app.

`pnpm dev:desktop` starts Vite and watches the Electron main and preload entries. Close the app, then stop the development process with Ctrl+C.

## Windows tests

Build the packaged renderer and Electron host before running the Playwright suite. After a fresh `pnpm install`, run `pnpm exec install-electron` before building. The E2E command launches `apps/desktop/dist/main.cjs` with the pinned Electron executable.

```powershell
pnpm desktop:build
pnpm desktop:test
pnpm desktop:test:e2e
```

The Playwright tests create one isolated profile under the Windows temporary directory for each test. The profile path uses the `leqad-desktop-test-*` prefix and is passed through `LEQAD_DESKTOP_USER_DATA` with `LEQAD_DESKTOP_TEST_MODE=1`. The tests remove their profiles when they finish.

Playwright writes screenshots and per-test results under `apps/desktop/test-results` and the HTML report under `apps/desktop/playwright-report`. The integration tests attach their screenshots to the report. Traces use `retain-on-failure`, so they are retained for failed tests only and are not promised for passing runs. The Windows CI artifact uploads both directories after every run; a successful artifact contains the screenshots and Playwright report. Open a local HTML report with:

```powershell
pnpm exec playwright show-report apps/desktop/playwright-report
```

A local Linux or macOS result does not establish a Windows pass. Record a Windows result only with the runner log for the tested commit. The PR #19 Windows job ran on Windows Server 2025; that CI result is separate from owner acceptance on Windows 10 or 11, which remains outstanding.

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

Final PR #19 validation passed for source commit [`0db10cdb342fc33dbeed08c6fa4307226bd4f31c`](https://github.com/anandanikait-bot/leqad/commit/0db10cdb342fc33dbeed08c6fa4307226bd4f31c). [General CI run `40285294670`](https://github.com/anandanikait-bot/leqad/actions/runs/40285294670) passed 697 unit tests, 45 reference tests, and 88 browser tests. [Windows CI run `40285294645`](https://github.com/anandanikait-bot/leqad/actions/runs/40285294645) passed on Windows Server 2025, including 65 desktop unit tests and 15 native Electron Playwright tests. Its clean-cache check verified that the Electron executable was absent before installation, set `electron_config_cache` to a new empty directory, and installed and verified Electron `v45.0.0` with `pnpm exec install-electron`.

The Windows run uploaded [artifact `12633971828`](https://github.com/anandanikait-bot/leqad/actions/runs/40285294645/artifacts/12633971828) (`desktop-windows-runtime-evidence`), which contains the Playwright report and screenshots. Playwright traces use `retain-on-failure`, so passing tests do not produce retained traces. This CI result does not establish owner acceptance on Windows 10 or 11; that manual acceptance remains outstanding.

## Validation record

An earlier local Linux run, before the host build was available, stopped all seven Playwright cases at Electron launch with `Cannot find module .../apps/desktop/dist/main.cjs`; it did not reach renderer assertions. The final Windows run above built the host and passed all 15 native Electron Playwright tests.

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
