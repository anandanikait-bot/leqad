# Phase 1B — No-redownload testing workflow

## Target experience
**During active development:** one-time repository checkout and tool install; start `pnpm dev:desktop`, edit a file and see the React UI update via HMR; only the Electron main/preload process restarts when those files change. **This command is a target for the next runtime implementation PR; it is NOT wired up in this PR.**

**For owner/manual CAD testing:** run the development build on the same Windows machine. After Codex pushes a change to the tracked test branch, run `git pull` and let the dev session reload/restart; no repeated ZIP extraction, browser-extension removal or installer runs. Reinstall only if native dependencies, security permissions or packaging fundamentally change.

**For a tester without a development toolchain:** once a signed Windows beta is available, install it once and opt into a verified update channel. Evaluate `electron-updater` + signed NSIS releases and differential delivery later; do not ship an unsecured auto-download/bootstrapper as a shortcut.

## Three-layer test loop
1. **Pure unit tests (fast):** deterministic overlay safety rules using simulated observations; run `pnpm test` or focus `pnpm exec vitest run packages/desktop-core/src/overlayPolicy.test.ts`. These run without screen access or installation.
2. **Fixture/host smoke tests:** scripted fake CAD windows exercise foreground changes, browser tab ambiguity, capture consent, coordinate transforms, DPI changes, stale recognition, click-through and panel focus. They run in CI on a suitable desktop runner. CI-generated screenshots and traces are review evidence only for the fixture.
3. **Short manual real-CAD smoke:** select an authorized disposable CAD document in the selected supported app. Trigger one `Show me`, check the highlight, switch away, return, move/resize, change scaling, and check that CAD remains clickable. Escalate to full 24-scenario Foundations acceptance only after basics pass.

## Developer one-time setup (future desktop runtime)
- Windows 11/10, current Node/pnpm version supported by the repo, clone repository locally once.
- Install dependencies once with `pnpm install --frozen-lockfile`. This is a *development* requirement only; end users must not install Node, pnpm, or Python.
- After the desktop host is implemented, run `pnpm dev:desktop`. Avoid packaging the entire app on every change.
- Use the app's obvious **Select CAD window**, **Start guidance**, **Pause/Stop capture** and **Report misaligned highlight** controls.
- A single log bundle may record app version, capture/window state names and anonymous geometry metadata; never collect passwords, document titles/URLs, raw private screenshots or continuous cursor logs by default.

## Stable repeatable fixtures
- Build local, synthetic CAD screens with known annotated tool boxes. Do not present synthetic screenshots as real Onshape/FreeCAD evidence.
- Include 100%, 125%, 150% scaling, multi-monitor negative coordinates, hidden/occluded/duplicate icons, screenshot resizing and stale results.
- Keep snapshots, expected boxes, fixture revisions and reproducible seeds versioned in Git.
- Run a fast smoke suite on every commit; reserve manual CAD validation for changes involving capture, platform adapters, overlays or permissions.

## Browser tab safety
Foreground browser PID/window equality does not reveal whether Onshape remains selected. Until a trusted tab-identity bridge or independently validated visual check exists, **clear the Onshape highlight** on uncertain/changed browser tab state. Never display stale boxes over unrelated websites.

## Build delivery phases
- **Prototype:** Git branch + dev hot reload; no installer.
- **Private beta:** signed installer once; opt-in update channel, rollback to previous tested version and release-channel pinning.
- **Public:** signed builds and manifests, platform approvals, update integrity and permission review, release notes; never silently activate capture after an update.

## Current status
Only the framework-independent policy and initial unit tests are being added now. The Electron host, `pnpm dev:desktop`, capture provider, actual overlay renderer, installer and updater are **not implemented**. No real-CAD screen capture or placement test has been performed in this PR.
