---
name: new-project
description: Scaffolds a new project — an OpenTeams React+TypeScript frontend (Vite, Tailwind v4, Nebari design system), a Python FastAPI backend (PostgreSQL, async SQLAlchemy, Alembic, pytest, uv), a full-stack monorepo with both wired together, or a vibe project (jbouder's personal Cloudflare app stack, built like holocron and datapad — Vite + React 19 + stock shadcn base-lyra on a Cloudflare Worker, bun, Biome, Vitest in workerd, Playwright + axe, pinned CI with deploy, PR previews and releases, and the docs, accessibility, security and motion rules). Not for static pages deployed through the Nebari Apps Pack — use new-nebari-app for those. Triggers on /new-project, "scaffold a new frontend", "create a React project", "new React app", "scaffold a new backend", "create a FastAPI project", "new FastAPI app", "bootstrap a frontend/backend app", "scaffold a monorepo", "create a full-stack project", "new full-stack app", "new vibe project", "start a vibe project", "new Cloudflare app like holocron/datapad".
argument-hint: <project-name> [--frontend | --backend | --monorepo | --vibe]
allowed-tools:
  - Write
  - Bash
  - Read
  - Glob
---

You are scaffolding a new project in one of four layouts. Follow every step below exactly and in order. Do not skip steps. Do not ask for confirmation between steps — execute everything autonomously.

| Layout | What it creates |
|---|---|
| `--frontend` | `$PROJECT_NAME/` — React 19 + TS + Vite + Tailwind v4 + Nebari + React Router + TanStack Query + Jotai + Vitest + Biome |
| `--backend` | `$PROJECT_NAME/` — Python 3.12 + FastAPI + async SQLAlchemy 2 + Alembic + Pydantic v2 + pytest + Ruff + uv |
| `--monorepo` | `$PROJECT_NAME/frontend/` + `$PROJECT_NAME/backend/` + a root `Makefile`, with the frontend's `/api` dev proxy pointed at the backend |
| `--vibe` | `$PROJECT_NAME/` — a personal Cloudflare app built like holocron and datapad: React 19 + TS + Vite + Tailwind v4 + stock shadcn `base-lyra` (Base UI, Oxanium, square, System/Light/Dark) on one Worker, bun, Biome, knip, Vitest in workerd, Playwright + axe (desktop and phone), pinned CI, deploy, PR previews, releases, and the docs. **Follow Pre-flight, then [Vibe Layout](#vibe-layout---vibe) instead of Steps 1–7.** |

All paths to `references/` and `assets/` are relative to this skill's directory.

## Pre-flight Checks

1. Parse `$ARGUMENTS`: the first non-flag token is `PROJECT_NAME`; `--frontend`, `--backend`, `--monorepo` or `--vibe` sets `LAYOUT`.
2. If `PROJECT_NAME` is empty, stop and tell the user: "Please provide a project name: /new-project <project-name> [--frontend | --backend | --monorepo | --vibe]"
3. If no flag was given, infer `LAYOUT` from the request: React / frontend / Vite → `frontend`; FastAPI / backend / API service → `backend`; full-stack / monorepo / "frontend and backend" → `monorepo`; vibe project / a personal or side project on Cloudflare / "like holocron" or "like datapad" → `vibe`. If the request doesn't say, ask which layout — this is the one question allowed before scaffolding.
4. If a directory named `$PROJECT_NAME` already exists in the current working directory, stop and tell the user: "Directory '$PROJECT_NAME' already exists. Choose a different name or remove the existing directory first."
5. For `backend` and `monorepo`: run `uv --version`. If it fails, stop and tell the user: "uv is required. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
   For `vibe`: run `bun --version`. If it fails, stop and tell the user: "bun is required. Install it with: curl -fsSL https://bun.sh/install | bash". Then check `PROJECT_NAME` is a valid Worker name (`^[a-z][a-z0-9-]{0,53}$`: lowercase letters, digits and dashes, room for a `-pr-<n>` preview suffix); if not, stop and suggest the nearest valid one.
6. Set `TARGET_DIR = <cwd>/$PROJECT_NAME` and the sub-project roots:

| Layout | `FRONTEND_DIR` | `FRONTEND_NAME` | `BACKEND_DIR` |
|---|---|---|---|
| `frontend` | `$TARGET_DIR` | `$PROJECT_NAME` | — |
| `backend` | — | — | `$TARGET_DIR` |
| `monorepo` | `$TARGET_DIR/frontend` | `$PROJECT_NAME-frontend` | `$TARGET_DIR/backend` |
| `vibe` | `$TARGET_DIR` (see Vibe Layout) | — | — |

7. For `vibe` only, work out the placeholder values the vibe references use:

| Placeholder | Value |
|---|---|
| `{{PROJECT_NAME}}` | `PROJECT_NAME` (also the Worker's name and the `localStorage` prefix) |
| `{{PROJECT_TITLE}}` | Its display name: the request's if it gives one, else `PROJECT_NAME` with dashes as spaces, each word capitalized (`tide-pool` → `Tide Pool`). No quotes or apostrophes: it lands in TS string literals. |
| `{{DESCRIPTION}}` | One plain sentence, ending in a period, saying what the app is, from the request (`Tide tables for the bay.`). If the request gives nothing to go on: `{{PROJECT_TITLE}} runs on Cloudflare.` No quotes. |
| `{{GITHUB_OWNER}}` | `gh api user --jq .login`; else `git config github.user`; else the literal `OWNER`, and say so in the report |
| `{{AUTHOR}}` | `git config user.name` |
| `{{YEAR}}` | `date +%Y` |
| `{{BUN_VERSION}}` | `bun --version` |
| `{{THEME_SCRIPT_HASH}}` | Left in place while writing; Step V3 computes it |

Only these `{{UPPER_CASE}}` tokens are placeholders. Leave every other double brace alone: GitHub expressions (`${{ github.ref }}`) and JSX objects (`route={{ name: 'home' }}`, `style={{ … }}`) are part of the files.

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
5. `ACCESSIBILITY.md` — from `assets/accessibility.md`. At the root, so GitHub shows it as an Accessibility tab beside the README.

---

## Step 3 — Frontend Files (`frontend` and `monorepo`)

Read ALL of `references/frontend-structure.md` before writing. Replace every `{{PROJECT_NAME}}` with `$FRONTEND_NAME`. Write into `$FRONTEND_DIR/`, creating parent directories as needed.

Root files:

1. `.gitignore`
2. `README.md`
3. `AGENTS.md` — from `assets/agents-frontend.md`
4. `ACCESSIBILITY.md` — from `assets/accessibility.md`. **`frontend` layout only**: a monorepo has it at its root (Step 2), not in `frontend/`.
5. `package.json`
6. `tsconfig.json`
7. `tsconfig.node.json`
8. `vite.config.ts`
9. `components.json` — includes the `@nebari` registry mapping
10. `biome.json`
11. `.env.example`
12. `index.html`

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

Accessibility:
  ACCESSIBILITY.md   → the WCAG 2.2 AA target, how it's checked, known exceptions
  /a11y-audit <url>  → audit the running app; then update ACCESSIBILITY.md's status
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

Accessibility:
  ACCESSIBILITY.md   → the WCAG 2.2 AA target, how it's checked, known exceptions
  /a11y-audit <url>  → audit the running app; then update ACCESSIBILITY.md's status

See AGENTS.md (root), frontend/AGENTS.md, and backend/AGENTS.md for full conventions.
```

---

## Vibe Layout (`--vibe`)

A vibe project is one of jbouder's personal apps on Cloudflare, built the way holocron, datapad and pulse are: the same stack, look, motion, accessibility bar, security headers, CI and release process from the first commit. `assets/agents-vibe.md` (written as the project's `AGENTS.md`) is the rulebook it ships with; `references/vibe-recipes.md` is what to add later (a Durable Object, Cloudflare Access, rate limits, WebLLM, MCP, more navigation, a collector, a docs site) — read it when the request already asks for one of those, and mention it in the report either way.

All paths below are relative to `$TARGET_DIR`. Replace the placeholders from Pre-flight item 7 in every file.

### Step V1 — Initialize the repository

```bash
mkdir -p "$TARGET_DIR" && cd "$TARGET_DIR" && git init -q
```

### Step V2 — Write the files

Read ALL of each reference before writing its files, and write every file it lists, exactly as given (they were generated from a scaffold that passed every check):

1. `references/vibe-config.md` — `.gitignore`, `package.json`, `biome.json`, `components.json`, the four `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `knip.jsonc`, `wrangler.jsonc`, `build-info.ts`, `index.html`, `public/_headers`, `public/favicon.svg`, `public/site.webmanifest`
2. `references/vibe-app.md` — `shared/`, `worker/`, and `src/` (except `src/components/ui/`, which Step V3 installs)
3. `references/vibe-tests.md` — `test/` and `e2e/`
4. `references/vibe-ci.md` — `.github/` (workflows, `scripts/preview-comment.sh`, `dependabot.yml`, the PR template) and `scripts/`
5. `references/vibe-docs.md` — `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `LICENSE`, `CLAUDE.md` and `docs/`
6. `AGENTS.md` — from `assets/agents-vibe.md`

> No `tailwind.config.ts`, `postcss.config.js`, ESLint or Prettier config: Tailwind v4 is configured in `src/index.css`, Biome is the linter and formatter. Do not add files the references don't list.

### Step V3 — Install, add the components, pin the CSP hash

```bash
cd "$TARGET_DIR" && bun install
```

Then the stock shadcn components, through the CLI (they are CLI-managed in this stack: never hand-written, never hand-edited). `components.json` already selects `base-lyra` with Phosphor icons:

```bash
cd "$TARGET_DIR" && bunx --bun shadcn@latest add button card dropdown-menu tooltip dialog input label --yes
```

Then fill `{{THEME_SCRIPT_HASH}}` in `public/_headers` with the SHA-256 of the inline theme script in `index.html` (the CSP allows that one script by hash):

```bash
cd "$TARGET_DIR" && HASH=$(python3 -I -c "import re,hashlib,base64; s=re.search(r'<script>([\s\S]*?)</script>', open('index.html').read()).group(1); print(base64.b64encode(hashlib.sha256(s.encode()).digest()).decode())") \
  && sed -i.bak "s|{{THEME_SCRIPT_HASH}}|$HASH|" public/_headers && rm public/_headers.bak
```

Then align Biome's schema with the installed CLI and format what the shadcn CLI wrote:

```bash
cd "$TARGET_DIR" && bunx biome migrate --write; bunx biome check --write .
```

If an install step fails (network), note it and continue; the checks in V4 will say what is missing.

### Step V4 — Verify

Run CI's `check` job locally, in order, and fix anything that fails before reporting (a failure here is a scaffold bug, not the user's problem):

```bash
cd "$TARGET_DIR" \
  && bunx wrangler types \
  && bunx biome ci . \
  && bunx knip \
  && bunx tsc -b \
  && bun run licenses \
  && bunx vite build \
  && bun run budget \
  && bunx vitest run
```

- `budget` fails only if dependencies drifted heavier than when the references were made: set `BUDGET_KB` in `scripts/budget.ts` to the measured value plus about 5%, and update its comment.
- `test/headers.test.ts` failing on the script hash means `index.html` changed after V3: recompute the hash.

Then the browser suite (about a minute; the first run needs Chromium):

```bash
cd "$TARGET_DIR" && bunx playwright install chromium && bunx playwright test
```

If Chromium cannot be installed here, skip it and say so in the report.

### Step V5 — First commit

```bash
cd "$TARGET_DIR" && git add -A && git commit -q -m "Scaffold $PROJECT_NAME"
```

Do not create a GitHub repository, push, or deploy: those are the user's calls, listed in the report.

### Step V6 — Report

Print the file list (as in Step 7, also excluding `dist/`, `.wrangler/`, `test-results/`), say which checks ran and passed (and anything skipped or failed), then:

```
✓ Scaffolded $PROJECT_NAME (vibe project)

Stack:
  React 19 + TypeScript + Vite · Tailwind CSS v4 · stock shadcn base-lyra (Base UI)
  Oxanium + JetBrains Mono · Phosphor icons · System / Light / Dark · square corners
  One Cloudflare Worker (static assets + /api) via @cloudflare/vite-plugin
  bun · Biome · knip · Vitest in workerd · Playwright + axe (desktop + phone)

Run it:
  cd $PROJECT_NAME
  npm run dev          → http://localhost:5173 (the Worker runs locally too)
  npm test             → Vitest in workerd: API, headers/CSP, theme contrast, motion tokens, workflow pins
  npm run e2e          → Playwright + axe, desktop and phone
  npm run check        → Biome
  npm run deploy       → build + wrangler deploy (after `npx wrangler login`)

Put it on GitHub (your call):
  gh repo create $GITHUB_OWNER/$PROJECT_NAME --public --source . --push
  Secrets CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID → deploy on green main, a preview Worker per PR
  A ruleset on main requiring: check, e2e, codeql (javascript-typescript), codeql (actions)
  (docs/self-hosting.md has every step)

Release:
  CHANGELOG.md's [Unreleased] → a version section, bump package.json, merge, tag vX.Y.Z (CONTRIBUTING.md)

Make it yours:
  The mark: public/favicon.svg and src/components/Mark.tsx (same shape)
  Pages: src/lib/router.ts (Route, parse, pathFor) + src/pages/ + a line in e2e/a11y.spec.ts
  API: an entry in ROUTES (worker/index.ts), its types in shared/, a test in test/api.test.ts
  More components: bunx --bun shadcn@latest add <name>

When it needs more (references/vibe-recipes.md in the new-project skill):
  saved or live state → a Durable Object · private → Cloudflare Access (and delete preview.yml)
  public create forms → Turnstile + rate limits · on-device AI → WebLLM · Claude → MCP

Rules: AGENTS.md (CLAUDE.md points at it), CONTRIBUTING.md, docs/design.md, ACCESSIBILITY.md
```

---

## Important Notes

- **Read references before writing**: Read the full reference and template files for each part before writing any of its files. Never guess at file contents.
- **Name substitution**: `{{PROJECT_NAME}}` becomes `$FRONTEND_NAME` in frontend files (so `<name>-frontend` in a monorepo) and `$PROJECT_NAME` everywhere else.
- **Placement**: in a monorepo, frontend files go in `frontend/`, backend files in `backend/`, and only the root `.gitignore`, `README.md`, `Makefile`, `AGENTS.md` and `ACCESSIBILITY.md` sit at `$TARGET_DIR/`.
- **`ACCESSIBILITY.md` only where there is a UI**: `frontend` and `monorepo` get one at `$TARGET_DIR/`; a `backend` project, an API with no UI, gets none.
- **Empty files**: `__init__.py`, `.gitkeep`, and `factories/__init__.py` files must be written as empty files.
- **Installs run unconditionally** after the files for that part are written.
- **Nebari components are upstream-managed**: `npx shadcn add @nebari/<name>` copies component source into `src/components/ui/`. Treat those files as managed — never hand-edit them (they are overwritten on upgrade). Extend at the call site via `className` (merged with `cn()`) or the Base UI `render` prop. See the `nebari-ui` skill.
- **Theme via CLI, not hand-copied**: the `:root`/`.dark` brand tokens come from `npx shadcn add @nebari/theme`. `src/index.css` intentionally ships only the Tailwind import, font imports, and base layer — do not paste token values into it.
- **Do not add extra files**: only create the files listed above.
- **Vibe placeholders**: only the `{{UPPER_CASE}}` tokens in Pre-flight item 7 are placeholders; `${{ … }}` in workflows and `{{ … }}` in JSX are code. `{{THEME_SCRIPT_HASH}}` is the one filled after writing (Step V3).
- **Vibe components are stock shadcn, not Nebari**: `src/components/ui/` comes from `bunx --bun shadcn@latest add` with the `base-lyra` style. Do not install `@nebari/*` or the `nebari-ui` skill in a vibe project.
- **Vibe templates are generated, not hand-kept**: the `vibe-*.md` references (except `vibe-recipes.md`) and `assets/agents-vibe.md` were generated from a scaffold that passed lint, knip, types, build, budget, Vitest and the Playwright + axe suite. To change them, never edit the Markdown by hand: `python3 -I scripts/vibe_refs.py scaffold <dir>` writes a project from them, change it there, run Steps V3 and V4 on it, then `python3 -I scripts/vibe_refs.py extract <dir>` regenerates them (the script's docstring has the loop).
