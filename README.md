# Claude Code Skills

Custom [Claude Code skills](https://docs.anthropic.com/en/docs/claude-code/skills) for OpenTeams development — scaffolding new projects, applying team conventions, reviewing code, and running local dev.

Skills install into `~/.claude/skills/` and activate automatically when their trigger conditions match, or on demand via their `/slash-command`.

## Skills

Full instructions for each skill live in its `SKILL.md`. Summary:

| Skill | What it does | Sample prompts |
|---|---|---|
| `new-project` | Scaffolds a new project in one of three layouts. `--frontend`: React + TypeScript (React 19, Vite, Tailwind v4, Nebari design system built on Base UI, React Router v6, TanStack Query v5, Jotai, Vitest, Biome) with routing, theme provider, API client, Jotai store, and test setup. `--backend`: Python FastAPI (Python 3.12, PostgreSQL 16, async SQLAlchemy 2, Alembic, Pydantic v2, pytest, Ruff, uv) with layered `app/` architecture, async migrations, `docker-compose.yml`, and pytest fixtures. `--monorepo`: both under one repo with a root `Makefile` and a `/api` dev proxy wiring them together. Infers the layout from the request when no flag is given. | `/new-project my-app --frontend` · `/new-project my-api --backend` · "scaffold a monorepo" · "create a React project" |
| `frontend-dev` | OpenTeams frontend conventions — folder structure, component/test patterns, TanStack Query + Jotai, styling with semantic tokens + `cn()`, and the Biome + Vitest gates. Applies when writing or reviewing frontend code. | "add a component to this React app" · "wire up a TanStack Query hook" · "review my frontend changes" |
| `backend-dev` | OpenTeams backend conventions — package layout, Pydantic v2 + pydantic-settings, async SQLAlchemy 2, structlog, and the ruff + mypy + pytest gate. Applies when writing or reviewing routes, models, schemas, services, or migrations. | "add a new FastAPI route" · "create a SQLAlchemy model + schema" · "write a migration" |
| `k8s-deploy` | OpenTeams Kubernetes deploy & local-dev conventions — Helm charts, Tilt + k3d/minikube inner loop, docker-compose, ArgoCD, and kubectl/k9s debugging. | "write a Helm chart for this service" · "set up a Tiltfile" · "my pods keep crashing — help debug" |
| `pr-review` | PR gate in two phases: a verified, severity-ranked report in the terminal, then — only on your go-ahead — a pushed GitHub change request with inline comments on the blockers and a short review body. Language-agnostic, with a frontend lens that switches on for React/TS diffs (OpenTeams conventions, accessibility, Nebari components and theme tokens, no hard-coded colors, stray console logs, dead code and TODOs). Accepts a PR number, URL, branch, or the working diff; `--quick` skips the deep reproduction pass. Carries the GitHub review-API mechanics and the frontend checklist in `references/`. | `/pr-review 72` · "review this frontend PR" · "gate this PR before merge" |
| `github-issue` | Generates well-structured GitHub issue markdown. Feature/task issues get Title, Summary, Motivation, Acceptance Criteria, and Out of Scope; bug reports get Title, Description, Steps to reproduce, Expected behavior, Environment, and Additional context. Infers the type from the description, or force it with `--bug` / `--feature`. | `/github-issue add dark mode toggle` · `/github-issue --bug deploy crashes on empty config` · "write a github issue" · "file a bug" |
| `tool-eval` | Evaluates a tool, app, library, or repo — the problem it solves, what it does and doesn't do, health/maturity, and how it compares to alternatives (including "do nothing"). Reports TL;DR and an Adopt/Trial/Hold/Skip verdict first. Accepts a name, GitHub URL, package name, or local repo path. | `/tool-eval owner/repo` · "evaluate this tool" · "what does X do and why do we need it" · "compare X vs Y" |
| `start-dev` | Launches one of the user's local-dev apps (`nebi`, `nebari-landing`, `nebari-chat-pack`, `jhub-apps`, `nebari-llm-serving-pack`) in its fast inner-loop mode. | `/start-dev nebi` · "start dev for nebari-landing" · "run jhub-apps locally" |
| `talk-deck` | Builds an interactive HTML slide deck for a talk — keyboard navigation, speaker notes, a timed running order, live demos with Show code toggles, takeaways and resources — with optional deep-dive and UI/UX-focus modes, a checker script, and publishing to the OpenTeams artifacts site or a claude.ai artifact. | `/talk-deck WebGPU --ux` · "make a 30 minute talk on X for the UI/UX CoP" · "add a demo slide to my deck" |
| `web-app-audit` | Runs a full maturity audit of a web app repo across 21 dimensions — security boundaries, auth, headers, secrets, throttling, database protection, observability, scalability, testing, CI/CD, pinning and versioning, containers, accessibility, motion, UX, AI/LLM safety, project structure and large files, architecture, GitHub repo health, docs, and agent instructions. Scores each 0–4 (4 = guarded by an automated check), flags drift between closed issues/docs and the code, and writes a report with ranked findings and a one-PR-per-item backlog. Ships a read-only `inventory.sh` evidence sweep. | `/web-app-audit` · `/web-app-audit --quick` · `/web-app-audit --only security,ci` · "how production-ready is this repo?" |

## Installing from this repo

Install a single skill with the [`skills`](https://docs.anthropic.com/en/docs/claude-code/skills) CLI:

```bash
npx skills add ./new-project --agent claude
```

Or install all of them:

```bash
for skill in backend-dev frontend-dev github-issue k8s-deploy \
             new-nebari-app new-project pr-review \
             start-dev talk-deck tool-eval web-app-audit; do
  npx skills add "./$skill" --agent claude
done
```

Skills are installed into `~/.claude/skills/` and activate automatically based on their trigger conditions.

## Skill structure

Each skill folder contains a `SKILL.md` (the skill definition and instructions) plus optional supporting files:

```
<skill-name>/
├── SKILL.md          # Skill definition, frontmatter, and step-by-step instructions
├── assets/           # Templates written into generated projects (e.g. AGENTS.md)
├── references/       # Detailed reference docs loaded on demand
└── scripts/          # Helper scripts invoked by the skill
```

## License

[MIT](LICENSE). Use, copy, modify, and redistribute freely.
