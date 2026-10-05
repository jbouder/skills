# AGENTS.md — {{PROJECT_NAME}}

This file provides guidance for AI agents (Claude Code, Copilot, Cursor, etc.) working in this repository. Read it before making changes.

---

## Project Overview

| Item | Value |
|------|-------|
| **Project** | {{PROJECT_NAME}} |
| **Framework** | FastAPI |
| **Runtime** | Python 3.12 |
| **Database** | PostgreSQL 16 (async via asyncpg) |
| **ORM** | SQLAlchemy 2 (async) |
| **Migrations** | Alembic |
| **Validation** | Pydantic v2 |
| **Testing** | pytest + pytest-asyncio + httpx |
| **Linting** | Ruff |
| **Package manager** | uv |
| **Dev port** | 8000 |

---

## Repository Structure

```
{{PROJECT_NAME}}/
├── app/
│   ├── main.py              # FastAPI app factory (create_app)
│   ├── config.py            # Settings via pydantic-settings
│   ├── database.py          # Async engine, session factory, get_db
│   ├── deps.py              # Typed FastAPI dependency annotations
│   ├── models/
│   │   ├── __init__.py      # Re-export all models (Alembic needs this)
│   │   └── base.py          # DeclarativeBase + TimestampMixin
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── health.py
│   ├── routers/
│   │   ├── __init__.py
│   │   └── health.py
│   ├── services/            # Business logic — no DB access, calls repositories
│   └── repositories/        # All DB queries live here
├── migrations/
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── tests/
│   ├── conftest.py          # test_engine, db, client fixtures
│   ├── test_health.py
│   └── factories/           # test data factories
├── pyproject.toml
├── alembic.ini
├── docker-compose.yml
├── .env
├── .env.example
└── AGENTS.md
```

---

## Development Commands

**After every major change: run tests and lint before considering the task complete.**

```bash
uv run pytest && uv run ruff check . && uv run ruff format --check .
```

| Command | Purpose |
|---------|---------|
| `docker-compose up -d` | Start Postgres (dev: 5432, test: 5433) |
| `uv run uvicorn app.main:app --reload --port 8000` | Dev server |
| `uv run alembic upgrade head` | Apply all pending migrations |
| `uv run alembic revision --autogenerate -m "..."` | Generate migration from model changes |
| `uv run alembic downgrade -1` | Roll back one migration |
| `uv run pytest` | Run all tests |
| `uv run pytest --cov=app --cov-report=term-missing` | Tests with coverage |
| `uv run ruff check .` | Lint |
| `uv run ruff format .` | Format |

---

## Layered Architecture

```
Router → Service → Repository → Database
```

| Layer | Responsibility | May call |
|-------|---------------|----------|
| **Router** (`app/routers/`) | HTTP: parse request, call service, return response | Service only |
| **Service** (`app/services/`) | Business logic, validation, orchestration | Repository only |
| **Repository** (`app/repositories/`) | All SQLAlchemy queries | Database (via `AsyncSession`) |

Routers must not call the database directly. Services must not construct SQLAlchemy queries. Repositories must not contain business logic.

---

## Adding a New Resource

Follow this checklist in order:

### 1. Model (`app/models/thing.py`)

```python
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class Thing(Base, TimestampMixin):
    __tablename__ = "things"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=False)
```

Then import it in `app/models/__init__.py` so Alembic can detect it:

```python
from app.models.thing import Thing  # noqa: F401
```

### 2. Migration

```bash
uv run alembic revision --autogenerate -m "add things table"
uv run alembic upgrade head
```

### 3. Schemas (`app/schemas/thing.py`)

```python
from pydantic import BaseModel

class ThingCreate(BaseModel):
    name: str

class ThingResponse(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}
```

### 4. Repository (`app/repositories/thing.py`)

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.thing import Thing

class ThingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all(self) -> list[Thing]:
        result = await self.db.execute(select(Thing))
        return list(result.scalars().all())

    async def create(self, name: str) -> Thing:
        thing = Thing(name=name)
        self.db.add(thing)
        await self.db.flush()
        await self.db.refresh(thing)
        return thing
```

### 5. Service (`app/services/thing.py`)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.thing import ThingRepository
from app.schemas.thing import ThingCreate, ThingResponse

class ThingService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = ThingRepository(db)

    async def list_things(self) -> list[ThingResponse]:
        things = await self.repo.get_all()
        return [ThingResponse.model_validate(t) for t in things]

    async def create_thing(self, data: ThingCreate) -> ThingResponse:
        thing = await self.repo.create(name=data.name)
        return ThingResponse.model_validate(thing)
```

### 6. Router (`app/routers/thing.py`)

```python
from fastapi import APIRouter
from app.deps import DbSession
from app.schemas.thing import ThingCreate, ThingResponse
from app.services.thing import ThingService

router = APIRouter()

@router.get("", response_model=list[ThingResponse])
async def list_things(db: DbSession) -> list[ThingResponse]:
    return await ThingService(db).list_things()

@router.post("", response_model=ThingResponse, status_code=201)
async def create_thing(data: ThingCreate, db: DbSession) -> ThingResponse:
    return await ThingService(db).create_thing(data)
```

