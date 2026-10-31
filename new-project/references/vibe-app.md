# Vibe Project: Shared code, the Worker and the app

Use these exact file contents when scaffolding a `--vibe` project. Paths are
relative to `$TARGET_DIR`. Replace every placeholder (the table is in
SKILL.md's Pre-flight) before writing; `{{THEME_SCRIPT_HASH}}` is filled in
after `index.html` is written (SKILL.md, Step V3). These files were generated
from a scaffold that passed every check in CI (`scripts/vibe_refs.py`); do not
"improve" them while scaffolding.

---

## `shared/api.ts`

```ts
/**
 * The shapes the Worker's API returns, used by both sides. One file per
 * area once there is more than a handful; validate anything that comes
 * in (a request body, a socket message) with a schema before trusting it.
 */

/** `GET /api/health`: the Worker is up, and which build it is. */
export interface Health {
  ok: true;
  version: string;
  commit: string;
}

/** Every error the API returns. Never a stack, never what was sent. */
export interface ApiError {
  error: string;
  requestId?: string;
}
```

---

## `shared/version.ts`

```ts
/**
 * Which build this is: the version from package.json and the
 * commit it was built from, defined at build time by `buildInfo()`
 * (build-info.ts, read by vite.config.ts and vitest.config.ts) for the
 * app and the Worker alike. Help shows them;
 * `GET /api/health` returns them.
 */

declare const __APP_VERSION__: string | undefined;
declare const __APP_COMMIT__: string | undefined;

export const VERSION: string =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

/** The short commit SHA, or `unknown` outside a git checkout. */
export const COMMIT: string =
  typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'unknown';

/** How the app writes them: `0.1.0 (a1b2c3d)`. */
export const BUILD_LABEL = `${VERSION} (${COMMIT})`;
```

---

## `worker/index.ts`

```ts
import type { ApiError, Health } from '#shared/api';
import { COMMIT, VERSION } from '#shared/version';
import { logError, REQUEST_ID_HEADER, requestIdOf } from './log';

/**
 * Static assets are served from the edge (public/_headers sets their
 * headers); only `/api/*` reaches this Worker first (`run_worker_first` in
 * wrangler.jsonc). Every response it makes carries API_HEADERS and an
 * `x-request-id`; a request that throws is logged once and answered with a
 * 500 that names the id, never the error.
 */

/**
 * On every response the Worker makes itself. None of these is a page, so
 * nothing may run, load or frame it. HSTS matters once the app is on a
 * custom domain: a browser that has been here once never tries plain HTTP
 * again.
 */
export const API_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
} as const;

type Handler = (request: Request, env: Env) => Promise<Response>;

/** The API, by path. A method it does not list is a 405. */
const ROUTES: Record<string, { method: string; handle: Handler }> = {
  '/api/health': {
    method: 'GET',
    handle: async () => {
      const health: Health = { ok: true, version: VERSION, commit: COMMIT };
      return json(health);
    },
  },
};

export async function handle(request: Request, env: Env): Promise<Response> {
  const id = requestIdOf(request);
  const { pathname } = new URL(request.url);
  let response: Response;
  try {
    response = await route(request, env, pathname);
  } catch (error) {
    logError(id, pathname, error);
    response = json({ error: 'Something went wrong', requestId: id }, 500);
  }
  response.headers.set(REQUEST_ID_HEADER, id);
  return response;
}

async function route(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> {
  if (!pathname.startsWith('/api/')) {
    // Only reached when `run_worker_first` sends more than /api/* here.
    return env.ASSETS.fetch(request);
  }
  const entry = ROUTES[pathname];
  if (!entry) {
    return json({ error: 'Not found' }, 404);
  }
  if (request.method !== entry.method) {
    return json({ error: 'Method not allowed' }, 405, {
      allow: entry.method,
    });
  }
  return entry.handle(request, env);
}

function json(
  body: Health | ApiError,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...API_HEADERS,
      'content-type': 'application/json; charset=utf-8',
      ...extra,
    },
  });
}

export default {
  fetch: handle,
} satisfies ExportedHandler<Env>;
```

---

## `worker/log.ts`

```ts
/**
 * The Worker's own log lines and request ids. Every line is one JSON
 * object (docs/architecture.md#logs). None carries a credential, a request
 * body or anything a person typed.
 */

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * The request's id: Cloudflare's `cf-ray`, which also names the request in
 * Cloudflare's own logs, so an id read off a 500 finds both. Local runs
 * have no ray; a random id stands in.
 */
