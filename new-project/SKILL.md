---
name: new-project
description: Scaffolds a new OpenTeams project — a React+TypeScript frontend (Vite, Tailwind v4, Nebari design system), a Python FastAPI backend (PostgreSQL, async SQLAlchemy, Alembic, pytest, uv), or a full-stack monorepo with both wired together. Not for static pages deployed through the Nebari Apps Pack — use new-nebari-app for those. Triggers on /new-project, "scaffold a new frontend", "create a React project", "new React app", "scaffold a new backend", "create a FastAPI project", "new FastAPI app", "bootstrap a frontend/backend app", "scaffold a monorepo", "create a full-stack project", "new full-stack app".
argument-hint: <project-name> [--frontend | --backend | --monorepo]
allowed-tools:
  - Write
  - Bash
  - Read
  - Glob
---

You are scaffolding a new project in one of three layouts. Follow every step below exactly and in order. Do not skip steps. Do not ask for confirmation between steps — execute everything autonomously.

| Layout | What it creates |
|---|---|
| `--frontend` | `$PROJECT_NAME/` — React 19 + TS + Vite + Tailwind v4 + Nebari + React Router + TanStack Query + Jotai + Vitest + Biome |
| `--backend` | `$PROJECT_NAME/` — Python 3.12 + FastAPI + async SQLAlchemy 2 + Alembic + Pydantic v2 + pytest + Ruff + uv |
| `--monorepo` | `$PROJECT_NAME/frontend/` + `$PROJECT_NAME/backend/` + a root `Makefile`, with the frontend's `/api` dev proxy pointed at the backend |

All paths to `references/` and `assets/` are relative to this skill's directory.

## Pre-flight Checks

1. Parse `$ARGUMENTS`: the first non-flag token is `PROJECT_NAME`; `--frontend`, `--backend` or `--monorepo` sets `LAYOUT`.
2. If `PROJECT_NAME` is empty, stop and tell the user: "Please provide a project name: /new-project <project-name> [--frontend | --backend | --monorepo]"
3. If no flag was given, infer `LAYOUT` from the request: React / frontend / Vite → `frontend`; FastAPI / backend / API service → `backend`; full-stack / monorepo / "frontend and backend" → `monorepo`. If the request doesn't say, ask which layout — this is the one question allowed before scaffolding.
4. If a directory named `$PROJECT_NAME` already exists in the current working directory, stop and tell the user: "Directory '$PROJECT_NAME' already exists. Choose a different name or remove the existing directory first."
5. For `backend` and `monorepo`: run `uv --version`. If it fails, stop and tell the user: "uv is required. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
6. Set `TARGET_DIR = <cwd>/$PROJECT_NAME` and the sub-project roots:

| Layout | `FRONTEND_DIR` | `FRONTEND_NAME` | `BACKEND_DIR` |
|---|---|---|---|
| `frontend` | `$TARGET_DIR` | `$PROJECT_NAME` | — |
| `backend` | — | — | `$TARGET_DIR` |
| `monorepo` | `$TARGET_DIR/frontend` | `$PROJECT_NAME-frontend` | `$TARGET_DIR/backend` |

---

## Step 1 — Initialize the Repository

```bash
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR" && git init
```

One `git init` only, at `$TARGET_DIR`. In a monorepo, never git-init `frontend/` or `backend/`.

---

## Step 2 — Monorepo Root Files (`monorepo` only)

Read `references/monorepo-root.md`. Replace every `{{PROJECT_NAME}}` with `$PROJECT_NAME` and write to `$TARGET_DIR/`:

1. `.gitignore`
2. `README.md`
3. `Makefile`
4. `AGENTS.md` — from `assets/agents-monorepo.md`

---

## Step 3 — Frontend Files (`frontend` and `monorepo`)

Read ALL of `references/frontend-structure.md` before writing. Replace every `{{PROJECT_NAME}}` with `$FRONTEND_NAME`. Write into `$FRONTEND_DIR/`, creating parent directories as needed.

Root files:

1. `.gitignore`
2. `README.md`
3. `AGENTS.md` — from `assets/agents-frontend.md`
4. `package.json`
5. `tsconfig.json`
6. `tsconfig.node.json`
7. `vite.config.ts`
8. `components.json` — includes the `@nebari` registry mapping
9. `biome.json`
10. `.env.example`
11. `index.html`

> Tailwind v4 needs no `tailwind.config.ts` or `postcss.config.js` (configured in `src/index.css` via `@import "tailwindcss"`), and Biome replaces `eslint.config.js`. Do not create those files.

Source files:

