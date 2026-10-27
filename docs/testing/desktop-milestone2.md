# Desktop Milestone 2 — window selection and safe sessions

Milestone 2 adds manual selection of a visible Windows application window and
an in-memory session lifecycle around that selection. The written lesson
remains independent of the selected window.

## What this build does

- Starts with no selected window. The owner must choose one, or choose **Use
  written lessons**.
- On Windows, lists visible top-level windows as a short application alias and
  an ordinal, such as `Chrome · Window 1`. It does not read window titles,
  browser tabs, URLs, page content, or CAD controls.
- Validates the selected window again before binding it. A partial or ambiguous
  list cannot be selected; the user can refresh or continue with written
  lessons.
- Offers **Pause window session**, **Resume window session**, **Change window**,
  **Disconnect window**, and **Keep screen access off** while appropriate.
- Records a decline as session-only state. Revoking returns screen access to
  off. Changing or disconnecting a window removes its binding.
- Keeps lesson progress separate from the window session. A disconnect or app
  restart does not clear saved lesson progress.

## Capabilities intentionally unavailable

This build has no screenshot/capture provider, native accessibility reader,
CAD recognition, AI, overlay, CAD click automation, or geometry verifier. The
selection screen explains this after a window is chosen. There is no enabled
permission grant: the host cannot provide or enforce a capture scope yet. No
image or control observation is made before or after the user's choice.

Selecting Chrome or Edge does not establish that Onshape is open, identify the
active browser tab, or prove the user is editing a CAD model. A session status
only reports whether the selected operating-system window is still present.
If several windows share the same application alias, the current list cannot
identify their contents. Use a single disposable test window when checking
this flow; do not treat its ordinal as a document or tab identity.

## Privacy and session handling

The Windows provider uses visible-window enumeration and process identity
metadata only. Native window handles, process IDs, thread IDs, process start
times, and short-lived random selection tokens stay in the desktop main process
memory. The renderer receives only the alias, ordinal, kind, and transient
token. The token expires after 60 seconds and is invalidated by a new list
request. Catalogs are capped at 50 entries; any incomplete or ambiguous scan
returns no selectable entries.

Window/session data is not written to the desktop state file. Only the
existing lesson progress, preferences, and approved panel placement persist.
The host discards its session on renderer navigation/reload, renderer crash,
window closure, and application exit. A paused session skips periodic liveness
checks; resuming revalidates the selected window first.

Window identity compares the native handle with process, thread, process-start,
application, and kind metadata. Reuse that changes those observed identity
fields is rejected. Windows does not provide a generation number through this
metadata query, so reuse of the same native handle by the same process and
thread during the same process lifetime cannot be distinguished from the
original window. If that rare case is suspected, disconnect and select again;
this remains a limitation for future native observation work.

The catalog fails closed when access is denied, enumeration is incomplete,
metadata is malformed, or the provider is unavailable. The app does not fall
back to window titles, screenshots, or guessed identifiers.

## Automated validation

Offline unit tests use synthetic metadata and state-machine fixtures. These are
not authenticated CAD observations. The Windows UI workflow uses a disposable
local WinForms window created by the test itself; it does not open Onshape or
inspect a real CAD application.

| Check                                          | Result                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| Desktop unit and component tests               | 115 passed locally; Windows native query required; final CI in PR #20 |
| Windows native selection and lifecycle fixture | Final Windows run linked in PR #20                                    |
| General repository CI                          | Final General run linked in PR #20                                    |
| Windows 10/11 owner acceptance                 | Not yet performed                                                     |
| Onshape window/tab/Sketch compatibility        | Not tested; unsupported by this build                                 |

The Windows regression enters written mode through the real startup UI before
running either readability negative control. Launch checks separately cover the
unselected, screen-access-off startup and the written lesson. Entering the lesson
moves keyboard focus to its primary action; saved-progress and completion focus
retain their existing destinations.

The native fixture emits a fixed readiness marker when its real WinForms window
is shown. The test then refreshes the actual native catalog through the UI,
selects a listed window, and requires that closing the fixture disconnects that
selection. No synthetic catalog is injected. The selection, pause/resume, closure, and saved-progress reload checks run in
both themes at 365 × 600 with normal text and 320 × 400 with 200% text. Sanitized
catalog summaries omit selection tokens and native identifiers. Screenshots show
only the isolated Leqad renderer and synthetic lesson data.

The restricted PowerShell subprocess originally omitted Windows host/compiler
runtime paths. On Windows CI this stalled at `Add-Type` until the deadline;
changing module search paths or command encoding alone did not resolve it. The
same query with the host environment completed in 2.2 seconds. The provider now
preserves an explicit Windows runtime-variable allowlist, including the host's
`PSModuleAnalysisCachePath`. An independent native comparison adding only that
cache setting to the runtime allowlist completed in 2.0 seconds; adding home paths
alone still timed out. The provider uses the trusted system
module directory, and still excludes credentials and unrelated environment data.
The five-second subprocess deadline and fail-closed checks remain. A real Windows
query regression and a secret-forwarding negative test guard this boundary.

The final pass/fail counts and exact source commit are recorded in PR #20.
The Windows CI screenshots and Playwright report are attached to the Windows
workflow run. They show only the app and its disposable fixture state; they do
not establish owner-machine or Onshape compatibility.

## Build and run on Windows 10/11

Use Node.js 24, pnpm 11.25.0, and a clean checkout of the Milestone 2 branch.
From the repository root, run:

```powershell
pnpm install --frozen-lockfile
pnpm exec install-electron
pnpm desktop:build
pnpm dev:desktop
```

`pnpm exec install-electron` downloads the pinned Electron runtime if it is not
already installed. On first launch, Windows may display its normal app security
prompt; do not approve additional screen-recording or accessibility access for
this build.

## Windows owner acceptance checklist

Please use a disposable local window or another harmless test app first. Do not
use a private CAD document for this check.

| Test                                                   | Result                | Short observed result |
| ------------------------------------------------------ | --------------------- | --------------------- |
| Leqad opens with no window selected                    | PASS / FAIL / BLOCKED |                       |
| **Use written lessons** opens Step 1                   | PASS / FAIL / BLOCKED |                       |
| Refresh lists a visible test window                    | PASS / FAIL / BLOCKED |                       |
| No window is selected by default                       | PASS / FAIL / BLOCKED |                       |
| Choosing a window shows screen access is off           | PASS / FAIL / BLOCKED |                       |
| No capture permission is offered in this build         | PASS / FAIL / BLOCKED |                       |
| Continue with written lessons preserves lesson access  | PASS / FAIL / BLOCKED |                       |
| Pause, then resume the selected window session         | PASS / FAIL / BLOCKED |                       |
| Keep screen access off revokes any consent state       | PASS / FAIL / BLOCKED |                       |
| Disconnect the window and retain lesson progress       | PASS / FAIL / BLOCKED |                       |
| Close the selected window and see disconnection status | PASS / FAIL / BLOCKED |                       |
| Restart Leqad; confirm no window/session is restored   | PASS / FAIL / BLOCKED |                       |
| Keyboard-only selection and written lesson             | PASS / FAIL / BLOCKED |                       |
| Narrow 320 × 400 layout at 200% text                   | PASS / FAIL / BLOCKED |                       |

For each row, write one short observed result. Do not send passwords, cookies,
tokens, window titles, URLs, document IDs, or screenshots containing private
work. A redacted issue description is enough if a test fails.
