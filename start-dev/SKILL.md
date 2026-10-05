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

Each app's recipe — commands, ports, env vars, URLs, gotchas, and cluster mode — lives in
**`references/apps/<app>.md`** (named after the App column above). Read only the matched
app's file, then follow it.

Dev servers are long-running. **Start each server with `run_in_background: true`**, then
report the URL(s) the user should open. After starting, briefly tail the background output
to confirm it came up (no immediate crash) before reporting success. If a documented command
fails, check that repo's `README.md` / `Makefile` — these commands may drift. When you find
drift, offer to fix the app's recipe file.

## After launching

Always end with the app's **URLs list** (from its recipe, corrected for what actually
started — e.g. the real Vite port, or only the processes that were launched), plus: which
command was run and any env var the user still needs to set. Note that the server is running
in the background and how to stop it (Ctrl+C / the background-task controls).

## Adding an app

Write `references/apps/<app>.md` in the same shape as the others (heading with repo path,
one-line summary, the local-mode commands, URLs, notes, then cluster mode), add a row to
the table above, and add the app name to the `description` so it triggers.
