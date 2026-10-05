# Audit dimensions

The checklist every audit works through. Each dimension lists what to check,
where the evidence usually lives, and what separates the maturity levels. A
check is a question about the repo, not a demand. Mark a dimension **N/A** only
when the app genuinely has no surface for it (no database, no UI, no LLM, no
public pages), and say why.

## Maturity scale

Score each dimension 0–4. Score what the code does, not what the docs or issue
titles claim.

| Level | Name | Meaning |
|---|---|---|
| 0 | Absent | Nothing in place, or only intent (an open issue, a TODO). |
| 1 | Ad hoc | Some of it exists, inconsistently. Depends on people remembering. |
| 2 | Baseline | The standard practice is in place and works for the common path. |
| 3 | Strong | Complete, consistent and centralized. Edge cases handled, documented. |
| 4 | Enforced | Level 3 plus an automated guard (test, CI job, lint rule, boot check) that fails when it regresses. |

The step from 3 to 4 matters most. "We set security headers" is a 3. "A test
fails if a route ships without them" is a 4. Look for the guard.

## Overall grade

- **Group mean**: the mean of the applicable dimensions in each group, to one
  decimal. Show it in the scorecard so the shape is visible (a 3.5 Experience
  next to a 1.4 Security tells the story by itself).
- **Overall**: the mean of all applicable dimensions, to one decimal, **capped
  at 2.0 while any dimension in the Security group is at 0 or 1**. Report both
  numbers when the cap applies: "1.9 / 4 (uncapped mean 2.8, capped: Auth at
  1)". A missing authorization check is not offset by good motion tokens.
- Name every Security-group dimension at 0 or 1 in the summary, whatever the
  average.
- Do not weight dimensions. The cap does the job weights would, and a reader
  can recompute a plain mean from the scorecard.

---

## Security group

### 1. Input handling and injection boundaries
- Every untrusted input (request bodies, query strings, headers, uploaded
  files, webhook payloads, model output) is validated at the boundary with a
  shared schema (zod, pydantic, valibot), not hand-rolled checks.
- SQL is parameterized. Any place that builds or accepts SQL text is behind a
  parser-based guard, not a keyword denylist. Same for shell, template, path
  and URL construction (SSRF: outbound fetches to user-supplied hosts).
- HTML from users or models is never injected raw (`dangerouslySetInnerHTML`,
  `innerHTML`, `v-html`, `|safe`). Markdown renders to elements or through a
  sanitizer.
- Inbound webhooks verify a signature (HMAC, Stripe/Svix/GitHub style) and
  reject replays; the handler is idempotent.
- Responses are built through explicit serializers or response schemas, never
  by returning the ORM row: no password hash, token or internal id in the user
  object. Writes bind an allowlist of fields (no mass assignment from the
  request body into the model).
- Uploads: size limits, content-type sniffing not just the declared type,
  stored outside the web root or in a private bucket, served via signed URLs or
  with `Content-Disposition: attachment` and a safe content type so an uploaded
  SVG or HTML file cannot become stored XSS. Image processing runs with limits
  (dimensions, decompression bombs).
- **Enforced looks like**: fuzz/property tests on the guard, regression tests
  for known bypasses (CTE-smuggled writes, quoted identifiers, comment tricks),
  a test that each response schema excludes sensitive fields.

### 2. Authentication, authorization and sessions
- One authentication path for real users (OIDC/SAML or a vetted library), no
  dev-only bypass that can reach production.
- If the app keeps local passwords: argon2id or bcrypt with sane cost, MFA
  (TOTP or WebAuthn/passkeys), breached-password check, email verification,
  lockout or progressive delay on failed logins, and uniform responses on
  login and password reset so accounts cannot be enumerated.
- Authorization is centralized (one `can()`/policy module) and checked on every
  route and every execution, not just at the page. Resource ownership comes
  from the server's record, never from an id the client sent.
- Sessions: secure cookie flags (`HttpOnly`, `Secure`, `SameSite`, `__Host-`
  prefix), PKCE and nonce on OIDC, expiry and renewal, revocation (logout,
  back-channel logout, a "sign out everywhere" that works), long-lived streams
  ended when the session is. Tokens are not kept in `localStorage` when a
  cookie would do.
- Redirect targets (`returnTo`, `next`, `callbackUrl`) are allowlisted or
  relative-only; no open redirect on login, logout or OAuth callback.
- CSRF: Origin/Referer check or tokens on cookie-authenticated mutations.
- Machine credentials (API tokens, share links) are hashed at rest, scoped,
  revocable, and cannot escalate.
