# Independent Onshape Sketch capture

The recorder is a standalone local tool. It does not import Leqad selectors, recognition, guidance, or registry code. It never clicks CAD controls, edits geometry, or exports browser storage, URLs, page text, HTML, IDs, classes, credentials, screenshots, or CAD document identifiers. Chrome stores cookies and other session data locally in the isolated temporary profile until cleanup. That profile is outside the repository and is deleted after normal completion or a handled failure; forcibly terminating the process may require manually removing the leftover `leqad-onshape-reference-*` directory from your operating system's temporary folder.

## Capture in local Chrome

Requirements: Node 22.12 or newer, pnpm, and a local Chrome installation that can render Onshape WebGL.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm reference:validate
pnpm reference:capture
```

Type `START`. The recorder opens a new temporary Chrome profile with extensions disabled, including Leqad. Sign in manually in the **original recorder tab**, open an authorized disposable Part Studio there, then type `READY` and confirm that you will not edit geometry. Close any extra tabs opened during sign-in. The recorder requires that original tab to be the only open tab at `READY` and before **both** snapshots; it stops rather than switching to another tab. If Onshape opens a new tab, return the workspace to the original tab and close the extra tab before continuing.

The START confirmation has a 30-minute limit. A separate 30-minute sign-in/workspace-readiness window begins once the initial Onshape navigation finishes. The 10-minute observation window starts after `READY`; sign-in time does not consume it. Before each snapshot, the recorder rechecks the Onshape origin and supported workspace-element route in memory and returns only a boolean from that check. You confirm that the workspace element is a Part Studio; the route check itself does not infer element type. No URL or identifier is exported.

The MVP makes one two-snapshot **Active Sketch** capture. Start in a Part Studio with its Sketch toolbar command available. The recorder takes a BEFORE snapshot, then asks you to open Sketch manually and takes an AFTER snapshot. It never clicks a CAD control. Select the human-reported state separately for each snapshot; those values never change the DOM classification. If Sketch is not recognizable in the DOM, still save the UNKNOWN result: the report keeps a bounded, sanitized structural sample plus counts for exact allowlisted labels, accessible-name attributes, role attributes, and native controls. This can show whether names or semantic roles are absent without exporting their private values.

The output is written to `validation/onshape-reference/captures/pending/` with restrictive local permissions, a matching SHA-256 sidecar, and a 32 KiB limit. Pending JSON and hash files are Git-ignored so they remain local during review. Inspect only the sanitized JSON. `SKETCH_CONTROLS_VISIBLE` means the exact allowlisted `Finish Sketch` label was visible; `SKETCH_COMMAND_VISIBLE` means an exact allowlisted Sketch command label was visible. These classifications describe labels; control acceptance additionally requires independent control semantics. A visible unrelated menu cannot replace the Sketch classification; its roles and visibility remain separately recorded in the nodes. If no exact Sketch label exists, the structural sample remains available even when unrelated allowlisted labels exist. Structural candidates are sampled across the bounded scan, including its endpoints, rather than taking only the first controls. Sampling cannot identify an unnamed Sketch control, and omitted structure remains UNKNOWN. A genuinely deep target retains bounded label, geometry, and ancestry evidence with UNKNOWN visibility when the ancestry inspection is incomplete.

`INCOMPLETE_CAPTURE` remains an honest global status when any traversal, depth, candidate, or output bound is reached. For the Active Sketch evaluator only, a depth limit or unrelated candidate limit may coexist with a passing local comparison when both snapshots still contain visible exact Sketch controls and the required before/after state evidence; node, output, or Sketch-candidate truncation remains non-passing. The report keeps the global incomplete status and discloses this local-evidence exception. No label alone proves an interface transition, model geometry, permissions, a selected plane, or lesson completion.

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

The evaluator validates the approved hashes and accepts only enumerated target/outcome values. A mismatch reports `FAIL`; missing, ambiguous, unknown, stale, WebGL-unavailable, or locally insufficient evidence cannot pass. Sketch command acceptance requires an exact label on a visible native button or an ARIA button/menuitem, or a label nested inside that independently observed control. Text alone, focusability alone, unknown clipping/visibility, or missing ancestry cannot establish a command. Controls with `aria-disabled="true"` or a native HTML `disabled` attribute cannot establish a command; the sanitized record stores only the fixed ARIA state and a boolean for native disabled-attribute presence. Unsupported explicit accessible names stay private and cannot be overridden by lower-priority title or text fallbacks. Active Sketch requires exactly one such Sketch command before, no visible Finish Sketch command before, and exactly one Finish Sketch command after, alongside the separately reported human states. A successful comparison is `CAPTURE_VERIFIED`, never `LIVE_VERIFIED`; it does not inspect Leqad automatically or validate CAD geometry. If real Onshape exposes no supported control semantics, keep the evidence UNKNOWN for owner review.

Run offline checks with:

```sh
pnpm reference:test
pnpm reference:validate
```

Synthetic fixtures are labeled in tests and can only establish `SIMULATED`. CI never signs in to Onshape. After producing the first active Sketch capture, stop and give the sanitized pending record to the owner for review and live comparison; do not extend the harness while waiting for that evidence.
