---
name: github-issue
description: Generates well-structured GitHub issue markdown (title, Summary, Motivation, Acceptance Criteria, Out of Scope). Triggers on /github-issue, "write a github issue", "draft an issue", "generate issue markdown", "create a github issue for".
argument-hint: <what the issue is about>
allowed-tools:
  - Read
  - Write
  - Bash
---

You are generating markdown for a GitHub issue. Produce clean, well-structured markdown that follows the template exactly. Your job is to turn the user's description into a complete, reviewable issue — not to ask a long series of questions first.

## Input

`$ARGUMENTS` is a free-form description of the feature, task, or change the issue should cover. It may be a single sentence ("add Biome for linting") or a detailed paragraph. The user may also reference the current repository or paste existing notes.

If `$ARGUMENTS` is empty, ask the user one short question: "What should the issue be about?" Then proceed once they answer.

## Step 1 — Read the template and example

Read these skill-relative files (resolve paths relative to `~/.claude/skills/github-issue/`):

1. `assets/issue-template.md` — the exact section structure to follow.
2. `assets/example.md` — a fully worked example showing the expected tone, density, and formatting.

## Step 2 — Gather just-enough context (optional)

Only if it makes the issue materially better and the info is cheap to get:

- If the working directory is a git repo and the issue is about this codebase, you may inspect relevant files (e.g. `package.json`, config files, existing tooling) to make the Summary and Acceptance Criteria concrete and accurate. Keep this lightweight — a few reads, not a full audit.
- Do **not** block on questions. Make reasonable, clearly-stated assumptions instead. If a critical detail is genuinely ambiguous, ask at most one focused question.

## Step 3 — Generate the markdown

Write the issue using exactly these sections, in this order:

- `## <Title>` — H2 heading. Action-oriented and concise (e.g. "Add Biome for Formatting & Linting"). This is the issue title; everything below is the body.
- `### Summary` — 1–3 sentences. What the issue proposes and its scope. Link tools/libraries with markdown links. State which parts of the codebase it touches.
- `### Motivation` — bullet list. One specific reason or benefit per bullet.
- `### Acceptance Criteria` — GitHub task-list checkboxes (`- [ ]`). Each item must be concrete and independently verifiable — prefer commands, files, or observable behavior over vague goals.
- `### Out of Scope` — bullet list of explicitly excluded work, with pointers to what handles it instead where relevant.

Formatting rules:

- Use the section headings verbatim (`### Summary`, `### Motivation`, `### Acceptance Criteria`, `### Out of Scope`).
- Wrap commands, filenames, config keys, and package names in backticks.
- Keep bullets tight — a single claim each. No filler.
- Omit a section only if it is genuinely not applicable; prefer to fill all four.

## Step 4 — Output

By default, print the generated markdown directly in your reply inside a single fenced ```markdown code block so the user can copy it cleanly. Note any assumptions you made in one short line after the block.

Then offer the follow-up actions (do not perform them unless the user asks):

- Save to a file (e.g. `gh-issue.md`).
- Create the issue with `gh`: `gh issue create --title "<title>" --body-file <file>` (the title is the `##` heading text without the `##`; the body is everything below it). Only run this if the user explicitly asks and `gh` is available.

## Important Notes

- **Read the template and example first** — do not generate from memory; match their structure and tone.
- **Title comes from the `##` heading** — when creating the issue via `gh`, strip the leading `## ` and use the rest as `--title`; use the remaining sections as the body.
- **Don't over-interrogate** — generate a strong draft from what you're given, state assumptions, and let the user refine.
