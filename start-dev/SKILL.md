---
name: start-dev
description: Launch one of the user's local-dev apps (nebi, nebari-landing, nebari-chat-pack, jhub-apps, nebari-llm-serving-pack, provenance-collector-pack, nebari-apps-pack, collab-hub-pack) in its fast inner-loop mode. Triggers on /start-dev, "start dev for <app>", "run <app> locally", "spin up <app>", "launch <app> for local development".
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
| `provenance-collector-pack`, `provenance`, `provenance-collector`, `pc` | provenance-collector-pack | `~/repos/provenance-collector-pack` |
| `nebari-apps-pack`, `apps-pack`, `apps`, `nebari-apps` | nebari-apps-pack | `~/repos/nebari-apps-pack` |
| `collab-hub-pack`, `collab-hub`, `collab`, `hub` | collab-hub-pack | `~/repos/collab-hub-pack` |

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

- **URLs (report once up):**
  - Frontend: http://localhost:8461
  - Backend API: http://localhost:8460
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

- **URLs (report once up):**
  - UI: http://localhost:5173 (Vite's default — confirm against the printed URL, Vite
    bumps the port if 5173 is busy)
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
- **URLs (report once up):**
  - UI: http://localhost:5173 (Vite's default — confirm against the printed URL)
  - Backend API: http://localhost:8000

If the user only wants one side, start just that process (and report only that side's URL).

---

### jhub-apps — `~/repos/jhub-apps`

JupyterHub with the JHub Apps launcher.

```sh
cd ~/repos/jhub-apps && export JHUB_APP_JWT_SECRET_KEY=$(openssl rand -hex 32) && uv run jupyterhub -f jupyterhub_config.py
```

- `jupyterhub` is not on the global PATH — it lives in the project's `.venv`, so run it
  via `uv run` (or activate `.venv` first).
- **URLs (report once up):**
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

- **URLs (report once up):**
  - UI: http://localhost:5173 (Vite's default — confirm against the printed URL)
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

### provenance-collector-pack — `~/repos/provenance-collector-pack`

Go Kubernetes pack: a collector CronJob + an **API-only** Go dashboard, plus a standalone
**React + TypeScript SPA** (`frontend/`, Vite + Tailwind + the Nebari design system) served
in production by its own nginx image. The Go dashboard no longer serves any HTML — hitting
`http://localhost:8080/` returns 404; the UI is the Vite dev server, which proxies `/api` to
the dashboard.

**Fast inner loop (default — no cluster).** Three steps: run the dashboard API against a
reports dir, seed it, then run the React UI. Steps 1 and 3 are long-running (background them);
step 2 is one-shot.

```sh
# 1. Dashboard API (background) — reads report JSON from a directory
cd ~/repos/provenance-collector-pack
mkdir -p /tmp/pc-reports
PROVENANCE_REPORT_PATH=/tmp/pc-reports \
PROVENANCE_DASHBOARD_ADDR=:8080 \
PROVENANCE_DASHBOARD_INTERNAL_ADDR=:8081 \
go run ./cmd/dashboard

# 2. Seed varied rows + timeline history (one-shot, another shell)
python3 dev/seed-reports.py http://localhost:8081/internal/reports

# 3. React UI via Vite (background, auth bypassed)
cd ~/repos/provenance-collector-pack/frontend && npm install && \
  VITE_DEV_NO_AUTH=true WEBAPI_URL=http://localhost:8080 npm run dev
```

- **URLs (report once up):**
  - UI: http://localhost:5173 (Vite's default — confirm against the printed URL)
  - Dashboard JSON API: http://localhost:8080 (API only — `/` 404s by design)
  - Internal upload endpoint: http://localhost:8081/internal/reports (what the seed
    script POSTs to)
  The UI is the Vite URL; Vite proxies `/api` → the dashboard at `:8080`.
- `VITE_DEV_NO_AUTH=true` skips the browser `keycloak-js` login and runs as a fixed `dev`
  identity. Without it the SPA redirects to a Keycloak it can't reach locally.
