---
name: new-frontend
description: Scaffolds a new React+TypeScript frontend project. Triggers on /new-frontend, "scaffold a new frontend", "create a React project", "bootstrap a frontend app", "new React app".
argument-hint: <project-name>
allowed-tools:
  - Write
  - Bash
  - Read
  - Glob
---

You are scaffolding a new React+TypeScript frontend project. Follow every step below exactly and in order. Do not skip steps. Do not ask for confirmation between steps — execute everything autonomously.

## Pre-flight Checks

1. Set `PROJECT_NAME` to the value of `$ARGUMENTS` (trimmed of whitespace).
2. If `PROJECT_NAME` is empty or not provided, stop immediately and tell the user: "Please provide a project name: /new-frontend <project-name>"
3. Check whether a directory named `$PROJECT_NAME` already exists in the current working directory. If it does, stop and tell the user: "Directory '$PROJECT_NAME' already exists. Choose a different name or remove the existing directory first."
4. Determine the absolute path: `TARGET_DIR = <cwd>/$PROJECT_NAME`

---

## Step 1 — Initialize the Repository

```bash
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR" && git init
```

---

## Step 2 — Write Root Files

### `.gitignore`

Write `$TARGET_DIR/.gitignore`:

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build output
dist/
build/
coverage/

# Env files
.env
.env.local
.env.*.local

# Editors
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

### `README.md`

Write `$TARGET_DIR/README.md` (replace `$PROJECT_NAME`):

```markdown
# $PROJECT_NAME

A React + TypeScript frontend application.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (light/dark mode)
- React Router v6
- TanStack Query v5
- Jotai (global state)
- Vitest + Testing Library

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run test         # Run tests
npm run test:coverage  # Tests with coverage
npm run lint         # Lint
```

See [AGENTS.md](./AGENTS.md) for full conventions and coding standards.
```

### `AGENTS.md`

Read the skill-relative file `assets/agents-md-template.md`. Replace every occurrence of `{{PROJECT_NAME}}` with the actual value of `$PROJECT_NAME`. Write the result to `$TARGET_DIR/AGENTS.md`.

---

## Step 3 — Write Config Files

Read `references/frontend-structure.md` for the exact content of each file below.

Write these files at the project root (`$TARGET_DIR/`):

1. `package.json` — replace `"name": "{{PROJECT_NAME}}"` with the actual project name
2. `tsconfig.json`
3. `tsconfig.node.json`
4. `vite.config.ts`
5. `tailwind.config.ts`
6. `postcss.config.js`
7. `components.json`
8. `eslint.config.js`
9. `.env.example`
10. `index.html`

---

## Step 4 — Write Source Files

Read `references/frontend-structure.md` for the exact content. Create parent directories as needed before writing each file.

Write these files under `$TARGET_DIR/src/`:

1. `src/main.tsx`
2. `src/App.tsx`
3. `src/index.css`
4. `src/lib/utils.ts`
5. `src/lib/api.ts`
6. `src/test/setup.ts`
7. `src/store/appAtoms.ts`
8. `src/providers/ThemeProvider/ThemeProvider.tsx`
9. `src/providers/ThemeProvider/ThemeProvider.test.tsx`
10. `src/providers/ThemeProvider/index.ts`
11. `src/pages/Home/Home.tsx`
12. `src/pages/Home/Home.test.tsx`
13. `src/pages/Home/index.ts`
14. `src/pages/NotFound/NotFound.tsx`
15. `src/pages/NotFound/NotFound.test.tsx`
16. `src/pages/NotFound/index.ts`
17. `src/components/ui/.gitkeep` — empty file
18. `src/hooks/.gitkeep` — empty file

---

## Step 5 — Install Dependencies

```bash
cd "$TARGET_DIR" && npm install
```

This may take 30–60 seconds. Wait for it to complete before continuing.

---

## Step 6 — Install shadcn/ui Skill

```bash
cd "$TARGET_DIR" && npx skills add shadcn/ui --agent claude --yes
```

This installs the shadcn/ui Claude Code skill into `$TARGET_DIR/.claude/skills/shadcn-ui/`. It auto-activates whenever `components.json` is detected in the project.

If the command fails (e.g. network error), note the failure but continue to Step 7.

---

## Step 7 — Add Base shadcn Components

```bash
cd "$TARGET_DIR" && npx shadcn@latest add button card input badge dialog dropdown-menu separator skeleton sonner --yes
```

These components cover the majority of common UI needs. If the command fails, note the failure but continue to Step 8.

---

## Step 8 — Verify and Report

Run:

```bash
find "$TARGET_DIR" -type f | grep -v node_modules | grep -v ".git/" | sort
```

Then print a success message in this exact format (with actual values substituted):

```
✓ Scaffolded $PROJECT_NAME

Stack:
  React 19 + TypeScript + Vite
  Tailwind CSS + shadcn/ui (light/dark mode)
  React Router v6
  TanStack Query v5
  Jotai (global state)
  Vitest + Testing Library + ESLint

Next steps:
  cd $PROJECT_NAME
  npm run dev        → http://localhost:5173
  npm run test       → run unit tests
  npm run build      → production build

Add more shadcn components:
  npx shadcn@latest add <component>

Add a new page:
  src/pages/PageName/PageName.tsx
  src/pages/PageName/PageName.test.tsx
  src/pages/PageName/index.ts
  Then add a <Route> in src/App.tsx

Add an API hook:
  src/hooks/use-<resource>.ts
  (see AGENTS.md for the TanStack Query pattern)
```

---

## Important Notes

- **Read references before writing**: Always read `references/frontend-structure.md` and `assets/agents-md-template.md` before writing files. Do not guess at the content.
- **Skill-relative paths**: Resolve reference paths relative to `~/.claude/skills/new-frontend/`.
- **Project name substitution**: Replace `{{PROJECT_NAME}}` in the AGENTS.md template and `"name": "{{PROJECT_NAME}}"` in package.json with the actual project name.
- **Empty files**: `.gitkeep` files must be written as empty files.
- **npm install**: Run unconditionally after writing all source files.
- **Do not add extra files**: Only create the files listed above.