1. `src/main.tsx`
2. `src/App.tsx`
3. `src/index.css`
4. `src/lib/utils.ts`
5. `src/lib/api.ts`
6. `src/test/setup.ts`
7. `src/store/appAtoms.ts`
8. `src/providers/ThemeProvider/ThemeProvider.tsx`
9. `src/providers/ThemeProvider/ThemeProvider.test.tsx`
10. `src/providers/ThemeProvider/index.ts`
11. `src/pages/Home/Home.tsx`
12. `src/pages/Home/Home.test.tsx`
13. `src/pages/Home/index.ts`
14. `src/pages/NotFound/NotFound.tsx`
15. `src/pages/NotFound/NotFound.test.tsx`
16. `src/pages/NotFound/index.ts`
17. `src/components/ui/.gitkeep` — empty file
18. `src/hooks/.gitkeep` — empty file

---

## Step 4 — Backend Files (`backend` and `monorepo`)

Read ALL of `references/backend-structure.md` before writing. Replace every `{{PROJECT_NAME}}` with `$PROJECT_NAME`. Write into `$BACKEND_DIR/`, creating parent directories as needed.

Root and config files:

1. `.gitignore`
2. `.python-version`
3. `README.md`
4. `AGENTS.md` — from `assets/agents-backend.md`
5. `.env`
6. `.env.example`
7. `docker-compose.yml`
8. `pyproject.toml`
9. `alembic.ini`

App source files:

1. `app/__init__.py` — empty file
2. `app/main.py`
3. `app/config.py`
4. `app/database.py`
5. `app/deps.py`
6. `app/models/__init__.py` — empty file
7. `app/models/base.py`
8. `app/schemas/__init__.py` — empty file
9. `app/schemas/health.py`
10. `app/routers/__init__.py` — empty file
11. `app/routers/health.py`
12. `app/services/__init__.py` — empty file
13. `app/repositories/__init__.py` — empty file

Migration files:

1. `migrations/env.py`
2. `migrations/script.py.mako`
3. `migrations/versions/.gitkeep` — empty file

Test files:

1. `tests/__init__.py` — empty file
2. `tests/conftest.py`
3. `tests/test_health.py`
4. `tests/factories/__init__.py` — empty file

---

## Step 5 — Install Frontend Dependencies and Nebari (`frontend` and `monorepo`)

```bash
cd "$FRONTEND_DIR" && npm install
```

This may take 30–60 seconds. Wait for it to complete before continuing.

Then install the Nebari design-system consumer skill. The `@nebari` registry is already wired into `components.json`, so `npx shadcn add @nebari/<name>` resolves without extra setup. This pulls the `nebari-ui` skill into `~/.claude/skills/nebari-ui/`, which auto-activates when you ask to add or use Nebari components:

```bash
cd "$FRONTEND_DIR" && npx shadcn@latest add @nebari/claude-skill --yes
```

If it fails (e.g. network error), note the failure and continue.

Then add the theme **first** (it writes the Nebari brand tokens — `:root` + `.dark` CSS variables — into `src/index.css`), then the base components. `shadcn` pulls each component's `registryDependencies` (the `utils` helper, the theme) and npm dependencies (Base UI, `class-variance-authority`, `lucide-react`) automatically:

```bash
cd "$FRONTEND_DIR" && npx shadcn@latest add @nebari/theme @nebari/button @nebari/card @nebari/input @nebari/badge @nebari/dialog @nebari/select @nebari/alert @nebari/tabs --yes
```

If it fails, note the failure and continue — the app will not build until `@nebari/theme` has been added, since `src/index.css` references its tokens.

---

## Step 6 — Install Backend Dependencies (`backend` and `monorepo`)

```bash
cd "$BACKEND_DIR" && uv sync
```

This may take 30–60 seconds. Wait for it to complete before continuing.

---

## Step 7 — Verify and Report

Run:

```bash
find "$TARGET_DIR" -type f \
  | grep -v node_modules | grep -v ".git/" | grep -v ".venv/" | grep -v __pycache__ \
  | sort
```

Then print the success message for the layout, with actual values substituted. If any install step failed, say so above the message.

### `frontend`

```
✓ Scaffolded $PROJECT_NAME

Stack:
  React 19 + TypeScript + Vite
  Tailwind CSS v4 + @nebari/design (Base UI, light/dark mode)
  React Router v6
  TanStack Query v5
  Jotai (global state)
  Vitest + Testing Library + Biome

Next steps:
  cd $PROJECT_NAME
  npm run dev        → http://localhost:5173
  npm run test       → run unit tests
  npm run check      → format + lint + organize imports
  npm run build      → production build

Add more Nebari components:
  npx shadcn add @nebari/<component>     (e.g. spinner, field, label, checkbox, switch, radio-group, textarea)
  npx shadcn view @nebari/<component>    (inspect variants/props before installing)
  curl -s https://nebari-dev.github.io/nebari-design/r/registry.json   (list the catalog)

Add a new page:
  src/pages/PageName/PageName.tsx
  src/pages/PageName/PageName.test.tsx
  src/pages/PageName/index.ts
  Then add a <Route> in src/App.tsx

Add an API hook:
  src/hooks/use-<resource>.ts
  (see AGENTS.md for the TanStack Query pattern)
```

