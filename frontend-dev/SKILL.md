---
name: frontend-dev
description: OpenTeams frontend conventions for React + TypeScript + Vite + shadcn/ui + Tailwind v4 projects. Use when writing, modifying, or reviewing frontend code — components, pages, hooks, state, data fetching, styling, or tests — in any project with a components.json or vite.config. Covers folder structure, component/test patterns, TanStack Query + Jotai, styling with semantic tokens + cn(), and Biome + Vitest quality gates.
---

# OpenTeams Frontend Development

Conventions and patterns for the OpenTeams frontend stack. Follow these when building or changing any React frontend in this org. To scaffold a brand-new project, use the `new-frontend` skill instead — this skill governs ongoing development.

## The Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS **v4** (CSS-first) + shadcn/ui |
| Icons | lucide-react |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Client state | Jotai v2 |
| Tests | Vitest + Testing Library |
| Quality | **Biome** (format + lint + import sort) |
| Package manager | npm |
| Dev port | 5173 |

## First Moves In Any Project

Before writing code, confirm what the project actually uses — conventions below are the org default, but a given repo may differ. Check, in order:

1. `package.json` — scripts, deps, package manager, React/Router/Tailwind versions.
2. `biome.json` — formatter + lint settings. If absent, the repo may still be on ESLint (older projects); match what's there, don't force a migration unasked.
3. `components.json` — shadcn style, baseColor, aliases, icon library.
4. `vite.config.ts` — `@tailwindcss/vite` plugin ⇒ Tailwind v4; `tailwind.config.ts` + postcss ⇒ Tailwind v3.
5. `src/index.css` / `globals.css` — color tokens and theme.
6. The existing folder layout — mirror it. Match the surrounding code's idioms over these defaults when they conflict.

## Non-Negotiables

- **Semantic color tokens only.** `bg-background text-foreground`, never `bg-white text-gray-900`. This is what makes dark mode work.
- **Never hand-edit `src/components/ui/`.** Those are shadcn-generated. Add via `npx shadcn@latest add <component>`. To customize, wrap or extend — don't edit in place.
- **Server state lives in TanStack Query, not Jotai.** Never copy API data into an atom.
- **No `any`.** Use real types or `unknown` + narrowing.
- **Co-locate tests** next to the code (`Foo.tsx` ⇄ `Foo.test.tsx`).
- **Run the quality gate before declaring done:** `npm run build && npm run test -- --run && npm run check` (Biome `check` = format + lint + import-organize).

## Folder Structure

Components and pages each get a PascalCase directory with a barrel `index.ts`. Import from the folder, never the inner file.

```
src/
├── main.tsx
├── App.tsx
├── index.css            # Tailwind v4 entry + @theme tokens
├── lib/
│   ├── utils.ts         # cn()
│   └── api.ts           # fetch wrapper
├── store/               # all Jotai atoms
│   └── appAtoms.ts
├── hooks/               # useThing.ts — TanStack Query wrappers + custom hooks
├── components/
│   ├── ui/              # shadcn (generated — don't edit)
│   └── UserCard/
│       ├── UserCard.tsx
│       ├── UserCard.test.tsx
│       └── index.ts
├── pages/
│   └── Home/
│       ├── Home.tsx
│       ├── Home.test.tsx
│       └── index.ts
└── providers/
    └── ThemeProvider/
```

```tsx
import UserCard from "@/components/UserCard";   // ✅ from the folder
import UserCard from "@/components/UserCard/UserCard";  // ❌ inner file
```

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Component / its directory | PascalCase | `UserCard`, `UserCard/` |
| Component file | PascalCase | `UserCard.tsx` |
| Non-component file | camelCase | `utils.ts`, `appAtoms.ts` |
| Hook / its file | `use` + camelCase | `useCurrentUser`, `useProducts.ts` |
| Utility / function | camelCase | `formatDate`, `cn` |

## Reference Files

Read the relevant reference before doing that kind of work — they contain the canonical code patterns:

- **`references/styling.md`** — Tailwind v4 setup, semantic tokens, `cn()`, CVA component variants, dark mode, adding shadcn components.
- **`references/state-and-data.md`** — TanStack Query hook patterns, Jotai atoms, the server-vs-client-state decision table, the `api.ts` wrapper.
- **`references/components-and-testing.md`** — component file template, the barrel pattern, Vitest + Testing Library patterns (Router/Query wrappers), what to test.
- **`references/quality.md`** — Biome config + commands, the quality-gate workflow, TypeScript strictness, common Biome rule fixes.

## What NOT To Do

| Don't | Do instead |
|-------|-----------|
| Hand-edit `src/components/ui/` | `npx shadcn@latest add <component>`; wrap to customize |
| Build a custom primitive that shadcn already ships | Check `src/components/ui/` first, then add it |
| Use raw Tailwind colors (`bg-white`, `text-gray-900`) | Semantic tokens (`bg-background`, `text-foreground`) |
| Fetch in a component with `useEffect` | A `use*` hook wrapping `useQuery`/`useMutation` |
| Store server/API data in a Jotai atom | TanStack Query owns server state |
| Scatter atoms across component files | All atoms in `src/store/` |
| Use `any` | Real types or `unknown` + narrowing |
| Flat component file | Own PascalCase dir with test + `index.ts` |
| Reach for ESLint/Prettier configs | Biome does format + lint + import sort |
