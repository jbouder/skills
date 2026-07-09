# Claude Code Skills

Custom [Claude Code skills](https://docs.anthropic.com/en/docs/claude-code/skills) for OpenTeams development — scaffolding new projects, applying team conventions, reviewing code, and running local dev.

Skills install into `~/.claude/skills/` and activate automatically when their trigger conditions match, or on demand via their `/slash-command`.

## Skills

### `new-frontend`

| | |
|---|---|
| **Name** | `new-frontend` |
| **Description** | Scaffolds a new React + TypeScript frontend project (React 19, Vite, Tailwind v4, shadcn/ui, React Router v6, TanStack Query v5, Jotai, Vitest). Creates the full `src/` layout, config files, routing, theme provider, API client, Jotai store, base pages, and test setup. |
| **Sample prompts** | `/new-frontend my-app` · "scaffold a new frontend" · "create a React project" · "bootstrap a frontend app" · "new React app" |

---

### `new-backend`

| | |
|---|---|
| **Name** | `new-backend` |
| **Description** | Scaffolds a new Python FastAPI backend project (Python 3.12, PostgreSQL 16, async SQLAlchemy 2, Alembic, Pydantic v2, pytest, Ruff, uv). Creates the layered `app/` architecture, Alembic async migrations, `docker-compose.yml` with dev + test Postgres, and pytest fixtures. |
| **Sample prompts** | `/new-backend my-api` · "scaffold a new backend" · "create a FastAPI project" · "bootstrap a backend app" · "new FastAPI app" |

---

### `new-monorepo`

| | |
|---|---|
| **Name** | `new-monorepo` |
| **Description** | Scaffolds a full-stack monorepo combining a React + TypeScript frontend and a Python FastAPI backend, wiring together the `new-frontend` and `new-backend` stacks under one repo. |
| **Sample prompts** | `/new-monorepo my-project` · "scaffold a monorepo" · "create a full-stack project" · "new full-stack app" |

---

### `frontend-dev`

| | |
|---|---|
| **Name** | `frontend-dev` |
| **Description** | OpenTeams frontend conventions for React + TypeScript + Vite + shadcn/ui + Tailwind v4 projects. Covers folder structure, component/test patterns, TanStack Query + Jotai, styling with semantic tokens + `cn()`, and the Biome + Vitest quality gates. Applies when writing, modifying, or reviewing frontend code in a project with a `components.json` or `vite.config`. |
| **Sample prompts** | "add a component to this React app" · "wire up a TanStack Query hook" · "how should I structure this page?" · "review my frontend changes for conventions" |

---

### `backend-dev`

| | |
|---|---|
| **Name** | `backend-dev` |
| **Description** | OpenTeams backend conventions for Python + FastAPI + async SQLAlchemy + uv projects. Covers package layout, Pydantic v2 + pydantic-settings, async SQLAlchemy 2, structlog, and the ruff + mypy + pytest quality gate. Applies when writing, modifying, or reviewing routes, models, schemas, services, config, migrations, or tests. |
| **Sample prompts** | "add a new FastAPI route" · "create a SQLAlchemy model + schema" · "add a service for X" · "write a migration for this model" |

---

### `k8s-deploy`

| | |
|---|---|
| **Name** | `k8s-deploy` |
| **Description** | OpenTeams Kubernetes deploy & local-dev conventions — Helm charts, Tilt + k3d/minikube inner loop, docker-compose, ArgoCD, and kubectl/k9s debugging. Applies when editing Helm charts, Tiltfiles, docker-compose files, or ArgoCD Applications, running a service on a cluster, or debugging a deployment. |
| **Sample prompts** | "write a Helm chart for this service" · "set up a Tiltfile" · "add an ArgoCD Application" · "my pods keep crashing — help debug" |

---

### `frontend-pr-review`

| | |
|---|---|
| **Name** | `frontend-pr-review` |
| **Description** | Reviews a frontend pull request against OpenTeams conventions — code correctness, React/TypeScript craft, accessibility, correct use of Nebari design components/utils/theme, no hard-coded colors, no stray console logs, and flags dead commented-out code and TODOs. Accepts a PR number, PR URL, branch, or the working diff. |
| **Sample prompts** | `/frontend-pr-review 123` · "review this frontend PR" · "review the frontend changes" · "check this React/TS diff before merge" |

---

### `github-issue`

| | |
|---|---|
| **Name** | `github-issue` |
| **Description** | Generates well-structured GitHub issue markdown with Title, Summary, Motivation, Acceptance Criteria, and Out of Scope sections. |
| **Sample prompts** | `/github-issue add dark mode toggle` · "write a github issue" · "draft an issue" · "generate issue markdown" · "create a github issue for …" |

---

### `start-dev`

| | |
|---|---|
| **Name** | `start-dev` |
| **Description** | Launches one of the user's local-dev apps (`nebi`, `nebari-landing`, `nebari-chat-pack`, `jhub-apps`, `nebari-llm-serving-pack`) in its fast inner-loop mode. |
| **Sample prompts** | `/start-dev nebi` · "start dev for nebari-landing" · "run jhub-apps locally" · "spin up nebari-chat-pack" · "launch nebi for local development" |

---

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
