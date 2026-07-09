---
name: k8s-deploy
description: OpenTeams Kubernetes deploy & local-dev conventions — Helm charts, Tilt + k3d/minikube inner loop, docker-compose, ArgoCD, and kubectl/k9s debugging. Use when writing or editing Helm charts (Chart.yaml, values.yaml, templates), Tiltfiles, docker-compose files, or ArgoCD Applications, when running a service locally on a cluster, or when debugging a deployment (pods crashing, images not updating, services unreachable).
---

# OpenTeams Kubernetes Deployment

How services ship and run on Kubernetes in this org. Every backend repo carries a `helm/` (or `chart/`) directory, most carry a `Tiltfile` for the local inner loop, and production rolls out via ArgoCD. Follow these when touching any of that.

## The Stack

| Concern | Tool |
|---------|------|
| Packaging | **Helm** charts (`helm/<name>/` or `chart/`) |
| Local inner loop | **Tilt** + **k3d** (or minikube) |
| Local-only / non-k8s dev | docker-compose |
| Production rollout | **ArgoCD** Applications (GitOps) |
| Image registry | `quay.io/nebari/<name>` |
| Live debugging | `kubectl`, **k9s** |

## First Moves In Any Repo

1. Is there a `Tiltfile`? → local dev runs on a cluster via Tilt. Read it for the cluster name, namespace, and which `values-*.yaml` it feeds Helm.
2. `helm/<name>/` or `chart/`? → the Helm chart. Read `values.yaml` (+ `values.schema.json` if present) before editing templates.
3. `docker-compose*.yml`? → lightweight local stack (often just Postgres/Valkey), or an alternative to the cluster loop.
4. `Makefile` — repos wrap common flows (`make up`, `make down`, `make dev`). Prefer the existing target over inventing a command.
5. ArgoCD `Application` YAML (in-repo or in a deploy repo) → how it reaches production. Note `targetRevision` and `sync-wave`.

Match the repo's existing structure. The patterns below are the org default, not a mandate to restructure.

## Non-Negotiables

- **Never `kubectl apply` / `helm upgrade` straight to a production cluster.** Production is GitOps — change the chart or values in git and let ArgoCD sync. Manual changes drift and get reverted.
- **Pin image tags in production values.** No `:latest`. The chart falls back to `appVersion`; set an explicit tag for a release.
- **Secrets never go in `values.yaml` or git.** Reference an existing Secret (`existingConfigMap`/secret refs, `kubectl create secret`, or the cluster's secret manager).
- **Keep the security context.** Charts run `runAsUser/Group/fsGroup: 1000` with `readOnlyRootFilesystem: true`. Don't drop these to "make it work" — add a writable `emptyDir` volume/mount instead.
- **`helm lint` + `helm template` before committing chart changes.** Render it and read the output; a template that lints can still produce broken YAML.
- **Use a `values-*-test.yaml` (or `values-k8s-test.yaml`) for the local cluster**, separate from production values. Don't point Tilt at production values.

## Reference Files

- **`references/helm.md`** — chart layout, the org `values.yaml` conventions (image, securityContext, resources, config inline/existingConfigMap, extraEnv), the `_helpers.tpl`/`_env.tpl`/`_validate.tpl` template trio, `values.schema.json`, and how to add a new templated resource.
- **`references/local-dev.md`** — the Tilt + k3d inner loop (cluster create, `custom_build` + image import, `k8s_resource` grouping, port-forwards, `tilt ci`), docker-compose usage, the ArgoCD Application shape, and a kubectl/k9s debugging playbook.

## What NOT To Do

| Don't | Do instead |
|-------|-----------|
| `helm upgrade` / `kubectl apply` to prod | Commit to git; ArgoCD syncs |
| `image.tag: latest` in prod values | Pin an explicit tag |
| Secrets in values.yaml or committed | Reference an existing Secret / create out-of-band |
| Drop `readOnlyRootFilesystem` to get writes | Mount an `emptyDir` at the writable path |
| Point Tilt at production values | Use `values-k8s-test.yaml` |
| Hand-write a one-off `kubectl run` for local dev | `tilt up` (or the repo's `make` target) |
| Edit templates without rendering | `helm template . -f values-k8s-test.yaml` and read it |
| Guess at chart values shape | Read `values.schema.json` / `values.yaml` first |
