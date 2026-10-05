# collab-hub-pack — `~/repos/collab-hub-pack`

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
