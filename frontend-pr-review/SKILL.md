---
name: frontend-pr-review
description: Review a frontend pull request against OpenTeams conventions — general code correctness, React/TypeScript frontend craft, accessibility, correct use of Nebari design components/utils/theme, no hard-coded colors or styling, no stray console logs, and flagging dead commented-out code and TODOs. Use when asked to "review this frontend PR", "review the frontend changes", "/frontend-pr-review", or to check a React/TS diff before merge.
user-invocable: true
argument-hint: "[PR number | PR url | branch | (blank = working diff)]"
---

# Frontend PR Review

Reviews a frontend pull request the way an OpenTeams frontend reviewer would: correctness first, then craft, accessibility, and design-system discipline. Produces a **structured, severity-ranked report with `file:line` anchors** — not a vague summary.

This skill governs *reviewing*. It leans on two skills for the "what good looks like" baseline — read them when a dimension needs the canonical rule:
- **`frontend-dev`** — the React + TS + Vite + Tailwind v4 + shadcn conventions, folder/naming, TanStack Query vs Jotai, the quality gate.
- **`nebari-ui`** — the `@nebari` registry, semantic theme tokens, `cn()`, `render`-prop composition, motion tokens, "treat installed `ui/*` as managed".

For deeper design/UX/a11y critique of a specific view, `impeccable` is the specialist; for pure logic-bug hunting on the diff, the built-in `code-review` skill goes deeper. This skill is the frontend-specific gate that ties them together.

## Step 1 — Get the diff

Confirm you're in the project repo (the working dir may be a parent folder — `cd` into the app if needed), then get the changes. Pick based on the argument:

- **PR number / URL** → `gh pr diff <n>` for the patch and `gh pr view <n>` for title/description. `gh pr checkout <n>` if you need to run the build/tests.
- **Branch name** → `git diff <base>...<branch>` (base is usually `main`/`master` — check the repo).
- **No argument** → review the working diff: `git diff HEAD` plus untracked files (`git status`).

Also read the full current version of each changed file, not just the hunk — a hunk hides whether a `console.log` is inside a debug guard, whether an import is now unused, whether the token exists in the theme. Review context, not just the `+` lines.

## Step 2 — Confirm the project's actual conventions

Don't assume the org defaults apply — verify against the repo (this mirrors `frontend-dev`'s "First Moves"):

- `package.json` — scripts, React/Router/Tailwind versions, Biome vs ESLint.
- `components.json` — shadcn config; **is the `@nebari` registry registered?** If so, Nebari rules apply.
- `vite.config.ts` / `tailwind.config.*` — Tailwind v4 (CSS-first) vs v3.
- `src/index.css` / `globals.css` — the **defined semantic tokens**. This is your allowlist for "is this color a real token or a hardcode?".
- `biome.json` — so a "lint" comment is a real finding, not a style opinion the tooling already owns.

## Step 3 — Review across every dimension

Work the full checklist in **`references/checklist.md`** — read it now; it's the substance of the review. The dimensions:

1. **General code review** — correctness, error/loading/empty states, dead code, prop/type sanity, no `any`, security (no secrets, `dangerouslySetInnerHTML`, unsanitized input).
2. **Frontend craft** (`frontend-dev`) — folder/naming/barrel structure, TanStack Query vs Jotai (no server data in atoms, no `useEffect` fetching), hooks rules, co-located tests, no hand-edits to `src/components/ui/`.
3. **Accessibility** — semantic HTML, labels, keyboard/focus, roles, alt text, contrast, `motion-safe:` gating. See the a11y section of the checklist.
4. **Nebari design system** (`nebari-ui`) — use existing components/variants over hand-rolled primitives; `render` prop over rewrapping; `cn()` for class merging; installed `ui/*` treated as managed (not edited in place); motion via tokens.
5. **No hard-coded colors or styling** — flag any raw hex/`rgb()`/`hsl()`, named Tailwind colors (`bg-white`, `text-gray-900`, `border-slate-200`), inline `style={{ color: ... }}`, and `dark:` variants that duplicate what a token already flips. Every color must be a semantic token defined in Step 2.
6. **No stray `console.*`** — flag `console.log/debug/info` left in. `console.error`/`warn` in real error paths are usually fine; call out the distinction.
7. **Dead commented-out code & TODOs** — flag commented-out code blocks and `TODO`/`FIXME`/`XXX`/`HACK`. Distinguish a tracked, actionable TODO (has an issue ref) from a vague one that should be resolved or removed before merge.

Only flag what the **diff introduces or touches**. Pre-existing issues in unchanged code are out of scope unless the change makes them materially worse — if you mention them, mark them `[pre-existing]`.

## Step 4 — Verify before reporting

Don't report from pattern-matching alone. For each candidate finding, confirm it against the actual code:
- A "hardcoded color" — is it truly not a token? (Some tokens *are* defined as hsl values in the theme file; those are the definition, not a violation.)
- A "console.log" — is it behind an `import.meta.env.DEV` guard or a logger util? Then it may be fine.
- A "missing label" — is there an `aria-label`, `aria-labelledby`, or wrapping `<label>` elsewhere in the file?

Drop anything you can't substantiate. A short, correct review beats a long, noisy one.

## Step 5 — Report

Output a single markdown report. Group by severity, most severe first; within each, anchor every item to `file:line` and give the fix, not just the complaint.

```
## Frontend PR Review — <PR title / branch>

**Verdict:** Approve · Approve with nits · Request changes
<one-sentence rationale>

### 🔴 Blocking
- `src/components/UserCard/UserCard.tsx:42` — Hardcoded `bg-white`; use `bg-background` (token defined in index.css). Breaks dark mode.

### 🟡 Should fix
- `src/hooks/useUser.ts:12` — Server response copied into a Jotai atom; let TanStack Query own it (frontend-dev).

### 🟢 Nits / optional
- `src/pages/Home/Home.tsx:88` — Stray `console.log("here")`; remove.

### ✅ Looks good
- <what the PR does well — call it out; reviews aren't only for problems>
```

If you were asked to post the review to the PR (or the user says "leave comments"), use `gh pr review` / `gh pr comment` — but only after showing the report and getting a go-ahead, since that's outward-facing.

## Severity guide

- **🔴 Blocking** — breaks correctness, dark mode, or a11y; edits managed `ui/*`; leaks a secret; ships obviously dead code as a feature.
- **🟡 Should fix** — convention violations with real consequences (state in the wrong place, `any`, missing loading/error state, hardcoded styling that happens to look right in light mode).
- **🟢 Nit** — stray logs, lone TODOs, naming, a cleaner component/variant that already exists.
