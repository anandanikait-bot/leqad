# Local development setup

## Requirements

- Node.js 22.12 or newer
- pnpm 11.25.0 through Corepack or a compatible installation
- Chrome, Edge, or Chromium for browser testing

## Install

```sh
git clone https://github.com/anandanikait-bot/leqad.git
cd leqad
pnpm install --frozen-lockfile
```

In storage-constrained cloud environments, keep the pnpm store in a writable temporary directory:

```sh
pnpm install --frozen-lockfile --store-dir /tmp/leqad-pnpm-store
```

## Develop

```sh
pnpm dev
```

WXT watches the extension source. It does not provide an authenticated Onshape session.

## Build and package

```sh
pnpm build
pnpm build:edge
pnpm package:browsers
```

Outputs:

- Chrome unpacked: `apps/extension/.output/chrome-mv3`
- Edge unpacked: `apps/extension/.output/edge-mv3`
- Zip packages: `apps/extension/.output/*-chrome.zip` and `*-edge.zip`

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select `apps/extension/.output/chrome-mv3`.
5. Open an authorized Onshape document route.

## Load unpacked in Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select `apps/extension/.output/edge-mv3`.
5. Confirm the panel on a disposable Onshape document and follow the Edge checklist in [live testing](../testing/live-onshape.md).

Managed browser policy may block unpacked extensions. Record that result as blocked or skipped; do not count it as a pass.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
pnpm build:edge
pnpm test:e2e
```

The browser fixture runs controlled HTML at `127.0.0.1`. The production-extension test uses the built Chrome directory and skips explicitly when managed policy blocks unpacked extensions.

## Repository conventions

- Keep verification packages independent from the extension UI.
- Add a regression test before or with a behavior fix.
- Use `UNKNOWN` rather than inferring unavailable CAD facts.
- Never commit `.env` files, credentials, private CAD data, build output, or browser profiles.
- Update the capability matrix only with evidence from the corresponding test track.
