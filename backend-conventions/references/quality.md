# Backend Quality Gate

The org's Ruff + mypy + pytest setup. Match the repo's `pyproject.toml`; the values below are the org default (taken from `ravnar`).

## The Gate — run before declaring done

```bash
uv run ruff format .            # format
uv run ruff check . --fix       # lint + import sort (I001) + autofix
uv run mypy src                 # or: uv run mypy app
uv run pytest                   # tests
```

If the repo has a `dev` dependency group, install it first: `uv sync` (groups install by default) or `uv sync --group dev`.

## Ruff

```toml
[tool.ruff]
target-version = "py311"
line-length = 120

[tool.ruff.lint]
pydocstyle = { convention = "google" }
select = ["E", "F", "I001", "B", "C4", "ISC", "RET", "SIM", "PTH", "D2", "UP", "ASYNC", "RUF"]
ignore = [
    "ISC001",   # conflicts with the formatter
    "E501",     # line-too-long handled by formatter; only fires on strings
    "B019",     # caching is intentional
    "PTH123",   # builtin open() is fine
    "D203", "D213",  # mutually exclusive with D211 / D212
]
```

What that buys you: pyflakes + pycodestyle (`E`/`F`), import sorting (`I001`), bugbear (`B`), comprehensions (`C4`), implicit-str-concat (`ISC`), return simplification (`RET`), `SIM`, **use-pathlib (`PTH`)**, docstrings (`D2`, google style), pyupgrade (`UP`), **async correctness (`ASYNC`)**, and Ruff's own rules (`RUF`).

Per-file escape hatches go in `[tool.ruff.lint.per-file-ignores]` — e.g. tests ignore `ASYNC230` (blocking open in tests is fine), SQLAlchemy ORM modules ignore `RUF012` (mutable class attrs).

## mypy — strict

```toml
[tool.mypy]
files = "src"
show_error_codes = true
pretty = true
disallow_untyped_calls = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
allow_redefinition = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_return_any = true
warn_unused_configs = true
```

Consequences: every function needs annotations, no calling untyped functions, `Optional` must be explicit, and unused `# type: ignore` is an error. Narrow missing-stub noise with targeted `[[tool.mypy.overrides]]` (`ignore_missing_imports = true`) per module — don't loosen the global config.

## pytest — async, strict warnings

```toml
[tool.pytest]
minversion = "9.0"
addopts = ["-ra", "--tb=short"]
testpaths = ["tests"]
filterwarnings = ["error", "ignore::ResourceWarning"]
xfail_strict = true
asyncio_mode = "auto"
```

Two things bite people:

- **`filterwarnings = ["error"]`** — any unhandled warning **fails the test**. When a dependency emits an unavoidable warning, add a *targeted* `ignore:` entry (match the message + category), not a blanket silence.
- **`asyncio_mode = "auto"`** — `async def test_*` runs without an `@pytest.mark.asyncio` decorator. Just write async tests.
- **`xfail_strict = true`** — an `xfail` that unexpectedly *passes* is a failure. Remove the marker once the bug is fixed.

### Async test shape

```python
import pytest
from httpx import ASGITransport, AsyncClient

async def test_health(app):  # no asyncio marker needed — auto mode
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
```

DB-backed tests run against the docker-compose Postgres (`docker compose up -d` first); use a transaction-per-test rollback fixture rather than recreating schema each test.

## Quick reference

| Task | Command |
|------|---------|
| Add a runtime dep | `uv add <pkg>` |
| Add a tooling dep | `uv add --group dev <pkg>` |
| Sync env | `uv sync` |
| Run anything in the env | `uv run <cmd>` |
| New migration | `uv run alembic revision --autogenerate -m "..."` |
| Apply migrations | `uv run alembic upgrade head` |
| Run the app | `uv run uvicorn app.main:app --reload --port 8000` |
