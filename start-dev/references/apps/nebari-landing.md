# nebari-landing — `~/repos/nebari-landing`

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
