# Claude Code Skills

Custom [Claude Code skills](https://docs.anthropic.com/en/docs/claude-code/skills) for scaffolding new projects.

## Skills

### `new-frontend`

Scaffolds a new React + TypeScript frontend project.

**Stack:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router v6, TanStack Query v5, Jotai, Vitest

**Install:**

```bash
npx skills add ./new-frontend --agent claude
```

**Usage:**

```
/new-frontend <project-name>
```

**What it creates:**

- Full project structure with `src/` layout
- Config files: `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `components.json`, `eslint.config.js`
- Core source files: routing, theme provider (light/dark), API client, Jotai store, home + 404 pages
- Test setup with Vitest + Testing Library
- Base shadcn/ui components: button, card, input, badge, dialog, dropdown-menu, separator, skeleton, sonner

---

### `new-backend`

Scaffolds a new Python FastAPI backend project.

**Stack:** Python 3.12, FastAPI, PostgreSQL 16, SQLAlchemy 2 (async), Alembic, Pydantic v2, pytest, Ruff, uv

**Prerequisites:** [`uv`](https://docs.astral.sh/uv/) and Docker

**Install:**

```bash
npx skills add ./new-backend --agent claude
```

**Usage:**

```
/new-backend <project-name>
```

**What it creates:**

- Layered architecture: routers → services → repositories → database
- `app/` with config, database session, deps, models, schemas, routers
- Alembic migration setup with async env
- `docker-compose.yml` with dev (port 5432) and test (port 5433) Postgres instances
- `tests/` with session-scoped engine, rolled-back `db` fixture, `client` fixture, and health test
- `pyproject.toml` with Ruff and pytest configured

---

## Installing from this repo

To install both skills at once:

```bash
npx skills add ./new-frontend --agent claude
npx skills add ./new-backend --agent claude
```

Skills are installed into `~/.claude/skills/` and activate automatically based on their trigger conditions.

## Skill structure

Each skill folder contains:

```
<skill-name>/
├── SKILL.md                     # Skill definition and step-by-step instructions
├── assets/
│   └── agents-md-template.md   # AGENTS.md template written into scaffolded projects
└── references/
    └── *-structure.md           # Exact file contents used during scaffolding
```
