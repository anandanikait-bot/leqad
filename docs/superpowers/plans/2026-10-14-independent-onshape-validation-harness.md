# Independent Onshape validation harness — MVP plan

## Goal

Collect independent, privacy-safe evidence that explains why Leqad does not recognize an active Onshape Sketch environment. Keep the recorder and offline evaluator independent from Leqad recognition code. This plan does not authorize changing production recognition without real Onshape evidence.

**Time target:** 6–8 focused engineering hours for the initial MVP. This is a planning target, not permission to skip essential privacy or correctness checks.

## MVP

- Launch a clean local Chrome profile with extensions disabled and remove it on exit.
- Record bounded, allowlisted DOM structure for the Sketch toolbar and active Sketch controls.
- Export sanitized JSON with observed, `UNKNOWN`, and `INCOMPLETE_CAPTURE` states kept distinct from the owner's self-reported state.
- Store captures as pending review; freeze approved bytes with SHA-256 and require owner-controlled review before treating them as authoritative.
- Compare an independently recorded target with a manually observed Leqad result; detect wrong and missing target recognition.
- Test privacy, recorder independence, wrong targets, and incomplete captures.

## Checkpoints

| Focused hours | Work                                                                |
| ------------- | ------------------------------------------------------------------- |
| 0–2           | Recorder boundary and minimal capture schema                        |
| 2–4           | Clean local Chrome workflow, Sketch snapshots, privacy checks       |
| 4–6           | Pending/approval integrity, small offline evaluator, negative tests |
| 6–8           | Integration, concise owner instructions, CI verification            |

## Defer

Until after the first successful real capture, defer a full dashboard, broad support for every Onshape tool, advanced browser automation, a separate reference-data repository, generalized fixture replay, extensive history management, and complex approval infrastructure.

## Required stopping point

Once a working safe Sketch capture tool is ready, stop adding harness infrastructure and ask the owner to run it in authenticated Onshape. Do not keep expanding the harness while waiting for evidence. Historical acceptance cannot block a new test, but it cannot establish current validation without fresh evidence. CI and synthetic fixtures remain separate from live acceptance.

## First success criterion

Independently observe whether Onshape Sketch controls are active, compare that evidence with Leqad's current recognition result, and identify where the observations diverge. Do not invent DOM evidence or export authentication data.
