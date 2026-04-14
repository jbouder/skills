# AGENTS.md — {{PROJECT_NAME}}

This file provides guidance for AI agents (Claude Code, Copilot, Cursor, etc.) working in this repository. Read it before making changes.

---

## Project Overview

| Item | Value |
|------|-------|
| **Project** | {{PROJECT_NAME}} |
| **Framework** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS 3 + shadcn/ui |
| **Routing** | React Router v6 |
| **Data fetching** | TanStack Query v5 |
| **Global state** | Jotai v2 |
| **Testing** | Vitest + Testing Library |
| **Linting** | ESLint (typescript-eslint) |
| **Package manager** | npm |
| **Dev port** | 5173 |

---

## Repository Structure

```
{{PROJECT_NAME}}/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── lib/
│   │   ├── utils.ts
│   │   └── api.ts
│   ├── store/
│   │   └── appAtoms.ts
│   ├── hooks/
│   ├── components/
│   │   └── ui/
│   ├── providers/
│   │   └── ThemeProvider/
│   │       ├── ThemeProvider.tsx
│   │       └── index.ts
│   ├── pages/
│   │   ├── Home/
│   │   │   ├── Home.tsx
│   │   │   ├── Home.test.tsx
│   │   │   └── index.ts
│   │   └── NotFound/
│   │       ├── NotFound.tsx
│   │       ├── NotFound.test.tsx
│   │       └── index.ts
│   └── test/
│       └── setup.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── components.json
├── eslint.config.js
└── AGENTS.md
```

---

## Development Commands

**After every major change: run build, test, and lint before considering the task complete.**

```bash
npm run build && npm run test -- --run && npm run lint
```

---

## Coding Standards

### Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Component | PascalCase | `UserCard`, `DashboardPage` |
| Directory | PascalCase | `UserCard/`, `DashboardPage/` |
| File | PascalCase (components), camelCase (non-components) | `UserCard.tsx`, `utils.ts` |
| Hook | camelCase, `use` prefix | `useCurrentUser`, `useProducts` |
| Utility | camelCase | `formatDate`, `cn` |

### Component Structure

Every component lives in its own PascalCase directory with a component file, test file, and `index.ts` barrel export. Same rule applies to pages.

```
src/components/UserCard/
├── UserCard.tsx
├── UserCard.test.tsx
└── index.ts
```

Import from the folder, not the file directly:

```tsx
import UserCard from "@/components/UserCard";
import Settings from "@/pages/Settings";
```

### Dark Mode

Always use semantic color tokens so dark mode works automatically:

```tsx
// Good
<div className="bg-background text-foreground">

// Bad — bypasses CSS variable system
<div className="bg-white text-gray-900">
```

### shadcn/ui

Add components via CLI — **never hand-edit files in `src/components/ui/`**:

```bash
npx shadcn@latest add button card input
```

---

## API Calls — TanStack Query Pattern

Create custom hooks in `src/hooks/` that wrap `useQuery` / `useMutation` using `src/lib/api.ts`.

```typescript
// src/hooks/use-products.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<Product[]>("/products"),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductInput) =>
      api.post<Product>("/products", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
```

---

## Global State — Jotai

Use Jotai for client-side state shared across multiple unrelated components. All atoms live in `src/store/`.

| State type | Where it lives |
|-----------|---------------|
| Component-local (e.g. form input, toggle) | `useState` inside the component |
| Server data (e.g. API responses) | TanStack Query (`useQuery` / `useMutation`) |
| Shared client state (e.g. sidebar open, selected item) | Jotai atom in `src/store/` |

**Never duplicate server state in atoms.** Derive from query data instead.

```typescript
// src/store/appAtoms.ts
import { atom } from "jotai";

export const sidebarOpenAtom = atom<boolean>(false);
export const selectedItemIdAtom = atom<string | null>(null);

// Derived (read-only)
export const hasSelectionAtom = atom((get) => get(selectedItemIdAtom) !== null);
```

```tsx
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { sidebarOpenAtom } from "@/store/appAtoms";

const [open, setOpen] = useAtom(sidebarOpenAtom);      // read + write
const open = useAtomValue(sidebarOpenAtom);             // read only
const setOpen = useSetAtom(sidebarOpenAtom);            // write only
```

---

## Theme / Dark Mode

```tsx
import { useTheme } from "@/providers/ThemeProvider";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle theme
    </button>
  );
}
```

---

## Testing Standards

- Test files live **next to** the component they test (same directory).
- Use `@testing-library/react` — query by role/label/text, not implementation details.
- Wrap components that use React Router in `<MemoryRouter>` in tests.
- Wrap components that use TanStack Query in `<QueryClientProvider>` in tests.

---

## Adding a New Page

1. Create `src/pages/PageName/` directory (PascalCase)
2. Add `PageName.tsx`, `PageName.test.tsx`, and `index.ts`
3. Add a `<Route>` in `src/App.tsx`

---

## Claude Code Skills

Project-level Claude Code skills live in `.claude/skills/`. This project includes:

- **shadcn-ui** — activates automatically when `components.json` is present; provides component docs, usage examples, and shadcn-aware guidance.

---

## What NOT To Do

| Don't | Do instead |
|-------|-----------|
| Hand-edit `src/components/ui/` files | Use `npx shadcn@latest add <component>` |
| Build a custom component when a shadcn one exists | Check `src/components/ui/` first; if not yet added, run `npx shadcn@latest add <component>` |
| Add one-off utility classes to pages/screens | Update the shadcn component to accept the variant/prop instead |
| Use TypeScript `any` | Use proper types or `unknown` with narrowing |
| Use raw Tailwind colors (`bg-white`, `text-gray-900`) | Use semantic tokens (`bg-background`, `text-foreground`) |
| Fetch directly in components | Create a hook in `src/hooks/` using TanStack Query |
| Store server/API data in Jotai atoms | Use TanStack Query — it owns server state |
| Scatter atoms across component files | Put all atoms in `src/store/` |
| Put a component in a flat file | Give it its own PascalCase directory with a test file and `index.ts` |
| Import from the component file directly | Import from the folder (`@/components/UserCard`, not `@/components/UserCard/UserCard`) |
