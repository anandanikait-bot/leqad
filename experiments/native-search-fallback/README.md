# Manual native-search fallback experiment

This is the standalone content and privacy preview for the native Search Tools fallback in the [systems evaluation](../../docs/research/onshape-existing-systems-evaluation.md). The current branch also contains the same narrowly gated guidance in Leqad's Step 4 panel after Rectangle SHOW abstains; use the Chrome extension build for that integrated owner trial. Opening this static `index.html` in a regular browser does not exercise the extension or Onshape. The page has no scripts, storage, screenshots, requests, CAD selectors, event listeners or progress changes. Following its explicit documentation link is a normal user-initiated navigation.

## Why this experiment

Official Onshape documentation supports student-operated search and native highlighting. Generic overlay libraries cannot fix command identity. A small written fallback tests the instructional proposal without introducing a second recognition implementation. This is a prototype of the fallback **content**, not an Onshape integration or production recognition fix.

Run `node --test experiments/native-search-fallback/fallback.test.mjs` and `pnpm exec playwright test --config experiments/native-search-fallback/playwright.config.ts`. Tests validate the static card and passive browser behavior only. They do not exercise authenticated Onshape, native search, actual command availability or the effect of drawing.

## Owner trial — pending

1. Install the unpacked Chrome build in a regular profile and open an authorized disposable Onshape Part Studio.
2. Reach Step 4 → SHOW. If Leqad automatically highlights a target, record that result and leave the manual fallback untested. Do not remove controls or force a failure in live Onshape.
3. If Leqad safely abstains and the fallback card appears, expand it. Record whether Search Tools opens, whether the exact Corner rectangle result is available, and what the native highlight surrounds.
4. If appropriate, select the result yourself and confirm the text distinguishes Corner rectangle from Center point and Aligned Rectangle. Do not export private CAD data or treat search/highlighting as geometry verification.
5. Try Escape and search again; note hidden Search Tools, unavailable result, panel overlap and whether collapse/re-expand preserves the lesson/help state.
6. Record PASS / FAIL / BLOCKED with browser/version and a short observation. No current live result exists; all automated extension fixtures are simulated.

Production adoption requires a product review. Counting this manual path toward a required automatic SHOW result would be a separate owner-approved scope change; this experiment makes no such change.
