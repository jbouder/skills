---
name: web-app-audit
description: Run a full maturity audit of a web application repo and produce a scored report — security boundaries, auth and sessions, security headers, secrets/config/crypto, rate limiting and throttling, database protection, privacy and data lifecycle, logging and observability, resilience and scalability, release engineering and incident readiness, testing, CI/CD, supply chain and licensing, containers and deployment, accessibility, motion, UX polish and i18n/SEO, frontend performance, AI/LLM and agent safety, data integrity, project structure and large files, architecture, GitHub repo health, docs, and AI agent instructions. Use when asked to "audit this app", "run a web app audit", "how production-ready is this repo", "what's missing before launch", "audit security/CI/docs across the repo", or /web-app-audit.
user-invocable: true
argument-hint: "[repo path | owner/repo] [--quick] [--only <dimension,...>] [--issues]"
---

# Web App Audit

Audits a web app repository across 25 dimensions and produces a scored report:
a maturity level per dimension, severity-ranked findings with evidence, drift
between what the repo claims and what the code does, and a backlog sized to
one PR per item.

It works like a staff engineer doing a production-readiness review: read the
code, run the cheap gates, check the claims, and score what is actually there.
The question for every dimension is not "does it exist?" but "is it complete,
centralized, and guarded so it cannot quietly regress?"

The dimensions, what to check in each, and the 0–4 maturity scale are in
**`references/dimensions.md`**. Read it before Step 3; it is the substance of
the audit. The report shape is **`assets/report-template.md`**.

## Arguments

- **Path** (default: current directory) or **`owner/repo`** (clone it shallowly
  into the scratchpad first: `gh repo clone owner/repo <dir> -- --depth 200`).
- **`--quick`**: inventory, gates and a pass over the Security and Operations
  groups only. Say in the report that it was quick.
- **`--only a,b`**: audit just the named dimensions or groups (match loosely:
  "security", "privacy", "release", "ci", "perf", "integrity", "docs", "a11y",
  "structure").
- **`--issues`**: after the report, draft GitHub issues for the backlog (see
  Step 7). Never file them without approval.

## Step 1 — Inventory

Run the inventory script. It is read-only and takes seconds:

```bash
bash <skill-dir>/scripts/inventory.sh <repo-path> > <scratchpad>/inventory.md
```

It reports, as facts: stack and lockfiles, repo hygiene files, agent
instruction files, CI workflows with action-pinning and job coverage,
dependency automation, Dockerfiles (digest pins, `USER`, `HEALTHCHECK`), deploy
assets, migrations, test types, docs, grep-level code signals (headers, rate
limiting, logging, redaction, `console.*`, `innerHTML`, possible secrets),
structure and size (files per directory, longest source files, largest tracked
files, binaries over 1 MB), and GitHub settings via `gh` (branch protection,
required checks, alerts, recent run outcomes).

The counts only tell you where to look; every one still has to be read. A
non-zero "rate limiting" count can be a comment; a zero "scanning" count can
be a scanner the regex did not know.

Then read the orientation files in full: `README`, `AGENTS.md`/`CLAUDE.md`,
`CONTRIBUTING.md`, `SECURITY.md`, the manifest (`package.json`,
`pyproject.toml`), and the main CI workflow. These tell you what the project
says about itself, which Step 4 checks.

## Step 2 — Run the cheap gates

Run the project's own lint, typecheck, test and build commands (from the
manifest scripts or `CONTRIBUTING.md`), in that order, and record pass/fail with
the first meaningful error. Run them in the background if they are slow and
continue with Step 3.

Do **not** run anything that deploys, migrates a real database, pushes, needs
credentials, or starts long-lived services. Skip e2e and integration suites
unless the user asked for them or they are self-contained and fast; record
them as "not run" with the reason. If dependencies are not installed, ask
before installing.

## Step 3 — Audit each dimension

Work through every applicable dimension in `references/dimensions.md`. For each:

1. Find the implementation (grep, read the central module, follow one request
   end to end).
2. Find the guard: the test, CI job, lint rule or boot check that would fail if
   it regressed. This decides 3 versus 4.
3. Score it 0–4 and write one line of evidence with a `path:line`.
4. Record findings: gaps, bugs, inconsistencies, each with evidence, impact
   and a concrete fix.

