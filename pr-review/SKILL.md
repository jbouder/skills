---
name: pr-review
description: Review a pull request in depth with a panel of three independent sub-agent reviewers, verify their findings, and produce a standalone HTML report with a consolidated recommendation, GitHub permalinks and diff excerpts for every cited line, a map of where the change is, and screenshots of the running app when the UI changed. Then, on approval, push a GitHub change request with inline comments on the chosen findings and a short review body, with no severity labels on anything posted. Language-agnostic, with a frontend lens that switches on automatically for React/TS diffs — OpenTeams conventions, accessibility, correct use of Nebari design components/utils/theme, no hard-coded colors or styling, no stray console logs, dead commented-out code and TODOs. Use when asked to "review pr <n>", "review this PR", "review this frontend PR", "review the frontend changes", "check this React/TS diff before merge", "give me a review report for this PR", "/pr-review", or to gate a PR before merge.
user-invocable: true
argument-hint: "[PR number | PR url | branch | (blank = working diff, or ask which PR)] [--quick] [--no-shots] [--out <dir>]"
---

# PR Review

A two-phase review loop. **Phase 1** reviews the PR with three independent reviewers, verifies what they found, and writes a standalone HTML report that ends in one consolidated recommendation. **Phase 2** — only after the user says go — pushes a GitHub review with inline comments on the blockers.

The two phases are separate on purpose. Pushing a review is outward-facing and hard to retract: it notifies the author, it shows up in their queue, and a wrong finding published inline costs them real time. Never merge the phases, and never push in the same turn as the report unless the user's request explicitly asked for both up front.

What ships with the skill:

- `scripts/pr-data.mjs` gathers the PR's facts into `pr.json` and saves `pr.diff`.
- `scripts/screenshot.mjs` captures the running app.
- `scripts/build-report.mjs` and `assets/report-template.html` build `report.html`.
- `references/review-panel.md`, `references/screenshots.md`, `references/report.md`, `references/frontend-checklist.md` and `references/github-review-api.md`. Read each when its step says to.

`<skill-dir>` below is the folder this file is in.

## Phase 1 — Review

### 1. Orient

Pick the target from the argument:

- **PR number / URL** → the normal path. From inside the repo's clone:
  ```bash
  node <skill-dir>/scripts/pr-data.mjs <n>          # add --out <dir> if the user named one
  ```
  It prints the title, author, size, checks, and whether UI files changed. It writes `pr.json` and `pr.diff` to the out dir, `~/pr-reviews/<owner>-<repo>-pr-<n>/` by default, and fetches the PR head so `git show <headSha>:<path>` works without touching the user's checkout. Everything this review produces goes in that out dir, outside the repo, so nothing shows up in `git status`.

  `pr.json` is the source for the facts you will need all the way through: `headSha`, `baseSha`, `fromFork`, each file's `kind` (product, tests, generated, docs), `areas`, `uiChanged` and `uiFiles`, and `size.tier`. If a repo keeps generated code somewhere the script does not recognize, rerun with `--generated '<regex>'` so the size numbers are honest.
- **Branch name** → `git diff <base>...<branch>` (base is usually `main`/`master` — check the repo). If the branch has an open PR (`gh pr list --head <branch>`), switch to the PR path.
- **No argument** → if the user is clearly asking about a PR, ask which one. If they're asking about their own changes, review the working diff: `git diff HEAD` plus untracked files from `git status`.

Branch and working-diff reviews have no PR to link to or push to. Review them with a single direct pass, report in the terminal using the finding rules in step 7, and stop. The panel, the HTML report and Phase 2 are for PRs.

Read the PR body properly (`body` in `pr.json`). A well-written description tells you what the author already knows is risky, what they tested, and what they deliberately deferred — all of which shapes where to look. A description claiming a defect class was already found and fixed is a hint to check whether the fix is complete, not a reason to skip that area. Check the description against the commits too: on a long-running PR it is often stale, and that is worth a line in the report.

Make sure you're in the right repo — the working dir may be a parent folder; `cd` into the app if needed.

### 2. Decide whether the frontend lens applies

Turn it on when the diff touches `.tsx`/`.jsx`/`.ts`/`.css` under a frontend app, or the repo (or a monorepo package the diff touches) has a `components.json` or `vite.config.*`. A PR that touches both a backend and a frontend gets both treatments — run the frontend lens on the frontend files only.

When it's on, confirm the project's actual conventions before reviewing — don't assume the org defaults apply:

- `package.json` — scripts, React/Router/Tailwind versions, Biome vs ESLint.
- `components.json` — shadcn config; **is the `@nebari` registry registered?** If so, Nebari rules apply.
- `vite.config.ts` / `tailwind.config.*` — Tailwind v4 (CSS-first) vs v3.
- `src/index.css` / `globals.css` — the **defined semantic tokens**. This is your allowlist for "is this color a real token or a hardcode?".
- `biome.json` — so a "lint" comment is a real finding, not a style opinion the tooling already owns.

