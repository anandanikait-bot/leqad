# Leqad

Leqad is an interactive CAD teaching assistant for Onshape. It teaches Foundations in the modeling workflow, points learners to recognized controls, offers progressive help, and keeps model changes in the learner's hands.

The current Phase 1 scope and the preserved source specifications are in [`docs/product/phase-1-scope.md`](docs/product/phase-1-scope.md). The complete Phase 2 model-verification backend is deferred. Until live Onshape validation is performed, fixture results are not compatibility claims.

## Development

Requirements: Node.js 22.12 or newer and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

`pnpm dev` runs WXT's Chrome extension development workflow. For a production build, run `pnpm build`; WXT writes the unpacked extension to `apps/extension/.output/chrome-mv3`. Load that directory as an unpacked extension in Chrome or Edge and open a supported Onshape document. Live Onshape behavior still needs validation with a real account and browser session.

## Experimental desktop companion — Phase 1B

Cross-CAD desktop guidance is being prototyped in a separate, non-shipping track. Read [Phase 1B architecture](docs/product/phase-1b-desktop-companion.md) and the [no-redownload test-loop plan](docs/testing/desktop-alpha-testing.md). The new pure overlay-policy tests run with `pnpm test`; **there is not yet a runnable desktop app or `pnpm dev:desktop` command**. The original extension and live Onshape acceptance scope remain separate.
