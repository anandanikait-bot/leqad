# Phase 1B Milestone 1 execution ledger

Plan: docs/superpowers/plans/2026-10-25-phase1b-desktop-implementation.md. Scope Tasks 1–6 only.

Baseline PR #15 5dbd09d. Only overlayPolicy.ts and overlayPolicy.test.ts imported from PR #17 d5f182a. Official SVGs copied unchanged from pinned main df1879e. No branch merge.

Task 1: contract test RED (missing implementation), GREEN 5 tests; existing imported overlay tests GREEN 9 tests. Stale generation is a host state validation responsibility, not a stateless schema promise.
Task 2 bootstrap: App.test RED (missing App), then GREEN minimal written-only bootstrap. Primary hands App.tsx and its test to Agent 1 after this commit; Agent 2 owns no renderer files.

User configuration at initial launch: three GPT-6 Luna xhigh agents accepted. Later owner instruction reduced active subagents to two GPT-6 Luna xhigh agents at regular speed; primary took over integration tests and review. Both resumed launches accepted the requested model/reasoning; no speed override was requested. Primary owns shared contracts, dependency/build/CI files and integration. Third workstream is restricted to Milestone 1 safety/integration tests and review; no overlay/capture implementation.

Environment: Linux. Windows launch must be established by a Windows CI runtime job and identified separately from manual owner validation. No local Windows claim.

Contract freeze: desktop-contracts/src/index.ts. Stored lesson schema is eight ordered records, version 2.0.0. No stored UI/model PASS. Milestone 1 session never grants consent or reports selectable windows.

Tasks 1–6 implementation: complete locally; historical Windows CI succeeded and owner Milestone 1 review remains pending. Renderer commit b981baf; host commits e8d42a9/f5a5919. Primary integration includes bb04575/f93d6ca. No capture/recognition/overlay implementation followed.

Verification: 697 unit/component tests; 45 independent reference tests and integrity validation; 7 actual Electron integration tests on Linux/Xvfb; extension browser tests 87 PASS, 1 SKIPPED locally. Typecheck, lint, format:check, full build, Edge build and Chrome/Edge packaging pass. Earlier two scan timing failures under simultaneous heavy browser/unit load passed in a serial rerun and the complete 697-test run. No production timeouts were changed.

Primary corrections: native content size preserved, menu closes with focus restored to its trigger, completed review returns to summary, native always-on-top preference works without focus stealing, unreadable saves are never silently overwritten, Leqad uses its own appData directory and application identity. Regression tests observed RED before fixes.

Development proof: dev:desktop launched Electron and Vite, renderer React HMR messages observed, Ctrl+C stopped server and child. This is Linux runtime evidence. Historical PR #19 checks for `e7e8dd1021ae81845ec222e782aa6eb43b297cd5` succeeded: General check `40278660055` and Windows check `40278660170`. The Windows job ran on Windows Server 2025. That CI result is separate from native Windows 10/11 manual DPI, Narrator, and multi-monitor acceptance, which remains owner work.

The Windows workflow now adds a clean Electron installation proof using an initially empty isolated cache and an assertion that `electron.exe` is absent before invoking the installer. Validation of this new proof is pending the primary final CI result; the historical checks above do not establish its result.

Read-only independent host review identified summary navigation, pin semantics and unreadable-store recovery issues; all were addressed. Primary reviewed IPC, assets, lesson outcomes, screenshot hierarchy and unchanged extension/shared lesson files. No merge, deployment, installer, website edit or later-milestone implementation.