**For a full audit, fan out.** The dimensions are independent, so spawn
subagents in parallel (one per group in `dimensions.md`: Security, Operations,
Experience, Product and code, Project health), each given the repo path, the
inventory, the gate results, its dimensions copied from `dimensions.md`, and the
instruction to return scores, evidence and findings in the template's shape,
read-only, with every claim anchored to `path:line`. Merge their results
yourself. For `--quick` or `--only`, do it inline.

Structure and size (dimension 21) deserves real reading, not a count: for each
source file the inventory lists over ~1,000 lines, open it and say whether it
is cohesive or several concerns that should be split, and name the split.

**Runtime pass for the Experience group.** Grep cannot see contrast, focus
order or Largest Contentful Paint. If the app can be started without
credentials or external services (the `run` skill, a compose file, a dev
script), start it, open the two or three main screens, and run axe and
Lighthouse against them; the `web-perf` and `impeccable` skills, if available,
go deeper. Record which pages were measured. If it cannot be started, say the
Experience scores are static-analysis only.

## Step 4 — Check for drift

The most valuable findings are often where the repo's story and its code
disagree:

- **Closed issues**: when `gh` is available, list closed issues from the recent
  window (`gh issue list --state closed --limit 200 --json number,title,labels`)
  and sample 5–10 load-bearing ones (security, CI, data protection). For each,
  confirm the code does what the title says. A closed "supply-chain scanning in
  CI" with no scanner in any workflow is a High drift finding.
- **Agent instructions and docs**: check that a sample of paths, scripts and
  rules named in `AGENTS.md`, `CONTRIBUTING.md` and the docs exist and behave as
  described.
- **Comments that name tools**: a Dockerfile comment crediting Renovate in a
  repo configured for Dependabot is drift, small but telling.

## Step 5 — Verify before reporting

Every finding must survive a second look:

- Re-open the cited `path:line` and confirm it says what the finding claims.
- For "missing" findings, search once more under other names before reporting
  absence (a rate limiter called `budget`, a header set in middleware instead
  of config, a scanner in a reusable workflow).
- Separate what the code shows from what you infer, and say which.
- Drop anything you cannot substantiate. A shorter, correct report beats a
  long one with a false High.

## Step 6 — Write the report

Fill `assets/report-template.md`: summary and top risks first, then the
scorecard with group means, ranked findings, drift, per-dimension detail,
strengths, backlog, and method/caveats.

The overall grade is the plain mean of applicable dimensions, **capped at 2.0
while any Security-group dimension is at 0 or 1**; when the cap applies, show
the uncapped mean beside it and name the dimension that triggered it. Do not
weight dimensions (see "Overall grade" in `dimensions.md`). Severity:

- **High**: exploitable or data-exposing, a production outage waiting to
  happen, or a guard that is claimed but absent.
- **Medium**: a real gap with a workaround or limited blast radius;
  inconsistency that will cause bugs.
- **Low**: polish, hygiene, documentation.

Write the report to `<repo>/web-app-audit-<YYYY-MM-DD>.md` unless the user names
another place. Do not commit it. In the terminal, print the summary, the
scorecard and the top risks, and point to the file for the rest.

If the user wants to share it, offer to publish it as an artifact page; don't
publish without being asked, since it describes security weaknesses.

## Step 7 — Backlog issues (only with `--issues` or on request)

Draft one GitHub issue per backlog item using the `github-issue` skill's
format, grouped by dimension, with suggested labels mirroring the repo's own
(`gh label list`). Show the drafts and wait for approval before
`gh issue create`. Never file issues for findings in the Security group on a
public repo; point to the private reporting channel in `SECURITY.md` instead.

## Important notes

- **Score the code, not the intent.** Open issues, plans and TODOs are level 0.
- **Read-only.** The audit never edits the repo except for writing the report
  file. Fixes are the backlog's job.
- **Proportionate scope.** A static marketing site gets N/A for most of the
  Security and Operations groups; say so in one line each rather than padding.
- **Credit what is good.** The strengths section is how the team knows which
  patterns to copy into the weaker dimensions.
- **Date-stamp it.** Record the commit SHA so a later audit can diff against
  this one. If a previous `web-app-audit-*.md` exists in the repo, read it
  first and add a "Since last audit" column to the scorecard.
