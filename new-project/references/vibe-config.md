# Vibe Project: Root configuration and static files

Use these exact file contents when scaffolding a `--vibe` project. Paths are
relative to `$TARGET_DIR`. Replace every placeholder (the table is in
SKILL.md's Pre-flight) before writing; `{{THEME_SCRIPT_HASH}}` is filled in
after `index.html` is written (SKILL.md, Step V3). These files were generated
from a scaffold that passed every check in CI (`scripts/vibe_refs.py`); do not
"improve" them while scaffolding.

---

## `.gitignore`

```
# Dependencies
node_modules/

# Build output
dist/
build/
coverage/

# Playwright (npm run e2e)
test-results/
playwright-report/
blob-report/
playwright/.cache/

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

# TypeScript build info
*.tsbuildinfo

# Cloudflare
.wrangler/
.dev.vars
worker-configuration.d.ts

# Claude Code agent worktrees
.claude/worktrees/
```

---

## `package.json`

```json
{
  "name": "{{PROJECT_NAME}}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "bun@{{BUN_VERSION}}",
  "scripts": {
    "dev": "vite",
    "build": "wrangler types && tsc -b && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && wrangler deploy",
    "test": "wrangler types && vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "e2e:changed": "playwright test --only-changed=main",
    "e2e:ui": "playwright test --ui",
    "lint": "biome lint --write .",
    "format": "biome format --write .",
    "check": "biome check --write .",
    "budget": "bun scripts/budget.ts",
    "licenses": "bun scripts/licenses.ts",
    "knip": "knip",
    "types": "wrangler types",
    "tail": "wrangler tail"
  },
  "dependencies": {
    "@base-ui/react": "^1.6.0",
    "@fontsource-variable/jetbrains-mono": "^5.3.0",
    "@fontsource-variable/oxanium": "^5.3.0",
    "@phosphor-icons/react": "^2.1.10",
    "class-variance-authority": "^0.7.1",
    "cn": "^0.5.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "shadcn": "^4.15.0",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.13.0",
    "@biomejs/biome": "^2.4.15",
    "@cloudflare/vite-plugin": "^1.62.0",
    "@cloudflare/vitest-plugin": "^1.3.0",
    "@playwright/test": "1.64.1",
    "@tailwindcss/vite": "^4.1.13",
    "@types/node": "^24.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.1.1",
    "knip": "^6.43.0",
    "tailwindcss": "^4.1.13",
    "typescript": "^7.0.2",
    "vite": "^8.3.1",
    "vitest": "^5.0.5",
    "wrangler": "^4.147.0"
  }
}
```

---

## `biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.2/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": [
      "**",
      "!dist",
      "!coverage",
      "!node_modules",
      "!**/*.tsbuildinfo",
      "!**/*.md"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 80
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
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
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended",
      "complexity": {
        "noImportantStyles": "off"
      }
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  },
  "overrides": [
    {
      "includes": ["src/components/ui/**"],
      "linter": {
        "enabled": false
      }
    }
  ]
}
```

---

## `components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-lyra",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "phosphor",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

---

## `tsconfig.json`

```json
{
  "files": [],
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "#shared/*": ["./shared/*"]
    }
  },
  "references": [
    {
      "path": "./tsconfig.app.json"
    },
    {
      "path": "./tsconfig.worker.json"
    },
    {
      "path": "./tsconfig.node.json"
    },
    {
      "path": "./test/tsconfig.json"
    },
    {
      "path": "./e2e/tsconfig.json"
    }
  ]
}
```

---

## `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": {
      "@/*": ["./src/*"],
      "#shared/*": ["./shared/*"]
    },
    "types": ["vite/client"]
  },
  "include": ["src", "shared"]
}
```

---

## `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "vitest.config.ts", "build-info.ts"]
}
```

---

## `tsconfig.worker.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.worker.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": {
      "#shared/*": ["./shared/*"]
    },
    "types": []
  },
  "include": ["worker", "shared", "worker-configuration.d.ts"]
}
```

---

## `vite.config.ts`

```ts
import path from 'node:path';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { buildInfo } from './build-info.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  // The version and commit, for the app and the Worker (shared/version.ts).
  define: buildInfo(),
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '#shared': path.resolve(import.meta.dirname, './shared'),
    },
  },
});
```

---

## `vitest.config.ts`

```ts
import path from 'node:path';
import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';
import { buildInfo } from './build-info.ts';

// Every test runs inside the Workers runtime (workerd), so the Worker is
// tested as it deploys. Pure modules in shared/ run there too; they have no
// DOM dependency. Browser behavior is e2e/'s job.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
  // The version and commit, as the build defines them.
  define: buildInfo(),
  resolve: {
    alias: {
      '#shared': path.resolve(import.meta.dirname, './shared'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    // test/themes.test.ts reads src/index.css?raw; without this Vitest
    // replaces CSS imports with an empty string.
    css: { include: /index\.css/ },
  },
});
```

---

## `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT) || 4318;
const CI = Boolean(process.env.CI);