The canonical "what good looks like" lives in two skills — read them when a checklist item needs the full rule: **`frontend-conventions`** (structure, naming, TanStack Query vs Jotai, the quality gate) and **`nebari-ui`** (the `@nebari` registry, theme tokens, `cn()`, `render`-prop composition, motion tokens, managed `ui/*`). For deeper design/UX critique of a specific view, `impeccable` is the specialist.

### 3. Start the reviewer panel

Every PR review gets three independent reviewers, each with one lens: **correctness and behavior**, **security and data**, and **tests and contracts**. Read **`references/review-panel.md`** now. It has the brief to send, the format they return, and the rules for consolidating.

Launch all three in one message so they run in parallel, and don't duplicate their work while they run. Keep your own suspicions out of their briefs: a reviewer handed a hypothesis returns it confirmed, and the point of three reviewers is three independent reads.

When `size.tier` is `large`, the diff is too big to read evenly. Tell each reviewer which areas hold the product code (from `areas` in `pr.json`) and to skip generated files, and plan to include a reading order in the report.

**`--quick`**: skip the panel and do a single direct pass yourself (plus the frontend checklist if it applies). Set `"mode": "quick"` in the report, which then says it was a quick pass and blockers weren't reproduced.

### 4. While they work: the frontend checklist

If the frontend lens is on, work **`references/frontend-checklist.md`** against the frontend files — read it now; it's the substance of the frontend review. Read the full current version of each changed file, not just the hunk: a hunk hides whether a `console.log` is inside a debug guard, whether an import is now unused, whether the token exists in the theme. Its seven dimensions:

1. **General code** — error/loading/empty states, no `any`, nullability, duplication, frontend security (`dangerouslySetInnerHTML`, `target="_blank"`).
2. **Frontend craft** — folder/naming/barrels, TanStack Query vs Jotai, no `useEffect` fetching, hook rules, co-located tests, no hand-edits to `src/components/ui/`.
3. **Accessibility** — semantic HTML, accessible names, keyboard/focus, forms, ARIA, contrast, `motion-safe:` gating.
4. **Nebari design system** — reuse existing components/variants, `render` prop over rewrapping, `cn()`, managed `ui/*`, motion tokens.
5. **No hard-coded colors or styling** — raw hex/`rgb()`/`hsl()`, named Tailwind colors, inline color styles, hand-added `dark:` patches. The test: would it render correctly in dark mode without change?
6. **No stray `console.*`** / `debugger` / `alert()`.
7. **Commented-out code & TODOs** — dead blocks, untracked `TODO`/`FIXME`, placeholder content.

Frontend findings you raise here go through step 6 like the reviewers' do. In the report, leave `raisedBy` off them.

### 5. While they work: screenshots of the running app

When `pr.json` says `uiChanged: true`, the report includes screenshots of the changed screens rendered from the PR's code. Read **`references/screenshots.md`** and follow it: a scratch worktree at the PR head, the cheapest way to run the UI (a mock mode if the project has one), `scripts/screenshot.mjs`, then look at every image before it goes in the report.

This runs the PR's code on the user's machine. If `fromFork` is true or the author is outside the user's team, ask first.

Skip this step when no UI files changed or the user passed `--no-shots`. If the app can't be started in a reasonable time, don't sink the review into it: record what you tried in `screenshotsNote` and move on. The report says "Not captured" with your reason, which is honest and still useful.

What you see in the screenshots is review input too. A clipped column or a broken dark theme is a finding once you have located it in the code.

### 6. Verify the findings yourself — do not relay unchecked

Subagent findings are input, not output. Both times this process has run, the returned findings contained at least one claim that needed correcting before it was safe to relay. Check each finding cheaply before it goes in the report:

- **Does the file exist, and is it actually in the diff?** A finding may cite a real defect located in *unchanged* code. That is still a legitimate finding when the PR causes it (e.g. this PR canonicalizes emails at the store boundary, and an untouched `findMember` still compares exactly) — but say so explicitly, because it changes where the fix goes and it can't be anchored inline. Otherwise, pre-existing issues are out of scope unless the change makes them materially worse; tag any you mention `[pre-existing]`.
- **Do the line numbers resolve?** `git show <head-sha>:<path> | sed -n '<n>p'` — cite lines from the PR head, not from your checked-out branch.
- **Are "X does not exist" claims true?** grep for it. Watch zsh globbing: `grep -rn "Foo" .` not `grep -rn "Foo" --include=*.go .` (zsh expands the glob and the command fails with `no matches found`).
- **Does the reproduction actually reproduce?** If the subagent describes a repro, the described mechanism must match what the code does. A repro that depends on a code path that isn't there is a dead finding.

