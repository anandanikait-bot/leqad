# Authorized Onshape live-runner proposal

Status: **NO-GO pending explicit Onshape automation permission**

Research date: 2026-10-18.

## Source status

Official sources required for the final permission review:

- [Onshape Terms of Use](https://www.onshape.com/en/legal/terms-of-use)
- [Onshape API authentication](https://onshape-public.github.io/docs/auth/)
- [Onshape API keys](https://onshape-public.github.io/docs/auth/apikeys/)
- [Onshape OAuth](https://onshape-public.github.io/docs/auth/oauth/)
- [Onshape API limits and terms](https://onshape-public.github.io/docs/auth/limits/)
- [Onshape's official client repository](https://github.com/onshape-public/onshape-clients)
- [Playwright Chrome extension testing](https://playwright.dev/docs/chrome-extensions)
- [Playwright authentication](https://playwright.dev/docs/auth)
- [Playwright parallelism](https://playwright.dev/docs/test-parallel)

The execution environment reviewed the official Onshape client repository and
the official Playwright documentation source. Its network policy blocked the
current Onshape legal and hosted developer pages, including the Terms of Use,
API terms/limits and hosted authentication guides. Those links are listed for
the owner's current-text review; their contents are not represented here as
reviewed. This proposal therefore does not conclude that browser automation is
permitted. The current legal text must be reviewed by the owner and,
preferably, Onshape must answer the narrow permission request below in writing.

Relevant technical findings:

- Onshape's official client points developers to the Developer Portal for API
  credentials. API keys or OAuth tokens are not web-login substitutes for this
  proposed UI runner.
- API terms and limits can still matter to related integrations. This runner
  proposes no direct API calls, which does not itself grant permission for UI
  automation.
- Playwright requires a persistent Chromium context for extension testing.
  Its current documentation says Chrome and Edge removed the command-line flags
  used to side-load extensions, so the runner should use Playwright's bundled
  Chromium.
- Playwright warns that saved browser state can contain cookies and headers
  capable of impersonating the account. No storage-state file, profile,
  cookie, token or header may enter the repository or CI artifact system.
- The four CAD states modify shared server-side state. The runner must use one
  dedicated account/document and run serially.

## Concise permission request

Send this to the Onshape account representative or support channel responsible
for the test account:

> **Subject: Permission for low-volume automated Leqad compatibility tests**
>
> We request written permission to run a low-volume Playwright Chromium UI test
> against one dedicated Onshape test account and one disposable Part Studio.
> The browser will load our unpacked Leqad extension and exercise four states:
> active Sketch with the Rectangle menu closed, the Rectangle menu open, a
> changed Rectangle variant, and Extrude editing.
>
> The test will run serially, at most once per release candidate and no more
> than once per day during development. It will not crawl public documents,
> enumerate accounts, call private APIs, bypass access controls, solve CAPTCHAs,
> or access any document outside the disposable test document. It will stop on
> authentication, authorization, rate-limit or unexpected-navigation errors.
>
> Authentication will occur in a local dedicated browser profile controlled by
> the account owner. Passwords, cookies, bearer tokens, document identifiers,
> URLs and profile files will never be committed, uploaded or placed in CI.
> Saved test output will contain only allowlisted state names, pass/fail/blocked
> results, relative control/highlight bounds and fixed reason codes.
>
> Please confirm whether this specific UI automation is allowed under the
> account's current Terms of Use and API/developer agreement, whether a special
> test account or application registration is required, and any frequency,
> authentication, user-agent or data-retention conditions we must follow.

Record the reply, scope, date, approving party and any conditions in a private
owner-controlled location. Do not put account credentials or document links in
the approval record.

## Proposed runner

### Isolation and authentication

1. Require an owner-controlled approval record before launch. Absence,
   expiration or scope mismatch stops the run.
2. Build Leqad from the exact commit under test.
3. Create a profile directory outside the repository with owner-only file
   permissions. Refuse a repository, shared or cloud-synced path.
4. Launch Playwright's bundled Chromium in headed mode with
   `launchPersistentContext`, loading only the unpacked Leqad build.
5. Let the test-account owner sign in manually. Do not script passwords, MFA or
   recovery flows. The runner stores no `storageState` export.
6. Check the expected Onshape origin and Part Studio route only in memory.
   Never log the URL or its identifiers.

The first version should keep the profile only for the approved local test
window, then remove it. A longer-lived profile requires a separate owner choice,
encrypted local storage and a documented expiry/cleanup procedure.

### Independent target oracle

The live runner must not import Leqad's recognition code, selectors, guidance
registry or diagnostic resolver. It needs a small test-only oracle based on
separately approved live evidence.

For each state, the oracle returns one of:

- `TARGET_OBSERVED` with one independently measured control rectangle;
- `TARGET_AMBIGUOUS`;
- `TARGET_MISSING`;
- `OBSERVATION_INCOMPLETE`.

Only `TARGET_OBSERVED` may be compared with Leqad's highlight. Any unresolved
oracle result blocks that state instead of turning Leqad's own result into the
expected answer.

### Serial four-state flow

Use one worker and one page:

1. **A — Sketch/menu closed:** establish the independent expected arrow, ask
   Leqad to SHOW, and compare one overlay with the expected bounds.
2. **B — menu open:** open the dropdown through an approved test action or a
   human checkpoint, then verify ownership and the expected abstention or menu
   item behavior declared by the build.
3. **C — changed variant:** change the variant through an approved action or a
   human checkpoint, then repeat the arrow-bound check.
4. **D — Extrude:** exit Sketch and enter Extrude through approved actions or a
   human checkpoint. Verify Rectangle SHOW abstains and creates no overlay.

The first approved runner should use human checkpoints for CAD state changes.
This cuts one-off capture/reinstall work while avoiding new automation based on
unverified Onshape controls. Fully automatic state creation can be considered
only after its controls have separate evidence and the written permission
explicitly covers those actions.

### Highlight assertion

For A and C, require:

- one Leqad overlay;
- `pointer-events: none`;
- the overlay rectangle equals the independently observed target rectangle plus
  the documented three-pixel padding, within a small device-pixel tolerance;
- no host control click and no lesson completion or geometry PASS;
- cleanup after timeout, navigation, rerender or state change.

For ambiguous, duplicate, hidden, disabled, stale or missing targets, require
no overlay and a fixed fallback reason. B and D must follow the behavior
declared for the exact build rather than forcing a positive result.

### Sanitized output

Save only:

- build commit and package hash;
- Chromium and runner versions;
- fixed state name;
- `PASS`, `FAIL` or `BLOCKED`;
- fixed oracle/product reason codes;
- relative viewport bounds and numeric delta;
- cleanup result and timestamps rounded to seconds.

Do not save screenshots by default. Do not save page text, HTML, selectors,
classes, IDs, URLs, account data, document data, network bodies, cookies,
headers, tokens or the browser profile. Validate the closed output schema before
writing it.

### Safe stops

Immediately stop and return `BLOCKED` for:

- sign-in, MFA, CAPTCHA or account-recovery prompts;
- wrong origin, route, document or account;
- read-only or unexpected permission state;
- multiple tabs or unexpected navigation;
- rate-limit, service-warning or access-denied UI;
- oracle ambiguity or incomplete observation;
- browser/extension crash;
- any request to export sensitive state.

No retry loop may continue changing the shared CAD document. Reset the
disposable document manually after a failed partial run.

## Cost estimate

| Work                                    | Engineering estimate                      | Runtime/operating cost                                           |
| --------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Offline fixture and CI coverage         | 2–4 focused hours                         | Existing CI only                                                 |
| Permission package and security review  | 1–2 hours plus response time              | No Onshape automation                                            |
| First permission-approved hybrid runner | 8–16 hours after approved evidence exists | About 3–6 minutes per serial run; one dedicated account/document |
| Fully automated four-state UI driver    | Additional 16–32+ hours                   | Higher maintenance when Onshape UI changes                       |
| Maintenance                             | 2–6 hours per material Onshape UI change  | Keep runs low-volume and serial                                  |

Account pricing and legal review cost are not estimated here. The initial
4–8-hour budget is enough for offline regression and the proposal, but not for
permission-approved live automation.

## Stop/go recommendation

- **GO:** merge or run the offline regression tests after normal review. They
  reduce repeated manual checks and do not access Onshape.
- **GO:** send the narrow permission request and prepare a dedicated account
  and disposable Part Studio after approval.
- **NO-GO:** launch automated live Onshape access, persist an authenticated
  profile, or automate CAD state changes before the permission scope is
  confirmed.
- **After approval:** start with the serial hybrid runner and human state
  checkpoints. Expand only when that run proves stable and the approved scope
  covers further automation.

Remaining manual acceptance is the five-item list in
`rectangle-offline-regression.md`. Offline CI cannot produce `LIVE_VERIFIED`.
