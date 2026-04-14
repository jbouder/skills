# Backend File Contents

Use these exact file contents when scaffolding the backend. All paths are relative to `$PROJECT_NAME/`. Replace every `{{PROJECT_NAME}}` with the actual project name.

---

## `.gitignore`

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
*.egg
*.egg-info/
dist/
build/
eggs/
parts/
var/
sdist/
develop-eggs/
.installed.cfg
lib/
lib64/
MANIFEST

# Virtual environments
.venv/
venv/
ENV/
env/

# uv
.uv/

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# Environment
.env
*.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Alembic
migrations/versions/*.pyc
```

---

## `.python-version`

```
3.12
```

---

## `README.md`

```markdown
# {{PROJECT_NAME}}

A FastAPI backend with PostgreSQL.

## Stack

- Python 3.12 + FastAPI + Uvicorn
- PostgreSQL 16 + SQLAlchemy 2 (async) + asyncpg
- Alembic (migrations)
- Pydantic v2 + pydantic-settings
- pytest + pytest-asyncio + httpx
- Ruff (lint + format)
- uv (package manager)

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Docker + Docker Compose

## Setup

```bash
docker-compose up -d          # start Postgres (dev: 5432, test: 5433)
uv sync                       # install dependencies
uv run alembic upgrade head   # run migrations
```

## Commands

```bash
uv run uvicorn app.main:app --reload --port 8000   # dev server
uv run pytest                                       # run tests
uv run pytest --cov=app --cov-report=term-missing  # with coverage
uv run ruff check .                                 # lint
uv run ruff format .                                # format
uv run alembic revision --autogenerate -m "msg"    # new migration
uv run alembic upgrade head                         # apply migrations
uv run alembic downgrade -1                         # roll back one
```

See [AGENTS.md](./AGENTS.md) for full conventions and coding standards.
```

---

## `.env`

```
APP_NAME={{PROJECT_NAME}}
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/{{PROJECT_NAME}}
ECHO_SQL=false
ENVIRONMENT=development
```

---

## `.env.example`

```
APP_NAME=myapp
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/myapp
ECHO_SQL=false
ENVIRONMENT=development
```

---

## `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: {{PROJECT_NAME}}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  db_test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: {{PROJECT_NAME}}_test
    ports:
      - "5433:5432"
    volumes:
      - postgres_test_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  postgres_test_data:
```

---

## `pyproject.toml`

```toml
[project]
name = "{{PROJECT_NAME}}"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.29.0",
    "alembic>=1.13.0",
    "pydantic>=2.8.0",
    "pydantic-settings>=2.4.0",
]

[dependency-groups]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",
    "pytest-cov>=5.0.0",
    "ruff>=0.6.0",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM"]
ignore = ["B008"]

[tool.ruff.lint.isort]
known-first-party = ["app"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "session"
testpaths = ["tests"]

[tool.coverage.run]
source = ["app"]
omit = ["*/migrations/*"]
```

---

## `alembic.ini`

```ini
[alembic]
script_location = migrations
file_template = %%(year)d%%(month).2d%%(day).2d_%%(hour).2d%%(minute).2d_%%(rev)s_%%(slug)s
prepend_sys_path = .
version_path_separator = os

[post_write_hooks]

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

---

## `app/main.py`

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize resources (cache warm-up, connection pool checks, etc.)
    yield
    # Shutdown: clean up resources


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )

    app.include_router(health.router, prefix="/health", tags=["health"])

    return app


app = create_app()
```

---

## `app/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "{{PROJECT_NAME}}"
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/{{PROJECT_NAME}}"
    )
    echo_sql: bool = False
    environment: str = "development"


settings = Settings()
```

---

## `app/database.py`

```python
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(settings.database_url, echo=settings.echo_sql)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

---

## `app/deps.py`

```python
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

# Use DbSession as a type annotation in route handlers for clean DI:
#   async def my_route(db: DbSession) -> ...:
DbSession = Annotated[AsyncSession, Depends(get_db)]
```

---

## `app/models/base.py`

```python
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Adds created_at and updated_at columns to a model."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
```

---

## `app/schemas/health.py`

```python
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
```

---

## `app/routers/health.py`

```python
from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", version="0.1.0")
```

---

## `migrations/env.py`

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.models.base import Base

# Import all models so Alembic can detect them.
import app.models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

---

## `migrations/script.py.mako`

```
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

---

## `tests/conftest.py`

```python
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import create_app
from app.models.base import Base

TEST_DATABASE_URL = (
    "postgresql+asyncpg://postgres:postgres@localhost:5433/{{PROJECT_NAME}}_test"
)


@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture()
async def db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    TestSession = async_sessionmaker(test_engine, expire_on_commit=False)
    async with TestSession() as session:
        yield session
        await session.rollback()


@pytest.fixture()
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    app = create_app()

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
```

---

## `tests/test_health.py`

```python
from httpx import AsyncClient


async def test_health_check(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
```
