# Manual native-search fallback experiment

This is the single isolated proof of concept from the [systems evaluation](../../docs/research/onshape-existing-systems-evaluation.md). Open `index.html` in a regular browser beside an authorized disposable Onshape document. No extension installation is needed. The card is static: no scripts, storage, screenshots, requests, CAD selectors, event listeners or progress changes. Following its explicit documentation link is a normal user-initiated navigation.

## Why this experiment

Official Onshape documentation supports student-operated search and native highlighting. Generic overlay libraries cannot fix command identity. A small written fallback tests the instructional proposal without introducing a second recognition implementation. This is a prototype of the fallback **content**, not an Onshape integration or production recognition fix.

Run `node --test experiments/native-search-fallback/fallback.test.mjs` and `pnpm exec playwright test --config experiments/native-search-fallback/playwright.config.ts`. Tests validate the static card and passive browser behavior only. They do not exercise authenticated Onshape, native search, actual command availability or the effect of drawing.

## Owner trial — pending

1. Open the card and your authorized disposable Onshape Part Studio in separate tabs/windows.
2. While manually editing Sketch, follow the search instructions; record whether the exact Corner rectangle result exists, its availability, and what native highlighting surrounds.
3. Select it yourself only if appropriate; record whether the explanation distinguished it from Center point rectangle. Do not export private CAD data.
4. Try Escape and search again; test an ordinary Part Studio context separately. Record unavailable behavior rather than assuming it.
5. Record PASS / FAIL / BLOCKED with browser/version and a short observation. No current live result exists.

Production adoption requires a product review. Counting this manual path toward a required automatic SHOW result would be a separate owner-approved scope change; this experiment makes no such change.
