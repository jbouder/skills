# nebari-chat-pack — `~/repos/nebari-chat-pack`

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