Frontend findings come from pattern-matching, so they need their own check:

- **A "hardcoded color"** — is it truly not a token? Tokens are often *defined* as hsl/oklch values in the theme file; that's the definition, not a violation.
- **A "console.log"** — is it behind an `import.meta.env.DEV` guard or a logger util? Then it may be fine.
- **A "missing label"** — is there an `aria-label`, `aria-labelledby`, or wrapping `<label>` elsewhere in the file?

Drop what doesn't hold. Correct what's half-right. A finding you can't substantiate is worse than no finding, because it costs the author a round trip to disprove.

While verifying, also check two things the review usually misses:

- **Migration/version-number collisions** with other open branches (`ls` the migrations dir on both branches — goose and most migration tools error on duplicate versions, so whichever merges second must renumber).
- **Structural merge conflicts** with the branch you're on or other open PRs — a PR built on a type or field another open PR deletes is a rewrite, not a textual merge. Worth a line even though it isn't a defect.

Then consolidate the three reviews into one set of findings and one verdict, following the rules at the end of `references/review-panel.md`. You set the final severity of each finding, and the verdict comes from the findings that survived verification. The reviewers do not vote.

### 7. Report

The report is a standalone HTML file. Read **`references/report.md`** for the `review.json` format, write `<outDir>/review.json`, then:

```bash
node <skill-dir>/scripts/build-report.mjs <outDir>
open <outDir>/report.html        # macOS
```

The builder draws the size charts from `pr.json`, turns every cited `path:line` into a GitHub permalink pinned to the head commit, cuts the diff excerpt for each cited range out of the real PR diff, renders suggested fixes as diffs, and inlines the screenshots. It refuses to write the report if a cited file or line does not exist at the PR head. Fix those errors rather than working around them: they are nearly always a real mistake in the review.

What goes in the report, in the order the reader sees it:

- **Verdict and summary.** Approve or request changes, one sentence why, and what the PR does for someone who has not opened it.
- **How much there is to read, and where.** Automatic.
- **How it works** (`flow`) and **a reading order.** Optional. Worth it on a large PR, usually noise on a small one.
- **Key changes** (`keyChanges`). The two or three changes worth seeing even though nothing is wrong with them, each with its diff. On a clean PR this is most of the report.
- **The running app.** Screenshots, or why there are none.
- **Findings.** Blocking first, then should fix. Each one cites its lines, so the reader gets the permalink and the diff without leaving the page.
- **Worth knowing.** Migration-number collisions, structural conflicts with other open PRs — not defects, but the author needs them before merging.
- **What each reviewer said**, then the **consolidated recommendation** at the end: which lenses turned up something blocking, what must change before merge, and where you overruled a reviewer and why. There is no vote: each reviewer reads through one lens, so a tally would only say which lens the blocker fell in.

Rules that keep the report worth reading. They apply to every field you write:

