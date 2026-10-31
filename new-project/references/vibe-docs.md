# Vibe Project: README, contributor and policy files, and docs/

Use these exact file contents when scaffolding a `--vibe` project. Paths are
relative to `$TARGET_DIR`. Replace every placeholder (the table is in
SKILL.md's Pre-flight) before writing; `{{THEME_SCRIPT_HASH}}` is filled in
after `index.html` is written (SKILL.md, Step V3). These files were generated
from a scaffold that passed every check in CI (`scripts/vibe_refs.py`); do not
"improve" them while scaffolding.

---

## `README.md`

````markdown
<p align="center">
  <img src="public/favicon.svg" alt="" width="72" height="72" />
</p>

# {{PROJECT_TITLE}}

{{DESCRIPTION}}

<!--
A screenshot or two once there is something to show: light theme, fictional
data, desktop and phone, committed under docs/screenshots/ with alt text
that says what the picture shows.
-->

## Features

- **Themes.** System, Light and Dark, with no flash on load.
- **Motion that knows when to stop.** A Motion switch in Preferences, and
  your system's reduced-motion setting, turn every animation into a cut.
- **Built for phones and keyboards.** Every page is checked at phone width
  and against WCAG 2.2 AA ([ACCESSIBILITY.md](ACCESSIBILITY.md)).

## Run it yourself

See **[docs/self-hosting.md](docs/self-hosting.md)**. Short version: a
Cloudflare account (the free plan covers it), `bun install`,
`npx wrangler login`, `npm run deploy`. No secrets, no paid plan.

Also: [docs/architecture.md](docs/architecture.md) for how it fits
together, [docs/design.md](docs/design.md) for tokens, type, motion and
copy, [docs/security.md](docs/security.md) for the threat model and
headers. [CHANGELOG.md](CHANGELOG.md) lists every release;
[CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) are the
guides to working in this repository.

## Stack

React 19 + TypeScript + Vite, Tailwind CSS v4, stock shadcn (base-lyra on
Base UI), Oxanium + JetBrains Mono, Phosphor icons, Biome. One Cloudflare
Worker through `@cloudflare/vite-plugin`. Tests with Vitest inside workerd
via `@cloudflare/vitest-plugin`; Playwright + axe at desktop and phone
width. No animation library: View Transitions, the Web Animations API,
`@starting-style` and CSS `linear()` springs.

## Commands

```bash
bun install
npm run dev          # http://localhost:5173 with the Worker running locally
npm test             # type-gen + vitest in workerd
npm run e2e          # playwright + axe, desktop and phone
npm run check        # biome
npm run build        # types + tsc + vite build (client + worker)
npm run deploy       # build + wrangler deploy
```

## License

MIT.
````

---

## `CONTRIBUTING.md`

````markdown
# Contributing

Thanks for looking. This is a small project kept to a high bar; this page
is how. [AGENTS.md](AGENTS.md) holds the same rules for AI agents, in more
detail; the two stay in step.

## Setup

```bash
bun install
npm run dev                      # http://localhost:5173
bunx playwright install chromium # once, for npm run e2e
```

## A change

1. **An issue first**, for anything bigger than a typo: what and why. One
   issue per pull request.
2. **A branch**, never `main`.
3. **The checks**, before you push. CI runs the same and they gate the
   merge:

   ```bash
   bunx biome ci .   # format and lint (npm run check fixes)
   bunx knip         # nothing unused
   bunx tsc -b       # types
   npm run build && npm run budget
   npm test          # Vitest in workerd
   npm run e2e       # Playwright + axe, desktop and phone
   ```

4. **The pull request** fills in the template. A change to the UI shows it:
   screenshots desktop and phone (Pixel 7 width), Light and Dark where it
   matters, attached in the PR body, never committed.
5. **CHANGELOG.md** gets a line under `## [Unreleased]` for anything
   someone using the app would notice. Docs a change touches are updated
   in the same PR.

The bar for UI: it uses the stock components and the color tokens, works
at 320px with no sideways scrolling, works from the keyboard, passes axe in
Light and Dark, and moves (or doesn't) by the rules in
[docs/design.md](docs/design.md#motion).

## Releasing

Every green `main` is deployed already; a release names a point in that
history.

1. In a pull request: move `## [Unreleased]`'s entries under a new
   `## [x.y.z] — YYYY-MM-DD` heading (leave `## [Unreleased]` empty above
   it), and set `version` in `package.json` to `x.y.z`. Merge it.
2. Tag the merge commit and push the tag:

   ```bash
   git checkout main && git pull
   git tag vx.y.z && git push origin vx.y.z
   ```

`.github/workflows/release.yml` checks the tag against `package.json` and
the changelog, and creates the GitHub Release with that section as its
notes.

Versions are [semver](https://semver.org) for what a person using the app
sees: a patch fixes, a minor adds, a major changes or removes something
they relied on.

## Security

Never in a public issue: see [SECURITY.md](SECURITY.md).
````

---

## `CHANGELOG.md`

```markdown
# Changelog

Every release of {{PROJECT_TITLE}}, newest first, in the shape of
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are
[tags](https://github.com/{{GITHUB_OWNER}}/{{PROJECT_NAME}}/tags) on `main`; each has a
[GitHub release](https://github.com/{{GITHUB_OWNER}}/{{PROJECT_NAME}}/releases) whose notes are
its section here. How to cut one is in
[CONTRIBUTING.md](CONTRIBUTING.md#releasing).

## [Unreleased]

### Added

- The app: a Worker serving the page and `/api/health`, System, Light and
  Dark themes, a Motion switch, Help, and a Not found page.
```

---

## `SECURITY.md`

```markdown
# Security policy

{{PROJECT_TITLE}} runs on Cloudflare. How it is protected is in
[docs/security.md](docs/security.md).

## Reporting a vulnerability

Please report it privately, not in a public issue:
[open a private advisory](https://github.com/{{GITHUB_OWNER}}/{{PROJECT_NAME}}/security/advisories/new)
(GitHub → Security → Report a vulnerability). Say what you found, where
(a path, file or commit), and how to reproduce it.

Never use real data in a report. Test against your own deployment
([docs/self-hosting.md](docs/self-hosting.md)) or `npm run dev`, never
against someone else's.

## In scope

- **The Worker** (`worker/`): every route, what it accepts, what it
  returns, what it logs.
- **The app** (`src/`): script injection, data leaving the browser, the
  headers and CSP in `public/_headers`.
- The repository's workflows and supply chain (`.github/`).

Out of scope: Cloudflare's own services (report those to Cloudflare), a
deployment's own misconfiguration that the docs warn against, and denial
of service by volume.

## What to expect

This is a one-person project, so the timelines are best effort:

- an acknowledgement within a week;
- an assessment, and a fix or a plan, within 30 days for anything serious;
- credit in the advisory and `CHANGELOG.md`, if you want it, once a fix is
  released.

Only the latest release on `main` gets fixes.
```

---

## `ACCESSIBILITY.md`

```markdown
# Accessibility

{{PROJECT_TITLE}} aims to conform to **WCAG 2.2 Level AA**, on desktop and phone, in
Light and Dark. What is checked, how, and the known exceptions are below.
A new exception gets an issue and a line here.

**Status:** not yet audited. Update this line after the first manual pass
(below), with its date and the level reached (for example "partially
conforms, checked 2026-11-15").

## How it is checked

Automated, on every pull request (CI's `check` and `e2e` jobs):

| What | Where |
| --- | --- |
| axe (the WCAG 2.0, 2.1 and 2.2 A and AA rules) on every route and the states behind a click (menus, dialogs), in Light and Dark, at desktop and phone width | `e2e/a11y.spec.ts`, and `expectAccessible()` in other specs |
| Contrast of every token pair as drawn: text ≥ 4.5:1 on each surface it sits on; the focus ring (at the half alpha it is mostly drawn with) and control edges ≥ 3:1 | `test/themes.test.ts` |
| Reflow at 320px (a 1280px window at 400% zoom) with no sideways scrolling; 44px targets on touch | `e2e/reflow.spec.ts` |
| Reduced motion (the system setting and Preferences → Motion): nothing animates | `e2e/motion.spec.ts` |
| A route change moves focus to the new page; each page has its own title | `e2e/app.spec.ts` |
| Forced colors (Windows Contrast themes): the current page stays outlined in `Highlight` | `e2e/a11y.spec.ts`, `src/index.css` |
| The skip link reaches the main content | `e2e/a11y.spec.ts` |

Manual, before each release (record the date and anything found):

| Check | Last done | Notes |
| --- | --- | --- |
| VoiceOver on macOS (Safari) through every page and menu | _not yet recorded_ | |
| VoiceOver on iOS (Safari) | _not yet recorded_ | |
| Keyboard only, no mouse, through every page, menu and dialog | _not yet recorded_ | |
| 200% browser zoom on desktop | _not yet recorded_ | Reflow at 400% is automated. |
| The deployed app with the `a11y-audit` skill (`/a11y-audit <url>`) | _not yet recorded_ | |

## Every drag has another way

WCAG 2.5.7 (dragging) and 2.1.1 (keyboard): nothing needs a drag. When
something can be dragged, add a row with its keyboard and touch way.

| Drag (mouse) | Keyboard | Touch |
| --- | --- | --- |
| _none yet_ | | |

## Known exceptions

None recorded yet. When a gap is found and not fixed right away, list it
here with what it affects, the workaround if there is one, and its issue.

## Building it in

- Colors are tokens (`src/index.css`); a new pair that carries meaning gets
  a row in `test/themes.test.ts`. A translucent token is tested as drawn.
- A new route, dialog or menu gets a line in `e2e/a11y.spec.ts`.
- A new drag needs a keyboard and a touch way to do the same, and a row in
  the table above.
- Motion follows [docs/design.md](docs/design.md#motion); state is never
  shown by a fill alone (forced colors drops it).

Found a barrier? Open an issue with the `accessibility` label: what you
were doing, what you expected, and the assistive technology, browser and
system you used. A barrier that stops someone using a feature is a bug,
not an enhancement.
```

---

## `LICENSE`

```
MIT License

Copyright (c) {{YEAR}} {{AUTHOR}}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## `CLAUDE.md`

```markdown
@AGENTS.md
```

---

## `docs/architecture.md`

````markdown
# Architecture

{{PROJECT_TITLE}} is one Cloudflare Worker with static assets. The browser loads a
single-page React app from the edge; the app talks to the Worker's API
under `/api/*`.

```
browser ──▶ Cloudflare edge
              ├─ /api/*  ──▶ Worker (worker/index.ts)
              └─ anything else ──▶ static assets (dist/client, public/_headers)
                                    unknown paths → index.html (the SPA)
```

## Requests

`wrangler.jsonc` sends only `/api/*` to the Worker first
(`run_worker_first`); every other path is a static asset served from the
edge with the headers in `public/_headers`, and an unknown one falls back
to `index.html` so a deep link like `/help` loads the app, whose router
takes it from there.

The Worker looks the path up in `ROUTES`. An unknown path is a JSON 404,
a known one with the wrong method a 405 with `Allow`. Every response it
makes carries `API_HEADERS` (no framing, no sniffing, no caching, HSTS)
and an `x-request-id`.

| Path | Method | What |
| --- | --- | --- |
| `/api/health` | GET | `{ ok, version, commit }`: the Worker is up, and which build |

## Code

- `shared/` is the contract: types and pure functions both sides import
  (`#shared/…`). Nothing in it touches the DOM or a Workers API.
- `worker/` is the server half. Bindings are typed by `wrangler types`
  into `worker-configuration.d.ts` (generated, ignored).
- `src/` is the browser half. `lib/router.ts` maps paths to pages;
  `components/AppShell.tsx` renders the current one inside a view
  transition and moves focus to it.

## Client

- **Themes.** An inline script in `index.html` applies the saved theme
  before first paint; `ThemeProvider` takes over after. The script is
  allowed by its hash in the CSP (`test/headers.test.ts` prints a new one
  when it changes).
- **Motion.** `MotionProvider` combines the Motion preference and
  `prefers-reduced-motion` into `active`, and sets `html[data-motion]` for
  CSS. See [design.md](design.md#motion).
- **Build info.** `build-info.ts` defines the version (`package.json`) and
  the commit for the app and the Worker; Help and `/api/health` show them.

## Logs

The Worker writes one JSON object per line (`worker/log.ts`), seen in
Workers Logs (`observability` in `wrangler.jsonc`) and `npm run tail`:

| `level` | When | Fields |
| --- | --- | --- |
| `error` | A request threw; the client got a 500 naming the id | `path`, `requestId`, `error` (the message only) |

The request id is Cloudflare's `cf-ray` when there is one, so an id read
off an error finds the request in Cloudflare's own logs too. No line
carries a credential, a request body or anything a person typed.

## Growing it

Patterns the sibling projects use, for when this one needs them:

- **State that lives somewhere:** a SQLite-backed Durable Object per room,
  board or user; every change a typed op through one pure `reduce()` in
  `shared/`, run optimistically in the browser and authoritatively in the
  object, fanned out over a WebSocket ([holocron](https://github.com/jbouder/holocron),
  [datapad](https://github.com/jbouder/datapad)).
- **Sign-in:** Cloudflare Access in front of the hostname, and the Worker
  verifying the Access JWT on every request as well (datapad).
- **A model in the browser:** WebLLM in a Web Worker, lazy-loaded, opt-in,
  nothing leaving the device (holocron's analysis, datapad's summaries).
````

---

## `docs/design.md`

```markdown
# Design

{{PROJECT_TITLE}} looks, feels and moves like its siblings,
[holocron](https://github.com/jbouder/holocron) and
[datapad](https://github.com/jbouder/datapad): Oxanium Variable for UI and
headings, JetBrains Mono for code, square corners, stock shadcn
`base-lyra` components on Base UI, and three themes: System, Light and
Dark.

## Tokens

Every color is a semantic token defined by both Light (`:root`) and Dark
(`.dark`) in `src/index.css`; `test/themes.test.ts` fails if Dark misses
one, or a pair drops below WCAG AA as drawn. Use the utilities
(`bg-card`, `text-muted-foreground`, `border-border`), never a literal.

Two semantic pairs beyond stock shadcn:

| Token | Meaning | Utilities |
| --- | --- | --- |
| `--warn` / `--warn-foreground` | Needs attention: due, paused, a warning | `text-warn`, `bg-warn`, `bg-warn/15`, `border-warn` |
| `--ok` / `--ok-foreground` | Done, healthy, saved | `text-ok`, `bg-ok`, `bg-ok/15`, `border-ok` |

`--warn` and `--ok` are safe as text on `background` and `card`; their
`-foreground` is safe on a solid fill. `--destructive` is errors and
deletes. Dark is the neutral counterpart of Light: the same grays
inverted, no tint.

## Type scale

| Style | Where | Size |
| --- | --- | --- |
| `.text-page-title` | Each page's `h1` | 28px, 34px from `desk` |
| `text-xl font-semibold font-heading` | Section headings (`h2`) | 20px |
| body | Everything else | 15px, line height 1.45 |
| `.text-state` | Empty states, a page's one-line summary | 17px, muted |
| `text-sm text-muted-foreground` | Secondary detail | 14px |
| `font-mono` | Code, ids, versions, SHAs | JetBrains Mono |

`rem` stays 16px so the stock components keep their sizes.

## Layout

- One breakpoint, `desk:` (820px). Phone below, wide above.
- Content sits in `main.page` at up to `max-w-5xl`, text at `max-w-prose`.
- Corners are square (`--radius: 0px`); depth is a border or a surface
  change, never a shadow.
- Touch targets are 44px below `desk` (`size-11 desk:size-9` on an icon
  button). Nothing is revealed only on hover: `hover-none:` shows it.
- A page that grows several sections takes a rail above `desk` and a
  bottom tab bar below it, as datapad does; until then, the header.

## Copy

- Sentence case everywhere, including buttons and headings.
- Buttons name the action: "Save note", "Delete board", not "OK" or
  "Submit".
- Typographic quotes and apostrophes in UI text (“ ” ’), an ellipsis
  character for in-progress states ("Saving…"), "–" for unknown.
- Empty states say what is missing and what to do next.
- Errors say what happened and what to try, in one line:
  - **Could not … .** An action that did not happen: "Could not save.
    Try again."
  - **Could not reach {{PROJECT_TITLE}}. Check the connection and try again.** Any
    call that got no answer. Never the browser's own "Failed to fetch".
- State is never color alone: a status dot has a label, a change has a
  sign.

## Motion

No animation library. The platform does it: View Transitions, the Web
Animations API, `@starting-style`, and CSS `linear()` springs.

- **Tokens.** `--duration-fast` (100ms), `--duration-base` (200ms),
  `--duration-slow` (350ms), `--ease-standard`, `--ease-emphasized`, and
  the springs `--ease-spring-snappy` / `--ease-spring-bouncy` (installed
  by `src/lib/motion.ts`). Script reads `DURATION` and `EASE` from
  `src/lib/motion-tokens.ts`.
- **Opacity and transform only.** Layout changes go through FLIP or a
  view transition.
- **View transition types** (`withViewTransition(update, enabled, type)`,
  names scoped by `html[data-vt]`): `page` (route changes: the old page
  lifts out, the new one settles in, the header holds) and `theme` (a
  crossfade of the whole page).
- **Entrances.** `.enter`, staggered with `--i`; overlays with
  `@starting-style` or Base UI's `data-starting-style` /
  `data-ending-style`. Pressable things take `.press`. Counts never
  animate.
- **Two switches.** Preferences → Motion (`html[data-motion="off"]`) and
  `prefers-reduced-motion`, which wins. Both turn every animation into a
  cut, view transitions included (`e2e/motion.spec.ts`).

When a list starts to reorder, add FLIP (`useFlip` and `data-flip-id`, as
in datapad's `src/hooks/useFlip.ts`); when an exit is worth seeing, run a
WAAPI animation before the state change.
```

---

## `docs/security.md`

```markdown
# Security

How {{PROJECT_TITLE}} is protected, and what it trusts. Reporting a problem is in
[SECURITY.md](../SECURITY.md).

## Threat model

| Who | Can | Cannot |
| --- | --- | --- |
| Anyone on the internet | Load the app, call every `/api/*` route | Run script in the app, frame it, read another visitor's data |
| A malicious page in another tab | Send requests with the visitor's cookies | Make a state-changing route act on them (cross-site `Origin` and non-JSON are refused) |
| Someone with the repository | Read every line, every workflow | Read a secret, deploy from a fork, run a fork's PR with a write token |

Update this table when the app gains accounts, stored data, or a route
that changes something.

## Every path and its check

| Path | Check |
| --- | --- |
| static assets | none needed: public, read-only, headers from `public/_headers` |
| `GET /api/health` | none: says only that the Worker is up and which build |

A new route adds a row: who may call it, what it validates, what it
changes.

## Transport and headers

Static assets (`public/_headers`, held by `test/headers.test.ts`):

- **CSP**: `default-src 'self'`; scripts from this origin plus the inline
  theme script by hash; no `unsafe-eval`, no inline script otherwise;
  nothing loaded from or sent to another origin; `object-src`, `base-uri`
  and `frame-ancestors` `'none'`.
- **HSTS** for a year, `nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: same-origin`, a `Permissions-Policy` that turns off
  camera, microphone, location and the rest.
- `/assets/*` (content-hashed by Vite) cached for a year, immutable.

The Worker's own responses (`API_HEADERS` in `worker/index.ts`):
`default-src 'none'`, no framing, `nosniff`, `no-referrer`, `no-store`,
HSTS.

## What the logs contain

Request ids, paths and error messages (`worker/log.ts`); never a
credential, a request body or anything a person typed.

## Supply chain

- Every GitHub Action is pinned to a commit SHA, the Playwright image by
  digest (`test/workflows.test.ts`); Dependabot proposes updates monthly.
- `bun install --frozen-lockfile` in CI; `bun audit` fails on a moderate
  or worse advisory; `scripts/licenses.ts` fails on a license outside the
  allowlist; CodeQL scans the code and the workflows.
- Workflows run with `contents: read` unless a job needs more, and never
  on `pull_request_target`. Deploys use one scoped Cloudflare API token,
  held as a repository secret, in the `production` environment.
```

---

## `docs/self-hosting.md`

````markdown
# Running {{PROJECT_TITLE}} on your own Cloudflare account

About ten minutes. The free Workers plan covers it.

## Prerequisites

- A Cloudflare account.
- [bun](https://bun.sh) (the version in `package.json`'s `packageManager`)
  and Node 22 or later.

## 1. Make the config yours

In `wrangler.jsonc`, `name` is the Worker's name and so its URL:
`https://<name>.<your-subdomain>.workers.dev`. Change it if `{{PROJECT_NAME}}` is
taken in your account.

## 2. Deploy

```bash
bun install
npx wrangler login
npm run deploy
```

Wrangler prints the URL. Open it: the home page says "Worker is up" with
the version.

## Custom domain

Workers & Pages → the Worker → Settings → Domains & Routes → Add →
Custom domain. HSTS is already on, so once a browser has visited it never
tries plain HTTP again.

## Deploy from GitHub Actions

`.github/workflows/deploy.yml` deploys every commit on `main` that passed
CI, and nothing else. Until the secrets below exist it skips itself and
stays green.

1. Create an API token (My Profile → API Tokens → Create Token → the
   **Edit Cloudflare Workers** template), scoped to your account.
2. In the repository: Settings → Secrets and variables → Actions → add
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (Workers & Pages →
   Overview, right-hand side).
3. Settings → Environments → `production` appears after the first deploy;
   add a protection rule there if you want to approve each one.
4. Settings → Rules → Rulesets → a branch ruleset on `main`: require a
   pull request, and the status checks `check`, `e2e`,
   `codeql (javascript-typescript)` and `codeql (actions)`. Block force
   pushes.

### Pull request previews

`.github/workflows/preview.yml` deploys each pull request from this
repository to its own Worker, `{{PROJECT_NAME}}-pr-<number>`, comments its URL on
the PR, and deletes it when the PR closes. It uses the same secrets.

Previews are **public** on workers.dev. Before the app holds anything
private, delete the workflow or put Cloudflare Access in front of
`*-pr-*` too.

### Dependency updates

Dependabot (`.github/dependabot.yml`) opens grouped pull requests monthly
for packages and for the actions. They run CI like any other PR and are
never deployed until merged. An action update changes the SHA and its
`# vX.Y.Z` comment together. When `@playwright/test` moves, move the
Playwright image digest in `ci.yml` with it:

```bash
docker buildx imagetools inspect mcr.microsoft.com/playwright:v<version>-noble
```

`bun audit` in CI fails on a moderate or worse advisory. One with no fixed
release yet can be skipped by id (`--ignore=GHSA-…`) with a comment saying
why, and removed when the fix lands.

## Local development

```bash
bun install
npm run dev
```

The Worker runs in Miniflare beside Vite, so `/api/*` works as deployed.
Local secrets, when the app has any, go in `.dev.vars` (ignored by git).

## Observability

Workers Logs is on (`observability` in `wrangler.jsonc`): Workers & Pages
→ the Worker → Logs, or `npm run tail` for a live stream. Every line is
JSON ([architecture.md](architecture.md#logs)); search by `requestId`.

## Updating

Pull `main` and `npm run deploy`, or let the workflow do it.

## Rolling back

Workers & Pages → the Worker → Deployments → pick the last good one →
Rollback, or:

```bash
npx wrangler rollback
```

A rollback restores the code, not data; if the app stores data, a release
that changes its shape says so in `CHANGELOG.md`.
````
