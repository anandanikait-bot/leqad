# Onshape capability matrix

This is a new Phase 1 matrix created on 2026-10-13 because the reported Phase 0 original was unavailable in accessible workspaces, branches, attachments, and repository history. It does not reproduce or imply earlier test findings.

| Capability                              | Implemented evidence                                                            | Fixture/unit status                                                       | Live Onshape status            |
| --------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------ |
| Exact Onshape document-route parsing    | URL origin and path parser                                                      | Passed                                                                    | Unverified                     |
| Workspace/version/microversion identity | Explicit route fields                                                           | Passed                                                                    | Unverified                     |
| Editability                             | Read-only route/indicator; no positive permission observer connected            | Visible commands stay UNKNOWN; read-only is never promoted                | BLOCKED                        |
| Part Studio type                        | Context-matched selected Part Studio UI/API observation                         | Passed with controlled observations                                       | Unverified                     |
| React Shadow DOM panel                  | WXT production content script and browser fixture                               | Fixture passed; local production load blocked by policy                   | Unverified                     |
| Sketch command recognition              | Accessible label/title/role strategy                                            | Controlled recognition passed                                             | Unverified                     |
| Top-plane recognition and selection     | Typed semantic result and selected-state observation                            | Controlled recognition passed                                             | Unverified                     |
| Rectangle recognition                   | Accessible label/title/role strategy                                            | Controlled recognition passed                                             | Unverified                     |
| Dimension recognition                   | Accessible label/title/role strategy                                            | Controlled recognition passed                                             | Unverified                     |
| Finish Sketch recognition               | Accessible label/title/role strategy                                            | Controlled recognition passed                                             | Unverified                     |
| Active sketch-editing UI                | Current recognized Finish Sketch controls; independent of earlier Top selection | Passed with controlled observations; editable-context gate still required | BLOCKED                        |
| Active sketch on intended plane         | Separate observation field                                                      | Unknown by design                                                         | Unverified                     |
| Rectangle geometry exists               | No supported production evidence                                                | Unknown by design                                                         | Unverified                     |
| 40 mm by 30 mm values                   | Requires current model evidence                                                 | Unknown by design                                                         | Unverified                     |
| Committed sketch                        | No supported production evidence                                                | Unknown by design                                                         | Unverified                     |
| Direct unverified continuation          | Shared observer availability; rectangle/dimensions/finish have no verifier      | Component/browser regressions preserve SELF_REPORTED/UNKNOWN              | BLOCKED                        |
| Reload and per-document recovery        | Versioned extension storage and reconciliation                                  | Passed                                                                    | Unverified                     |
| Chrome MV3 build/package                | WXT build and zip                                                               | Passed                                                                    | Manual load blocked locally    |
| Edge MV3 build/package                  | WXT build and zip                                                               | Passed                                                                    | Manual Edge validation pending |

Update the live column only from an authorized run of [the live Onshape procedure](live-onshape.md). Preserve failures and version-specific observations.
