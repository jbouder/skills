# Backend Structure & Patterns

Canonical patterns for both org layouts. Detect which layout the repo uses (`src/` vs `app/`) and follow the matching section.

---

## `app/` — Deployable Service

Layered, one-directional: **router → service → repository → DB**. Each resource adds five files.

### config.py — pydantic-settings

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    project_name: str = "myapp"
    database_url: str
    log_level: str = "INFO"


settings = Settings()  # import this; never read os.environ elsewhere
```

### database.py — async engine + session

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
```

### deps.py — FastAPI dependency

```python
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
```

### A resource, end to end

```python
# models/thing.py — SQLAlchemy 2 typed model
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class Thing(Base):
    __tablename__ = "things"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
# remember: import Thing in app/models/__init__.py so Alembic sees it
```
```python
# schemas/thing.py — Pydantic v2, separate from the ORM model
from pydantic import BaseModel, ConfigDict

class ThingCreate(BaseModel):
    name: str

class ThingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # read straight off the ORM object
    id: int
    name: str
```
```python
# repositories/thing.py — owns all DB access for Thing
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.thing import Thing

class ThingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, thing_id: int) -> Thing | None:
        return await self.db.get(Thing, thing_id)

    async def list(self) -> list[Thing]:
        result = await self.db.execute(select(Thing))
        return list(result.scalars().all())
```
```python
# services/thing.py — business logic; depends on the repository, not the session
from app.repositories.thing import ThingRepository
from app.schemas.thing import ThingCreate

class ThingService:
    def __init__(self, repo: ThingRepository) -> None:
        self.repo = repo

    async def create(self, data: ThingCreate) -> Thing:
        ...  # validation / rules here, not in the router
```
```python
# routers/thing.py — thin; wires deps, returns schemas
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_db
from app.repositories.thing import ThingRepository
from app.schemas.thing import ThingRead

router = APIRouter(prefix="/things", tags=["things"])

@router.get("/{thing_id}", response_model=ThingRead)
async def get_thing(thing_id: int, db: AsyncSession = Depends(get_db)) -> ThingRead:
    thing = await ThingRepository(db).get(thing_id)
    ...
# include in app/main.py: app.include_router(thing.router)
```

Keep the layers honest: routers never touch the session directly, repositories never hold business rules.

---

## `src/` — Publishable Package (public/private split)

Used by library-style repos like `ravnar` and `hrafnar`. Two packages:

- **`src/<pkg>/`** — the public, supported API. Mostly thin re-exports. Ships `py.typed`. Holds `__main__.py` (the Typer CLI entrypoint, wired in `[project.scripts]`).
- **`src/_<pkg>/`** — private implementation: `config.py`, `orm.py`, `core.py`, `database.py`, `events.py`, `observability.py`, etc. Free to change without a breaking release.

Rules:
- New implementation goes in `_<pkg>/`. Only add to `<pkg>/__init__.py` when you intend to expose API.
- Version is **git-derived** (`uv-dynamic-versioning`, `vcs = "git"`). The build hook writes `src/_<pkg>/version.py`. Never hand-edit it; bump by tagging.
- Optional features are gated behind extras (`[project.optional-dependencies]`), and an `all` extra unions them. `[dependency-groups]` (`lint`, `test`, `docs`, `dev`) hold tooling, not runtime deps.

### Typer CLI entrypoint

```toml
# pyproject.toml
[project.scripts]
<pkg> = "<pkg>.__main__:app"
```
```python
# src/<pkg>/__main__.py
import typer
app = typer.Typer()

@app.command()
def serve(host: str = "0.0.0.0", port: int = 8000) -> None:
    ...

if __name__ == "__main__":
    app()
```

---

## Logging (both layouts)

```python
import structlog

logger = structlog.get_logger()
logger.info("thing_created", thing_id=thing.id, name=thing.name)  # event name + kv, never f-strings
```

Bind request/context once and let it propagate; don't reconstruct context on every log line.

## Observability

OpenTelemetry instrumentation for FastAPI and SQLAlchemy is wired centrally (an `observability.py` / app-factory step), exporting via OTLP. Don't scatter manual spans through handlers — instrument at the framework boundary and add spans only around genuinely opaque work.
