# Vibe Project: Add-on Recipes

The `--vibe` scaffold is the part every one of these projects shares. What
follows is the part only some need, taken from the projects that built it
first. Each recipe says when to reach for it, what changes, and where the
working version lives. The source repositories are public:
[holocron](https://github.com/jbouder/holocron) (a live retro board, no
accounts, wiped daily), [datapad](https://github.com/jbouder/datapad) (a
private single-user tracker behind Cloudflare Access),
[pulse](https://github.com/jbouder/pulse) (a daily collector and a static
dashboard) and [holotable](https://github.com/jbouder/holotable) (a larger
self-hosted app with a docs site). Local clones sit beside this one under
`~/repos/jbouder/` when they exist.

Do none of these while scaffolding. Apply one when the project asks for it,
in its own pull request, and keep the scaffold's rules: a test that holds
each new rule, the docs page that describes it updated in the same change,
and every check green.

---

## State that lives somewhere: a Durable Object

**When:** anything is saved, shared live between people, or survives a
reload on another device.

**Shape (holocron `worker/board.ts`, datapad `worker/datapad.ts`):**

- `wrangler.jsonc`: a `durable_objects` binding and a migration,
  `"migrations": [{ "tag": "v1", "new_sqlite_classes": ["ThingObject"] }]`.
  The object's SQLite storage is the database. Export the class from
  `worker/index.ts`.
- `shared/types.ts` the document, `shared/protocol.ts` zod schemas for every
  op and socket message (`bun add zod`), `shared/reducer.ts` **the only
  place state changes**: pure, ids and `now` come in the op. Permission
  checks live in the reducer so the UI can never do what the server
  refuses.
- The object persists after each op and broadcasts it with a sequence
  number; a client that sees a gap asks for a snapshot. WebSockets use
  hibernation (`ctx.acceptWebSocket`).
- The client hook (`useBoard`, `useDatapad`) renders
  `pending.reduce(reduce, confirmed)`: optimistic ops over a confirmed
  snapshot. No component touches the socket.
- Tests: `test/reducer.test.ts` for every op; the object's own tests run in
  workerd with real SQLite and alarms (`runInDurableObject` from
  `cloudflare:test`).
- `preview.yml` already deletes with `--force`, which a Worker that owns a
  Durable Object namespace needs.
- AGENTS.md gains the rule: "Every change is an op through `reduce()`. Add
  the op to `protocol.ts`, handle it in `reducer.ts`, test it in
  `test/reducer.test.ts`."

Name the object by something the server trusts (a verified email, an
unguessable code), never by a value the client sends alone.

## A private app: Cloudflare Access

**When:** only you (or a named few) may open it.

**Shape (datapad `worker/access.ts`, `scripts/check-deploy.ts`,
`docs/self-hosting.md` §4):**

- Access (Zero Trust) in front of the hostname, *and* the Worker verifying
  the `Cf-Access-Jwt-Assertion` JWT against the team's JWKS on every
  request, so a misconfigured Access app can never leak.
  `"run_worker_first": true` so assets are checked too; `ACCESS_AUD` and
  `ACCESS_TEAM_DOMAIN` are public `vars`.
- A dev bypass that works only while `ACCESS_AUD` is empty *and*
  `DEV_ACCESS_EMAIL` is set in `.dev.vars` on a localhost hostname;
  `.dev.vars.example` documents it. The deploy workflow runs
  `bun scripts/check-deploy.ts` first and refuses an empty `ACCESS_AUD` or
  any `DEV_ACCESS_EMAIL` (`test/workflows.test.ts` holds the order).
- The e2e fixtures sign each test in as its own address through the bypass
  header, so each test gets an empty object; CI writes `.dev.vars` for the
  e2e job.
- **Delete `preview.yml`** (previews are public on workers.dev), add
  `<meta name="robots" content="noindex, nofollow">` and a
  `Disallow: /` `robots.txt`, make `/assets/*` `Cache-Control: private`,
  and the manifest link `crossorigin="use-credentials"`.
- A "Sign in again" screen when the session ends, not a toast; drafts kept.

## Bot protection and rate limits