### `backend`

```
✓ Scaffolded $PROJECT_NAME

Stack:
  Python 3.12 + FastAPI + Uvicorn
  PostgreSQL + SQLAlchemy 2 (async) + asyncpg
  Alembic (migrations)
  Pydantic v2 + pydantic-settings
  pytest + pytest-asyncio + httpx
  Ruff (lint + format)
  uv (package manager)

Next steps:
  cd $PROJECT_NAME
  docker-compose up -d            → start Postgres (dev: 5432, test: 5433)
  uv run alembic upgrade head     → run migrations
  uv run uvicorn app.main:app --reload --port 8000
  uv run pytest                   → run tests (requires docker-compose up -d)

Add a migration after editing models:
  uv run alembic revision --autogenerate -m "describe change"
  uv run alembic upgrade head

Add a new resource:
  app/models/thing.py             → SQLAlchemy model (import in app/models/__init__.py)
  app/schemas/thing.py            → Pydantic request/response schemas
  app/repositories/thing.py       → DB queries (ThingRepository)
  app/services/thing.py           → business logic (ThingService)
  app/routers/thing.py            → route handlers (include in app/main.py)

See AGENTS.md for full conventions and coding standards.
```

### `monorepo`

```
✓ Scaffolded $PROJECT_NAME (full-stack monorepo)

Structure:
  $PROJECT_NAME/
  ├── frontend/    React 19 + TypeScript + Vite + Tailwind v4 + @nebari/design (Base UI)
  └── backend/     Python 3.12 + FastAPI + PostgreSQL + Alembic

Stack:
  Frontend: React 19 · TypeScript · Vite · Tailwind CSS v4 · @nebari/design (Base UI) · React Router v6 · TanStack Query v5 · Jotai · Vitest
  Backend:  FastAPI · SQLAlchemy 2 (async) · asyncpg · Alembic · Pydantic v2 · pytest-asyncio · httpx · Ruff · uv

Next steps:
  cd $PROJECT_NAME

  # Start databases
  make db-up

  # Run migrations
  make db-migrate

  # Start both servers (frontend: 5173, backend: 8000)
  make dev

  # Or start individually
  make dev-frontend
  make dev-backend

  # Run all tests
  make test

  # Build frontend for production
  make build

Frontend API calls: already proxied — fetch("/api/...") in the browser hits http://localhost:8000
Add more Nebari components:
  cd frontend && npx shadcn add @nebari/<component>     (e.g. spinner, field, label, checkbox, switch, radio-group, textarea)
  cd frontend && npx shadcn view @nebari/<component>    (inspect variants/props before installing)
  curl -s https://nebari-dev.github.io/nebari-design/r/registry.json   (list the catalog)

See AGENTS.md (root), frontend/AGENTS.md, and backend/AGENTS.md for full conventions.
```

---

## Important Notes

- **Read references before writing**: Read the full reference and template files for each part before writing any of its files. Never guess at file contents.
- **Name substitution**: `{{PROJECT_NAME}}` becomes `$FRONTEND_NAME` in frontend files (so `<name>-frontend` in a monorepo) and `$PROJECT_NAME` everywhere else.
- **Placement**: in a monorepo, frontend files go in `frontend/`, backend files in `backend/`, and only the root `.gitignore`, `README.md`, `Makefile` and `AGENTS.md` sit at `$TARGET_DIR/`.
- **Empty files**: `__init__.py`, `.gitkeep`, and `factories/__init__.py` files must be written as empty files.
- **Installs run unconditionally** after the files for that part are written.
- **Nebari components are upstream-managed**: `npx shadcn add @nebari/<name>` copies component source into `src/components/ui/`. Treat those files as managed — never hand-edit them (they are overwritten on upgrade). Extend at the call site via `className` (merged with `cn()`) or the Base UI `render` prop. See the `nebari-ui` skill.
- **Theme via CLI, not hand-copied**: the `:root`/`.dark` brand tokens come from `npx shadcn add @nebari/theme`. `src/index.css` intentionally ships only the Tailwind import, font imports, and base layer — do not paste token values into it.
- **Do not add extra files**: only create the files listed above.
