# Helm Chart Conventions

Based on the org charts (`ravnar/helm/ravnar`, `nebi/chart`, `nebari-llm-serving-pack/charts`).

## Chart Layout

```
helm/<name>/
├── Chart.yaml
├── values.yaml
├── values.schema.json          # JSON Schema validating values.yaml — keep in sync
├── values-k8s-test.yaml         # local-cluster overrides (Tilt feeds this)
└── templates/
    ├── _helpers.tpl             # name/label/selector helpers
    ├── _env.tpl                 # shared env-var block (DRY across deployment + jobs)
    ├── _validate.tpl            # fail-fast assertions on required values
    ├── <name>-deployment.yaml
    ├── <name>-service.yaml
    ├── <name>-ingress.yaml
    ├── <name>-configmap.yaml
    ├── postgres-statefulset.yaml
    ├── postgres-service.yaml
    ├── postgres-secret.yaml
    └── persistent-file-storage-pvc.yaml
```

## values.yaml conventions

Annotate every value with a `# --` comment (the charts use helm-docs style). Canonical shape:

```yaml
# -- Override the chart's default name / fullname
nameOverride: ""
fullnameOverride: ""

# -- Replicas for the main app pod
replicaCount: 1

image:
  # -- Main application image repository
  repository: quay.io/nebari/<name>
  # -- Image tag. Empty ⇒ chart appVersion is used. PIN in production.
  tag: ""
  pullPolicy: IfNotPresent

securityContext:
  pod:
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
  container:
    readOnlyRootFilesystem: true

resources:
  # Org convention: limits == requests (predictable scheduling, no burst surprises)
  limits:   { cpu: 500m, memory: 512Mi }
  requests: { cpu: 500m, memory: 512Mi }

config:
  # -- Inline app config (rendered into a ConfigMap)
  inline: {}
  # -- ...or point at an existing ConfigMap instead
  existingConfigMap:
    name: ""
    key: config.yaml

# -- Extra environment variables for the app
extraEnv: {}

service:
  type: ClusterIP
  port: 80
```

Conventions to preserve:
- **`limits == requests`** — match it unless you have a specific reason.
- **`readOnlyRootFilesystem: true`** — if the app needs to write, add an `emptyDir` volume + `volumeMount`, don't disable it.
- **Config two ways** — `config.inline` (chart owns it) or `config.existingConfigMap` (external). Templates handle both; keep that branch.
- **`extraEnv` passthrough** — let operators add env without editing templates.

## The template helper trio

- **`_helpers.tpl`** — `<name>.fullname`, `<name>.labels`, `<name>.selectorLabels`. Every resource's `metadata.labels` and selectors call these — never hardcode label maps.
- **`_env.tpl`** — one `define` for the env block, `include`d by the deployment (and any jobs) so env stays identical across workloads.
- **`_validate.tpl`** — `required`/`fail` assertions for must-set values, `include`d early so a misconfigured release fails at template time, not at runtime.

```yaml
# in a template
metadata:
  labels: {{- include "<name>.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels: {{- include "<name>.selectorLabels" . | nindent 6 }}
  template:
    spec:
      securityContext:
        runAsUser: {{ .Values.securityContext.pod.runAsUser }}
        fsGroup: {{ .Values.securityContext.pod.fsGroup }}
      containers:
        - name: {{ include "<name>.fullname" . }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          env: {{- include "<name>.env" . | nindent 12 }}
          securityContext:
            readOnlyRootFilesystem: {{ .Values.securityContext.container.readOnlyRootFilesystem }}
          resources: {{- toYaml .Values.resources | nindent 12 }}
```

## values.schema.json

When you add or rename a value, update `values.schema.json` in the same change. It's what catches typo'd keys at `helm install` time. A value present in `values.yaml` but missing from the schema (or vice versa) is a bug.

## Adding a resource

1. Add the templated YAML under `templates/`, using the helpers for labels/selectors.
2. Add any new values to `values.yaml` (with `# --` docs) **and** `values.schema.json`.
3. If it needs env, source it from `_env.tpl`.
4. Render and read: `helm template <name> . -f values-k8s-test.yaml`.
5. `helm lint .`.

## CRDs

Charts that ship CRDs (e.g. `nebari-llm-serving`) put them in `charts/<name>/crds/`. Helm installs CRDs once and does **not** upgrade them on `helm upgrade` — a CRD schema change needs a separate `kubectl apply` of the new CRD. Call this out when editing a CRD.