- An audit log records security-relevant actions and refusals, append-only,
  with redaction.
- **Enforced looks like**: a test per route that it calls the authz check, a
  test that maps each audit action to the route that emits it, a test that
  an external `returnTo` is rejected.

### 3. Security headers and browser hardening
- CSP (ideally nonce-based, no `unsafe-inline` for scripts), HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  frame-ancestors / `X-Frame-Options` (with deliberate exceptions for embeds).
- CORS is explicit, not `*` with credentials.
- Third-party scripts and styles carry `integrity=` (SRI) or are self-hosted;
  `postMessage` listeners check `event.origin`.
- Production builds do not ship source maps publicly (or ship them only to the
  error tracker), and build-time public env prefixes (`VITE_`, `NEXT_PUBLIC_`,
  `REACT_APP_`) carry no server secrets.
- Error pages and responses do not leak stack traces or internals in
  production.
- **Enforced looks like**: a test that asserts the header set; e2e that fails
  on CSP violations; a build step that fails if a secret-shaped value lands in
  the client bundle.

### 4. Secrets, configuration and cryptography
- No secrets in the repo (check history too if cheap: `git log -p -S` on a
  suspicious string), no committed `.env`. `.env.example` documents every
  variable.
- Config is parsed and validated at startup with clear errors that name the
  variable; the app refuses to boot on invalid production config. The build
  does not need secrets.
- Secrets come from a provider (files, vault, KMS, env injected at deploy),
  rotation does not need a restart where it matters, and credentials never
  reach the client or persisted user-facing data.
- Cryptography: sensitive columns (tokens, PII the app must keep, OAuth refresh
  tokens) are encrypted at rest with a managed key, not a constant in config;
  keys have a rotation story; tokens and ids that must be unguessable come from
  a CSPRNG; no home-rolled crypto, no MD5/SHA-1 for anything security
  relevant; TLS termination and minimum version are stated for self-hosting.
- **Enforced looks like**: a `config:check` script run in CI; a test per
  variable; deploy templates that refuse a secret in a ConfigMap; a lint or
  test that bans `Math.random`/`random.random` in auth code.

### 5. Abuse protection and throttling
- Rate limits on expensive or abusable routes (auth, generation, search,
  exports), keyed sensibly (user, workspace, IP).
- Cost budgets for metered upstreams (LLM tokens, third-party APIs).
- Caps: request body size, result rows/bytes, page size, concurrent
  connections/subscribers, query concurrency, pool size per upstream.
- Timeouts on every outbound call and database statement; backoff and circuit
  breakers on retries.
- Bot and abuse signals on public forms (Turnstile/hCaptcha or equivalent) when
  the app has signup, contact or comment surfaces.
- **Enforced looks like**: tests that hit the limit and get 429; caps read from
  validated config.

### 6. Data and database protection
- The app connects with least privilege (read-only role for read paths,
  `statement_timeout`, `default_transaction_read_only` where possible).
- Tenant isolation: row-level filters or RLS, column allowlists, every query
  scoped by tenant from the server's record.
- Migrations: versioned, ordered, each with a rollback or a declared
  irreversible reason, expand/contract for rolling deploys, verified in CI
  against the real engine.
- Seeds are bounded and never run against production by accident.
- Backups exist, are tested by restore, and the restore procedure is written
  down if the app owns data.
- **Enforced looks like**: CI that round-trips every migration and compares the
  schema; integration tests against the real database.

### 7. Privacy and data lifecycle (N/A only if the app stores no personal data)
- A written inventory of personal data: which fields, where stored, why, who
  can read them. Fields are classified (public, internal, sensitive) and the
  classification drives logging redaction, encryption and access.
- Retention: every personal-data table or bucket has a retention period and a
  job that enforces it; logs and backups have their own.
