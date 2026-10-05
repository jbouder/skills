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

- [ ] Biome configured at the repo root and passing across all packages
- [ ] CI fails the build on Biome violations
- [ ] ESLint and Prettier removed

### Out of Scope

- Python files (handled separately by Ruff)
