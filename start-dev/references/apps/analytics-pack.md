# analytics-pack — `~/repos/analytics-pack`

Nebari software pack that deploys Umami 3.4 (cookieless web analytics) with a builtin
Postgres, in one Helm chart (`chart/`). It also has a React sample app with the tracker
pre-wired (`examples/sample-app/`) and an Astro docs site (`docs/`). Umami only runs on a
cluster, so the fast loop is the **standalone kind mode**: no operator, Keycloak or
gateway, and access is through a port-forward. `dev/Makefile` wraps it.

**Kube context: watch it.** `dev/Makefile` never passes `--context`. `kind create` switches
the current context to the new cluster, but when the cluster **already exists**, helm
installs into whatever context is current. That might be `kind-nebari-local`. Before any
`make -C dev ...` target, run `kubectl config current-context`. If the
`analytics-pack-dev` cluster exists and the context isn't `kind-analytics-pack-dev`, switch
with `kubectl config use-context kind-analytics-pack-dev`. Pass
`--context kind-analytics-pack-dev` on every kubectl command below.

**Standalone (default).** Umami runs on kind cluster `analytics-pack-dev`.

```sh
cd ~/repos/analytics-pack && make -C dev up-standalone      # one-shot; waits up to 5m
kubectl --context kind-analytics-pack-dev port-forward svc/analytics-pack 3000:3000   # background
```

- **Verify before reporting success:**
  `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/script.js` should print
  `200`.
- **Sign in:** user `admin`. The bootstrap Job rotates the password into a Secret:
  `kubectl --context kind-analytics-pack-dev get secret analytics-pack-secrets -o jsonpath='{.data.admin-password}' | base64 -d`
- If 3000 is taken (`lsof -nP -iTCP:3000 -sTCP:LISTEN`), don't kill the process using it.
  The sample app's `public/config.json` hard-codes `http://localhost:3000/script.js`, so
  tell the user about the clash rather than silently switching ports.

**Sample app (optional; run it when the user wants to see events arrive).** Vite with
Umami at :3000, so it needs the standalone port-forward above. No auth flag is needed:
Keycloak in the app is opt-in.

```sh
cd ~/repos/analytics-pack/examples/sample-app && npm install && npm run dev   # background
```

- The `localhost` website id and tracker URL are already in `public/config.json`, and
  standalone mode declares that website, so page views and events show up in Umami's
  realtime view right away.

- **URLs (report once up):**
  - Umami dashboard: http://localhost:3000
  - Tracker script: http://localhost:3000/script.js
  - Sample app: http://localhost:5173 (Vite's default; confirm against the printed URL)

**Docs site (on request: "docs").** Astro and Starlight.
`cd ~/repos/analytics-pack && make docs` serves http://localhost:4321 (Astro's default;
confirm against the printed URL). Run it in the background.

**Checks (before a PR):** `make test` (chart lint and template, plus pack-metadata),
`make sample-test` and `make docs-test`, all from the repo root.

**Full Nebari kind mode (on request: "with SSO", "full cluster", "operator").** Run
`make -C dev up` (same context caveat). It builds `analytics-pack-dev` with MetalLB, Envoy
Gateway, cert-manager, Keycloak and nebari-operator, then installs the chart behind a
`NebariApp` at https://analytics.nebari.local. `make -C dev sample-up` adds the sample app
at https://sample.nebari.local. Both run the operator's `update-hosts.sh`, which edits
`/etc/hosts` and needs sudo, so the user may have to run `make -C dev update-hosts`
themselves. **This clashes with nebari-local**, which serves the same
`analytics.nebari.local` hostname. Check `/etc/hosts` and say which cluster the name points
at. `make -C dev up-standalone` and `make -C dev up` reuse the same cluster name.

**Already on nebari-local.** The pack is deployed there by ArgoCD (Application
`analytics-pack`, namespace `analytics`) at https://analytics.nebari.local. If the user
just wants the running pack, start nebari-local instead (see `nebari-local.md`). That
Application pulls `chart/` from GitHub `nebari-dev/analytics-pack` at `main` (private repo,
credential minted by nebari-local's `post-recreate.sh`), so local chart edits only reach it
once they're pushed to `main`. Its values live in
`~/repos/nebari-local/gitops/apps/analytics-pack.yaml`.

- **Teardown:** `make -C dev down` deletes the `analytics-pack-dev` kind cluster. Stopping
  the background tasks ends the port-forward and Vite.
