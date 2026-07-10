---
name: new-monorepo
description: Scaffolds a full-stack monorepo with a React+TypeScript frontend and a Python FastAPI backend. Triggers on /new-monorepo, "scaffold a monorepo", "create a full-stack project", "new full-stack app".
argument-hint: <project-name>
allowed-tools:
  - Write
  - Bash
  - Read
  - Glob
---

You are scaffolding a full-stack monorepo with a React+TypeScript frontend and a Python FastAPI backend. Follow every step below exactly and in order. Do not skip steps. Do not ask for confirmation between steps — execute everything autonomously.

## Pre-flight Checks

1. Set `PROJECT_NAME` to the value of `$ARGUMENTS` (trimmed of whitespace).
2. If `PROJECT_NAME` is empty or not provided, stop immediately and tell the user: "Please provide a project name: /new-monorepo <project-name>"
3. Check whether a directory named `$PROJECT_NAME` already exists in the current working directory. If it does, stop and tell the user: "Directory '$PROJECT_NAME' already exists. Choose a different name or remove the existing directory first."
4. Verify `uv` is installed by running `uv --version`. If it fails, stop and tell the user: "uv is required. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
5. Determine the absolute path: `TARGET_DIR = <cwd>/$PROJECT_NAME`

---

## Step 1 — Initialize the Monorepo Root

```bash
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR" && git init
```

---

## Step 2 — Write Root Files

Read `references/root-files.md` (skill-relative: `~/.claude/skills/new-monorepo/references/root-files.md`) for the exact content of each file. Replace every `{{PROJECT_NAME}}` with the actual project name.

Write these files at `$TARGET_DIR/`:

1. `.gitignore`
2. `README.md`
3. `Makefile`

### Root `AGENTS.md`

Read `assets/agents-md-template.md` (skill-relative: `~/.claude/skills/new-monorepo/assets/agents-md-template.md`). Replace every `{{PROJECT_NAME}}` with the actual project name. Write the result to `$TARGET_DIR/AGENTS.md`.

---

## Step 3 — Scaffold the Frontend

Read ALL content from `~/.claude/skills/new-frontend/references/frontend-structure.md` before writing any frontend files. Write every file into `$TARGET_DIR/frontend/` (not a standalone project directory). Create parent directories as needed.

### Frontend root files (write to `$TARGET_DIR/frontend/`)

1. `.gitignore` — use content from new-frontend skill
2. `README.md` — replace `$PROJECT_NAME` with `{{PROJECT_NAME}}-frontend`
3. `package.json` — replace `"name": "{{PROJECT_NAME}}"` with the actual project name + `-frontend`
4. `tsconfig.json`
5. `tsconfig.node.json`
6. `vite.config.ts`
7. `components.json` — includes the `@nebari` registry mapping
8. `biome.json`
9. `.env.example`
10. `index.html`

> Tailwind v4 needs no `tailwind.config.ts` or `postcss.config.js` (configured in `frontend/src/index.css` via `@import "tailwindcss"`), and Biome replaces `eslint.config.js`. Do not create those files.

### Frontend `AGENTS.md`

Read `~/.claude/skills/new-frontend/assets/agents-md-template.md`. Replace every `{{PROJECT_NAME}}` with `{{PROJECT_NAME}}-frontend`. Write the result to `$TARGET_DIR/frontend/AGENTS.md`.

### Frontend source files (write to `$TARGET_DIR/frontend/src/`)

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

## Step 4 — Scaffold the Backend

Read ALL content from `~/.claude/skills/new-backend/references/backend-structure.md` before writing any backend files. Write every file into `$TARGET_DIR/backend/` (not a standalone project directory). Replace every `{{PROJECT_NAME}}` with the actual project name. Create parent directories as needed.

### Backend root files (write to `$TARGET_DIR/backend/`)

1. `.gitignore`
2. `.python-version`
3. `README.md`
4. `.env` — replace `{{PROJECT_NAME}}` with the actual project name
5. `.env.example`
6. `docker-compose.yml` — replace `{{PROJECT_NAME}}` with the actual project name
7. `pyproject.toml` — replace `{{PROJECT_NAME}}` with the actual project name
8. `alembic.ini`

### Backend `AGENTS.md`