- **Plain language first.** Write each finding so someone who did not read the diff understands it in one read. Lead with what goes wrong for the user or the system, then the cause. "Users with no orders see a crash on the dashboard" before "the reducer assumes a non-empty array".
- **Lead with the mechanism, not the severity label.** "This wraps `mcpHandler`, not `handler`, so the cap is discarded" beats "HIGH: security issue in handler wiring".
- **Cite, don't paste.** Point `refs` at the exact lines. The report quotes the real code from the diff, so retyped code in a text field is redundant at best and wrong at worst.
- **Name why CI is green** whenever it is. `TestFoo` using `DevMode: true` and thereby testing the one branch where the wrapper survives is the detail that makes the finding land.
- **Distinguish reachable from latent.** A defect gated behind a feature that hasn't shipped is real but not blocking — say which it is, and tag it `latent`. Tag defects in unchanged code `pre-existing`.
- **Keep it short.** A few sentences per field. If a finding needs a paragraph, it is probably two findings.
- **No nits.** Don't report naming preferences, formatting, wording, "could be slightly cleaner" refactors, or anything the linter/formatter already owns. If a finding wouldn't change behavior, correctness, security, accessibility, or a future reader's understanding of an invariant, leave it out entirely — not in a lower tier, not in "Worth knowing".
- **Don't pad with praise**, but do say when the PR's own hard work was right (a genuine catch in the author's review history is worth one sentence).
- **Say what was not done** in `notDone`: a flow you could not exercise, a reviewer lens you had to cover yourself, screenshots you could not take.
- If the PR is clean, say so plainly. The report is then short, and that is the right length.

Then tell the user, in the terminal, briefly:

```
PR #<n> — <title>
Verdict: Request changes · blocking findings in 2 of 3 lenses

Blocking
1. <one-line claim> — path/to/file.go:59

Should fix
2. <one-line claim> — path/to/other.ts:12

Report: <outDir>/report.html
```

One line per finding. The detail is in the report, so don't repeat it. Mention anything in `notDone` that the user would want to know before trusting the verdict.

Close by offering the push:

> Want me to push these as inline comments and request changes?

Then **stop**. Do not push yet.

The report embeds code from the repo and, if the app ran against real data, whatever was on screen. It is a local file for the user. Don't publish it or attach it anywhere unless they ask.

## Phase 2 — Push (only after approval)

Default scope: **inline comments for the blocking findings only**, a short body, and the should-fix findings left in the report. Push more only if the user asks.

**Posted comments carry no severity.** Severity ranks findings in the HTML report and decides what gets posted. It never appears on GitHub: no "Blocker:", "Should fix:", "Nit:" or emoji tiers in inline comments, and no "one blocker" counts in the body. Every comment that gets posted is one the author is expected to address, so all of them read the same way.

### The body comment stays light

The body is just the count of changes requested, nothing more:

> One change.

> Three changes.

The inline comments carry the substance. Don't describe them in the body, don't add "inline", and don't rank them. For an approval with no comments, a one-line approval is enough.

What to keep out of it: a description or re-listing of the inline findings, a summary of the PR, praise padding (no "Nice cleanup" openers, even short ones), and hedging about your own confidence. If a finding needed a caveat, the caveat belongs in that finding's inline comment.

### Inline comments stay short

Each inline comment is two or three sentences: what breaks for the user, the cause in one clause, and the fix. No severity label. No mechanism walkthrough, no evidence dump, no "why CI is green". Those stay in the HTML report.

- When the fix is a one-line change on the anchored line, end with a ```suggestion block and nothing after it. Build the suggestion from the exact line at the PR head (see the API reference), never retyped.
- When the defect lives in a file the PR does not touch, anchor on the closest related line in the diff, name the real `file:line` in the first sentence, and describe the fix in prose. No suggestion block.

Shapes that landed well (PR 257):

> This default breaks installs whose tokens carry plain names (`ops`, or a role claim). After upgrade the gateway only allows `/ops`, so the internal endpoint returns 403, while the key manager still lists the model. Please add an `upgrading.mdx` entry: role claims set `groupsClaimForm: name`, and realms issuing bare group names switch their mapper to `full.path: true`.

> With `groupsClaimForm: name` this still puts `/llm` in tokens, so private models vanish from the key manager. Follow the form:
> *(suggestion block with the one-line fix)*

> The auditor needs the same normalization. `audit/auditor.go:91` and `:141` still compare exactly, so once the userinfo lookup is built it would revoke keys from users still in `/llm`. Passing the group form to `NewAuditor` and normalizing both sides would cover it.

### Mechanics

Read **`references/github-review-api.md`** before building the payload. It has the `gh api` invocation, the payload shape, and the four gotchas that will otherwise cost a failed request each — most importantly that **an inline comment can only anchor to a line that appears inside a diff hunk**, which is not the same as a line in a changed file.

The short version:

1. Get the head SHA: `gh pr view <n> --json headRefOid -q .headRefOid`.
2. For each finding being posted, find an anchorable line in the relevant hunk (see the reference).
3. Write the payload to a JSON file in the scratchpad — never inline in the shell, the quoting will bite you.
4. `gh api repos/<owner>/<repo>/pulls/<n>/reviews --method POST --input <file>`.

### After pushing

Report back with the review URL, one line per inline comment placed, and — importantly — **any place you had to deviate**: a line you couldn't anchor and where you anchored instead, a suggestion block you had to drop, a finding you left out. The user needs to know the pushed review isn't identical to the report they approved.

## Severity guide

- **🔴 Blocking** — wrong behavior in a reachable path; a security or access-control control that doesn't apply where it claims to; data loss; a migration or startup path that can brick a deployment. Reproduce these. Frontend: breaks dark mode or a11y (an unlabeled icon-only control, a keyboard trap), edits managed `ui/*`, leaks a secret into the bundle.
- **🟡 Should fix** — real defect with a narrow trigger, a guard that silently no-ops, a documented invariant the code doesn't hold, a regression in an adjacent surface. Frontend: convention violations with real consequences — server data in a Jotai atom, `any`, a missing loading/error state, hardcoded styling that happens to look right in light mode.
  Also 🟡: a defect latent behind an unshipped feature, and a stale comment that is the *stated rationale* for a workaround (the next reader will reason from a false invariant). Frontend: stray `console.log`/`debugger`, dead commented-out code, a TODO marking something incomplete in the code being merged.

There is no minor/nit tier. Anything below 🟡 — naming, style, cosmetic doc drift, "use this slightly nicer variant", ergonomics-only limits — is dropped, not reported.
