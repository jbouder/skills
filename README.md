# Claude Code Skills

Custom [Claude Code skills](https://docs.anthropic.com/en/docs/claude-code/skills) for OpenTeams development — scaffolding new projects, applying team conventions, reviewing code, and running local dev.

Skills install into `~/.claude/skills/` and activate automatically when their trigger conditions match, or on demand via their `/slash-command`.

## Skills

Full instructions for each skill live in its `SKILL.md`. Summary:

| Skill | What it does | Sample prompts |
|---|---|---|
| `new-frontend` | Scaffolds a React + TypeScript frontend (React 19, Vite, Tailwind v4, Nebari design system built on Base UI, React Router v6, TanStack Query v5, Jotai, Vitest) with full `src/` layout, routing, theme provider, API client, Jotai store, and test setup. | `/new-frontend my-app` · "scaffold a new frontend" · "create a React project" |
| `new-backend` | Scaffolds a Python FastAPI backend (Python 3.12, PostgreSQL 16, async SQLAlchemy 2, Alembic, Pydantic v2, pytest, Ruff, uv) with layered `app/` architecture, async migrations, `docker-compose.yml`, and pytest fixtures. | `/new-backend my-api` · "scaffold a new backend" · "create a FastAPI project" |
| `new-monorepo` | Scaffolds a full-stack monorepo combining the `new-frontend` stack (React 19, Vite, Tailwind v4, Nebari design system built on Base UI) and the `new-backend` stack (FastAPI, async SQLAlchemy 2, Alembic, Pydantic v2) under one repo, with a root `Makefile`, `docker-compose.yml`, and a `/api` dev proxy wiring the two together. | `/new-monorepo my-project` · "scaffold a monorepo" · "new full-stack app" |
| `frontend-dev` | OpenTeams frontend conventions — folder structure, component/test patterns, TanStack Query + Jotai, styling with semantic tokens + `cn()`, and the Biome + Vitest gates. Applies when writing or reviewing frontend code. | "add a component to this React app" · "wire up a TanStack Query hook" · "review my frontend changes" |
| `backend-dev` | OpenTeams backend conventions — package layout, Pydantic v2 + pydantic-settings, async SQLAlchemy 2, structlog, and the ruff + mypy + pytest gate. Applies when writing or reviewing routes, models, schemas, services, or migrations. | "add a new FastAPI route" · "create a SQLAlchemy model + schema" · "write a migration" |
| `k8s-deploy` | OpenTeams Kubernetes deploy & local-dev conventions — Helm charts, Tilt + k3d/minikube inner loop, docker-compose, ArgoCD, and kubectl/k9s debugging. | "write a Helm chart for this service" · "set up a Tiltfile" · "my pods keep crashing — help debug" |
| `frontend-pr-review` | Reviews a frontend PR against OpenTeams conventions — correctness, React/TS craft, accessibility, Nebari component/theme usage, no hard-coded colors, no stray console logs, dead code and TODOs. Accepts a PR number, URL, branch, or the working diff. | `/frontend-pr-review 123` · "review this frontend PR" · "check this React/TS diff before merge" |
| `github-issue` | Generates well-structured GitHub issue markdown with Title, Summary, Motivation, Acceptance Criteria, and Out of Scope sections. | `/github-issue add dark mode toggle` · "write a github issue" · "draft an issue" |
| `start-dev` | Launches one of the user's local-dev apps (`nebi`, `nebari-landing`, `nebari-chat-pack`, `jhub-apps`, `nebari-llm-serving-pack`) in its fast inner-loop mode. | `/start-dev nebi` · "start dev for nebari-landing" · "run jhub-apps locally" |

## Installing from this repo

Install a single skill with the [`skills`](https://docs.anthropic.com/en/docs/claude-code/skills) CLI:

```bash
npx skills add ./new-frontend --agent claude
```

Or install all of them:

```bash
for skill in backend-dev frontend-dev frontend-pr-review github-issue \
             k8s-deploy new-backend new-frontend new-monorepo start-dev; do
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
