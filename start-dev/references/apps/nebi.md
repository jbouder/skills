# nebi — `~/repos/nebi`

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
