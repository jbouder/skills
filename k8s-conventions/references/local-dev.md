# Local Dev & Deploy Playbook

## Tilt + k3d — the inner loop

Local development runs the real chart on a throwaway cluster. The `Tiltfile` is the source of truth; read it for cluster name, namespace, and which values file it feeds.

### Start

```bash
k3d cluster create -c k3d-config.yaml    # one-time, per the repo's config (or: minikube start)
tilt up                                   # build image → import → helm install → port-forward → watch
# Tilt UI: http://localhost:10350
tilt down                                 # tear down workloads (cluster persists)
```

Many repos wrap this in `make up` / `make down` / `make dev` — prefer the existing target.

### Tiltfile anatomy (from `nebi/Tiltfile`)

```python
allow_k8s_contexts('k3d-nebi-dev')        # guard: refuse to run against any other context
is_ci = config.tilt_subcommand == "ci"     # branch behavior for `tilt ci`
k8s_namespace('nebi')                      # matches the Helm release name

# Build locally and import into k3d — NO registry push
custom_build(
    'nebi',
    'docker build -t $EXPECTED_REF . && k3d image import $EXPECTED_REF -c nebi-dev',
    ['./'],
    ignore=['./chart', './.git', './data', './docs'],
    skips_local_docker=True,
)

# Deploy the chart with the local test values
k8s_yaml(helm('./chart', name='nebi', namespace='nebi',
              values=['./chart/values-k8s-test.yaml']))

# Group + order resources, forward ports
k8s_resource(objects=['nebi:namespace', 'nebi-postgres:secret'],
             new_name='setup', labels=['setup'], pod_readiness='ignore')
k8s_resource('nebi-postgres', labels=['database'], resource_deps=['setup'],
             port_forwards='5432:5432')
k8s_resource('nebi-api', labels=['app'],
             resource_deps=['setup', 'nebi-postgres'], port_forwards='8460:8460')
```

Conventions:
- **`allow_k8s_contexts(...)`** pins the cluster — Tilt aborts if your `kubectl` context is something else. This is the guardrail against deploying local junk to a shared cluster. Keep it.
- **`custom_build` + `k3d image import`, `skips_local_docker=True`** — images go straight into k3d, never to a registry.
- **`resource_deps`** encodes ordering (setup → db → app). **`labels`** group the Tilt UI. **`port_forwards`** expose services on localhost.
- **`tilt ci`** runs the same graph headless to readiness then exits — use it to smoke-test the chart in CI.

## docker-compose

For repos (or sub-stacks) that don't need a cluster locally — typically just Postgres/Valkey for a backend, or a full app stack for quick runs.

```bash
docker compose up -d            # background; most-used in this org
docker compose logs -f <svc>
docker compose down             # add -v to drop volumes / reset data
```

Repos often have `docker-compose.dev.yml` / `docker-compose.prod.yml` / `docker-compose.gpu.yml` — pick with `-f`, or use the `make` target that selects it.

## Production — ArgoCD (GitOps)

Production never receives a manual `helm upgrade`. You change the chart/values in git; ArgoCD reconciles. Application shape (multi-source lets model/config live in a separate repo from the chart):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: <app>
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "7"        # ordering across apps; lower waves first
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: foundational
  sources:
    - repoURL: https://github.com/nebari-dev/<repo>.git
      targetRevision: v0.1.0-alpha.7           # PIN — this is the deployed version
      path: charts/<chart>
      helm:
        releaseName: <release>
        values: |
          platform:
            baseDomain: "your-cluster.example.com"
```

To ship a change: merge the chart/values change, then bump `targetRevision` to the new tag (or let auto-sync pick up the tracked branch). `sync-wave` orders dependent apps. Don't `kubectl edit` live objects — ArgoCD will revert them and you'll lose the change.

## Debugging playbook

```bash
kubectl get pods -n <ns>                          # what's running / crashing
kubectl describe pod <pod> -n <ns>                # events: scheduling, image pull, probes, OOM
kubectl logs <pod> -n <ns> [-c <container>] [-f]  # app logs; --previous for a crashed prior container
kubectl get events -n <ns> --sort-by=.lastTimestamp
k9s -n <ns>                                       # interactive: logs, shell, describe, port-forward
```

| Symptom | Likely cause | Check |
|---------|-------------|-------|
| `ImagePullBackOff` | tag missing / not imported | did `k3d image import` run? is `image.tag` real? |
| `CrashLoopBackOff` | app erroring at boot | `kubectl logs --previous`; usually config/env or DB unreachable |
| `CreateContainerConfigError` | missing Secret/ConfigMap | `describe` shows the missing ref |
| Pending forever | unschedulable (resources / GPU / PVC) | `describe` events; node capacity; StorageClass exists |
| Code change not reflected | old image still running | rebuild; with Tilt confirm the build triggered (UI) |
| Read-only FS write error | `readOnlyRootFilesystem` + unmounted write path | add an `emptyDir` volume + mount, don't disable the flag |
| Service unreachable | selector/label mismatch | `kubectl get endpoints <svc>` — empty ⇒ selector wrong |

When a chart change misbehaves, render it first — `helm template <name> . -f values-k8s-test.yaml` — and read the YAML before blaming the cluster.
