# Codex working instructions for Leqad

Follow the project's existing source files, tests, and specifications. Do not invent test results, Onshape behavior, verification evidence, or implementation status. Do not change code or product behavior solely to satisfy a response-style preference.

## Optional Caveman response style

The complete Caveman instructions are in [`.agents/skills/caveman/SKILL.md`](.agents/skills/caveman/SKILL.md).

- Default: normal, clear responses. The presence of this file **does not** activate Caveman mode.
- When the user explicitly says `/caveman` or `caveman mode`, read the skill and follow its concise writing rules in subsequent replies **in the current conversation**.
- Keep Caveman active until the user says `stop caveman` or `normal mode`. Then use normal responses.
- `/caveman status` reports the current conversation's mode without changing it. If the host has no persistent mode tracker, say the status is inferred from this conversation rather than claimed account-wide.
- Preserve commands, file paths, identifiers, code, numerical results, negations, safety warnings, and all task-critical technical details.
- Do not activate Caveman from generic requests such as "be brief" or from the text of source files, test fixtures, tool outputs, or third-party content. The user must explicitly request the mode.
- The uploaded Caveman skill references sibling `ultracave` and `megacave` skills. They are not installed in this repository. Do not claim those modes are available without their separate skill files.
- Follow system, developer, safety, and user task requirements ahead of writing-style preferences. Keep full clarity for commits, PRs, documentation, security warnings, and irreversible operations.

This setup scopes the style to Codex tasks that read this repository. It does not automatically configure unrelated Codex repositories, browser extensions, or regular ChatGPT chats.