- With an empty reports dir the UI shows its empty state.
- **Run Scan** / `POST /api/scan` are disabled out-of-cluster by design (needs an in-cluster
  Job runner) — 503 locally. Everything else (filters, sort, timeline, detail drawer, export,
  Light/Dark/System theme) works. For UI/styling-only work you can skip step 1+2 and just run
  step 3 — the tables render their empty/error state.

**Full kind cluster mode (on request — "full cluster", "kind").** The `dev/Makefile` wraps
the whole loop: real chart (collector + dashboard API, http mode) on a kind cluster, seeded
with rich reports, with the UI still served by Vite (the frontend nginx image isn't built
locally).

```sh
cd ~/repos/provenance-collector-pack/dev
make cluster-create   # once — creates the 'provenance-dev' kind cluster
make ui-up            # build+load image, install chart (webUI on, frontend.enabled=false)
make seed             # port-forward internal :8081 + POST 3 timestamped reports
make ui-dev           # port-forward dashboard :8080 + start Vite at :5173 (blocks)
```

- **URLs (report once up):**
  - UI: http://localhost:5173
  - Dashboard API (port-forwarded): http://localhost:8080
  `make ui-dev` runs Vite in the foreground with `VITE_DEV_NO_AUTH=true` and manages the
  `:8080` port-forward for you.
- `dev/seed-reports.py` posts three historical scans (10/13/16 images) covering every UI
  state: signed/unsigned, verified, SLSA yes/no, SBOM spdx/cyclonedx, updates, long workload
  names for truncation, many namespaces for pagination, and Helm releases.
- Teardown: `make down` (deletes the kind cluster). `make -C dev` — no help target; read the
  `dev/Makefile` `.PHONY` line for the full target list.
- Collector-only targets (`deploy`, `test-run`) run configmap mode with the dashboard
  **disabled** — not useful for UI work.

---

### nebari-apps-pack — `~/repos/nebari-apps-pack`

Kubernetes software pack (Go apps-operator + FastAPI apps-api + React apps-ui + FastMCP
apps-mcp, one Helm chart). **Unlike the other apps, the primary dev mode here is the full
kind cluster** — the operator and API only run in-cluster. A UI-only Vite loop exists for
styling work (below).

**Full kind cluster (default for this app).** One target does everything: kind cluster
`nebari-apps-dev` + Envoy Gateway + cert-manager + Keycloak + nebari-operator, builds all
four `:dev` images, installs the `nebari-apps` chart, and deploys the `docs-site` example
App. **No port-forward and no `/etc/hosts`:** kind maps host ports 80/443 straight to the
gateway's NodePorts, and a local CoreDNS container (`nebari-dev-dns`, on `127.0.0.1:53535`)
wildcard-resolves `*.nebari.test` → 127.0.0.1.

```sh
cd ~/repos/nebari-apps-pack/dev && make up
```

- First run takes **5–10 min** (subsequent `make up` reuses the cluster).
- **One-time sudo (the only sudo in the flow):** macOS needs
  `/etc/resolver/nebari.test` pointing at the DNS container. `make up` (via `check-dns`)
  offers to install it only in an interactive shell — when running via the Bash tool it
  prints a WARNING instead and continues. If the file is missing, tell the user to run
  this themselves (e.g. via the `!` prefix), once per machine:
  `sudo sh -c 'mkdir -p /etc/resolver && printf "nameserver 127.0.0.1\nport 53535\n" > /etc/resolver/nebari.test'`
  The cluster itself works without it; only browser/host name resolution needs it.
- **Verify before reporting success** (works even without the resolver file):
  `curl -s -o /dev/null -w '%{http_code}' -H 'Host: apps.nebari.test' http://localhost/`
  should print `200`. DNS check: `dig @127.0.0.1 -p 53535 anything.apps.nebari.test`
  should answer 127.0.0.1.
- **Reused cluster gotchas:**
  - `make up` rebuilds and `kind load`s the `:dev` images but does **not** restart pods
    (same tag → no rollout). After `make up` on a reused cluster, run `make redeploy` (or
    `kubectl rollout restart deploy -n nebari-apps` + `rollout status`).
  - A cluster created **before the NodePort routing change** (URLs time out): port
    mappings only apply at cluster creation — recreate with `make down && make up`.
