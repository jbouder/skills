# AGENTS.md — {{PROJECT_TITLE}}

Guidance for AI agents working in this repository. Read it before making
changes. `CONTRIBUTING.md` is the human-facing version; keep the two in
step. Many rules below are held by a test named beside them: when one
fails, it is telling you the rule.

## What this is

{{DESCRIPTION}} One Worker serves the
single-page app from static assets and answers the API under `/api/*`.
`docs/architecture.md` is how it fits together.

## Layout

- `shared/` — the domain, used by both sides: types, schemas, pure
  functions. `api.ts` (what the API returns), `version.ts` (the build's
  version and commit). Pure: no DOM, no Workers APIs, so it runs in both
  and in the tests.
- `worker/` — `index.ts` (the API by path, security headers, request ids),
  `log.ts` (one JSON line per event, never a credential or a body).
- `src/` — React 19 + Vite app. `lib/router.ts` (a small pushState router),
  `lib/motion.ts` + `lib/motion-tokens.ts` (motion helpers and tokens),
  `lib/themes.ts` (System, Light, Dark), `lib/api.ts` (the browser half of
  the API), `providers/*` (Motion, Theme), `components/*` (the shell;
  `ui/` is stock shadcn, CLI-managed), `pages/*` (one per route),
  `hooks/*`.
- `test/` — Vitest inside workerd (`@cloudflare/vitest-plugin`): the API,
  headers and CSP, theme contrast, motion tokens, workflow pins.
- `e2e/` — Playwright + axe against `vite preview`, in a **desktop and a
  phone project**. `fixtures.ts` blocks every request off localhost and has
  `expectAccessible`, `settle`, `expectNoSidewaysScroll`.
- `scripts/` — `budget.ts` (the entry's gzip budget) and `licenses.ts` (the
  license allowlist), both run by CI.
- `docs/` — architecture, design, security, self-hosting. The in-app Help
  page covers *using* the app only.

## Stack

React 19 + TypeScript + Vite · Tailwind CSS v4 (CSS-first, `src/index.css`)
· stock shadcn `base-lyra` on Base UI (`src/components/ui`, CLI-managed, do
not hand-edit) · Oxanium + JetBrains Mono · Phosphor icons · Biome ·
Cloudflare Workers via `@cloudflare/vite-plugin` · Vitest in workerd ·
Playwright + axe · **bun** for installs (one version, `packageManager` in
`package.json`, which every workflow uses; npm's resolver trips on the
Vitest peers).

## Rules

### Security

- **The Worker answers only what it lists.** Every API path is an entry in
  `ROUTES` (`worker/index.ts`) with its method; anything else is a JSON 404
  or 405. Every response carries `API_HEADERS` and an `x-request-id`
  (`test/headers.test.ts`).
- **Validate what comes in.** A request body, a query string or a socket
  message is parsed against a schema (zod, in `shared/`) before anything
  reads it; a body has a byte limit. A state-changing route refuses a
  cross-site `Origin` and anything but `application/json`.
- **No credential on a URL.** Nothing secret goes in a path or a query
  string. Secrets are `wrangler secret put`, never `vars`, never committed;
  local ones live in `.dev.vars` (ignored).
- **Logs carry ids and counts.** One JSON object per line through
  `worker/log.ts`; never a credential, a request body or anything a person
  typed. A 500 says only the request id.
- **The CSP stays tight.** `public/_headers` allows the inline theme script
  by hash and nothing else inline; nothing loads from another origin. Widen
  a directive only for a named need, with the reason in `_headers` and a
  line in `test/headers.test.ts`.
- **The repository is public.** No real data in fixtures, tests, docs or
  screenshots.

### UI

- **Stock components first.** Use `src/components/ui/*` (add more with
  `bunx shadcn@latest add <name>`); they are CLI-managed: extend at the call
  site with `className` (through `cn()`) or Base UI's `render` prop, never
  by editing the file. A link styled as a button is `ButtonLink`, never a
  `Button` rendering an `<a>` (Base UI gives that `role="button"`).
- **Colors are tokens.** Light (`:root`) and Dark (`.dark`) in
  `src/index.css` define every token; use `text-warn`, `bg-ok/15`,
  `text-muted-foreground`, never a literal. A new pair that carries meaning
  gets a row in `test/themes.test.ts` (text 4.5:1, focus ring and control
  edges 3:1, as drawn).
- **Square and flat.** `--radius: 0px`, no shadows for depth: borders and
  surfaces (`card`, `muted`) separate things.
- **Type.** Oxanium for UI and headings, JetBrains Mono for code, ids,
  versions and numbers that line up (`font-mono`, `.tabular`). Page titles
  are `.text-page-title`; quiet lines `.text-state`. 15px body.
