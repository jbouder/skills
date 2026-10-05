# nebari-apps-pack — `~/repos/nebari-apps-pack`

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