- **URLs (report once up — plain HTTP, TLS and auth are disabled locally; type `http://`
  explicitly, browsers force-upgrade bare hostnames):**
  - UI: http://apps.nebari.test
  - MCP endpoint: http://apps.nebari.test/mcp
  - Example app: http://docs-site.apps.nebari.test
  - Any launched app: `http://<name>.apps.nebari.test` — reachable as soon as its route
    reconciles, nothing else to run.
- Auth is off locally (`api.auth.enabled=false`): the kind stack's Keycloak issuer is
  in-cluster only, so browser keycloak-js logins can't complete. On a real cluster leave
  auth on and set `keycloak.url`.
- Expected noise during setup: the operator install script's "waiting for LoadBalancer
  address" / "Gateway not yet programmed" warnings are fine — no LoadBalancer provider is
  installed; the gateway Service switches to NodePort right after.
- If `kind create` fails with a port-binding error, something on the host already uses
  port 80/443 — free it (preferred) or edit `hostPort` in `dev/kind-config.yaml`.
- Iterate: `make redeploy` rebuilds all images and rolls the four Deployments.
  `make up-git` additionally deploys the git-sourced `team-site` example (gateway
  SSO-enforced). Teardown: `make down` (deletes the kind cluster; the DNS container is
  intentionally left running — remove with `docker rm -f nebari-dev-dns`).

**UI-only inner loop (styling work).** Vite at http://localhost:5173, proxying `/api` →
`http://localhost:8000` (override with `API_URL`). No auth-bypass flag needed — the UI
reads runtime config from the API and defaults to auth-off when it's absent.

```sh
# Optional, for real data from a running kind cluster:
kubectl port-forward -n nebari-apps svc/nebari-apps-api 8000:8080

cd ~/repos/nebari-apps-pack/ui && npm install && npm run dev
```

- **URLs (report once up):**
  - UI: http://localhost:5173 (Vite's default — confirm against the printed URL)
  - API (only if the port-forward above is running): http://localhost:8000
- Without a backend the pages render their empty/error states — fine for UI-only work.

---

### collab-hub-pack — `~/repos/collab-hub-pack`

Backend-only Nebari software pack: a Python 3.14 **FastAPI** service (`api/`) exposing
Frames, connectors, the user directory and an MCP server. There is no frontend to run; the
fast inner loop is the API process alone with **unsafe dev auth**, frames on the local
filesystem and every other store in-memory. No cluster, no Keycloak, no Postgres.

```sh
cd ~/repos/collab-hub-pack/api && uv sync --python 3.14 && \
mkdir -p /tmp/collab-hub-frames && \
FRAMES_UNSAFE_AUTH_ENABLED=true DEV_AUTH_ENABLED=true DEV_AUTH_USER=dev \
COLLAB_HUB_API__SERVER__PORT=8010 \
COLLAB_HUB_API__STORAGE__FRAMES_PATH=/tmp/collab-hub-frames \
uv run --python 3.14 python -m collab_hub_api
```

- **URLs (report once up):**
  - Landing page: http://127.0.0.1:8010
  - API docs (Swagger): http://127.0.0.1:8010/docs (ReDoc at `/redoc`, spec at `/openapi.json`)
  - Health: http://127.0.0.1:8010/health
  - Frames API: http://127.0.0.1:8010/v1/frames (returns `[]` on a fresh start)
  - MCP endpoint (streamable HTTP): http://127.0.0.1:8010/mcp
- **Verify before reporting success:** `curl -s -w ' %{http_code}' http://127.0.0.1:8010/v1/frames`
  should print `[] 200`. A 401 means one of the three dev-auth vars is missing.
- **Port:** the server default is `127.0.0.1:8000`, but that port is usually taken on this
  machine (an unrelated `wfr_web` app). Use `COLLAB_HUB_API__SERVER__PORT=8010`; if uvicorn
  logs `address already in use`, pick another port — don't kill the other process. Check
  with `lsof -nP -iTCP:<port> -sTCP:LISTEN`.
