# Desktop AI tutor V1

This branch starts at verified Milestone 2 commit `5737611724db1d8392a676fcba56fcdee4fda58d`. Its [General CI](https://github.com/anandanikait-bot/leqad/actions/runs/40607085719) and [Windows CI](https://github.com/anandanikait-bot/leqad/actions/runs/40607085753) passed. The tutor is a separate draft change stacked on PR #20.

## What this build does

Ask accepts a question, remembers recent turns during the application session, and includes the current written lesson step in each request. Suggested questions help students get started. Cancellation stops the request; a failed question can be retried without counting it twice.

Learning history contains at most 30 topic request records, including whether a student asked for clarification. The student can remove records, select an explanation preference, or clear history. It records no proficiency score. Conversation text is not saved to disk. Lesson progress stays in the existing lesson store with its original self-reported or acknowledgement labels. Tutor replies cannot advance a lesson or mark geometry verified.

The configured provider receives the student's text, recent conversation, bounded learning history, lesson instructions and progress. The app does not attach screen images, window metadata, CAD documents, cookies or account details. Students must not put private CAD information or credentials into a question. OpenAI requests use `store: false`; this does not promise zero provider retention under all account policies.

## Windows setup

Install Git, Node.js 24 and pnpm 11.25.0. In PowerShell:

```powershell
git clone https://github.com/anandanikait-bot/leqad.git
Set-Location leqad
git fetch origin feat/yc-ai-tutor-v1
git switch --track origin/feat/yc-ai-tutor-v1
pnpm install --frozen-lockfile
pnpm exec install-electron
pnpm desktop:build
pnpm dev:desktop
```

Without an API key, Ask shows **AI unavailable**. It never substitutes a scripted response. Written lessons and window selection remain available.

To test live OpenAI, close Leqad first. In the same PowerShell window, enter a key privately. Do not paste it into chat, a source file, a terminal command, or an issue:

```powershell
$leqadSecureKey = Read-Host 'OpenAI API key' -AsSecureString
$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', $leqadSecureKey).Password
$env:OPENAI_MODEL = 'gpt-4.1-mini'
try {
  pnpm dev:desktop
} finally {
  Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
  Remove-Variable leqadSecureKey -ErrorAction SilentlyContinue
}
```

`OPENAI_MODEL` selects the model for one request per question. The initial default is `gpt-4.1-mini`; select another Responses API model available to your account if needed. No planning-model second call is required. API usage is billed to the key's account.

The key is read only in Electron main and exists in the launching shell/process environment until cleared or closed. Leqad does not store it, return it through IPC, or log it. Renderer networking remains blocked. A missing or rejected key never enables a mock response. No installer or deployment is included.

## Owner acceptance

Use nonprivate practice questions. Record PASS, FAIL or BLOCKED plus one short observation:

1. Open Ask without a key. Confirm unavailable mode and working written lessons.
2. Configure your key, restart, and ask: “How do I dimension a rectangle?” Confirm a live response and accurate 40 mm by 30 mm lesson context.
3. Say: “I'm still confused.” Confirm the tutor tries another explanation rather than assuming a failed drawing.
4. Inspect Learning history. Confirm both dimensioning-help requests and the clarification record. Change the explanation preference and ask again.
5. Close and reopen Leqad. Confirm recent chat text is gone, bounded topic history remains, and a new question can use that history without a proficiency claim.
6. Remove a history record, then clear history. Reopen and confirm deletion. Lesson progress must remain unchanged.
7. Cancel a pending question. Confirm no late answer appears. Retry an error and confirm one history entry per question.
8. Check light/dark themes, keyboard focus, 365 × 600 and 320 × 400 at 200% text. Send, Cancel, Retry and Back to lesson must remain reachable.
9. Check window selection, pause, disconnect and reload. Screen access remains off. A tutor answer must never mark a lesson step done.

## Evidence limits

Automated provider tests use injected mocks and make no real API calls. UI examples using a test bridge must display **Test provider · simulated responses**. Those examples do not establish answer quality or live provider availability. Windows CI uses Windows Server; owner Windows 10/11 and live API acceptance remain separate.

The profile is local application data at `%APPDATA%\Leqad\learner-profile.json`. It contains only validated topic/clarification records and the selected preference. Delete it while Leqad is closed to reset memory manually. The separate `desktop-state.json` contains existing lesson/preferences data and is unaffected by tutor history deletion.