**When:** anyone can create something (holocron's boards).

- Turnstile on the create form, verified server-side (holocron
  `worker/turnstile.ts`; the `turnstile-spin` skill sets it up). Off when
  the site key var is empty, so local and preview runs work.
- `ratelimits` in `wrangler.jsonc` (`"simple": { "limit": 5, "period": 60 }`)
  keyed by client IP. `namespace_id` is account-wide: `preview.yml` gives
  previews their own (holocron rewrites it with `jq`).
- The e2e fixtures give each test its own client IP so the limiter stays
  live in Miniflare.

## Scheduled work and backups

**When:** something must happen without a visitor: a daily wipe (holocron),
a nightly backup (datapad).

- A Durable Object alarm (`ctx.storage.setAlarm`), rescheduled by the alarm
  itself; times are DST-safe in a named time zone (`shared/schedule.ts`,
  `shared/reset-time.ts`), tested as pure functions.
- Backups: an R2 binding, the export JSON written per object and pruned to
  the latest N; a destructive action writes a `before-*` copy first
  (datapad `docs/data.md`).
- Every entry point calls an `expireIfDue()`-style check first, so a missed
  alarm cannot leave stale data reachable.

## A language model in the browser

**When:** summaries or analysis, with nothing leaving the device and no API
key (holocron's retro analysis, datapad's summaries).

- `@mlc-ai/web-llm` in a Web Worker (`src/lib/analysis.worker.ts`),
  lazy-loaded behind an opt-in consent step that says the download size;
  an "unsupported" state without WebGPU.
- CSP: `'wasm-unsafe-eval'` in `script-src`; `connect-src` adds
  `https://huggingface.co https://*.huggingface.co https://*.hf.co
  https://raw.githubusercontent.com`; `test/headers.test.ts` lists exactly
  those. `Referrer-Policy: same-origin` (Hugging Face refuses a
  `*.workers.dev` referrer).
- `scripts/budget.ts` fails if WebLLM's markers (`tvmjs`, `webllm/model`)
  reach the entry chunk; pin the model library URLs with integrity hashes
  (datapad `src/lib/summary-pins.ts`).
- Prompts are built by pure functions in `shared/` and never carry names
  or ids that need not be there.

## An MCP server

**When:** Claude (or another MCP client) should read or write the app's
data (datapad `worker/mcp/`, `docs/mcp.md`).

- `@cloudflare/workers-oauth-provider` with a KV namespace; exactly the
  provider's paths bypass the app's own sign-in, and a consent page behind
  it issues the grant. Scopes `read` / `write`.
- Tools go through the same `reduce()` as the UI, limited to an explicit
  allowlist of op types; no tool deletes, imports or erases.
- `@modelcontextprotocol/sdk` as a dev dependency drives the tests.

## Navigation for more than a few pages

**When:** the header's links stop fitting.

- A rail above `desk` and a bottom tab bar below it, never both, never
  neither (datapad `src/components/Rail.tsx`, `TabBar.tsx`,
  `e2e/reflow.spec.ts`). The tab bar respects
  `env(safe-area-inset-bottom)`; toasts sit above it.
- Both get their own `view-transition-name` while a page transition runs
  (datapad `src/index.css` `.vt-tabbar`, `.vt-topbar`), so they hold still
  and opaque while the page moves under them.

## Lists that move

- FLIP: `src/hooks/useFlip.ts` from datapad, items marked `data-flip-id`;
  `holdFlip()` before a section opens so it jumps instead of sliding. Never
  FLIP the thing under the pointer.
- Layout switches (table ↔ cards): a `layout` view transition naming the
  first 40 visible items only for its length (datapad
  `withLayoutTransition`).
- Deletes leave first: a WAAPI exit on the row, then the state change. A
  toast with Undo instead of a confirm for anything reversible (datapad
  `src/components/Toast.tsx`, `ToastProvider`).
- Every drag gets a keyboard and a touch way, and a row in
  `ACCESSIBILITY.md`.

## Errors the owner can find

- An `ErrorBoundary` per page with "Reload this view" (the shell stays), and
  `POST /api/client-error` logging the message, the component stack and the
  version, capped in size (datapad `src/components/ErrorBoundary.tsx`).
- `GET /api/health` already returns the version and commit; Help shows
  them. Point an uptime check at it.

## Installable (PWA) and icons

- Real PNG icons (192, 512, maskable 512, apple-touch-icon) and an `og.png`
  generated from the mark by a script (datapad `scripts/icons.ts`,
  `test/icons.test.ts`), and `theme-color` per scheme kept in step with the
  theme (`ThemeProvider` already updates the meta tags).
- A brand folder with the mark on light and dark (holocron `docs/brand/`)
  for the README's `<picture>`.

## More themes

- A theme is an entry in `THEMES` (`src/lib/themes.ts`) with a `base`, a
  token block in `src/index.css`, and the same entry in the inline script's
  logic; `test/themes.test.ts` and `e2e/a11y.spec.ts` pick it up from
  `THEMES` (holocron's Dagobah, Tatooine and Kamino).

## Bigger test suites

- Coverage floors on `shared/` and `worker/` with
  `@vitest/coverage-istanbul` (V8 coverage does not work in workerd); raise
  them as the suite grows, never lower them to get a change through
  (datapad `vitest.config.ts`).
- Split e2e across runners with `--shard` once it passes a few minutes, and
  keep one aggregate job named `e2e` as the required check (datapad
  `ci.yml`). Dates in specs never literal: a seed shifted to today, run in
  more than one time zone (datapad `e2e/seed.ts`, `AGENTS.md`).

## A collector and a static dashboard

**When:** the job is gathering numbers on a schedule and showing them
(pulse).

- A Python collector (`uv`, stdlib + what it needs, `ruff` and `pytest`)
  run by a scheduled Action that upserts CSV under `data/`, rebuilds the
  dashboard's JSON, commits, and dispatches the deploy (a push made with
  `GITHUB_TOKEN` triggers no other workflow).
- The site is this scaffold's front end in `site/`, deployed as static
  assets only; the JSON contract is one docstring on the Python side
  mirrored exactly by one TypeScript module, changed together and
  additively.
- Blank means unknown, not zero; a partial failure is a warning, a total
  one an error.

## A docs site

**When:** the docs outgrow a handful of Markdown files (holotable `docs/`).

- Astro Starlight in `docs/` with its own `package.json`, deployed as a
  second Worker; `starlight-links-validator` fails the build on a broken
  link, and a script checks the root Markdown files' links too
  (holotable `docs/scripts/check-root-links.mjs`, `.github/workflows/docs.yml`).
- A test that holds the docs' tables of routes and settings to the code
  (holotable `test/docs-drift.test.ts`).
