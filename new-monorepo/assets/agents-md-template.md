# AGENTS.md — {{PROJECT_NAME}}

This file covers the monorepo root. Each sub-project has its own `AGENTS.md` with detailed conventions:

- **[frontend/AGENTS.md](./frontend/AGENTS.md)** — React, TypeScript, Tailwind, shadcn/ui, TanStack Query, Jotai, Vitest
- **[backend/AGENTS.md](./backend/AGENTS.md)** — FastAPI, SQLAlchemy, Alembic, Pydantic, pytest, Ruff

Read the relevant sub-project `AGENTS.md` before making changes there.

---

## Project Overview

| Item | Value |
|------|-------|
| **Project** | {{PROJECT_NAME}} |
| **Type** | Full-stack monorepo (single git repo, two sub-projects) |
| **Frontend** | React 19 + TypeScript + Vite — `frontend/` |
| **Backend** | Python 3.12 + FastAPI — `backend/` |
| **Database** | PostgreSQL 16 (via Docker) |
| **Frontend port** | 5173 |
| **Backend port** | 8000 |

---

## Repository Structure

```
{{PROJECT_NAME}}/
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── lib/api.ts          # fetch wrapper — use this for all HTTP calls
│   │   ├── hooks/              # TanStack Query hooks (one per resource)
│   │   ├── components/ui/      # shadcn components (never hand-edit)
│   │   ├── pages/              # route-level components
│   │   ├── store/              # Jotai atoms
│   │   └── providers/ThemeProvider/
│   ├── package.json
│   ├── vite.config.ts          # /api proxy → http://localhost:8000
│   └── AGENTS.md
├── backend/
│   ├── app/
│   │   ├── main.py             # create_app() factory
│   │   ├── config.py           # pydantic-settings
│   │   ├── database.py         # async engine + get_db
│   │   ├── deps.py             # DbSession type alias
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic I/O schemas
│   │   ├── routers/            # FastAPI route handlers
│   │   ├── services/           # business logic
│   │   └── repositories/       # DB queries
│   ├── migrations/             # Alembic
│   ├── tests/
│   ├── docker-compose.yml      # Postgres dev (5432) + test (5433)
│   ├── pyproject.toml
│   └── AGENTS.md
├── Makefile                    # unified dev commands
├── .gitignore
├── README.md
└── AGENTS.md                   ← this file
```

---

## Development Commands

**After every major change: run tests and lint for both sub-projects.**

```bash
make test && make lint
```

| Command | Description |
|---------|-------------|
| `make dev` | Start frontend (5173) + backend (8000) in parallel |
| `make test` | Run all tests (frontend + backend) |
| `make lint` | Lint + format check both sub-projects |
| `make build` | Production build of frontend |
| `make db-up` | Start Postgres containers |
| `make db-migrate` | Apply Alembic migrations |
| `make db-revision` | Create a new migration (prompts for message) |

---

## Frontend ↔ Backend Integration

The Vite dev server proxies all `/api/*` requests to `http://localhost:8000`. No CORS configuration needed in development.

```
Browser → GET /api/things
       → Vite proxy (vite.config.ts)
       → FastAPI at http://localhost:8000/api/things  ← not yet — see below
```

**Important:** The backend registers routes under `/health`, `/things`, etc. (no `/api` prefix). The Vite proxy strips nothing. To align them, either:

- **Option A (recommended):** Add a global prefix in `backend/app/main.py`:
  ```python
  app.include_router(things.router, prefix="/api/things", tags=["things"])
  ```
- **Option B:** Adjust the Vite proxy to rewrite `/api` → `""` in `vite.config.ts`:
  ```ts
  proxy: { "/api": { target: "http://localhost:8000", rewrite: (p) => p.replace(/^\/api/, "") } }
  ```

Pick one approach and apply it consistently across all routers.

### Frontend API Pattern

```typescript
// frontend/src/hooks/use-things.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useThings() {
  return useQuery({
    queryKey: ["things"],
    queryFn: () => api.get<Thing[]>("/api/things"),
  });
}
```

---

## Adding a Full-Stack Feature (End-to-End Checklist)

### Backend

1. Add model: `backend/app/models/thing.py` (import in `backend/app/models/__init__.py`)
2. Generate migration: `make db-revision` → `uv run alembic upgrade head`
3. Add schemas: `backend/app/schemas/thing.py`
4. Add repository: `backend/app/repositories/thing.py`
5. Add service: `backend/app/services/thing.py`
6. Add router: `backend/app/routers/thing.py`, register in `backend/app/main.py`
7. Add tests: `backend/tests/test_things.py`

### Frontend

8. Add query hook: `frontend/src/hooks/use-things.ts`
9. Add page or component that uses the hook
10. Add route in `frontend/src/App.tsx` if it's a new page

---

## Environment Variables

| File | Purpose |
|------|---------|
| `backend/.env` | Live values (gitignored) |
| `backend/.env.example` | Committed template |

Frontend env vars use the `VITE_` prefix and live in `frontend/.env.local` (gitignored). Reference with `import.meta.env.VITE_*`.

---

## What NOT To Do

| Don't | Do instead |
|-------|-----------|
| Commit `backend/.env` | Use `backend/.env.example` as the template |
| Fetch directly in React components | Create a hook in `frontend/src/hooks/` |
| Call the DB in a FastAPI router directly | Go through a service and repository |
| Hand-edit `frontend/src/components/ui/` | Use `npx shadcn@latest add <component>` from `frontend/` |
| `git init` inside `frontend/` or `backend/` | One git repo at the monorepo root |
| Mix frontend and backend concerns | Keep sub-projects independent — they communicate via HTTP only |
