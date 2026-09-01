## [BUG] - `nebi deploy` fails with `KeyError: 'namespace'` when `--config` omits the `cluster` block

### Description

Running `nebi deploy` against a config file that has no top-level `cluster:` block crashes with a Python traceback instead of a validation error. The CLI exits 1 with no indication of which config key is missing.

```
Traceback (most recent call last):
  File "nebi/cli/deploy.py", line 42, in run
    ns = cfg["cluster"]["namespace"]
KeyError: 'cluster'
```

### Steps to reproduce

1. Create `nebi.yaml` containing only `name: demo` and an `apps:` list (no `cluster:` block).
2. Run `nebi deploy --config nebi.yaml`.
3. Observe the `KeyError: 'cluster'` traceback and exit code 1.

### Expected behavior

`nebi deploy` should either fall back to the default namespace (`nebari`) or fail fast with a clear validation message such as `config error: 'cluster.namespace' is required`, without exposing a raw traceback.

### Environment

- OS: macOS 15.5 (Apple Silicon)
- Nebi version: `0.4.2` (installed via `pip install nebi`)
- Python: 3.12.4
- Kubernetes: k3d v5.7.4, kubectl v1.31

### Additional context

- Adding `cluster: { namespace: nebari }` to the config makes the command succeed, so the bug is limited to config validation.
- `nebi validate --config nebi.yaml` reports the same file as valid, so the two commands disagree on what is required.
- Related: nebari-dev/nebi#118 (config schema hardening)