/**
 * End-to-end tests against the built app under `vite preview`: the Worker
 * runs in workerd (Miniflare) exactly as it would deploy, with
 * public/_headers (and so the CSP) applied, which `vite dev` does not do.
 *
 * Every spec runs twice: desktop Chromium and a phone (Pixel 7, touch).
 * A view is not done until both pass.
 *
 * Locally a server already listening on the port is reused, so
 * `npm run preview -- --port 4318` in another terminal skips the rebuild.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  // CI retries a failed test once; the reporter still lists a test that
  // passed on its retry as flaky. Locally there is no retry, so a flake
  // shows where it can be investigated.
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
```

---

## `knip.jsonc`

```jsonc
// Unused files, exports and dependencies (https://knip.dev). CI's `check`
// job runs `bunx knip`; a finding fails it. Fix a finding by deleting what
// is unused; ignore something here only with the reason beside it.
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  // The app's entry (index.html → src/main.tsx), the Worker's (wrangler)
  // and Vite, Vitest and Playwright's configs are found by knip's plugins.
  // These are the rest.
  "entry": ["scripts/*.ts", "test/**/*.test.ts", "e2e/**/*.spec.ts"],
  "project": [
    "src/**/*.{ts,tsx,css}",
    "shared/**/*.ts",
    "worker/**/*.ts",
    "scripts/**/*.ts",
    "test/**/*.ts",
    "e2e/**/*.ts"
  ],
  // Stock shadcn components, managed by its CLI and kept whole as it writes
  // them (AGENTS.md): their spare exports and unused parts are upstream's.
  "ignore": ["src/components/ui/**"],
  // A constant exported for a test or a reader and used in its own file is
  // not dead code.
  "ignoreExportsUsedInFile": true
}
```

---

## `wrangler.jsonc`

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "{{PROJECT_NAME}}",
  "main": "./worker/index.ts",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],

  // The Vite plugin fills in `assets.directory` with the client build.
  // Static assets are served straight from the edge with the headers in
  // public/_headers; only /api/* reaches the Worker first. Unknown paths
  // fall back to the single-page app, so deep links like /help load it.
  "assets": {
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },

  "observability": { "enabled": true }
}
```

---

## `build-info.ts`

```ts
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * The build's version and commit, as Vite `define`s for the app and
 * the Worker (shared/version.ts). The commit is the checkout's HEAD (in
 * the deploy workflow, the commit CI passed), else CI's `GITHUB_SHA`, else
 * `unknown`.
 */
export function buildInfo(): Record<string, string> {
  const pkg = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
  ) as { version: string };
  return {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit()),
  };
}

function commit(): string {
  try {
    const head = execSync('git rev-parse --short=7 HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (head) return head;
  } catch {
    // Not a git checkout (a tarball, say).
  }
  const sha = process.env.GITHUB_SHA?.trim();
  return sha && /^[0-9a-f]{7,40}$/.test(sha) ? sha.slice(0, 7) : 'unknown';
}
```

---

## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"
    />
    <meta name="color-scheme" content="dark light" />
    <script>
      // Apply the saved theme before first paint so there is no flash.
      // Mirrors apply() in src/providers/ThemeProvider.tsx; the ids come
      // from src/lib/themes.ts. Change this script and test/headers.test.ts
      // prints the new hash for public/_headers.
      (() => {
        let saved = null;
        try {
          saved = localStorage.getItem('{{PROJECT_NAME}}:theme');
        } catch {
          // Blocked storage: follow the OS.
        }
        const dark =
          saved === 'dark' ||
          (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', dark);
      })();
    </script>
    <meta name="description" content="{{DESCRIPTION}}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
    <meta property="og:title" content="{{PROJECT_TITLE}}" />
    <meta property="og:description" content="{{DESCRIPTION}}" />
    <meta property="og:type" content="website" />
    <title>{{PROJECT_TITLE}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## `public/_headers`

```
# Response headers for the static assets (Workers static assets reads this
# file). The Worker's own responses (/api/*) set theirs in worker/index.ts.
# test/headers.test.ts holds both to the rules below.
#
# The app loads nothing from another origin: fonts are bundled and there is
# no third-party script. Widen a directive only for a named need, with the
# reason here and a line in test/headers.test.ts.
#
# Content-Security-Policy, by directive:
#   script-src   the inline theme script in index.html, by hash (change the
#                script and test/headers.test.ts tells you the new one).
#   style-src    'unsafe-inline' for style attributes the UI library sets;
#                no stylesheet comes from anywhere else.
#   connect-src  'self': the API.
#
# Strict-Transport-Security: once on a custom domain, a browser that has
# been here never tries plain HTTP again. The Worker's own responses send
# it too (API_HEADERS).
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Referrer-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-{{THEME_SCRIPT_HASH}}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), midi=()

# Vite names every file under /assets by its content hash, so a file there
# never changes: keep it a year without asking again. index.html is not
# under /assets and is revalidated as usual.
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

---

## `public/favicon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>{{PROJECT_TITLE}}</title>
  <style>
    rect { stroke: #1a1a1a; }
    path { fill: #1a1a1a; }
    @media (prefers-color-scheme: dark) {
      rect { stroke: #f2f2f2; }
      path { fill: #f2f2f2; }
    }
  </style>
  <rect x="9" y="9" width="46" height="46" fill="none" stroke-width="7" />
  <path d="M32 20 44 32 32 44 20 32Z" />
</svg>
```

---

## `public/site.webmanifest`

```json
{
  "id": "/",
  "name": "{{PROJECT_TITLE}}",
  "short_name": "{{PROJECT_TITLE}}",
  "description": "{{DESCRIPTION}}",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    {
      "src": "/favicon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    }
  ]
}
```