Then register in `app/main.py`:

```python
from app.routers import thing
app.include_router(thing.router, prefix="/things", tags=["things"])
```

---

## Database & SQLAlchemy Patterns

### Models

- Always inherit from `Base` and `TimestampMixin`
- Use `Mapped[T]` and `mapped_column()` for all columns (SQLAlchemy 2 style)
- Use `nullable=False` explicitly — do not rely on the default
- Define `__tablename__` explicitly (use `snake_case` plural)

```python
class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
```

### Queries

Always use `select()` from `sqlalchemy` — never the legacy `session.query()`:

```python
# Good
result = await db.execute(select(User).where(User.id == user_id))
user = result.scalar_one_or_none()

# Bad — legacy query API
user = db.query(User).filter(User.id == user_id).first()
```

### Flush vs Commit

- The `get_db` fixture commits on success and rolls back on exception automatically.
- Inside a repository, call `await db.flush()` after adding objects to push changes to the DB within the transaction (makes IDs available) without committing.
- Never call `await db.commit()` inside a repository or service — the router layer owns the transaction boundary via `get_db`.

---

## Alembic Migration Workflow

1. Edit or add a model in `app/models/`
2. Import the model in `app/models/__init__.py`
3. Generate: `uv run alembic revision --autogenerate -m "describe change"`
4. Review the generated file in `migrations/versions/`
5. Apply: `uv run alembic upgrade head`

**Always review autogenerated migrations** — Alembic does not detect renames or data migrations.

---

## Testing Standards

- Tests live in `tests/` and mirror the app structure (`tests/routers/`, `tests/services/`, etc.)
- Use the `client` fixture for HTTP-level tests (integration)
- Use the `db` fixture directly to test repositories in isolation
- All tests use the real Postgres test database (port 5433 via docker-compose)
- Wrap each test in a rolled-back transaction — state does not leak between tests

```python
# Integration test via HTTP client
async def test_create_thing(client: AsyncClient) -> None:
    response = await client.post("/things", json={"name": "widget"})
    assert response.status_code == 201
    assert response.json()["name"] == "widget"

# Repository test via db session
async def test_thing_repository(db: AsyncSession) -> None:
    repo = ThingRepository(db)
    thing = await repo.create(name="widget")
    assert thing.id is not None
```

### Test Factories

Use `tests/factories/` for constructing test data. Prefer simple factory functions over complex factory libraries:

```python
# tests/factories/things.py
from app.models.thing import Thing
from sqlalchemy.ext.asyncio import AsyncSession

async def create_thing(db: AsyncSession, name: str = "test") -> Thing:
    thing = Thing(name=name)
    db.add(thing)
    await db.flush()
    await db.refresh(thing)
    return thing
```

---

## Configuration

All settings flow through `app/config.py` via `pydantic-settings`. Add new settings there:

```python
class Settings(BaseSettings):
    new_setting: str = "default"
```

Then access via `from app.config import settings`.

Never hard-code URLs, credentials, or environment-specific values. Always use settings.

---

## Coding Standards

| Thing | Convention | Example |
|-------|-----------|---------|
| Module | `snake_case` | `user_profile.py` |
| Class | `PascalCase` | `UserRepository` |
| Function / variable | `snake_case` | `get_user_by_email` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_RETRIES` |
| Type hints | Always required | `async def get(id: int) -> User:` |

- All functions must have return type annotations
- Use `from __future__ import annotations` only when needed for forward references
- Prefer `list[T]` over `List[T]`, `dict[K, V]` over `Dict[K, V]` (Python 3.12+)
- Never use `Any` — use `Unknown` with narrowing or proper generics

---

## Error Handling

Raise `fastapi.HTTPException` in routers for HTTP errors. Raise domain exceptions in services for business logic errors, and catch them in the router:

```python
# services/thing.py
class ThingNotFoundError(Exception):
    pass

# routers/thing.py
from fastapi import HTTPException
try:
    result = await service.get_thing(thing_id)
except ThingNotFoundError:
    raise HTTPException(status_code=404, detail="Thing not found")
```

---

## What NOT To Do

| Don't | Do instead |
|-------|-----------|
| Call the DB directly in a router | Call a service, which calls a repository |
| Write business logic in a repository | Move it to a service |
| Use `session.query()` (legacy) | Use `select()` with `await session.execute()` |
| Call `await session.commit()` in a repo/service | Let `get_db` manage transactions |
| Hard-code config values | Add to `Settings` and use `settings.x` |
| Import models in env.py manually | Keep `app/models/__init__.py` up to date |
| Use `Any` in type hints | Use proper types or `object` with narrowing |
| Skip migrations after changing models | Always run `alembic revision --autogenerate` |
