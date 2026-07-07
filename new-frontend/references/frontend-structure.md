# Frontend File Contents

Use these exact file contents when scaffolding the frontend. All paths are relative to `$PROJECT_NAME/`.

---

## `package.json`

> `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, and
> `@base-ui-components/react` are the runtime deps Nebari components import; they
> are declared here so the first `npm install` sets them up. `npx shadcn add`
> also installs any it finds missing. Fonts are `Geist` (sans) + `IBM Plex Mono`
> (mono) to match the `@nebari/theme` tokens.

```json
{
  "name": "{{PROJECT_NAME}}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "biome lint --write .",
    "format": "biome format --write .",
    "check": "biome check --write ."
  },
  "dependencies": {
    "@base-ui-components/react": "1.0.0-rc.0",
    "@fontsource-variable/geist": "^5.2.9",
    "@fontsource/ibm-plex-mono": "^5.2.7",
    "@tanstack/react-query": "^5.51.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "jotai": "^2.9.0",
    "lucide-react": "^0.400.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^6.24.1",
    "tailwind-merge": "^3.3.1"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.15",
    "@tailwindcss/vite": "^4.1.0",
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^20.14.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^4.3.1",
    "@vitest/coverage-v8": "^2.0.3",
    "jsdom": "^24.1.1",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.4.5",
    "vite": "^5.3.1",
    "vitest": "^2.0.3"
  }
}
```

---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

---

## `vite.config.ts`

```typescript
/// <reference types="vitest" />
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
```

---

## `biome.json`

> Tailwind v4 is configured in CSS (`src/index.css`), not a JS config file — there is no `tailwind.config.ts` or `postcss.config.js`. The Vite plugin (`@tailwindcss/vite`) handles the build.

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
  "assist": {
    "enabled": true,
    "actions": { "source": { "organizeImports": "on" } }
  }
}
```

---

## `components.json`

> The `registries` block wires up the `@nebari` namespace so
> `npx shadcn add @nebari/<name>` resolves against the Nebari design-system
> registry (served from GitHub Pages). It sits alongside the normal
> `style` / `tailwind` / `aliases` config — it does not replace them.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "registries": {
    "@nebari": "https://nebari-dev.github.io/nebari-design/r/{name}.json"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## `.env.example`

```
VITE_APP_TITLE=My App
VITE_API_URL=/api/v1
```

---

## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## `src/main.tsx`

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

## `src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/providers/ThemeProvider";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
```

---

## `src/index.css`

> This file ships **only** the Tailwind import, the Nebari fonts, the dark
> variant, and the base layer. The Nebari brand tokens (`:root` + `.dark` CSS
> variables and the `--font-sans` / radius / motion tokens) are installed by
> `npx shadcn add @nebari/theme` (Step 7) — the `theme` registry item is their
> source of truth. Do **not** hand-copy token values into this file; re-running
> `shadcn add @nebari/theme` updates them. The app will not build until the
> theme has been added, since the base layer references `border-border` /
> `bg-background`.

```css
@import "tailwindcss";
@import "@fontsource-variable/geist";
@import "@fontsource/ibm-plex-mono/400.css";
@import "@fontsource/ibm-plex-mono/500.css";

@custom-variant dark (&:is(.dark *));

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  html {
    @apply font-sans;
  }

  body {
    @apply bg-background text-foreground;
  }

  html,
  body,
  #root {
    width: 100%;
    margin: 0;
    min-height: 100%;
  }
}
```

---

## `src/lib/utils.ts`

> `npx shadcn add @nebari/<component>` also installs the shared `cn()` helper
> (the `utils` registry item) to this path. Its contents are identical to the
> version below; if `shadcn` overwrites it, that is expected and safe.

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## `src/lib/api.ts`

```typescript
const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = { get, post, put, delete: del };
```

---

## `src/test/setup.ts`

```typescript
import "@testing-library/jest-dom";
```

---

## `src/store/appAtoms.ts`

```typescript
import { atom } from "jotai";

/**
 * Global app atoms — add your application-wide state here.
 *
 * Rules:
 * - Use atoms for state that is shared across multiple unrelated components.
 * - Use local useState for component-local state.
 * - Use TanStack Query (useQuery/useMutation) for server state.
 * - Never duplicate server state in atoms — derive from query data instead.
 */

// Example atom — replace or extend with real app state.
export const sidebarOpenAtom = atom<boolean>(false);
```

---

## `src/providers/ThemeProvider/ThemeProvider.tsx`

```tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) ?? "system"
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  function setTheme(newTheme: Theme) {
    localStorage.setItem("theme", newTheme);
    setThemeState(newTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

---

## `src/providers/ThemeProvider/index.ts`

```typescript
export { ThemeProvider, useTheme } from "./ThemeProvider";
```

---

## `src/providers/ThemeProvider/ThemeProvider.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeProvider";

function ThemeDisplay() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme("dark")}>set dark</button>
      <button onClick={() => setTheme("light")}>set light</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("defaults to system theme", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("system");
  });

  it("applies dark class when theme is set to dark", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "set dark" }));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists theme to localStorage", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "set light" }));
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
```

---

## `src/pages/Home/Home.tsx`

```tsx
function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Welcome</h1>
      <p className="mt-4 text-muted-foreground">Your app is ready. Start building.</p>
    </div>
  );
}

export default Home;
```

---

## `src/pages/Home/index.ts`

```typescript
export { default } from "./Home";
```

---

## `src/pages/Home/Home.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import Home from "./Home";

describe("Home", () => {
  it("renders welcome heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /welcome/i })
    ).toBeInTheDocument();
  });
});
```

---

## `src/pages/NotFound/NotFound.tsx`

```tsx
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="mt-4 text-muted-foreground">Page not found.</p>
      <Link
        to="/"
        className="mt-8 inline-block text-primary underline-offset-4 hover:underline"
      >
        Go home
      </Link>
    </div>
  );
}

export default NotFound;
```

---

## `src/pages/NotFound/index.ts`

```typescript
export { default } from "./NotFound";
```

---

## `src/pages/NotFound/NotFound.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

describe("NotFound", () => {
  it("renders 404 heading", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
  });

  it("renders a link back home", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /go home/i })).toHaveAttribute(
      "href",
      "/"
    );
  });
});
```