export function requestIdOf(request: Request): string {
  const ray = request.headers.get('cf-ray')?.trim() ?? '';
  return /^[\w-]{1,64}$/.test(ray) ? ray : crypto.randomUUID();
}

/** One line for a request that threw; the client got a 500 with `id`. */
export function logError(id: string, path: string, error: unknown): void {
  console.error(
    JSON.stringify({
      level: 'error',
      path,
      requestId: id,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}
```

---

## `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { installSpringEasingTokens } from './lib/motion.ts';

installSpringEasingTokens();

// biome-ignore lint/style/noNonNullAssertion: #root is guaranteed by index.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

---

## `src/App.tsx`

```tsx
import { AppShell } from '@/components/AppShell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MotionProvider } from '@/providers/MotionProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

export default function App() {
  return (
    <MotionProvider>
      <ThemeProvider>
        <TooltipProvider>
          <AppShell />
        </TooltipProvider>
      </ThemeProvider>
    </MotionProvider>
  );
}
```

---

## `src/index.css`

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/oxanium";
@import "@fontsource-variable/jetbrains-mono";

@custom-variant dark (&:is(.dark *));
/* Touch screens and other devices that cannot hover: hover reveals never fire. */
@custom-variant hover-none (@media (hover: none));

/*
 * Theme: stock shadcn base-lyra (neutral) with Oxanium Variable for body AND
 * headings (Lyra normally sets JetBrains Mono as the body font); JetBrains
 * Mono is reserved for code, ids and numbers that line up. Square corners.
 * Two semantic colors every theme defines: --warn and --ok
 * (docs/design.md). test/themes.test.ts holds every pair to WCAG AA.
 */
@theme {
  /* The one layout breakpoint (`desk:`): wide layouts above, phone below. */
  --breakpoint-desk: 51.25rem;
}

@theme inline {
  --font-sans: "Oxanium Variable", ui-sans-serif, system-ui, sans-serif;
  --font-heading: var(--font-sans);
  --font-mono:
    "JetBrains Mono Variable", ui-monospace, SFMono-Regular, monospace;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-warn: var(--warn);
  --color-warn-foreground: var(--warn-foreground);
  --color-ok: var(--ok);
  --color-ok-foreground: var(--ok-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.53 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  /* A checkbox's edge and the focus ring are 3:1 on every surface as drawn
   * (the ring mostly at half alpha, `outline-ring/50`): test/themes.test.ts. */
  --input: oklch(0.65 0 0);
  --ring: oklch(0.27 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  /* Square, to match the base-lyra shadcn components. */
  --radius: 0px;
  /* Needs attention: due, paused, a warning. Text-safe on background and card. */
  --warn: oklch(0.54 0.14 75);
  --warn-foreground: oklch(0.99 0.01 75);
  /* Done, healthy, saved. */
  --ok: oklch(0.53 0.13 150);
  --ok-foreground: oklch(0.99 0.01 150);
}

.dark {
  /* Dark: the neutral counterpart of Light (stock shadcn neutral dark),
   * the same grays inverted, with no tint. */
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.72 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 36%);
  --ring: oklch(0.8 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --warn: oklch(0.8 0.14 80);
  --warn-foreground: oklch(0.2 0.04 80);
  --ok: oklch(0.76 0.14 150);
  --ok-foreground: oklch(0.2 0.04 150);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  html {
    @apply font-sans;
    scroll-behavior: smooth;
    color-scheme: light;
  }

  html.dark {
    color-scheme: dark;
  }

  body {
    @apply bg-background text-foreground;
    /* 15px base; rem stays 16px so the stock components keep their sizes. */
    font-size: 15px;
    line-height: 1.45;
  }

  html,
  body,
  #root {
    width: 100%;
    margin: 0;
    min-height: 100%;
  }

  /* Stops live counters and readouts from jittering. */
  .tabular {
    font-variant-numeric: tabular-nums;
  }
}

/* ---- Type scale (docs/design.md) ---------------------------------------- */

@layer components {
  .text-page-title {
    font-family: var(--font-heading);
    font-size: 28px;
    line-height: 1.15;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  @media (min-width: 820px) {
    .text-page-title {
      font-size: 34px;
    }
  }
  /* Quiet lines: empty states and short notes about a view. */
  .text-state {
    font-size: 17px;
    line-height: 1.35;
    font-weight: 500;
    color: var(--muted-foreground);
  }
}

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

/* Tokens. Durations and easings are never written as literals in components;
   script reads the same values from src/lib/motion-tokens.ts
   (test/motion-tokens.test.ts holds the two equal). */
:root {
  --duration-fast: 100ms;
  --duration-base: 200ms;
  --duration-slow: 350ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
  /* --ease-spring-snappy / --ease-spring-bouncy are installed by lib/motion.ts */
}

/* The preference (the preferences menu → Motion). One attribute on <html>
   turns every CSS transition and animation into a cut; the JS helpers check
   the same flag. */
html[data-motion="off"] *,
html[data-motion="off"] *::before,
html[data-motion="off"] *::after {
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
}
html[data-motion="off"]::view-transition-group(*),
html[data-motion="off"]::view-transition-old(*),
html[data-motion="off"]::view-transition-new(*) {
  animation: none !important;
}

/* The OS setting is a hard override, independent of the preference. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}

/* Anchor jumps scroll smoothly only while motion is on. */
html[data-motion="off"] {
  scroll-behavior: auto;
}
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}

/* ---- View transitions -------------------------------------------------- */

/* `withViewTransition()` puts its type on <html data-vt> for the life of the
   transition, so each element is only snapshotted separately when its own
   transition is running. Types: page, theme. The root snapshot never
   animates: everything that should move has a name. */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

/* The header holds still on top while the page moves under it: its own
   name, an opaque background (a named snapshot has nothing behind it to
   blur), and no animation. Not during a theme change, which is one
   whole-page snapshot. */
html[data-vt]:not([data-vt="theme"]) .vt-header {
  view-transition-name: header;
  background-color: var(--background);
}
::view-transition-old(header) {
  display: none;
}
::view-transition-group(header),
::view-transition-new(header) {
  animation: none;
}

/* Page changes: the old page lifts out, the new one settles in. */
html[data-vt="page"] .page {
  view-transition-name: page;
}
::view-transition-old(page) {
  animation: page-out var(--duration-base) var(--ease-standard) both;
}
::view-transition-new(page) {
  animation: page-in var(--duration-slow) var(--ease-emphasized) both;
}
@keyframes page-out {
  to {
    opacity: 0;
    translate: 0 -12px;
  }
}
@keyframes page-in {
  from {
    opacity: 0;
    translate: 0 12px;
  }
}

/* Theme changes: the whole page is one snapshot; the new one fades in. */
html[data-vt="theme"]::view-transition-new(root) {
  animation: theme-fade var(--duration-base) var(--ease-standard) both;
}
@keyframes theme-fade {
  from {
    opacity: 0;
  }
}

/* ---- Entrances and feedback --------------------------------------------- */

/* Rows and cards arriving. `--i` (optional, inline) staggers a group. The
   transition covers only these two properties so the delay cannot leak
   into hover states. */
.enter {
  opacity: 1;
  translate: 0 0;
  transition:
    opacity var(--duration-slow) var(--ease-emphasized),
    translate var(--duration-slow) var(--ease-emphasized);
  transition-delay: calc(var(--i, 0) * 40ms);
}
@starting-style {
  .enter {
    opacity: 0;
    translate: 0 8px;
  }
}

/* Press feedback on anything interactive. */
.press {
  transition-property: scale, color, background-color, border-color, opacity;
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--ease-standard);
}
.press:active {
  scale: 0.96;
}

/* Counts just change. A number ticking over is not an event worth motion. */
.count {
  transition: none;
}

/* ---- Forced colors ------------------------------------------------------ */

/* Windows Contrast themes drop backgrounds, so state shown by a fill alone
   disappears: outline the current page's link in the system highlight. */
@media (forced-colors: active) {
  [aria-current="page"] {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }
}
```

---

## `src/lib/utils.ts`

```ts
export { cn } from 'cn';
```

---

## `src/lib/themes.ts`

```ts
/**
 * The selectable themes: `light` and `dark` are the token sets on `:root`
 * and `.dark` in src/index.css; `system` follows the OS.
 *
 * index.html applies the saved theme before first paint and keeps its own
 * copy of this logic; update it when changing the ids here.
 */

export type ThemeId = 'system' | 'light' | 'dark';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  /** Which token set it uses. `system` resolves at runtime. */
  base: 'light' | 'dark' | 'system';
}

export const THEMES: readonly ThemeOption[] = [
  { id: 'system', label: 'System', base: 'system' },
  { id: 'light', label: 'Light', base: 'light' },
  { id: 'dark', label: 'Dark', base: 'dark' },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function themeOption(id: ThemeId): ThemeOption {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
```

---

## `src/lib/motion-tokens.ts`

```ts
/**
 * The motion tokens for script: the Web Animations API and timers take
 * numbers and strings, not `var(--…)`. The same values as the `:root`
 * tokens in src/index.css (`--duration-*`, `--ease-*`);
 * test/motion-tokens.test.ts holds the two equal and keeps literals out
 * of every `.animate()` call. No imports, so the test (in workerd) reads
 * it as is.
 */

/** Milliseconds: `--duration-fast`, `--duration-base`, `--duration-slow`. */
export const DURATION = {
  fast: 100,
  base: 200,
  slow: 350,
} as const;

/** `--ease-standard`, `--ease-emphasized`. */
export const EASE = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;
```

---

## `src/lib/motion.ts`

```ts
import { flushSync } from 'react-dom';

/**
 * The platform-only motion helpers this app uses. No animation library:
 * View Transitions, the Web Animations API, and CSS `linear()` easings baked
 * from a damped-spring integrator. Every helper takes `enabled` so the
 * Motion preference (and prefers-reduced-motion) can turn it into a plain
 * cut: pass `useMotion().active`. A WAAPI `.animate()` call takes its
 * duration and easing from `DURATION` and `EASE` in `@/lib/motion-tokens`.
 */

/* ---------- View Transitions ---------- */

/** What a view transition is for; `src/index.css` scopes names by it. */
export type ViewTransitionType = 'default' | 'page' | 'theme';

/**
 * Run a React state update inside a view transition, or just run it.
 *
 * `type` lands on `<html data-vt="…">` for the life of the transition so the
 * stylesheet can scope `view-transition-name`s: the page only gets its own
 * snapshot during navigation.
 */
export function withViewTransition(
  update: () => void,
  enabled: boolean,
  type: ViewTransitionType = 'default',
) {
  if (!enabled || typeof document.startViewTransition !== 'function') {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.vt = type;
  const transition = document.startViewTransition(() => {
    flushSync(update);
  });
  // A skipped transition (hidden tab, another one in flight) rejects these;
  // the DOM update has still happened, so there is nothing to handle.
  transition.ready.catch(() => undefined);
  transition.finished
    .catch(() => undefined)
    .then(() => {
      if (root.dataset.vt === type) {
        delete root.dataset.vt;
      }
    });
}

/* ---------- Springs baked into linear() ---------- */

interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
}

const STEP_S = 1 / 120;
const REST_DELTA = 0.001;
const REST_SPEED = 0.001;
const MAX_DURATION_S = 10;

/** Semi-implicit Euler on a unit spring (0 → 1). */
function simulateSpring(config: SpringConfig): {
  samples: number[];
  durationMs: number;
} {
  const { stiffness, damping, mass = 1 } = config;
  let position = 0;
  let velocity = 0;
  const samples = [0];

  for (let t = STEP_S; t <= MAX_DURATION_S; t += STEP_S) {
    const acceleration =
      (-stiffness * (position - 1) - damping * velocity) / mass;
    velocity += acceleration * STEP_S;
    position += velocity * STEP_S;
    samples.push(position);
    if (
      Math.abs(position - 1) < REST_DELTA &&
      Math.abs(velocity) < REST_SPEED
    ) {
      break;
    }
  }
  samples[samples.length - 1] = 1;
  return { samples, durationMs: (samples.length - 1) * STEP_S * 1000 };
}

/** Bake a spring into a CSS `linear(...)` string plus its natural duration. */
function springLinearEasing(config: SpringConfig): {
  easing: string;
  durationMs: number;
} {
  const { samples, durationMs } = simulateSpring(config);
  const stride = Math.max(1, Math.ceil(samples.length / 60));
  const stops: string[] = [];
  for (let i = 0; i < samples.length; i += stride) {
    const progress = ((i / (samples.length - 1)) * 100).toFixed(1);
    stops.push(`${samples[i]?.toFixed(4)} ${progress}%`);
  }
  if ((samples.length - 1) % stride !== 0) {
    stops.push('1 100%');
  }
  return { easing: `linear(${stops.join(', ')})`, durationMs };
}

const SPRING_PRESETS = {
  snappy: { stiffness: 260, damping: 24 },
  bouncy: { stiffness: 300, damping: 12 },
} as const satisfies Record<string, SpringConfig>;

/** Write `--ease-spring-*` and `--ease-spring-*-duration` onto :root once. */
export function installSpringEasingTokens(
  root: HTMLElement = document.documentElement,
) {
  for (const [name, config] of Object.entries(SPRING_PRESETS)) {
    const { easing, durationMs } = springLinearEasing(config);
    root.style.setProperty(`--ease-spring-${name}`, easing);
    root.style.setProperty(
      `--ease-spring-${name}-duration`,
      `${Math.round(durationMs)}ms`,
    );
  }
}
```

---

## `src/lib/router.ts`

```ts
import type { MouseEvent } from 'react';
import { useSyncExternalStore } from 'react';

/**
 * A small `history.pushState` router. Add a route by adding it to `Route`,
 * `parse` and `pathFor`; the compiler then finds every switch that has to
 * learn it. Route changes go through `runTransition`, which the app shell
 * points at `withViewTransition` so navigation animates as a page
 * transition.
 */

export type Route =
  | { name: 'home' }
  | { name: 'help'; section?: string }
  | { name: 'notFound'; path: string };

export function parse(pathname: string, hash = ''): Route {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  if (clean === '/') {
    return { name: 'home' };
  }
  if (clean === '/help') {
    const section = decodeURIComponent(hash.replace(/^#/, ''));
    return section ? { name: 'help', section } : { name: 'help' };
  }
  return { name: 'notFound', path: clean };
}

export function pathFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'help':
      return route.section
        ? `/help#${encodeURIComponent(route.section)}`
        : '/help';
    case 'notFound':
      return route.path;
  }
}

function here(): string {
  return window.location.pathname + window.location.hash;
}

let current: Route = parse(window.location.pathname, window.location.hash);
const listeners = new Set<() => void>();

type Transition = (update: () => void) => void;
let runTransition: Transition = (update) => update();

/** The app shell installs the view-transition wrapper here. */
export function setRouteTransition(transition: Transition) {
  runTransition = transition;
}

function commit(next: Route) {
  const update = () => {
    current = next;
    for (const listener of listeners) {
      listener();
    }
  };
  // Moving between sections of the same page is a scroll, not a page change.
  if (next.name === current.name && next.name !== 'notFound') {
    update();
    return;
  }
  runTransition(update);
}

export function navigate(route: Route, options: { replace?: boolean } = {}) {
  const path = pathFor(route);
  if (options.replace) {
    window.history.replaceState(null, '', path);
  } else if (path !== here()) {
    window.history.pushState(null, '', path);
  }
  commit(route);
}

window.addEventListener('popstate', () => {
  commit(parse(window.location.pathname, window.location.hash));
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current);
}

/** For real anchors: middle-click and "open in new tab" keep working. */
export function linkProps(route: Route) {
  return {
    href: pathFor(route),
    onClick(event: MouseEvent<HTMLAnchorElement>) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      navigate(route);
    },
  };
}
```

---

## `src/lib/api.ts`

```ts
import type { Health } from '#shared/api';

/**
 * The browser half of the API. Every call goes through `request`, so a
 * failure always reads the same way (docs/design.md#copy): a refusal says
 * what the server said, no answer at all says so plainly, never the
 * browser's own "Failed to fetch".
 */

export class ApiFailure extends Error {}

const UNREACHABLE =
  'Could not reach {{PROJECT_TITLE}}. Check the connection and try again.';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiFailure(UNREACHABLE);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiFailure(body?.error ?? UNREACHABLE);
  }
  return (await response.json()) as T;
}

export function getHealth(signal?: AbortSignal): Promise<Health> {
  return request<Health>('/api/health', { signal });
}
```

---

## `src/providers/MotionProvider.tsx`

```tsx
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

const STORAGE_KEY = '{{PROJECT_NAME}}:motion';
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

interface MotionContextValue {
  /** The per-device preference, from the preferences menu. */
  preference: boolean;
  /** The OS setting. A hard override: when true, nothing animates. */
  reduced: boolean;
  /** What the app actually does: preference AND NOT reduced. */
  active: boolean;
  setPreference: (on: boolean) => void;
}

const MotionContext = createContext<MotionContextValue | null>(null);

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function subscribeReduced(callback: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getReduced() {
  return window.matchMedia(REDUCE_QUERY).matches;
}

/**
 * One attribute on <html> drives the CSS side (`html[data-motion="off"]`
 * zeroes every duration); the JS helpers read `active` directly.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readPreference);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced);
  const active = preference && !reduced;

  useEffect(() => {
    document.documentElement.dataset.motion = active ? 'on' : 'off';
  }, [active]);

  const value = useMemo<MotionContextValue>(
    () => ({
      preference,
      reduced,
      active,
      setPreference: (on) => {
        setPreferenceState(on);
        try {
          localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
        } catch {
          // Private mode: the choice lasts for this page load.
        }
      },
    }),
    [preference, reduced, active],
  );

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  );
}

export function useMotion(): MotionContextValue {
  const ctx = useContext(MotionContext);
  if (!ctx) {
    throw new Error('useMotion must be used inside MotionProvider');
  }
  return ctx;
}
```

---

## `src/providers/ThemeProvider.tsx`

```tsx
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { withViewTransition } from '@/lib/motion';
import { isThemeId, type ThemeId, themeOption } from '@/lib/themes';
import { useMotion } from '@/providers/MotionProvider';

const STORAGE_KEY = '{{PROJECT_NAME}}:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

interface ThemeContextValue {
  /** What the person picked, `system` included. */
  theme: ThemeId;
  /** Light or dark after resolving `system` and the theme's base. */
  mode: 'light' | 'dark';
  /** Switch theme inside a short crossfade (a view transition). */
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** No saved choice (or an unknown one) means follow the OS. */
function readTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isThemeId(saved)) {
      return saved;
    }
  } catch {
    // Blocked storage: follow the OS.
  }
  return 'system';
}

