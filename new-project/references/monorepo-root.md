# Monorepo Root File Contents

Use these exact file contents for the monorepo root. Replace every `{{PROJECT_NAME}}` with the actual project name.

---

## `.gitignore`

```
# Frontend
frontend/node_modules/
frontend/.pnp
frontend/dist/
frontend/build/
frontend/coverage/
frontend/.env.local
frontend/.env.*.local

# Backend
backend/.venv/
backend/.uv/
backend/__pycache__/
backend/**/__pycache__/
backend/*.py[cod]
backend/.env
backend/htmlcov/
backend/.coverage
backend/.pytest_cache/

# Shared
.env
*.env.local
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp
*.swo
```

---

## `README.md`

```markdown
# {{PROJECT_NAME}}

Full-stack monorepo: React + TypeScript frontend, Python FastAPI backend.

## Structure

```
{{PROJECT_NAME}}/
├── frontend/    React 19 + TypeScript + Vite + Tailwind v4 + @nebari/design (Base UI)
└── backend/     Python 3.12 + FastAPI + PostgreSQL + Alembic
```

## Prerequisites

- Node.js 20+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Docker + Docker Compose

## Quick Start

```bash
make db-up        # start Postgres (dev: 5432, test: 5433)
make db-migrate   # run migrations
make dev          # start both servers in parallel
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:8000
- API docs: http://localhost:8000/docs

Frontend API calls use `/api/...` — Vite proxies them to the backend automatically.

## Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start frontend (5173) and backend (8000) in parallel |
| `make dev-frontend` | Frontend dev server only |
| `make dev-backend` | Backend dev server only |
| `make test` | Run all tests |
| `make test-frontend` | Frontend tests (Vitest) |
| `make test-backend` | Backend tests (pytest) |
| `make build` | Production build of frontend |
| `make lint` | Lint frontend (Biome) + backend (Ruff) |
| `make db-up` | Start Postgres containers |
| `make db-down` | Stop Postgres containers |
| `make db-migrate` | Apply Alembic migrations |

## Adding a New API Endpoint

1. Add model → `backend/app/models/thing.py`
2. Add schema → `backend/app/schemas/thing.py`
3. Add repository → `backend/app/repositories/thing.py`
4. Add service → `backend/app/services/thing.py`
5. Add router → `backend/app/routers/thing.py`, register in `backend/app/main.py`
6. Generate migration: `cd backend && uv run alembic revision --autogenerate -m "add things"`
7. Consume in frontend: `frontend/src/hooks/use-things.ts` (TanStack Query)

See [AGENTS.md](./AGENTS.md), [frontend/AGENTS.md](./frontend/AGENTS.md), and [backend/AGENTS.md](./backend/AGENTS.md) for full conventions.
```

---

## `Makefile`

```makefile
.PHONY: dev dev-frontend dev-backend test test-frontend test-backend build lint db-up db-down db-migrate

# ── Development ───────────────────────────────────────────────────────────────

dev:
	make -j2 dev-frontend dev-backend

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

# ── Testing ───────────────────────────────────────────────────────────────────

test: test-frontend test-backend

test-frontend:
	cd frontend && npm run test -- --run

test-backend:
	cd backend && uv run pytest

test-coverage:
	cd frontend && npm run test:coverage
	cd backend && uv run pytest --cov=app --cov-report=term-missing

# ── Build ─────────────────────────────────────────────────────────────────────

build:
	cd frontend && npm run build

# ── Lint ──────────────────────────────────────────────────────────────────────

lint:
	cd frontend && npm run lint
	cd backend && uv run ruff check .
	cd backend && uv run ruff format --check .

format:
	cd backend && uv run ruff format .

# ── Database ──────────────────────────────────────────────────────────────────

db-up:
	cd backend && docker-compose up -d

db-down:
	cd backend && docker-compose down

db-migrate:
	cd backend && uv run alembic upgrade head

db-rollback:
	cd backend && uv run alembic downgrade -1

db-revision:
	@read -p "Migration message: " msg; \
	cd backend && uv run alembic revision --autogenerate -m "$$msg"
```
