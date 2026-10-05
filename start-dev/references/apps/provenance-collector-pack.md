# provenance-collector-pack — `~/repos/provenance-collector-pack`

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
