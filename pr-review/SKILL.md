---
name: pr-review
description: Review a pull request in depth, report severity-ranked findings with verified evidence, then on approval push a GitHub change request with inline comments on the blockers and a short review body. Use when asked to "review pr <n>", "review this PR", "/pr-review", or to gate a PR before merge. Language-agnostic — for React/TS-specific convention checks use frontend-pr-review instead.
user-invocable: true
argument-hint: "[PR number | PR url | (blank = ask which PR)]"
---

# PR Review

A two-phase review loop. **Phase 1** produces a verified, severity-ranked report in the terminal. **Phase 2** — only after the user says go — pushes a GitHub review with inline comments on the blockers.

The two phases are separate on purpose. Pushing a review is outward-facing and hard to retract: it notifies the author, it shows up in their queue, and a wrong finding published inline costs them real time. Never merge the phases, and never push in the same turn as the report unless the user's request explicitly asked for both up front.

## Phase 1 — Review

### 1. Orient

```bash
gh pr view <n> --json title,body,author,state,baseRefName,headRefName,additions,deletions,changedFiles,url
gh pr diff <n> --name-only
```

Read the PR body properly. A well-written description tells you what the author already knows is risky, what they tested, and what they deliberately deferred — all of which shapes where to look. A description claiming a defect class was already found and fixed is a hint to check whether the fix is complete, not a reason to skip that area.

### 2. Run the deep review

Invoke the built-in **`code-review`** skill with the PR number. It reads the full diff, builds the branch in a scratch worktree, and writes throwaway reproduction tests to confirm suspicious paths — which is what separates a real finding from a plausible-sounding one. It runs in the background; wait for it, don't duplicate its work in the meantime.

If `code-review` is unavailable, do the review directly, but keep its standard: **every finding you report must be substantiated against the actual code**, and blocking findings should be reproduced.

### 3. Verify the findings yourself — do not relay unchecked

Subagent findings are input, not output. Both times this process has run, the returned findings contained at least one claim that needed correcting before it was safe to relay. Check each finding cheaply before it goes in the report:

- **Does the file exist, and is it actually in the diff?** A finding may cite a real defect located in *unchanged* code. That is still a legitimate finding when the PR causes it (e.g. this PR canonicalizes emails at the store boundary, and an untouched `findMember` still compares exactly) — but say so explicitly, because it changes where the fix goes and it can't be anchored inline.
- **Do the line numbers resolve?** `git show <head-sha>:<path> | sed -n '<n>p'` — cite lines from the PR head, not from your checked-out branch.
- **Are "X does not exist" claims true?** grep for it. Watch zsh globbing: `grep -rn "Foo" .` not `grep -rn "Foo" --include=*.go .` (zsh expands the glob and the command fails with `no matches found`).
- **Does the reproduction actually reproduce?** If the subagent describes a repro, the described mechanism must match what the code does. A repro that depends on a code path that isn't there is a dead finding.

Drop what doesn't hold. Correct what's half-right. A finding you can't substantiate is worse than no finding, because it costs the author a round trip to disprove.

While verifying, also check two things the review usually misses:

- **Migration/version-number collisions** with other open branches (`ls` the migrations dir on both branches — goose and most migration tools error on duplicate versions, so whichever merges second must renumber).
- **Structural merge conflicts** with the branch you're on or other open PRs — a PR built on a type or field another open PR deletes is a rewrite, not a textual merge. Worth a line even though it isn't a defect.

### 4. Report

Group by severity, most severe first. Anchor every finding to `file:line`. State the failure concretely — inputs and state → wrong outcome — and give the fix.

```
## 🔴 Blocking

**1. <one-line claim>** — `path/to/file.go:59`

<mechanism, in the code's own terms. Quote the few lines that matter.>

<the evidence: what you reproduced, and what came out. Verbatim error text
if there is one.>

<why the test suite doesn't catch it, if it doesn't — this is often the
most useful sentence in the whole review.>

<the fix, specifically.>

## 🟡 Should fix
## 🔵 Minor

## Worth knowing
<merge collisions, stale comments, doc drift — not defects, but the author
wants them.>
```

Rules that keep the report worth reading:

- **Lead with the mechanism, not the severity label.** "This wraps `mcpHandler`, not `handler`, so the cap is discarded" beats "HIGH: security issue in handler wiring".
- **Name why CI is green** whenever it is. `TestFoo` using `DevMode: true` and thereby testing the one branch where the wrapper survives is the detail that makes the finding land.
- **Distinguish reachable from latent.** A defect gated behind a feature that hasn't shipped is real but not blocking — say which it is.
- **Don't pad with praise**, but do say when the PR's own hard work was right (a genuine catch in the author's review history is worth one sentence).
- If the PR is clean, say so plainly and skip to offering an approve.

Close the report by offering the push:

> Want me to push these as inline comments and request changes?

Then **stop**. Do not push yet.

## Phase 2 — Push (only after approval)

Default scope: **inline comments for the blocking findings only**, a short body, and the minor findings left in the terminal. Push more only if the user asks.

### The body comment stays light

One to three sentences. It frames the review; it does not restate it. Good shape:

> One blocker inline — the body cap is wired so it only takes effect in dev mode, the inverse of the intent. One-word fix. Everything else I found is minor and can follow up.

What to keep out of it: a re-listing of the inline findings, a summary of the PR, praise padding, and hedging about your own confidence. If a finding needed a caveat, the caveat belongs in that finding's inline comment.

### Mechanics

Read **`references/github-review-api.md`** before building the payload. It has the `gh api` invocation, the payload shape, and the four gotchas that will otherwise cost a failed request each — most importantly that **an inline comment can only anchor to a line that appears inside a diff hunk**, which is not the same as a line in a changed file.

The short version:

1. Get the head SHA: `gh pr view <n> --json headRefOid -q .headRefOid`.
2. For each blocker, find an anchorable line in the relevant hunk (see the reference).
3. Write the payload to a JSON file in the scratchpad — never inline in the shell, the quoting will bite you.
4. `gh api repos/<owner>/<repo>/pulls/<n>/reviews --method POST --input <file>`.

### After pushing

Report back with the review URL, one line per inline comment placed, and — importantly — **any place you had to deviate**: a line you couldn't anchor and where you anchored instead, a suggestion block you had to drop, a finding you left out. The user needs to know the pushed review isn't identical to the report they approved.

## Severity guide

- **🔴 Blocking** — wrong behavior in a reachable path; a security or access-control control that doesn't apply where it claims to; data loss; a migration or startup path that can brick a deployment. Reproduce these.
- **🟡 Should fix** — real defect with a narrow trigger, a guard that silently no-ops, a documented invariant the code doesn't hold, a regression in an adjacent surface.
- **🔵 Minor** — latent behind unshipped features, comment/doc drift that would mislead a future reader, missing limits that only affect ergonomics.

Comment drift deserves more weight than it looks like it does: a stale comment that is the *stated rationale* for a workaround will make the next reader reason from a false invariant. That's a 🔵 that earns its place in the report.