- **Mobile is first class.** One breakpoint, `desk:` (820px). Every view is
  built and tested at phone width: e2e runs desktop *and* phone; 44px touch
  targets below `desk`; nothing only on hover (`hover-none:` reveals it);
  nothing scrolls the page sideways at 320px.
- **Every page** has an `h1`, a title (`usePageTitle`, WCAG 2.4.2), and a
  deliberate empty, loading and error state. Copy follows
  `docs/design.md#copy`: sentence case, buttons name the action, errors say
  what happened and what to try.
- **State is never color alone.** A status carries a word, a change a sign,
  a chart a text summary. Forced colors drops fills: outline state in
  `Highlight` (`src/index.css`).
- **Focus is never lost.** A route change moves focus to the new page's
  `main`; closing a dialog returns it to what opened it; deleting the
  focused thing hands focus on.

### Motion

- **No animation libraries for app motion.** View Transitions, the Web
  Animations API, `@starting-style`, CSS `linear()` springs. Helpers in
  `src/lib/motion.ts`. (`tw-animate-css` is imported only because the stock
  shadcn overlays in `src/components/ui/*` use it; do not reach for it.)
- **Tokens, not literals.** `var(--duration-base)`, `var(--ease-emphasized)`
  in CSS; `DURATION.base`, `EASE.emphasized` from `@/lib/motion-tokens` in
  script (`test/motion-tokens.test.ts` holds the two equal and keeps
  literals out of `.animate()`).
- **Animate `opacity` and `transform` only.** A position change goes
  through FLIP or a view transition, never a transition on `top`, `height`
  or `margin`.
- **Scope view-transition names** with `html[data-vt="…"]`; types in use:
  `page`, `theme`. Add a type to `ViewTransitionType` and its rules to
  `src/index.css` together.
- **Entrances** use `.enter` (with `--i` inline to stagger a list); anything
  pressable `.press`; overlays `@starting-style` or Base UI's
  `data-starting-style` / `data-ending-style`. Counts never animate.
- **Two switches:** the Motion preference (`html[data-motion="off"]`) and
  `prefers-reduced-motion` (a hard override). JS helpers take `enabled`
  from `useMotion().active`. Motion styling lives in `src/index.css` or at
  the call site, never in `src/components/ui/*`.

### Changes

- **One issue per pull request.** Every PR that changes the UI shows it:
  screenshots in the PR body, desktop *and* phone (Pixel 7 width), light
  and dark where it matters, as GitHub attachments, never committed.
- **A change someone would notice** gets a line under `## [Unreleased]` in
  `CHANGELOG.md`. Releases are `v*` tags on `main` (`CONTRIBUTING.md`).
- **Docs stay true.** A change to something a page in `docs/` or
  `ACCESSIBILITY.md` describes updates it in the same PR.
- **Dependencies are deliberate.** A new one must pass `bun run licenses`
  and `bun audit`, and earn its weight against `bun run budget`; knip fails
  on one that is unused. Load anything big that only one page needs with
  `lazy(() => import(…))`, out of the entry.
- **Actions are pinned** to a full commit SHA with a `# vX.Y.Z` comment,
  and the Playwright image by digest at `@playwright/test`'s exact version
  (`test/workflows.test.ts`). Dependabot moves both.
- American spelling everywhere: color, behavior, center.

## Commands

```bash
bun install
npm run dev          # Vite + the Worker locally (Miniflare), http://localhost:5173
npm test             # wrangler types + vitest (runs in workerd)
npm run e2e          # playwright: build, vite preview, desktop + phone
npm run e2e:changed  # only the specs changed since main
npm run check        # biome check --write
npm run build        # wrangler types + tsc -b + vite build
npm run budget       # after a build: the entry's gzip budget
npm run knip         # unused files, exports, dependencies
npm run licenses     # every installed package's license against the allowlist
npm run deploy       # build + wrangler deploy
```

Run `npm run check && npm run build && npm test` before finishing any
change, and `npm run e2e` when it touches the UI (first time: `bunx
playwright install chromium`). Iterate with `npm run e2e:changed` against a
running `npm run preview -- --port 4318`, but the full `npm run e2e` is the
gate. Before every push, `bunx biome ci .`, `bunx knip` and `bunx tsc -b`
on the final tree must print no errors: they are CI's first three checks.

**Biome checks the code, not the docs.** Markdown is excluded in
`biome.json`, so docs and `CHANGELOG.md` are formatted by hand.

Check UI changes at phone width in the browser too, in Light and Dark,
and add an e2e spec for every flow worth keeping; a new route, dialog or
menu adds itself to `e2e/a11y.spec.ts`.