Read `~/.claude/skills/new-backend/assets/agents-md-template.md`. Replace every `{{PROJECT_NAME}}` with the actual project name. Write the result to `$TARGET_DIR/backend/AGENTS.md`.

### Backend app source files (write to `$TARGET_DIR/backend/`)

1. `app/__init__.py` — empty file
2. `app/main.py`
3. `app/config.py` — replace `{{PROJECT_NAME}}` with the actual project name
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

### Backend migration files

1. `migrations/env.py`
2. `migrations/script.py.mako`
3. `migrations/versions/.gitkeep` — empty file

### Backend test files

1. `tests/__init__.py` — empty file
2. `tests/conftest.py` — replace `{{PROJECT_NAME}}` with the actual project name
3. `tests/test_health.py`
4. `tests/factories/__init__.py` — empty file

---

## Step 5 — Install Frontend Dependencies

```bash
cd "$TARGET_DIR/frontend" && npm install
```

This may take 30–60 seconds. Wait for it to complete before continuing.

---

## Step 6 — Install the Nebari UI Skill for Frontend

The `@nebari` registry is already wired into `frontend/components.json` (the
`registries` block written in Step 3), so `npx shadcn add @nebari/<name>`
resolves without any extra setup. Install the Nebari design-system consumer
skill from the `@nebari` registry (served from the `nebari-design` GitHub repo)
so Claude Code knows how to add and compose Nebari components:

```bash
cd "$TARGET_DIR/frontend" && npx shadcn@latest add @nebari/claude-skill --yes
```

This pulls the `nebari-ui` skill from the registry and installs it at
`~/.claude/skills/nebari-ui/`. It auto-activates when you ask to add or use
Nebari components.

If the command fails (e.g. network error), note the failure but continue to Step 7.

---

## Step 7 — Add the Nebari Theme and Base Components

Add the theme **first** (it writes the Nebari brand tokens — `:root` + `.dark`
CSS variables — into `frontend/src/index.css`), then the base components.
`shadcn` pulls each component's `registryDependencies` (the `utils` helper, the
theme) and npm dependencies (Base UI, `class-variance-authority`,
`lucide-react`) automatically.

```bash
cd "$TARGET_DIR/frontend" && npx shadcn@latest add @nebari/theme @nebari/button @nebari/card @nebari/input @nebari/badge @nebari/dialog @nebari/select @nebari/alert @nebari/tabs --yes
```

These cover the majority of common UI needs. If the command fails, note the
failure but continue to Step 8 — the app will not build until `@nebari/theme`
has been added, since `frontend/src/index.css` references its tokens.

---

## Step 8 — Install Backend Dependencies

```bash
cd "$TARGET_DIR/backend" && uv sync
```

This may take 30–60 seconds. Wait for it to complete before continuing.

---

## Step 9 — Verify and Report

Run:

```bash
find "$TARGET_DIR" -type f \
  | grep -v node_modules \
  | grep -v ".git/" \
  | grep -v ".venv/" \
  | grep -v __pycache__ \
  | sort
```

Then print a success message in this exact format (with actual values substituted):

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

- **Read all references before writing**: Read the full content of each reference file before writing any files from that section. Never guess at file contents.
- **Sub-skill reference paths are absolute**: Use `~/.claude/skills/new-frontend/` and `~/.claude/skills/new-backend/` when reading their files — do not resolve them relative to this skill.
- **This skill's own reference paths are skill-relative**: Resolve `references/` and `assets/` paths relative to `~/.claude/skills/new-monorepo/`.
- **Project name substitution**: Replace `{{PROJECT_NAME}}` everywhere across all files in both frontend and backend.
- **Subdirectory placement**: Frontend files go in `$TARGET_DIR/frontend/`, backend files go in `$TARGET_DIR/backend/`. The root `.gitignore`, `README.md`, `Makefile`, and `AGENTS.md` go directly in `$TARGET_DIR/`.
- **Single git repo**: Only one `git init` at `$TARGET_DIR/`. Do not git-init the frontend or backend subdirectories.
- **Empty files**: All `__init__.py`, `.gitkeep`, and `factories/__init__.py` files must be written as empty files.
- **Do not add extra files**: Only create the files listed above.
