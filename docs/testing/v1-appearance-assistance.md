# V1.1 appearance and assistance settings

## Behavior and boundaries

Settings opens from the header gear inside the existing 365px panel. Back or Escape restores the prior Learn/Projects/Ask view and focuses the gear. Native radio controls support keyboard selection. Settings clicks and arrow keys do not drag the panel. Opening Settings clears current highlights, cancels pending local captures and disables diagnostics; it does not complete a lesson step.

Light retains the approved palette and primary SVG. Dark uses scoped charcoal surfaces and the unchanged black SVG with its ivory field. System observes device appearance changes and removes its listener when no longer needed. Missing or invalid appearance defaults to Light. CSS tokens apply only within the Leqad panel; Onshape is not themed. Browser manifest icons remain primary-derived, and all SVG source files are unchanged.

Only when I ask is the default. It suppresses the existing unsolicited cursor-proximity cue without suppressing lesson instructions, verification results, permission notices or save errors. Proactive opt-in enables that existing bounded cue only when the semantic recognizer supplies a usable lesson control and the local pointer observation reaches the existing threshold. The wording labels observation and suggestion separately. A cue is not evidence of clicking, Sketch completion or model geometry. Dismissing it persists the known lesson-step identity across reloads; it does not repeat after switching modes or remounting.

There is no new AI service, design-review engine, CAD automation, scanner or detection selector. Unknown/missing targets yield no proactive cue. Proactive capability remains limited to local UI cues, not mechanical design review.

## Persistence

The existing version-2 preference envelope and extension storage queue are reused. Appearance and assistance are validated independently; legacy fields and progress/history keys are preserved. A bounded list of known lesson-step identities stores dismissed cues.

The 250ms effect saves one memoized, complete preference snapshot. Unrelated renders or changed callback identities do not restart the deadline or overwrite settings with defaults. Pending changes are submitted on unmount and pagehide. Writes remain ordered by the existing store. Save failures are visible with Retry; a browser/process crash cannot be guaranteed to finish an outstanding asynchronous storage operation.

## Fixture evidence

These images and recording show controlled simulation, not authenticated Onshape:

- [Light panel](../images/v1-settings/light-panel.png)
- [Dark panel](../images/v1-settings/dark-panel.png)
- [Light Settings](../images/v1-settings/light-settings.png)
- [Dark Settings](../images/v1-settings/dark-settings.png)
- [Primary header](../images/v1-settings/primary-header.png)
- [Black header](../images/v1-settings/black-header.png)
- [Appearance switching recording](../images/v1-settings/appearance-switching.webm)

Run the interactive fixture with:

```bash
pnpm --filter @leqad/extension exec vite --config tests/e2e/fixture-vite.config.ts --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/fixture.html`, use the gear, switch Light/Dark/System and reload. Fixture persistence uses localStorage as an adapter for the real progress store; production uses browser.storage.local. The recording shows manual settings actions and simulated OS changes.

Focused tests cover backward compatibility, independent invalid-value fallbacks, bounded dismissals, queued saves, pagehide/unmount flushing, save retry, System listener cleanup, logo loading, keyboard and drag isolation, prior-view restoration and unchanged progress. Browser checks cover 100/125/150% effective zoom through viewport/device-scale simulation, theme persistence and settings text contrast of at least 4.5:1. These are not native Chrome zoom acceptance tests.

Exact complete-suite counts, commit SHA, hosted CI and package link are recorded in PR #15.

The first hosted run exposed three archived raster A/B preview failures: with DejaVu Sans and the new gear, the wider historical wordmark wrapped status text and grew the header from 61px to 70.890625px. A local font-controlled reproduction confirmed the cause. Those historical tests now isolate their original pre-Settings layout and verify reload restores the gear. Current production header and Settings tests still include the gear; no production layout or brand geometry was changed to satisfy the archived comparison.

## Owner acceptance

1. Install the CI Chrome package in a regular authorized Chrome profile.
2. Open Settings in the actual extension; check Light/Dark/System and both header marks.
3. Change assistance mode, drag/collapse, reload and confirm the preferences and lesson progress persist.
4. Check Settings and lesson controls at native browser zoom 100%, 125% and 150%, including keyboard focus and scrolling.
5. Confirm existing Top/Sketch/Rectangle SHOW behavior and safe fallbacks. No new CAD compatibility is claimed by this UI change.
6. Review the visual treatment before approving PR #15. Keep the PR draft, open and unmerged; test Edge runtime separately if required.

No authenticated Onshape automation was performed.