function systemDark(): boolean {
  return matchMedia(DARK_QUERY).matches;
}

function resolveMode(theme: ThemeId): 'light' | 'dark' {
  const { base } = themeOption(theme);
  if (base === 'system') {
    return systemDark() ? 'dark' : 'light';
  }
  return base;
}

/** Same logic as the inline script in index.html. */
/** `--background` of each mode, as hex for the browser's chrome. */
export const THEME_COLORS = { light: '#ffffff', dark: '#0a0a0a' } as const;

function apply(theme: ThemeId) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolveMode(theme) === 'dark');
  // The status bar and title bar follow the app's theme, not only the
  // device's: index.html has one theme-color per scheme; a picked theme
  // sets both.
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  )) {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content =
      THEME_COLORS[theme === 'system' ? scheme : resolveMode(theme)];
  }
}

function save(theme: ThemeId) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: the theme still changes for this session.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { active } = useMotion();
  const [theme, setThemeState] = useState<ThemeId>(readTheme);
  const [mode, setMode] = useState(() => resolveMode(theme));

  useEffect(() => {
    apply(theme);
    setMode(resolveMode(theme));
  }, [theme]);

  // Following the OS: re-resolve when it flips.
  useEffect(() => {
    if (theme !== 'system') {
      return;
    }
    const query = matchMedia(DARK_QUERY);
    const onChange = () => {
      withViewTransition(
        () => {
          apply('system');
          setMode(resolveMode('system'));
        },
        active,
        'theme',
      );
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme, active]);

  const setTheme = useCallback(
    (next: ThemeId) => {
      if (next === theme) {
        return;
      }
      save(next);
      // The DOM has to change inside the transition callback so the "new"
      // snapshot is taken in the new theme; the state update follows.
      withViewTransition(
        () => {
          apply(next);
          setThemeState(next);
          setMode(resolveMode(next));
        },
        active,
        'theme',
      );
    },
    [theme, active],
  );

  const value = useMemo(
    () => ({ theme, mode, setTheme }),
    [theme, mode, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}
```

---

## `src/hooks/usePageTitle.ts`

```ts
import { useEffect } from 'react';

const APP = '{{PROJECT_TITLE}}';

/**
 * Give each page its own tab title (WCAG 2.4.2), e.g. "Help · {{PROJECT_TITLE}}".
 * No argument is the bare app name, for the home page.
 */
export function usePageTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} · ${APP}` : APP;
  }, [page]);
}
```

---

## `src/components/AppShell.tsx`

```tsx
import { useEffect, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { withViewTransition } from '@/lib/motion';
import { setRouteTransition, useRoute } from '@/lib/router';
import { HelpPage } from '@/pages/HelpPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { useMotion } from '@/providers/MotionProvider';

/**
 * A skip link, a slim header and one page. Route changes run inside a view
 * transition so the page lifts out and the next settles in while the header
 * holds still, and focus moves to the new page so a keyboard or screen
 * reader user starts there, not on the link they left.
 */
export function AppShell() {
  const route = useRoute();
  const { active } = useMotion();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);

  useEffect(() => {
    setRouteTransition((update) => withViewTransition(update, active, 'page'));
  }, [active]);

  const key = route.name === 'notFound' ? `notFound:${route.path}` : route.name;

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per page, keyed by `key`.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [key]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:outline-2"
      >
        Skip to content
      </a>
      <AppHeader route={route} />
      {/* Keyed by route so each page mounts fresh and its entrances replay. */}
      <main
        key={key}
        id="main"
        ref={main}
        tabIndex={-1}
        className="page mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col px-4 py-8 outline-none desk:px-6 desk:py-12"
      >
        {route.name === 'home' && <HomePage />}
        {route.name === 'help' && <HelpPage section={route.section} />}
        {route.name === 'notFound' && <NotFoundPage />}
      </main>
    </div>
  );
}
```

---

## `src/components/AppHeader.tsx`

```tsx
import { QuestionIcon } from '@phosphor-icons/react';
import { ButtonLink } from '@/components/ButtonLink';
import { Mark } from '@/components/Mark';
import { PreferencesMenu } from '@/components/PreferencesMenu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { linkProps, type Route } from '@/lib/router';

/** The mark and name on the left, help and preferences on the right. */
export function AppHeader({ route }: { route: Route }) {
  return (
    <header className="vt-header sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="flex h-14 w-full items-center gap-3 px-4 desk:px-6">
        <a
          {...linkProps({ name: 'home' })}
          aria-current={route.name === 'home' ? 'page' : undefined}
          className="press flex min-h-11 items-center gap-2 font-heading text-base font-semibold tracking-tight outline-ring/50 focus-visible:outline-2"
        >
          <Mark className="size-6" />
          <span>{{PROJECT_TITLE}}</span>
        </a>

        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <ButtonLink
                  route={{ name: 'help' }}
                  variant={route.name === 'help' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="size-11 desk:size-9"
                  aria-current={route.name === 'help' ? 'page' : undefined}
                />
              }
            >
              <QuestionIcon weight="bold" />
              <span className="sr-only">Help</span>
            </TooltipTrigger>
            <TooltipContent>Help</TooltipContent>
          </Tooltip>
          <PreferencesMenu />
        </div>
      </div>
    </header>
  );
}
```

---

## `src/components/Mark.tsx`

```tsx
/**
 * The app's mark, drawn in `currentColor` so it follows the theme. The same
 * shape as public/favicon.svg; change both together.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect
        x="9"
        y="9"
        width="46"
        height="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
      />
      <path d="M32 20 44 32 32 44 20 32Z" fill="currentColor" />
    </svg>
  );
}
```

---

## `src/components/ButtonLink.tsx`

```tsx
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { linkProps, type Route } from '@/lib/router';
import { cn } from '@/lib/utils';

/**
 * A link that looks like a button: a plain anchor (the link role,
 * middle-click and "open in new tab" all work) with the stock Button's
 * classes. Never a `Button` rendering an `<a>`: Base UI gives that
 * `role="button"`, so a screen reader announces a link as a button. Never
 * a button inside a link either.
 */
export function ButtonLink({
  route,
  variant,
  size,
  className,
  ...props
}: Omit<ComponentProps<'a'>, 'href'> &
  VariantProps<typeof buttonVariants> & { route: Route }) {
  return (
    <a
      {...props}
      {...linkProps(route)}
      className={cn('press', buttonVariants({ variant, size }), className)}
    />
  );
}
```

---

## `src/components/PreferencesMenu.tsx`

```tsx
import { GearSixIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isThemeId, THEMES } from '@/lib/themes';
import { useMotion } from '@/providers/MotionProvider';
import { useTheme } from '@/providers/ThemeProvider';

/** Theme and motion. Per device: stored in this browser only. */
export function PreferencesMenu() {
  const { theme, setTheme } = useTheme();
  const motion = useMotion();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="press size-11 desk:size-9"
            aria-label="Preferences"
          />
        }
      >
        <GearSixIcon weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => {
              if (isThemeId(value)) setTheme(value);
            }}
          >
            {THEMES.map((t) => (
              <DropdownMenuRadioItem
                key={t.id}
                value={t.id}
                closeOnClick={false}
              >
                {t.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            closeOnClick={false}
            checked={motion.preference}
            disabled={motion.reduced}
            onCheckedChange={(on) => motion.setPreference(on)}
          >
            <span className="flex-1">Motion</span>
            {motion.reduced && (
              <span className="text-muted-foreground">off by your OS</span>
            )}
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## `src/pages/HomePage.tsx`

```tsx
import { useEffect, useState } from 'react';
import type { Health } from '#shared/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ApiFailure, getHealth } from '@/lib/api';

type Status =
  | { state: 'checking' }
  | { state: 'up'; health: Health }
  | { state: 'down'; message: string };

const READY = [
  'A Worker that serves this page and the API under /api',
  'Light and Dark themes that follow your system, with no flash on load',
  'Motion that a switch in Preferences, or your system, turns off',
  'Checks on every pull request: types, lint, unit tests, browser tests and axe',
];

export function HomePage() {
  usePageTitle();
  const [status, setStatus] = useState<Status>({ state: 'checking' });

  useEffect(() => {
    const abort = new AbortController();
    getHealth(abort.signal)
      .then((health) => setStatus({ state: 'up', health }))
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        setStatus({
          state: 'down',
          message:
            error instanceof ApiFailure
              ? error.message
              : 'Something went wrong.',
        });
      });
    return () => abort.abort();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-page-title">{{PROJECT_TITLE}}</h1>
        <p className="text-state">
          {{DESCRIPTION}}
        </p>
      </div>

      <Card className="enter max-w-prose">
        <CardHeader>
          <CardTitle>What is ready</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {READY.map((line, i) => (
              <li
                key={line}
                className="enter flex gap-2"
                style={{ '--i': i } as React.CSSProperties}
              >
                <span aria-hidden="true" className="text-ok">
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p role="status" className="text-sm text-muted-foreground">
        {status.state === 'checking' && 'Checking the Worker…'}
        {status.state === 'up' && (
          <>
            Worker is up:{' '}
            <span className="font-mono">
              {status.health.version} ({status.health.commit})
            </span>
          </>
        )}
        {status.state === 'down' && (
          <span className="text-destructive">{status.message}</span>
        )}
      </p>
    </div>
  );
}
```

---

## `src/pages/HelpPage.tsx`

```tsx
import { useEffect } from 'react';
import { BUILD_LABEL } from '#shared/version';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * How to use the app, in sections a link can open (`/help#theme`). It
 * covers using the app only; running it is docs/self-hosting.md's job.
 */
export function HelpPage({ section }: { section?: string }) {
  usePageTitle('Help');

  useEffect(() => {
    if (section) {
      document.getElementById(section)?.scrollIntoView();
    }
  }, [section]);

  return (
    <div className="flex max-w-prose flex-col gap-8">
      <h1 className="text-page-title">Help</h1>

      <section aria-labelledby="theme" className="flex flex-col gap-2">
        <h2 id="theme" className="font-heading text-xl font-semibold">
          Theme and motion
        </h2>
        <p>
          Preferences (the gear in the top right) picks System, Light or Dark,
          and turns motion off. Both are kept in this browser only. If your
          system asks for reduced motion, nothing moves whatever the switch
          says.
        </p>
      </section>

      <section aria-labelledby="about" className="flex flex-col gap-2">
        <h2 id="about" className="font-heading text-xl font-semibold">
          About this build
        </h2>
        <p>
          Version <span className="font-mono">{BUILD_LABEL}</span>.
        </p>
      </section>
    </div>
  );
}
```

---

## `src/pages/NotFoundPage.tsx`

```tsx
import { ButtonLink } from '@/components/ButtonLink';
import { usePageTitle } from '@/hooks/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Not found');
  return (
    <div className="flex max-w-prose flex-col items-start gap-4">
      <h1 className="text-page-title">Not found</h1>
      <p className="text-state">
        There is nothing at this address. It may have moved, or the link may be
        mistyped.
      </p>
      <ButtonLink route={{ name: 'home' }}>Go home</ButtonLink>
    </div>
  );
}
```
