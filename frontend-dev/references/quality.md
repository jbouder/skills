# Quality — Biome, TypeScript, the gate

## Biome does everything ESLint + Prettier used to

One tool for formatting, linting, and import organization. No `.eslintrc`, no `eslint.config.js`, no `.prettierrc` in a Biome project.

`biome.json` (the org Vite baseline):

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.15/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**", "!dist", "!coverage", "!node_modules", "!**/*.tsbuildinfo"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 80
  },
  "javascript": {
    "formatter": {
      "semicolons": "always",
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "trailingCommas": "all",
      "bracketSpacing": true,
      "arrowParentheses": "always"
    }
  },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "assist": { "enabled": true, "actions": { "source": { "organizeImports": "on" } } }
}
```

Formatter style this enforces: **2-space indent, single quotes in TS/JS, double quotes in JSX, semicolons always, trailing commas everywhere, 80-col width, always-parens arrows.** Don't fight it — run the formatter.

`package.json` scripts:

```json
{
  "lint": "biome lint --write .",
  "lint:ci": "biome lint .",
  "format": "biome format --write .",
  "format:ci": "biome format .",
  "check": "biome check --write .",
  "check:ci": "biome check ."
}
```

- **`biome check`** = format + lint + organize-imports in one pass. This is the everyday command.
- `--write` applies fixes; the `:ci` variants only report (use in CI / pre-merge).

## The quality gate

Run before considering any change complete:

```bash
npm run build && npm run test -- --run && npm run check
```

All three must pass: types compile, tests green, Biome clean. If `check` reports unfixable lint errors, fix the code — don't disable the rule unless it's genuinely wrong for the project (and then do it in `biome.json`, not inline).

## TypeScript

`tsconfig.json` runs strict. Honor it:
- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are on.
- **No `any`** — use a real type, or `unknown` then narrow.
- Path alias `@/*` → `src/*`. Import `@/components/...`, `@/lib/...`, never long relative chains.
- Type component props with an interface; type hook returns via the `api.get<T>` generic.

## Common Biome fixes

| Biome complaint | Fix |
|-----------------|-----|
| `useExhaustiveDependencies` | Add the missing dep, or restructure; don't blanket-disable |
| import not organized | `biome check --write` sorts them |
| `noExplicitAny` | Replace `any` with a real type or `unknown` + narrowing |
| `useImportType` | Use `import type { Foo }` for type-only imports |
| formatting diff | `biome format --write` — never reformat by hand |

> Older repos still on ESLint + Prettier: match their tooling and run their `lint` script. Only migrate to Biome when explicitly asked — when you do, remove `eslint.config.js` / `.eslintrc*` / `.prettierrc*` and their deps, add `@biomejs/biome` and `biome.json`, and replace the scripts above.