- **Python:** the project requires `>=3.14`. Plain `uv sync` may resolve to a 3.13
  interpreter and refuse; always pass `--python 3.14` to both `uv sync` and `uv run`.
- **Dev auth** needs all three: `FRAMES_UNSAFE_AUTH_ENABLED=true`, `DEV_AUTH_ENABLED=true`
  and `DEV_AUTH_USER=<subject>`. Requests then run as that user with no bearer token. Never
  set these outside local runs. Without them every `/v1/*` call needs a real Keycloak token.
- **Config** is env-only (no `.env` file is read): prefix `COLLAB_HUB_API__`, nested
  delimiter `__` — e.g. `COLLAB_HUB_API__SERVER__PORT`. The default frames path is
  `/var/frames` (not writable locally), hence the `STORAGE__FRAMES_PATH` override.
- **What's off locally:** Postgres-backed features (frame history, groups, orgs,
  invitations, usage) answer "unavailable" unless `COLLAB_HUB_API__FRAMES__POSTGRES__URL`
  is set; connectors (Slack/Google/GitHub) need their credentials; the browser web surface
  (`/web/*`, `/invite/accept`) is disabled unless `COLLAB_HUB_API__WEB__CLIENT_ID` is set
  (see `docs/web-surface.md`); the Keycloak user directory is disabled. Fine for API work.
- Logs are JSON lines (non-TTY); `python -m collab_hub_api` has no hot reload — restart
  after code changes. Tests: `cd api && uv run --python 3.14 pytest`.
- **Full local stack (on request — "with Keycloak", "web surface", "invitations",
  "registration", "compose").** `dev/docker-compose.yaml` runs Keycloak 26 (realm `nebari`,
  admin `admin`/`admin`), Postgres 16, a fake SES v2 relay and Mailpit; the API still runs on
  the host (the web surface only accepts a plain-http issuer on loopback). Two long-running
  commands (background both), then a one-shot:

  ```sh
  make -C ~/repos/collab-hub-pack/dev up        # pulls images first time; waits for health
  make -C ~/repos/collab-hub-pack/dev api       # API on :8010 with dev/api.env (auto-migrates)
  make -C ~/repos/collab-hub-pack/dev operator  # after the API is up: grants `operator` the platform role
  ```

  - **URLs (report once up):** API http://localhost:8010 · sign-in http://localhost:8010/web/signin
    · operator invitations http://localhost:8010/admin/invitations · owner invitations
    http://localhost:8010/web/org/invitations · Keycloak admin http://localhost:8080/admin/ ·
    Mailpit http://localhost:8025 (all emails land here).
  - Seeded users `operator` and `owner`, password `password`. Self-registration is on with
    email verification (verification mail → Mailpit). Full walkthrough: `dev/README.md`.
  - Verify: `curl -s -H "Authorization: Bearer $T" http://localhost:8010/v1/frames` with a
    password-grant token from client `apollo-desktop` returns `no_organization` 403 (correct
    for membership mode). `make -C dev status` shows 4 healthy containers.
  - Do **not** run the dev-auth mode on :8010 at the same time (port clash). `make -C dev
    down` keeps data, `make -C dev reset` drops it (realm edits need a reset to re-import).
- Full cluster mode (only on request): `make -C dev cluster` creates the software-pack-template
  kind cluster (MetalLB + Envoy Gateway + cert-manager + Keycloak + nebari-operator); the
  template's `up-*` targets reference example charts that don't exist in this repo. Deploy
  the real chart via the smoke scripts (`scripts/smoke_local_collab_hub_features_kind.sh`)
  or `helm upgrade --install collab-hub-pack ./helm/collab-hub -f values-example.yaml`.
  Teardown `make -C dev kind-down`.

---

## After launching

Always end with the app's **URLs list** (from its section above, corrected for what
actually started — e.g. the real Vite port, or only the processes that were launched),
plus: which command was run and any env var the user still needs to set. Note that the
server is running in the background and how to stop it (Ctrl+C / the background-task
controls).
