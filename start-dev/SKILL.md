---
name: start-dev
description: Launch one of the user's local-dev apps (nebi, nebari-landing, nebari-chat-pack, jhub-apps, nebari-llm-serving-pack) in its fast inner-loop mode. Triggers on /start-dev, "start dev for <app>", "run <app> locally", "spin up <app>", "launch <app> for local development".
---

# start-dev

Starts a named app in its **lightweight local mode** (fast inner loop), not the full
Kubernetes cluster mode. Cluster mode is documented per app but only used when the user
explicitly asks for it ("full cluster", "k8s", "minikube", "k3d", "Tilt").

## Usage

The user names an app (e.g. `/start-dev nebi`, "spin up the chat pack"). Match loosely:

| Alias / mention | App | Repo |
|---|---|---|
| `nebi` | nebi | `~/repos/nebi` |
| `nebari-landing`, `landing` | nebari-landing | `~/repos/nebari-landing` |
| `nebari-chat-pack`, `chat`, `chat-pack` | nebari-chat-pack | `~/repos/nebari-chat-pack` |
| `jhub-apps`, `jhub`, `jupyterhub` | jhub-apps | `~/repos/jhub-apps` |
| `nebari-llm-serving-pack`, `llm-serving`, `llm-pack`, `key-manager` | nebari-llm-serving-pack | `~/repos/nebari-llm-serving-pack` |

If no app is named or the match is ambiguous, list the apps and ask which one.

## How to run

Dev servers are long-running. **Start each server with `run_in_background: true`**, then
report the URL(s) the user should open. After starting, briefly tail the background output
to confirm it came up (no immediate crash) before reporting success. If a documented command
fails, check that repo's `README.md` / `Makefile` — these commands may drift.

---

### nebi — `~/repos/nebi`

Full-stack Go app with hot reload (frontend + backend together).

```sh
cd ~/repos/nebi && make dev
```

- Frontend: http://localhost:8461
- Backend: http://localhost:8460
- API docs: http://localhost:8460/docs
- Auto-installs `air` and frontend `node_modules` if missing. Loads `.env` if present
  (warns if absent — defaults are fine for local).
- Variants: `make run` (no hot reload), `make up` (full k3d + Tilt cluster — only on request).

---

### nebari-landing — `~/repos/nebari-landing`

Frontend-only inner loop. The Vite dev server uses **MSW mocks by default**, so no backend
or cluster is needed.

```sh
cd ~/repos/nebari-landing/frontend && npm install && npm run dev
```

- Opens on Vite's default port (http://localhost:5173) — read the printed URL.
- To hit a real webapi instead of mocks, the dev server proxies `/api` to
  `http://localhost:8080` (override with `WEBAPI_URL`); the user must run a webapi separately.
- Full cluster mode (only on request): `make -f dev/Makefile setup` (minikube + Keycloak +
  webapi). See `dev/QUICKSTART.md`.

---

### nebari-chat-pack — `~/repos/nebari-chat-pack`

Two processes: a Ravnar backend and a Vite frontend. Start the **backend first**, then the
frontend.

Backend (serves on :8000, reads `config.yml` from the cwd):
```sh
cd ~/repos/nebari-chat-pack/backend && uv run ravnar serve
```
- Requires `OPENROUTER_API_KEY` in the environment (the config references
  `{{ OPENROUTER_API_KEY }}`). If it's unset, tell the user to export it before starting.

Frontend (proxies `/api` → `http://localhost:8000`, auth disabled for local):
```sh
cd ~/repos/nebari-chat-pack/frontend && npm install && npm run dev
```
- The `.env` should have `VITE_API_URL=http://localhost:8000` and `VITE_AUTH_ENABLED=false`
  (copy from `.env.example` if `.env` is missing).
- Open the Vite URL printed in the terminal.

If the user only wants one side, start just that process.

---

### jhub-apps — `~/repos/jhub-apps`

JupyterHub with the JHub Apps launcher.

```sh
cd ~/repos/jhub-apps && export JHUB_APP_JWT_SECRET_KEY=$(openssl rand -hex 32) && uv run jupyterhub -f jupyterhub_config.py
```

- `jupyterhub` is not on the global PATH — it lives in the project's `.venv`, so run it
  via `uv run` (or activate `.venv` first).

- Launcher: http://127.0.0.1:8000/hub/home (log in with any username + password `password`)
- Service API docs: http://127.0.0.1:10202/services/japps/docs
- First-time setup (only if deps are missing): `uv sync --extra dev`, and for the React UI
  `cd ui && npm install`.
- Full k3d/Tilt cluster mode (only on request): `cd k3s-dev && make up` → http://localhost:8000.

---

### nebari-llm-serving-pack — `~/repos/nebari-llm-serving-pack`

React + Vite frontend for the LLM API key-manager. The fast inner loop runs the frontend
only, with **auth bypassed** (a fixed "dev" identity, no Keycloak):

```sh
cd ~/repos/nebari-llm-serving-pack/frontend && npm install && VITE_DEV_NO_AUTH=true npm run dev
```

- Opens on Vite's default port (http://localhost:5173) — read the printed URL.
- `VITE_DEV_NO_AUTH=true` skips Keycloak and runs as user `dev` (mirrors the backend's
  `LLM_DEV_MODE`). Without it, the app redirects to a Keycloak login it can't reach locally.
- The dev server proxies `/api` (and `/logout`) to the key-manager at `http://localhost:8080`
  (override with `WEBAPI_URL`). With **no** backend running, the app loads but the keys table
  shows its error/empty state — fine for UI/styling work. For real data, run a key-manager on
  :8080 (or use full cluster mode below).
- Full cluster mode (only on request): `cd dev && make run-dev` — k3d cluster + models +
  port-forward + hot-reload UI. Needs `dev/.env` with `OPENROUTER_API_KEY`. `make -C dev help`
  lists the individual targets.

---

## After launching

Report: which command was run, the URL(s) to open, and any env var the user still needs to
set. Note that the server is running in the background and how to stop it (Ctrl+C / the
background-task controls).
