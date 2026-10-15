# First intelligent interaction: design for review

## Outcome and approved choices

A beginner can ask about the First Sketch lesson, receive an AI explanation,
request help locating Sketch, authorize one screenshot, and manually use an
AI-suggested outline. Neither the teacher nor highlighting verifies CAD geometry
or performs CAD actions.

The owner selected OpenAI through a local server and the interaction
**SHOW → click Leqad's Chrome toolbar icon → confirm one screenshot**.
The existing branch baseline is `edafd20`; PR #1 stays open and unmerged.
The requested AI services narrowly supersede the repository's earlier prohibition
on AI calls. Existing deterministic lesson behavior remains available offline.

This document proposes the implementation details for owner review. Approval of
the provider and capture interaction does not establish live compatibility.

## Scope and components

Extend the existing WXT/React/TypeScript extension with:

1. A Manifest V3 background worker and a small toolbar popup for local-server
   pairing and one-shot screenshot consent.
2. Typed, runtime-validated capture, grounding, and teaching messages. Only
   `sketch-toolbar-control` is a supported grounding target.
3. A local Node server with separate grounding and teaching endpoints calling
   OpenAI's Responses API. Use the existing toolchain and native HTTP/fetch
   facilities; avoid a new application framework.
4. A focused question component within `AssistantPanel.tsx`, plus the Sketch SHOW
   fallback and request lifecycle integration in the existing content script.
5. A transient AI outline using the existing visual shell and cleanup behavior.
   An AI proposal is never saved as a user calibration or semantic recognition.

Keep Top-plane recognition, progress storage, manual Sketch-mode reporting,
HINT/SHOW, and calibration. Do not expand the recorder, add CAD API calls,
automatic clicking, Rectangle grounding, billing, or a general agent framework.

## Local server and credentials

Bind the server to `127.0.0.1` on a documented fixed development port. Configure
the OpenAI key and model names through server environment variables. Model names
are explicit configuration; a missing or unsupported model produces a setup
error, not a fabricated answer.

Require the installed extension ID in server configuration and a random pairing
token generated at server startup. The owner copies that token into the extension
popup. The token lives only in extension session storage, with access restricted
to trusted extension contexts; it is never passed to the Onshape page or content
script. Restarting the server requires pairing again.

Allow only the configured extension origin, expected Host, and authenticated
requests. Do not offer permissive CORS or accept requests from arbitrary websites.
Use a fixed loopback endpoint in the extension, rather than accepting arbitrary
backend URLs from content messages. Grant only the required loopback host access
alongside `storage` and `activeTab`; do not request `<all_urls>` or broad `tabs`
access. Verify the packaged manifest and Chrome's actual loopback permission
behavior during implementation.

The server bounds request size, field lengths, concurrency, response size, and
request duration. It returns fixed safe errors without dumping provider bodies,
keys, questions, or images. No image, conversation, or request-body logging and no
application-level persistence. Request `store: false` from OpenAI. Disclose that
provider retention is governed separately by the owner's OpenAI account policy;
local non-retention is not a promise of zero provider retention.

## Screenshot authorization and capture

SHOW first tries existing semantic recognition. If it cannot identify Sketch,
the panel offers AI location assistance and manual calibration. The AI option
creates a short-lived pending request tied to this tab, top-level document,
workspace route, lesson step, and current UI generation. Route identifiers remain
in memory inside the extension and are never sent to the server.

The user opens the toolbar popup, granting Chrome's temporary `activeTab` access.
The popup explains that one screenshot of the visible Onshape tab, including
visible CAD content and any visible names, will be sent through the local server
to OpenAI to locate Sketch. Confirm and Cancel are explicit. Tutor consent does
not authorize screenshots, and screenshot consent does not authorize later
captures. No capture occurs on installation, page load, ordinary SHOW, or retries
without a new confirmation.

The worker accepts requests only from this extension's expected UI and top-level
content script. It validates the active tab and focused window against the
pending request immediately before and after capture. Require the exact origin
`https://cad.onshape.com` and the existing supported workspace route. A known
other element type is rejected. If Part Studio identity is UNKNOWN, explain that
limitation and require the owner to confirm that the visible page is their
disposable Part Studio before capture. That confirmation remains user-reported;
it does not upgrade page recognition or editing permission. Calibration remains
available without AI. A route alone must not be called proof of a Part Studio.

Use `captureVisibleTab` only for that active window. Chrome does not offer an
atomic tab-ID capture operation: changes detected around capture discard the
image before upload, rather than retargeting another tab. Pending requests also
expire or cancel on tab activation changes, navigation, document replacement,
window focus changes, or worker restart. Test the race behavior explicitly and
document the browser API's limits.

Keep image bytes only in transient request memory. Read and validate actual PNG
dimensions, enforce image size limits, and send those dimensions with the image.
Do not store images in extension storage, files, test reports, or GitHub. Report
permission denial, stale requests, unsupported pages, and unavailable capture as
recoverable outcomes with the manual fallback.

## Grounding contract and outline

Input is the authorized screenshot, its width and height, and the closed target
identity `sketch-toolbar-control`. No document identifiers, DOM dump, cookies,
tokens, or browsing history accompany it.

The structured result contains:

