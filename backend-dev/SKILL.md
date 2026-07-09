---
name: backend-dev
description: OpenTeams backend conventions for Python + FastAPI + async SQLAlchemy + uv projects. Use when writing, modifying, or reviewing backend code — routes, models, schemas, services, config, migrations, or tests — in any project with a pyproject.toml and a src/ or app/ layout. Covers package layout, Pydantic v2 + pydantic-settings, async SQLAlchemy 2, structlog, and the ruff + mypy + pytest quality gate.
---

# OpenTeams Backend Development

Conventions and patterns for the OpenTeams Python backend stack. Follow these when building or changing any FastAPI backend in this org. To scaffold a brand-new project, use the `new-backend` skill instead — this skill governs ongoing development.

## The Stack

| Layer | Choice |
|-------|--------|
| Language | Python 3.11+ (support 3.11–3.14) |
| Framework | FastAPI + Starlette |
| Server | Uvicorn (+ uvloop off-Windows) |
| Validation / settings | Pydantic **v2** + pydantic-settings (`[yaml]`) |
| DB | PostgreSQL + SQLAlchemy **2** (async) + psycopg 3 |
| Migrations | Alembic |
| Logging | structlog |
| Observability | OpenTelemetry (api, sdk, otlp exporter, FastAPI + SQLAlchemy instrumentation) |
| CLI | Typer |
| Lint + format | **Ruff** (line-length 120) |
| Types | **mypy** (strict) |
| Tests | pytest + pytest-asyncio (`asyncio_mode = auto`) |
| Package manager | **uv** |
| Build backend | hatchling + uv-dynamic-versioning (for publishable packages) |

## First Moves In Any Project

Before writing code, confirm what the project actually uses — conventions below are the org default, but a given repo may differ. Check, in order:

1. `pyproject.toml` — deps, optional-extras, `[dependency-groups]`, the `[tool.ruff]`/`[tool.mypy]`/`[tool.pytest]` config, build backend.
2. The package layout — **`src/` vs `app/`** (see below). Mirror whichever is present.
3. `AGENTS.md` / `README.md` — repo-specific commands and conventions.
4. `alembic.ini` + `migrations/` — whether the project uses migrations.
5. `docker-compose.yml` — local Postgres (and its ports).
6. The surrounding code's idioms — match them over these defaults when they conflict.

## Two Layouts — Identify Which You're In

The org runs two layouts. **Detect, then mirror — never convert one to the other unasked.**

**`app/` — deployable service** (scaffolded by `new-backend`). Flat application package, layered by responsibility:

```
app/
├── main.py            # FastAPI app + router includes
├── config.py          # pydantic-settings Settings
├── database.py        # async engine + sessionmaker
├── deps.py            # FastAPI dependencies (get_db, ...)
├── models/            # SQLAlchemy models (import each in __init__.py)
├── schemas/           # Pydantic request/response models
├── repositories/      # DB queries — ThingRepository
├── services/          # business logic — ThingService
└── routers/           # route handlers (include in main.py)
```
Per-resource, you add five files: `models/thing.py`, `schemas/thing.py`, `repositories/thing.py`, `services/thing.py`, `routers/thing.py`. Routers call services, services call repositories, repositories touch the DB. Keep the layers one-directional.

**`src/` — publishable package** (e.g. `ravnar`, `hrafnar`). Uses the org's **public/private split**:

```
src/
├── <pkg>/             # PUBLIC API — thin re-exports, py.typed, __main__.py (Typer)
└── _<pkg>/            # PRIVATE impl — config.py, orm.py, core.py, database.py, ...
```
`<pkg>/__init__.py` re-exports the supported surface from `_<pkg>/`; everything in `_<pkg>/` is internal and may change. When editing one of these repos, put implementation in `_<pkg>/` and only widen `<pkg>/` when intentionally exposing API. Version comes from git via `uv-dynamic-versioning` — never hand-edit a version string.

## Non-Negotiables

- **Async all the way down.** Async route → async service → async repository → `AsyncSession`. Never block the event loop with sync DB/HTTP calls.
- **Pydantic v2 only.** `model_config = ConfigDict(...)`, `model_validate`, `model_dump`. No v1 `.dict()`/`Config` class.
- **Config via pydantic-settings**, never `os.environ[...]` scattered through code. One `Settings` object, env-prefixed, loaded once.
- **Separate ORM models from API schemas.** SQLAlchemy models ≠ Pydantic schemas. Map between them explicitly.
- **Structured logging via structlog**, not `print` or bare `logging`. Bind context, log events as `logger.info("event_name", key=value)`.
- **Full type annotations.** mypy runs strict (`disallow_untyped_defs`, `disallow_untyped_calls`). No untyped public functions.
- **Migrations for every model change** (in `app/` services): edit model → `uv run alembic revision --autogenerate -m "..."` → review the generated SQL → `uv run alembic upgrade head`. Never hand-write schema drift.
- **Run the quality gate before declaring done** (see `references/quality.md`):
  `uv run ruff format . && uv run ruff check . && uv run mypy <pkg-or-src> && uv run pytest`

## Reference Files

Read the relevant reference before doing that kind of work — they hold the canonical patterns:

- **`references/structure.md`** — both layouts in detail, the public/private split, adding a resource to an `app/` service, config + database + deps patterns, Typer CLI entrypoints.
- **`references/quality.md`** — the exact ruff rule set + mypy strictness + pytest config used across the org, the quality-gate commands, and async test patterns (`asyncio_mode=auto`, `xfail_strict`, `filterwarnings=error`).

## What NOT To Do

| Don't | Do instead |
|-------|-----------|
| Convert `src/` ↔ `app/` layout | Detect which is present and mirror it |
| Hand-edit a version string in a `src/` package | It's git-derived via uv-dynamic-versioning |
| Put new logic in the public `<pkg>/` package | Implement in `_<pkg>/`, re-export only when exposing API |
| `os.getenv` sprinkled through modules | One pydantic-settings `Settings`, injected |
| Sync DB call inside an async path | `await session.execute(...)` on `AsyncSession` |
| Return a SQLAlchemy model from a route | Map to a Pydantic response schema |
| `print()` / bare `logging` | `structlog` with bound context |
| Edit a model without a migration | `alembic revision --autogenerate` then review |
| `pip install` / `requirements.txt` | `uv add` / `uv sync`; deps live in pyproject |
| Reach for black/isort/flake8 | Ruff does format + lint + import sort |
