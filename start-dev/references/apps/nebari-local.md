# nebari-local — `~/repos/nebari-local`

The local Nebari cluster every pack runs on: NIC `local` provider (kind cluster
`nebari-local`, kubectl context `kind-nebari-local`, MetalLB) plus the GitOps tree ArgoCD
syncs from via `file://`. **There's no dev server.** "Starting" it means making sure the
cluster is up and running the gateway port-forward, which has to keep running. The repo's
`README.md` is the source of truth. Re-check it if anything below drifts.

**1. Check the cluster exists and is healthy.**

```sh
kind get clusters                                   # expect: nebari-local
kubectl --context kind-nebari-local get nodes       # expect: Ready
```

- If the node container is stopped (Docker Desktop restarted), start it with
  `docker start nebari-local-control-plane` and wait for the node to be `Ready`.
- **No cluster? Don't create one without asking.** A fresh deploy is long and heavy (it
  needs a Docker Desktop VM with about 12+ CPUs and 40+ GB of memory, see README "Minimum
  specs"). With the user's go-ahead, run it in the background:
  `cd ~/repos/nebari-local && nic deploy -f nebari-config.yaml`, then
  `./scripts/post-recreate.sh` (idempotent, so re-running it is always safe). After a
  recreate, the user has to trust the newly minted root CA themselves:
  `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /tmp/nebari-local-root-ca.pem`

**2. Start the gateway port-forward.** One forward serves every service and pack, because
Envoy routes them by hostname. It needs sudo to bind 443.

- **Already running?** Run the verify curl below first. If it answers, don't start a
  second forward. (`lsof` without sudo can't see the root-owned listener, so it isn't a
  reliable check.)
- **Sudo password: use a macOS dialog.** Neither the Bash tool nor `!`-prefixed commands
  have a terminal, so a plain `sudo` (or `! sudo -v`) fails with "a terminal is required
  to read the password". Use `sudo -A` with an askpass helper that pops a native password
  dialog. Write the helper to the session scratchpad (`chmod 700`):

```sh
#!/bin/sh
exec osascript -e 'text returned of (display dialog "sudo password for the nebari-local port-forward (kubectl, port 443):" default answer "" with hidden answer with title "Claude Code: sudo" with icon caution)'
```

- Start the forward with `run_in_background: true`, then tell the user a **"Claude Code:
  sudo"** dialog is waiting for their Mac password. If `sudo -n true` already succeeds
  (cached credentials), plain `sudo` works and no dialog appears.

```sh
SUDO_ASKPASS=<scratchpad>/askpass.sh sudo -A kubectl --context kind-nebari-local \
  port-forward -n envoy-gateway-system \
  svc/envoy-envoy-gateway-system-nebari-gateway-be66687c 443:443
```

- **Wait for the password, don't poll by hand.** Start a second background Bash command
  that loops (about 1s apart, giving up after about 5 min) until the verify curl returns
  2xx/3xx, or until the forward's output file shows a sudo error ("incorrect password",
  "no password", "cancel"). You get one notification when it ends.

- If the service name changed (it has a hash suffix), look it up with
  `kubectl --context kind-nebari-local -n envoy-gateway-system get svc` and use the
  `envoy-envoy-gateway-system-nebari-gateway-*` one.
- Forward on **443 only**. Keycloak redirects drop the port, so 8443 or any other port
  breaks login.
- **Verify before reporting success.** This works even without `/etc/hosts`:
  `curl -sk -o /dev/null -w '%{http_code}' --resolve nebari.local:443:127.0.0.1 https://nebari.local/`
  should print a 2xx or 3xx code.
- The forward drops sometimes, and `post-recreate.sh` restarts the envoy proxy, which
  kills it. If pages stop loading, restart the forward.

**3. Host prerequisites (one-time, user runs them).** `/etc/hosts` needs a `127.0.0.1`
entry for every hostname. The current full line is in README "Access". There are no
wildcards, so each Apps-pack app needs its own `<name>.apps.nebari.local` entry. If
`grep nebari.local /etc/hosts` shows any missing, give the user the README line to run.

- **URLs (report once the forward is up).** Each one shows a self-signed-cert warning once
  unless the root CA is trusted.
  - Landing page: https://nebari.local (links to every installed pack)
  - Keycloak: https://keycloak.nebari.local
  - ArgoCD: https://argocd.nebari.local
  - Packs: hub, nebi, chat, provenance, apps, harbor, frames, analytics, llm-keys and
    llm (all `.nebari.local`). See the README "Software packs" table.
- **Sign-in** (username `admin`, nebari realm):
  `kubectl --context kind-nebari-local -n keycloak get secret nebari-realm-admin-credentials -o jsonpath='{.data.password}' | base64 -d`
  The README "Credentials" section has the Keycloak master and ArgoCD secrets.
- **Stopping:** stopping the background task ends the forward and leaves the cluster
  running. Full teardown is `nic destroy -f nebari-config.yaml`. Confirm with the user
  first, since it can't be undone.
- Pack changes go through git: ArgoCD reads this repo over `file://`, so commit locally.
  To pick up a change fast, run
  `kubectl --context kind-nebari-local -n argocd annotate applications.argoproj.io nebari-root argocd.argoproj.io/refresh=hard --overwrite`.
