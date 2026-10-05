# jhub-apps — `~/repos/jhub-apps`

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
