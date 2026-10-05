# nebari-llm-serving-pack — `~/repos/nebari-llm-serving-pack`

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