- Deletion: a user or tenant can be deleted and it cascades to every store
  (database, object storage, search index, caches, queues, analytics, the LLM
  provider's retention setting). Soft-delete has a hard-delete follow-up.
- Export: a user can get their data in a portable format if the product's
  audience expects it (GDPR/CCPA scope).
- Consent and tracking: analytics and third-party scripts load only after
  consent where required; cookies are categorized; a privacy policy exists and
  matches what the code actually collects.
- Data minimization: analytics events carry ids not emails; prompts to LLM
  providers are stripped of what they do not need; data residency is stated if
  customers care.
- **Enforced looks like**: a test that deleting a user leaves no rows keyed to
  them in any table; a retention job with a metric and an alert; a schema-level
  PII annotation that the redactor and the exporter read.

---

## Operations group

### 8. Observability
- Structured (JSON) logs with request id and trace id, levels, and a redaction
  pass so credentials, tokens and raw prompts/SQL never land in logs. No stray
  `console.log` in app code. The request id is returned to the client so a
  support ticket can be matched to a trace.
- Metrics endpoint (Prometheus/OTel) that is not open to the internet by
  default.
- Distributed tracing across inbound request → DB/upstream.
- `/health` (liveness) and `/ready` (readiness, checks dependencies) that
  differ.
- Error tracking with source maps.
- **Enforced looks like**: a lint rule banning `console`; tests on the
  redactor; a smoke test that scrapes metrics.

### 9. Performance, resilience and scalability
- Graceful shutdown: SIGTERM drains in-flight work within a budget matched to
  the orchestrator's grace period.
- Background loops (pollers, workers, schedulers) survive a throw, back off,
  jitter, and dedupe identical work. Queued jobs are idempotent and have a
  dead-letter path.
- Horizontal story is explicit: either designed for one instance and said so,
  or shared state is in Redis/DB with leases/leader election.
- Streams resume (SSE `Last-Event-ID`, websocket reconnect with state).
- Caching, pagination and query cost are considered (no N+1 on list routes,
  indexes match the hot queries); a load test exists with published numbers.
- **Enforced looks like**: load test in CI or on a schedule; tests that kill a
  tick mid-flight; a query-count assertion on list endpoints.

### 10. Release engineering and incident readiness
- Environments: at least staging and production, built from the same artifact,
  with config as the only difference; preview deploys for PRs where the
  platform allows.
- Rollback is a documented, rehearsed command (redeploy previous image, revert
  the migration), not "revert and wait for CI".
- Feature flags or kill switches exist for risky paths (new providers,
  expensive features) and are readable from config without a deploy; stale
  flags are removed.
- Alerting: alert rules (or a hosted equivalent) on error rate, latency, queue
  depth and the health endpoint, routed somewhere a human sees; SLOs or at
  least target numbers are written down; dashboards are versioned when the
  stack allows.
- Runbooks for the known failure modes (database full, upstream down, key
  rotation, restoring a backup), an incident channel or escalation path, and a
  status page or a plan for customer comms.
- Release notes or a changelog reach users; versions are visible in the app
  (`/version`, footer, or a header) so a report can be matched to a build.
- **Enforced looks like**: alert rules linted or tested in CI; a scheduled
  restore test; a CI check that every flag has an owner and an expiry.

### 11. Testing strategy
- Unit tests on domain logic; integration tests against real dependencies
  (Testcontainers or a CI service); end-to-end journeys (Playwright/Cypress);
  contract/snapshot tests on shared schemas; property/fuzz tests on parsers and
  guards; visual regression for charts if the UI is chart-heavy.
- Tests run in CI and gate merges. Coverage is measured with a floor.
- Test layout mirrors the source; slow suites are separable.
- **Enforced looks like**: coverage thresholds that fail CI; required checks.

### 12. CI/CD pipeline
- Every PR runs lint, typecheck, test and build; those are required checks on
  the default branch (branch protection or rulesets).
- Additional jobs: container build, chart lint/render, migrations, e2e,
  integration, docs build and link check.
- Workflows set least-privilege `permissions:`, use `concurrency:` to cancel
  superseded runs, cache dependencies, and avoid `pull_request_target` with
  untrusted checkout.
- Release automation: tags, changelog, image publish on tag/main.
- **Enforced looks like**: the required-check list matches the jobs that
  matter; a test or linter (actionlint, zizmor) on workflows themselves.

### 13. Supply chain, dependencies, pinning and versioning
- Lockfile committed and used (`npm ci`, `uv sync --frozen`).
- Dependabot/Renovate configured with grouping and deliberate ignores for
  majors that need migration work.
- Runtime version pinned (`.nvmrc`, `engines`, `.python-version`) and
  consistent across Dockerfiles, CI and local.
- GitHub Actions pinned to full commit SHAs with a version comment; base images
  pinned by digest.
- Vulnerability scanning in CI (dependency review, `npm audit`/`pip-audit`,
  OSV, Trivy/Grype on images, CodeQL), Dependabot alerts enabled, SBOM and
  provenance/signing for published images.
- License compliance: dependency licenses are checked against an allowlist
  (no copyleft in a proprietary app, no "UNLICENSED" in a shipped one), and a
  NOTICE or third-party-licenses file ships with the product where required.
- Dependency hygiene: no unused or deprecated packages (knip, depcheck,
  deptry), no duplicate major versions in the lockfile, no dependency on an
  archived upstream without a note.
- Versioning: semver tags, Conventional Commits, changelog. Schema/API
  versions bumped on breaking change with an upgrade path.
- **Enforced looks like**: a test that fails on an unpinned `uses:`; scanning
  and the license check as required checks.

### 14. Containers and deployment
- Multi-stage Dockerfile, minimal base, non-root `USER`, `HEALTHCHECK`,
  `.dockerignore`, no secrets baked in, reproducible (digest-pinned).
- Images published to a registry from CI with sensible tags.
- Deploy artifacts (Helm/Kustomize/compose/PaaS config) with probes, resource
  requests/limits, PodDisruptionBudget, security context, and guards against
  dangerous values.
- A one-command local or quick-start path (compose, devcontainer, all-in-one
  image).
- **Enforced looks like**: CI renders the chart with every example values file
  and asserts bad renders fail; image scan gates publish.

---

## Experience group (score N/A for API-only services)

When the app can be started locally (see the `run` skill if available), run
axe and Lighthouse against the main screens rather than scoring this group from
grep alone, and record which pages were measured.

### 15. Accessibility
- Semantic HTML, labelled controls, icon-only buttons with `aria-label`,
  visible focus, logical tab order, keyboard access to every action, skip
  links, focus management in dialogs.
- Color contrast meets WCAG AA in every theme; charts have a text alternative.
- Reduced-motion is honored.
- **Enforced looks like**: axe in e2e for each theme; a contrast test over the
  token pairs; lint rules (jsx-a11y or Biome a11y).

### 16. Motion and interaction polish
- Motion uses tokens (durations, easings) rather than literals, animates
  transform/opacity, and is gated by one reduced-motion switch.
- Overlays enter/exit cleanly; lists reorder without jumps; charts update
  rather than re-create.
- No heavy animation dependency where platform features suffice.
- **Enforced looks like**: a test or lint that bans literal durations or
  ungated motion.

### 17. UX quality and product refinement
- Every data view has loading (skeleton), empty, error and stale states; a
  failing widget is contained by an error boundary.
- Responsive layout at phone width; no horizontal scroll.
- First-run onboarding, settings/preferences, keyboard shortcuts, command
  palette where the product warrants it.
- Design tokens in one place; no hard-coded colors; light/dark parity.
- Internationalization readiness, proportionate to the audience: user-facing
  strings externalized (or at least not concatenated), dates, numbers and
  currency formatted through `Intl`/locale APIs, layouts that survive long
  strings and RTL, and the user's timezone respected in display.
- Public pages (if any): title and meta description per page, canonical URLs,
  Open Graph/Twitter cards, `robots.txt` and a sitemap, `noindex` on
  authenticated or utility pages, a real 404.
- Recent feature work is coherent: no half-shipped features behind dead UI,
  no stale copy.

### 18. Frontend performance and delivery
- Core Web Vitals are measured (Lighthouse CI, web-vitals beacon, or the
  platform's RUM) with budgets, not just once by hand.
- Bundle: route-level code splitting, no duplicate heavy libraries, tree-shaken
  icon and date libraries, a size budget (size-limit, bundlewatch) and an
  analyzer in the repo.
- Assets: images sized and served in modern formats with `width`/`height` set,
  fonts preloaded and `font-display` set, no render-blocking third-party
  scripts.
- Delivery: static assets content-hashed with long cache lifetimes, HTML and
  API responses with deliberate `Cache-Control`, compression (brotli/gzip) on,
  a CDN in front of static assets where traffic warrants.
- Data fetching: no request waterfalls on first paint, lists paginated or
  virtualized, optimistic updates where latency is visible.
- The `web-perf` skill, if available, is the deeper runtime pass; this
  dimension scores what the repo guarantees.
- **Enforced looks like**: Lighthouse CI or a size budget as a required check;
  a test that fails on an unoptimized image import.

---

## Product and code group

### 19. AI/LLM and agent features (N/A if none)
- Model output is untrusted: validated against a schema, never executed or
  rendered raw, never the source of data the user takes as fact.
- Prompt-injection defenses on anything the model reads (catalog metadata,
  user content, tool results), with tests.
- Timeouts, retries with backoff, bounded repair loops, rate and cost limits.
- A redacted generation log; an eval harness for prompt changes.
- Provider is swappable; a stub provider for tests and demos.
- Agents and tools: each tool runs with least privilege and a scoped
  credential, destructive or irreversible tool actions require confirmation,
  tool execution is sandboxed (no shell or filesystem access from model output
  without a boundary), tool results are treated as untrusted input, and agent
  loops have a step and cost ceiling.
- MCP or tool servers the app exposes: authenticated, scoped per user or
  tenant, with tool descriptions that cannot be rewritten by user content.
- **Enforced looks like**: injection regression tests per tool; a test that a
  destructive tool call without confirmation is refused.

### 20. Data integrity and correctness
- Invariants live in the database, not only in code: foreign keys, `UNIQUE`,
  `CHECK` and `NOT NULL` constraints, enums as constrained types.
- Multi-step writes run in one transaction with a sensible isolation level;
  nothing does read-then-write without a lock, a version column or an
  `ON CONFLICT`.
- Mutating endpoints that can be retried (payments, job submission, webhook
  delivery) accept an idempotency key and store the result.
- Money and quantities use decimal or integer minor units, never floats.
- Time: timestamps stored in UTC with timezone-aware types, the user's
  timezone applied at display, no naive `datetime.now()`/`new Date()` for
  business logic, scheduled jobs reason about DST.
- Concurrency: optimistic locking or `SELECT … FOR UPDATE` on contended rows;
  counters are incremented in the database, not read-modify-write.
- Soft deletes, status enums and state machines have explicit transitions and
  a test per transition.
- **Enforced looks like**: a migration lint that rejects a new table without a
  primary key or a nullable foreign key; a property test on the state machine;
  a test that replaying a request with the same idempotency key returns the
  same result.

### 21. Project structure and code health
- Layout is predictable and documented: routes, components, domain logic,
  scripts, tests, docs and deploy assets each have one home. Domain logic
  lives in a library layer, not in page components.
- **Large files**: flag source files over ~500 lines and especially over
  ~1,000 (the inventory lists them). For each, decide whether it is cohesive
  (a parser, a generated table, a fuzz corpus) or a god-component that mixes
  concerns and should be split. Large tracked binaries belong in LFS or out of
  the repo.
- Types are strict, no `any`/untyped escapes, shared types inferred from one
  schema rather than duplicated.
- No dead code, commented-out blocks, stray debug output or untracked TODOs.
- Dependency direction is sane (UI → lib, never lib → UI; server-only modules
  not imported by client code).
- Linting and formatting are one tool, configured, and run in CI.

### 22. Architecture and extensibility
- Shared contracts (schemas, IR, API types) are versioned with an upgrade path
  for stored data.
- Errors from the API have one shape (RFC 9457 problem details or a documented
  equivalent) with stable codes the client can branch on.
- Extension points are registries or interfaces rather than `switch`
  statements spread across the code (panel types, drivers, providers).
- Import/export, templates, APIs and tokens make the product usable beyond its
  UI.
- New features since the last audit follow the same patterns instead of adding
  parallel ones.

---

## Project health group

### 23. GitHub repository and community health
- LICENSE, README, SECURITY.md (with a private reporting channel),
  CONTRIBUTING.md, CODE_OF_CONDUCT.md, CODEOWNERS on sensitive paths, issue
  forms, PR template with an invariants checklist.
- Branch protection or rulesets with required checks and reviews; secret
  scanning, Dependabot alerts and code scanning enabled.
- Labels and milestones used consistently; issues closed by PRs that reference
  them; description and topics set.
- **Drift check**: sample 5–10 closed issues in the recent window and confirm
  the code does what the issue says. A closed issue with no matching code is a
  finding (record the issue number).

### 24. Documentation
- README is a landing page: what it is, a screenshot, quick start, links.
- A docs site or `docs/` covering getting started, concepts, operations
  (config reference, deploy, upgrade, migrations, security, backup and
  restore), and reference (API routes, config variables).
- Architecture decisions recorded (ADRs or architecture pages).
- Docs match the code: spot-check the config reference against the config
  schema and the API reference against the routes.
- **Enforced looks like**: a docs-drift test, a link checker in CI, a
  contributing checklist that maps source files to doc pages.

### 25. AI agent instructions
- `AGENTS.md` (and `CLAUDE.md` pointing to it) states the product's
  invariants, the framework versions to respect, the repo map, the commands,
  the CI constraints, and what not to do.
- It is accurate: every file path, script and rule it names exists. Check a
  sample of paths and commands.
- It stays in step with `CONTRIBUTING.md`.
- Project skills/commands exist for repeated workflows where useful.
- **Enforced looks like**: a test that the paths named in AGENTS.md exist.