- The same target identity.
- `FOUND`, `NOT_FOUND`, or `UNCERTAIN`.
- A pixel rectangle `{ x, y, width, height }` only for `FOUND`; otherwise `null`.
- A bounded explanation, displayed as text.

Use provider structured output and independent runtime validation on both sides
of the extension/server boundary. Reject non-finite or out-of-image coordinates,
extra fields, wrong identities, malformed status/rectangle combinations, and
implausibly large control regions. Never clamp malformed output into validity.
Prompt the model to distinguish the toolbar command from lesson text, feature
names, and dialog text, and to abstain for missing, disabled, or ambiguous
controls. Model confidence is not an acceptance criterion. Valid output remains
an unverified proposal, including when the model reports `FOUND`.

Map pixels to CSS viewport coordinates using the captured image dimensions and
the capture-time viewport dimensions. Track device-pixel ratio, browser zoom,
visual viewport scale/offset, and page identity. Reject unsupported visual
viewport configurations rather than applying an untested conversion.

Track a UI generation before capture and through response display. Invalidate on
relevant Onshape DOM changes, clicks/keyboard interactions, scrolling, resize,
zoom, navigation, visibility/focus changes, step changes, pause, and cancellation.
Ignore only Leqad's own panel/overlay updates. If freshness cannot be established,
discard the result and explain how to retry. This deliberately favors a retry
over displaying an old screenshot's coordinates.

Show one subtle, click-through outline for at most five seconds, with reduced
motion respected and deterministic listener/observer cleanup. Clear it immediately
when the context changes. Display:

> AI-suggested location. Check that the outline surrounds the Sketch button.

On abstention, timeout, stale context, or error, offer existing saved calibration
when valid, the calibration editor, and written instructions. Never produce a
semantic `FOUND`, lesson PASS, geometry verification, or CAD click from a vision
response.

## First Sketch teacher

Add a question input, Send button, loading/cancel state, answer, actionable next
step, optional follow-up, and clear unavailable/error state to the existing panel.
Sending discloses that the question and lesson context go to OpenAI. It does not
send a screenshot, arbitrary DOM text, student history, or document identifiers.
Answers render as plain text, without HTML, executable actions, or arbitrary links.

The request carries a validated First Sketch lesson ID/version, a valid step ID,
a bounded question, and allowlisted UI context. Preserve separate fields for
observed UI state, UNKNOWN state, and user-reported Sketch mode. The server derives
curated lesson content from the existing lesson definition; it does not accept
arbitrary client-authored system prompts or lesson definitions.

The structured answer contains an explanation, a next step, and an optional
clarifying question. Instruct the model to stay within this introductory lesson,
avoid claiming to inspect geometry or know unsupported permissions, and treat
student text as a question rather than privileged instructions. Schema validation
cannot guarantee teaching accuracy; owner review of actual answers is required.

Limit to one outstanding question. Cancel or discard replies after the lesson
step or page changes. Do not automatically retry paid requests. No long-term
conversation storage or adaptive student profile. Existing HINT remains usable
when the service is offline, and AI responses never update completion state.

## Validation and implementation order

1. Implement and test the permission/messaging boundary and capture-only flow
   first. Provide an owner checkpoint for a real unpacked Chrome screenshot and
   measured dimensions before claiming capture works in Onshape.
2. Add the local server, strict schemas, grounding conversion and stale-result
   handling. Add the SHOW integration and preserve calibration fallback.
3. Add the teacher service and panel integration using the existing lesson data.
4. Run reference validation/tests, lint, typecheck, formatting, unit/component
   tests, browser tests, Chrome/Edge builds and packaging, then CI on PR #1.

Focused tests cover authorization and sender validation; permission failure;
wrong tab/window/route; navigation and capture races; single-use consent; privacy
and credential boundaries; malformed, ambiguous and missing model results;
coordinate conversion at multiple dimensions/zoom levels; stale replies;
timeout/network failures; invalid lesson context; teacher rendering; no CAD
clicks or completion changes; progress preservation; and existing Top highlights.
Provider mocks and browser fixtures are explicitly simulated. Inspect built
packages for unintended secrets, permissions, and server-only code.

This managed environment previously blocked unpacked extensions. Respect that
restriction if still present; report a skip instead of treating fixture tests as
capture acceptance. Absence of configured OpenAI credentials is also a live API
test blocker, not grounds for a mocked success claim.

The owner runs the actual extension in regular Chrome with an authorized
disposable Part Studio and the local server. Test three distinct lesson questions,
Sketch open and closed, at least two window sizes, permission/cancel failures,
and a UI change while grounding is pending. Record PASS/FAIL/BLOCKED and a brief
observation for each. At least one complete question → answer → SHOW → authorized
capture → correct outline → manual Sketch action must succeed for this sprint's
live acceptance. Further cases and failures remain visible in the report.

## Delivery and limits

Provide committed changes on `phase1-hardening`, CI/artifact links, exact Windows
server setup and extension installation instructions, a local capture checkpoint,
and the short acceptance checklist. Keep pending live results BLOCKED until
observed. Do not merge PR #1 or announce Phase 1 completion.

The October 19–21 target depends on owner capture access, API configuration, and
actual grounding quality. Neither passing schemas nor passing CI guarantees the
model will locate the live Sketch button. If the first live flow fails, use the
reported failure to make a focused correction rather than expand the framework.
