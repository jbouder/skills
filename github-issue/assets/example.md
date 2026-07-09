## Add Biome for Formatting & Linting

### Summary

Replace or consolidate existing formatting/linting tooling with [Biome](https://biomejs.dev/) — a fast, single-binary formatter and linter for JavaScript/TypeScript. This covers the full monorepo: apps and packages.

### Motivation

- Single tool replaces ESLint + Prettier with no config conflicts
- Significantly faster than the ESLint/Prettier combo (Rust-based)
- First-class Vite + React + TypeScript support out of the box
- One unified `biome.json` at the repo root, overridable per package
- Built-in import sorting (replaces `eslint-plugin-import` / `prettier-plugin-sort-imports`)

### Acceptance Criteria

- [ ] `biome.json` added at monorepo root with agreed-upon rule set
- [ ] `biome check` runs clean against all packages
- [ ] `biome check --write` used for format-on-save (replace Prettier)
- [ ] CI step added: `biome ci` fails the build on violations
- [ ] VS Code workspace settings updated to use Biome as default formatter
- [ ] Existing ESLint / Prettier configs removed (or scoped only to packages that can't migrate)
- [ ] `package.json` scripts updated: `lint`, `format`, `check` all delegate to Biome

### Out of Scope

- Python files (handled separately by Ruff in the `marketplace/` pixi projects)
- Biome does not process `.toml`, `.md`, or `.yaml` — existing tooling (or none) handles those
