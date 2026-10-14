# Independent Onshape Sketch capture

The recorder is a standalone local tool. It does not import Leqad selectors, recognition, guidance, or registry code. It never clicks CAD controls, edits geometry, saves browser storage, or exports URLs, page text, HTML, IDs, classes, credentials, screenshots, or CAD document identifiers.

## Capture in local Chrome

Requirements: Node 22.12 or newer, pnpm, and a local Chrome installation that can render Onshape WebGL.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm reference:validate
pnpm reference:capture
```

Type `START`. The recorder opens a new temporary Chrome profile with extensions disabled, including Leqad. Sign in manually in that browser, open an authorized disposable Part Studio, then type `READY` and confirm that you will not edit geometry. Sign-in has a separate 30-minute limit; the 10-minute observation window starts after `READY`. Before capture, the recorder checks the Onshape origin and supported workspace-element route in memory and stores only the boolean result. You confirm that the workspace element is a Part Studio; the route check itself does not infer element type. It never records the URL or identifiers. The profile is deleted when capture ends or fails.

The MVP makes one two-snapshot **Active Sketch** capture. Start in a Part Studio with its Sketch toolbar command available. The recorder takes a BEFORE snapshot, then asks you to open Sketch manually and takes an AFTER snapshot. It never clicks a CAD control. Select the human-reported state separately for each snapshot; those values never change the DOM classification. If Sketch is not recognizable in the DOM, still save the UNKNOWN result: the report keeps a bounded, sanitized structural sample plus counts for exact allowlisted labels, accessible-name attributes, role attributes, and native controls. This can show whether names or semantic roles are absent without exporting their private values.

The output is written to `validation/onshape-reference/captures/pending/` with restrictive local permissions, a matching SHA-256 sidecar, and a 32 KiB limit. Pending JSON and hash files are Git-ignored so they remain local during review. Inspect only the sanitized JSON. `SKETCH_CONTROLS_VISIBLE` means the exact allowlisted `Finish Sketch` label was visible; `SKETCH_COMMAND_VISIBLE` means an exact allowlisted Sketch command label was visible. If no exact Sketch label exists, `domState` stays `UNKNOWN` and the structural sample remains available, even when unrelated allowlisted labels exist. `INCOMPLETE_CAPTURE` remains an honest global status when any traversal, depth, candidate, or output bound is reached. For the Active Sketch evaluator only, a depth limit or unrelated candidate limit may coexist with a passing local comparison when both snapshots still contain visible exact Sketch targets and the required before/after state evidence; node, output, or Sketch-candidate truncation remains non-passing. The report keeps the global incomplete status and discloses this local-evidence exception. No label alone proves an interface transition, model geometry, permissions, a selected plane, or lesson completion.

## Review and evaluate

After inspecting a pending JSON file, the owner can explicitly approve it. Only then is an approved copy and manifest entry created; nothing is committed or pushed automatically:

```sh
pnpm reference:approve -- cap_<capture-id>
```

The approval command asks for an explicit owner confirmation, copies the exact pending bytes, and appends their SHA-256 to the approved manifest. Approved captures are append-only. `.github/CODEOWNERS` assigns those files to the owner, but the repository must require code-owner review through branch protection or a ruleset before a change is authoritative. Hashes alone do not protect coordinated changes to a capture and manifest.

To compare an approved reference with a manually observed Leqad result:

```sh
pnpm reference:evaluate -- cap_<capture-id>
```

The evaluator validates the approved hashes and accepts only enumerated target/outcome values. A mismatch reports `FAIL`; missing, ambiguous, unknown, stale, WebGL-unavailable, or locally insufficient evidence cannot pass. Active Sketch requires a two-snapshot transition with a visible Sketch command before and visible Finish Sketch control after; the label alone is insufficient. A successful comparison is `CAPTURE_VERIFIED`, never `LIVE_VERIFIED`; it does not inspect Leqad automatically or validate CAD geometry.

Run offline checks with:

```sh
pnpm reference:test
pnpm reference:validate
```

Synthetic fixtures are labeled in tests and can only establish `SIMULATED`. CI never signs in to Onshape. After producing the first active Sketch capture, stop and give the sanitized pending record to the owner for review and live comparison; do not extend the harness while waiting for that evidence.
