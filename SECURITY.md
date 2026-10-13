# Security policy

## Supported versions

Leqad is pre-release Phase 1 software. Security fixes are applied to the latest commit on `main`; older commits and packages are not supported releases.

## Report a vulnerability

Use GitHub's private security-advisory flow for this repository. Do not open a public issue for an unpatched vulnerability and do not include credentials, session data, private CAD content, or sensitive account identifiers.

Include:

- A concise description and potential impact
- Reproduction steps using non-sensitive fixtures where possible
- Affected commit, browser, and extension build
- Any suggested mitigation

Maintainers should acknowledge a complete report within seven days, coordinate validation and remediation privately, and credit reporters who want public acknowledgement.

## Security model

- The extension matches only `https://cad.onshape.com/documents/*`.
- The manifest requests only `storage`; it has no broad host permission, telemetry permission, or remote-code permission.
- Lesson and panel state remain in browser extension storage.
- Cursor samples are bounded and local and are not sent to a server.
- Evidence is validated for source, identity, time, revision, and required trust before a production lesson transition can pass.
- The current product does not execute model-generated instructions or automatically change an Onshape model.

The latest repository review is in [docs/security/review-2026-10-13.md](docs/security/review-2026-10-13.md).
