---
name: github-issue
description: Generates well-structured GitHub issue markdown for feature/task issues (title, Summary, Motivation, Acceptance Criteria, Out of Scope) and bug reports (title, Description, Steps to reproduce, Expected behavior, Environment, Additional context). Triggers on /github-issue, "write a github issue", "draft an issue", "generate issue markdown", "create a github issue for", "write a bug report", "file a bug".
argument-hint: [--bug|--feature] <what the issue is about>
allowed-tools:
  - Read
  - Write
  - Bash
---

You are generating markdown for a GitHub issue. Produce clean, well-structured markdown that follows the selected template exactly. Your job is to turn the user's description into a complete, reviewable issue — not to ask a long series of questions first.

## Input

`$ARGUMENTS` is a free-form description of the feature, task, change, or bug the issue should cover. It may be a single sentence ("add Biome for linting", "deploy crashes when config has no cluster block") or a detailed paragraph. The user may also reference the current repository, paste a stack trace, or paste existing notes.

An optional leading flag forces the issue type:

- `--bug` — use the bug report template.
- `--feature` (or `--task`) — use the feature/task template.

If `$ARGUMENTS` is empty, ask the user one short question: "What should the issue be about?" Then proceed once they answer.

## Step 1 — Pick the issue type

If a flag was given, use it. Otherwise infer the type from the description:

- **Bug** when the request describes something that is broken, crashes, errors, regresses, or behaves differently from what was expected — look for words like "bug", "broken", "fails", "crash", "error", "traceback", "regression", "doesn't work", "wrong", "unexpected", or a pasted stack trace / error message.
- **Feature/task** (the default) for everything else — new functionality, refactors, tooling changes, chores, docs, improvements.

If it is genuinely ambiguous (e.g. "the login page is slow" could be a bug or a performance improvement), default to **feature/task** and state the choice in the assumptions line after the output. Do not ask.

## Step 2 — Read the template and example

Read the two skill-relative files for the chosen type (resolve paths relative to `~/.claude/skills/github-issue/`):

| Type | Template | Example |
|---|---|---|
| Feature/task | `assets/issue-template.md` | `assets/example.md` |
| Bug | `assets/bug-template.md` | `assets/bug-example.md` |

The template gives the exact section structure; the example shows the expected tone, density, and formatting.

## Step 3 — Gather just-enough context (optional)

Only if it makes the issue materially better and the info is cheap to get:

- If the working directory is a git repo and the issue is about this codebase, you may inspect relevant files (e.g. `package.json`, config files, existing tooling, the code path named in a traceback) to make the content concrete and accurate. Keep this lightweight — a few reads, not a full audit.
- For bugs, if the user pasted a traceback or error, use it verbatim in the Description; if they named a command that failed, put that exact command in Steps to reproduce. You may fill in the Environment from cheap local facts (e.g. `uname`, `python --version`, the project's version file) **only** when the bug is clearly about the current machine/repo — otherwise leave placeholders for the user to fill in.
- Do **not** block on questions. Make reasonable, clearly-stated assumptions instead. If a critical detail is genuinely ambiguous, ask at most one focused question.

## Step 4 — Generate the markdown

### Feature/task issues

Write the issue using exactly these sections, in this order:

- `## <Title>` — H2 heading. Action-oriented and concise (e.g. "Add Biome for Formatting & Linting"). This is the issue title; everything below is the body.
- `### Summary` — 1–3 sentences. What the issue proposes and its scope. Link tools/libraries with markdown links. State which parts of the codebase it touches.
- `### Motivation` — bullet list. One specific reason or benefit per bullet.
- `### Acceptance Criteria` — GitHub task-list checkboxes (`- [ ]`). Each item must be concrete and independently verifiable — prefer commands, files, or observable behavior over vague goals.
- `### Out of Scope` — bullet list of explicitly excluded work, with pointers to what handles it instead where relevant.

### Bug reports

Write the issue using exactly these sections, in this order (mirrors the `bug_report.yml` form fields, rendered as plain markdown):

- `## [BUG] - <Title>` — H2 heading with the literal `[BUG] - ` prefix. The title names the defect concretely: the command/page, the symptom, and the trigger where known (e.g. "`nebi deploy` fails with `KeyError: 'namespace'` when `--config` omits the `cluster` block"). Avoid vague titles like "Deploy broken".
- `### Description` — 1–3 sentences: what happened, where, and the impact. If there is an error message or traceback, include it verbatim in a fenced code block directly under the prose.
- `### Steps to reproduce` — numbered list. Each step is a single concrete action (exact command, page, click). The last step states the observed result.
- `### Expected behavior` — what should have happened instead, specific enough that a fix can be verified against it.
- `### Environment` — bullet list of `- Key: value` lines. Always include `OS` and the project's version (name it after the project, e.g. `Nebi version`); add others that plausibly matter (browser, runtime version, install method, cluster tooling). Use placeholders like `<fill in>` rather than guessing values you cannot verify.
- `### Additional context` — bullet list: logs, screenshots, related issues/PRs, workarounds tried, narrowing observations. Omit the section entirely if there is nothing useful to add.

### Formatting rules (both types)

- Use the section headings verbatim for the chosen template.
- Wrap commands, filenames, config keys, and package names in backticks.
- Keep bullets tight — a single claim each. No filler.
- Omit a section only if it is genuinely not applicable; prefer to fill every section the template defines.

## Step 5 — Output

By default, print the generated markdown directly in your reply inside a single fenced ```markdown code block so the user can copy it cleanly. Note the chosen issue type (if inferred) and any assumptions you made in one short line after the block.

Then offer the follow-up actions (do not perform them unless the user asks):

- Save to a file (e.g. `gh-issue.md`).
- Create the issue with `gh`: `gh issue create --title "<title>" --body-file <file>` (the title is the `##` heading text without the `##`; the body is everything below it). For bug reports, also pass `--label "type: bug"` if that label exists in the target repo. Only run this if the user explicitly asks and `gh` is available.

## Important Notes

- **Read the template and example first** — do not generate from memory; match their structure and tone.
- **Pick one template and stick to it** — never mix feature sections (Motivation, Acceptance Criteria) into a bug report or bug sections (Steps to reproduce, Environment) into a feature issue.
- **Title comes from the `##` heading** — when creating the issue via `gh`, strip the leading `## ` and use the rest as `--title` (keep the `[BUG] - ` prefix for bugs); use the remaining sections as the body.
- **Don't invent reproduction details** — for bugs, only list steps and environment facts the user gave you or you verified locally; use placeholders for the rest.
- **Don't over-interrogate** — generate a strong draft from what you're given, state assumptions, and let the user refine.
