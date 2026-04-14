---
name: new-backend
description: Scaffolds a new Python FastAPI backend project with PostgreSQL, async SQLAlchemy, Alembic, and pytest. Triggers on /new-backend, "scaffold a new backend", "create a FastAPI project", "bootstrap a backend app", "new FastAPI app".
argument-hint: <project-name>
allowed-tools:
  - Write
  - Bash
  - Read
  - Glob
---

You are scaffolding a new Python FastAPI backend project. Follow every step below exactly and in order. Do not skip steps. Do not ask for confirmation between steps — execute everything autonomously.

## Pre-flight Checks

1. Set `PROJECT_NAME` to the value of `$ARGUMENTS` (trimmed of whitespace).
2. If `PROJECT_NAME` is empty or not provided, stop immediately and tell the user: "Please provide a project name: /new-backend <project-name>"
3. Check whether a directory named `$PROJECT_NAME` already exists in the current working directory. If it does, stop and tell the user: "Directory '$PROJECT_NAME' already exists. Choose a different name or remove the existing directory first."
4. Verify `uv` is installed by running `uv --version`. If it fails, stop and tell the user: "uv is required. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
5. Determine the absolute path: `TARGET_DIR = <cwd>/$PROJECT_NAME`

---

## Step 1 — Initialize the Repository

```bash
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR" && git init
```

---

## Step 2 — Write Root Files

### `.gitignore`

Write `$TARGET_DIR/.gitignore` (use the content from `references/backend-structure.md`).

### `.python-version`

Write `$TARGET_DIR/.python-version` (use the content from `references/backend-structure.md`).

### `README.md`

Write `$TARGET_DIR/README.md` — replace every `{{PROJECT_NAME}}` with the actual project name (use the content from `references/backend-structure.md`).

### `AGENTS.md`

Read the skill-relative file `assets/agents-md-template.md`. Replace every occurrence of `{{PROJECT_NAME}}` with the actual value of `$PROJECT_NAME`. Write the result to `$TARGET_DIR/AGENTS.md`.

### `.env`

Write `$TARGET_DIR/.env` — replace every `{{PROJECT_NAME}}` with the actual project name (use the content from `references/backend-structure.md`).

### `.env.example`

Write `$TARGET_DIR/.env.example` (use the content from `references/backend-structure.md`).

### `docker-compose.yml`

Write `$TARGET_DIR/docker-compose.yml` — replace every `{{PROJECT_NAME}}` with the actual project name (use the content from `references/backend-structure.md`).

---

## Step 3 — Write Config Files

Read `references/backend-structure.md` for the exact content of each file below.

Write these files at the project root (`$TARGET_DIR/`):

1. `pyproject.toml` — replace `"name": "{{PROJECT_NAME}}"` and all `{{PROJECT_NAME}}` occurrences with the actual project name
2. `alembic.ini`

---

## Step 4 — Write App Source Files

Read `references/backend-structure.md` for the exact content. Create parent directories as needed before writing each file.

Write these files under `$TARGET_DIR/app/`:

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

---

## Step 5 — Write Migration Files

Read `references/backend-structure.md` for the exact content.

Write these files:

1. `migrations/env.py`
2. `migrations/script.py.mako`
3. `migrations/versions/.gitkeep` — empty file

---

## Step 6 — Write Test Files

Read `references/backend-structure.md` for the exact content. Replace `{{PROJECT_NAME}}` where it appears.

Write these files:

1. `tests/__init__.py` — empty file
2. `tests/conftest.py` — replace `{{PROJECT_NAME}}` with the actual project name
3. `tests/test_health.py`
4. `tests/factories/__init__.py` — empty file

---

## Step 7 — Install Dependencies

```bash
cd "$TARGET_DIR" && uv sync
```

This may take 30–60 seconds. Wait for it to complete before continuing.

---

## Step 8 — Verify and Report

Run:

```bash
find "$TARGET_DIR" -type f | grep -v __pycache__ | grep -v ".git/" | grep -v ".venv/" | sort
```

Then print a success message in this exact format (with actual values substituted):

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

---

## Important Notes

- **Read references before writing**: Always read `references/backend-structure.md` and `assets/agents-md-template.md` before writing files. Do not guess at the content.
- **Skill-relative paths**: Resolve reference paths relative to `~/.claude/skills/new-backend/`.
- **Project name substitution**: Replace `{{PROJECT_NAME}}` everywhere it appears — pyproject.toml, config.py, .env, docker-compose.yml, conftest.py, README.md, AGENTS.md template.
- **Empty files**: `__init__.py`, `.gitkeep`, and `factories/__init__.py` must be written as empty files.
- **uv sync**: Run unconditionally after writing all source files.
- **Do not add extra files**: Only create the files listed above.
