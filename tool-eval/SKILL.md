---
name: tool-eval
description: Evaluate a tool, app, library, service, or repo — what it does, what it doesn't, why it exists, how healthy it is, and how it compares to alternatives. Produces a report with the TL;DR and verdict up front. Use when asked to "evaluate <tool>", "what does <tool> do and why do we need it", "should we use <tool>", "compare <tool> to <alternative>", "review this repo/tool", or /tool-eval.
user-invocable: true
argument-hint: "<tool name | GitHub URL | package name | local repo path> [vs <alternative>]"
---

# Tool Eval

Evaluates a tool, app, library, or repo the way a skeptical senior engineer would before recommending it to the team. The reader may have **no idea what the tool is or why anyone needs it** — the report must work for that reader: plain language, the problem it solves stated before the features, and a comparison against the alternatives (including "what we'd do without it").

**The TL;DR and verdict always come first.** Everything after is supporting detail for readers who want it.

## Step 1 — Identify the subject

Parse `$ARGUMENTS` to figure out what you're evaluating and where to look:

- **Local path** (exists on disk) → a repo/app checkout. Primary evidence is the code and docs themselves.
- **GitHub URL or `owner/repo` slug** → fetch the repo. Use `gh repo view <slug>` / `gh api` when `gh` is available; otherwise WebFetch the repo page, README, and releases.
- **Package name** (npm, PyPI, crates, etc. — infer the ecosystem from context) → registry page for metadata, then the linked repo/docs.
- **Product or service name** (no URL, not a package) → WebSearch first ("what is X", "X docs", "X alternatives"), then the official site and docs.
- **`X vs Y`** → evaluate X as the subject and treat Y as a required entry in the alternatives comparison.

If the argument is empty and there's no obvious subject from the conversation, ask one short question: "What tool/app/repo should I evaluate?" Then proceed.

## Step 2 — Gather evidence

Collect enough to answer every section of the report. Adapt to the subject type; keep it proportionate — this is an evaluation, not a full audit.

**For any subject:**
- README / landing page / docs — what it claims to do, quickstart, examples.
- License, pricing model (free/OSS, freemium, paid, open-core).
- Maintenance signals: last release, release cadence, last commit, open vs closed issues, number of active maintainers, backing org.
- Adoption signals: stars/downloads/usage, who uses it, ecosystem (plugins, integrations, community).
- WebSearch for third-party views: "X alternatives", "X vs <closest competitor>", recent (last ~12 months) reviews, HN/Reddit threads, migration/regret posts. Marketing copy and third-party experience often diverge — you want both.

**For a local repo or GitHub repo, additionally:**
- Package manifest / entry points (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, Dockerfile, CLI definitions) — what it actually exposes: binaries, exports, APIs, services.
- Skim the top-level structure and any `docs/` folder. Run `--help` on a CLI if it's cheap and safe. Do **not** deep-read the whole codebase.
- `git log --oneline -20` and tags for real activity (for local repos).

**Stop condition:** once you can state the problem it solves, 3–5 concrete capabilities, 2–3 real limits, and 2–4 alternatives, stop gathering and write.

## Step 3 — Answer the core questions

Work these out explicitly before writing — they are the substance:

1. **The problem** — what pain exists without this tool? What would someone do instead (by hand, with a script, with a built-in, with a tool they already have)? If you can't state the problem crisply, that itself is a finding — say so.
2. **What it does** — concrete capabilities, in plain language. Not the marketing feature list; what you'd actually use it for.
3. **What it does NOT do** — explicit non-goals, known limitations, things people commonly assume it does but it doesn't. This section is where most evaluation value lives; never leave it thin.
4. **How it works** — one short paragraph of mechanism (agent? CLI? SaaS? library? sidecar?), just enough to reason about fit, ops burden, and lock-in.
5. **Who it's for** — team size, stack, use-case profile where it shines; where it's overkill or a poor fit.
6. **Health** — maintained? bus factor? license risk? breaking-change history? Would you bet a project on it?

## Step 4 — Consider alternatives

Identify 2–4 credible alternatives and compare honestly:

- Always include the **null alternative**: doing without it (manual process, shell script, platform built-in). Many tools don't beat "nothing."
- Include the **incumbent** if the user's context suggests one (something already in their stack that overlaps). If evaluating for this codebase/org, check what's already in use before recommending an addition.
- For each alternative: how it differs in approach, where it wins, where the subject wins.
- If the user gave `X vs Y`, make that comparison the centerpiece.

## Step 5 — Verify before reporting

- Distinguish **verified facts** (seen in docs/code/registry) from **claims** (the project's own marketing) from **inference** (your read). Don't launder marketing into fact.
- Cross-check anything load-bearing: a headline feature against the docs, "actively maintained" against the actual commit/release dates.
- If something important couldn't be verified (paywalled docs, sparse info), say so in the report rather than guessing.

## Step 6 — Report

Output a single markdown report. **TL;DR and verdict first**, details after:

```
## Tool Eval — <name>

**TL;DR:** <2–4 sentences a busy reader can stop after: what it is in plain
language, the problem it solves, the strongest alternative, and your verdict.>

**Verdict:** Adopt · Trial · Hold · Skip — <one-sentence reason>

### The problem it solves
<What hurts without it, and what people do instead. If the need is niche or
dubious, say so plainly.>

### What it does
- <concrete capability>
- ...

### What it doesn't do
- <limit, non-goal, or common misconception>
- ...

### How it works
<One short paragraph: form factor, mechanism, ops/lock-in implications.>

### Alternatives
| Option | Approach | Wins | Loses |
|---|---|---|---|
| <subject> | ... | ... | ... |
| <alt 1> | ... | ... | ... |
| Do nothing / built-in | ... | ... | ... |

<A sentence or two of prose steering the comparison — the table alone
doesn't carry judgment.>

### Health & maturity
| Signal | Value |
|---|---|
| License | ... |
| Latest release / activity | ... |
| Maintainers / backing | ... |
| Adoption | ... |

### When to use it / when not to
- **Use it when** ...
- **Skip it when** ...

### Caveats
<What you couldn't verify, assumptions made, how fresh the info is.>
```

Verdict scale: **Adopt** (clear win, healthy, use it) · **Trial** (promising — pilot it on something low-stakes) · **Hold** (interesting but immature/risky — watch it) · **Skip** (an alternative or "nothing" is better).

## Important notes

- **Write for the reader who doesn't know the space.** Spell out the category ("a terminal multiplexer — keeps sessions alive when SSH drops") before any jargon. The whole reason this skill exists is "I'm looking at a tool and can't tell what it does or why it's needed."
- **"What it doesn't do" is mandatory** and must be substantive — it's the difference between an evaluation and a book report.
- **Be willing to say "you don't need this."** A verdict of Skip with a pointer to the simpler alternative is a successful evaluation.
- **Date-stamp your judgment.** Health and comparison claims rot; note when the evaluation was done and flag anything based on stale sources.
