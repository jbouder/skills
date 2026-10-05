# Audit dimensions

The checklist every audit works through. Each dimension lists what to check,
where the evidence usually lives, and what separates the maturity levels. A
check is a question about the repo, not a demand. Mark a dimension **N/A** only
when the app genuinely has no surface for it (no database, no UI, no LLM), and
say why.

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

Overall grade: the mean of the applicable dimensions, rounded to one decimal,
with any dimension at 0 or 1 in the **Security** group named in the summary
however good the average looks.

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
- Upload limits, content-type checks and request size caps exist.
- **Enforced looks like**: fuzz/property tests on the guard, regression tests
  for known bypasses (CTE-smuggled writes, quoted identifiers, comment tricks).

### 2. Authentication, authorization and sessions
- One authentication path for real users (OIDC/SAML or a vetted library), no
  dev-only bypass that can reach production.
- Authorization is centralized (one `can()`/policy module) and checked on every
  route and every execution, not just at the page. Resource ownership comes
  from the server's record, never from an id the client sent.
- Sessions: secure cookie flags (`HttpOnly`, `Secure`, `SameSite`, `__Host-`
  prefix), PKCE and nonce on OIDC, expiry and renewal, revocation (logout,
  back-channel logout), long-lived streams ended when the session is.
- CSRF: Origin/Referer check or tokens on cookie-authenticated mutations.
- Machine credentials (API tokens, share links) are hashed at rest, scoped,
  revocable, and cannot escalate.
- An audit log records security-relevant actions and refusals, append-only,
  with redaction.
- **Enforced looks like**: a test per route that it calls the authz check, a
  test that maps each audit action to the route that emits it.

### 3. Security headers and browser hardening
- CSP (ideally nonce-based, no `unsafe-inline` for scripts), HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  frame-ancestors / `X-Frame-Options` (with deliberate exceptions for embeds).
- CORS is explicit, not `*` with credentials.
- Error pages and responses do not leak stack traces or internals in
  production.
- **Enforced looks like**: a test that asserts the header set; e2e that fails
  on CSP violations.

### 4. Secrets and configuration
- No secrets in the repo (check history too if cheap: `git log -p -S` on a
  suspicious string), no committed `.env`. `.env.example` documents every
  variable.
- Config is parsed and validated at startup with clear errors that name the
  variable; the app refuses to boot on invalid production config. The build
  does not need secrets.
- Secrets come from a provider (files, vault, KMS, env injected at deploy),
  rotation does not need a restart where it matters, and credentials never
  reach the client or persisted user-facing data.
- **Enforced looks like**: a `config:check` script run in CI; a test per
  variable; deploy templates that refuse a secret in a ConfigMap.

### 5. Abuse protection and throttling
- Rate limits on expensive or abusable routes (auth, generation, search,
  exports), keyed sensibly (user, workspace, IP).
- Cost budgets for metered upstreams (LLM tokens, third-party APIs).
- Caps: request body size, result rows/bytes, page size, concurrent
  connections/subscribers, query concurrency, pool size per upstream.
- Timeouts on every outbound call and database statement; backoff and circuit
  breakers on retries.
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
- Backups/retention documented if the app owns data.
- **Enforced looks like**: CI that round-trips every migration and compares the
  schema; integration tests against the real database.

---

## Operations group

### 7. Observability
- Structured (JSON) logs with request id and trace id, levels, and a redaction
  pass so credentials, tokens and raw prompts/SQL never land in logs. No stray
  `console.log` in app code.
- Metrics endpoint (Prometheus/OTel) that is not open to the internet by
  default.
- Distributed tracing across inbound request → DB/upstream.
- `/health` (liveness) and `/ready` (readiness, checks dependencies) that
  differ.
- Error tracking with source maps.
- **Enforced looks like**: a lint rule banning `console`; tests on the
  redactor; a smoke test that scrapes metrics.

### 8. Performance, resilience and scalability
- Graceful shutdown: SIGTERM drains in-flight work within a budget matched to
  the orchestrator's grace period.
- Background loops (pollers, workers, schedulers) survive a throw, back off,
  jitter, and dedupe identical work.
- Horizontal story is explicit: either designed for one instance and said so,
  or shared state is in Redis/DB with leases/leader election.
- Streams resume (SSE `Last-Event-ID`, websocket reconnect with state).
- Caching, pagination, bundle size and query cost are considered; a load test
  exists with published numbers.
- **Enforced looks like**: load test in CI or on a schedule; tests that kill a
  tick mid-flight.

### 9. Testing strategy
- Unit tests on domain logic; integration tests against real dependencies
  (Testcontainers or a CI service); end-to-end journeys (Playwright/Cypress);
  contract/snapshot tests on shared schemas; property/fuzz tests on parsers and
  guards; visual regression for charts if the UI is chart-heavy.
- Tests run in CI and gate merges. Coverage is measured with a floor.
- Test layout mirrors the source; slow suites are separable.
- **Enforced looks like**: coverage thresholds that fail CI; required checks.

### 10. CI/CD pipeline
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

### 11. Supply chain, dependencies, pinning and versioning
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
- Versioning: semver tags, Conventional Commits, changelog. Schema/API
  versions bumped on breaking change with an upgrade path.
- **Enforced looks like**: a test that fails on an unpinned `uses:`; scanning
  as a required check.

### 12. Containers and deployment
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

### 13. Accessibility
- Semantic HTML, labelled controls, icon-only buttons with `aria-label`,
  visible focus, logical tab order, keyboard access to every action, skip
  links, focus management in dialogs.
- Color contrast meets WCAG AA in every theme; charts have a text alternative.
- Reduced-motion is honored.
- **Enforced looks like**: axe in e2e for each theme; a contrast test over the
  token pairs; lint rules (jsx-a11y or Biome a11y).

### 14. Motion and interaction polish
- Motion uses tokens (durations, easings) rather than literals, animates
  transform/opacity, and is gated by one reduced-motion switch.
- Overlays enter/exit cleanly; lists reorder without jumps; charts update
  rather than re-create.
- No heavy animation dependency where platform features suffice.
- **Enforced looks like**: a test or lint that bans literal durations or
  ungated motion.

### 15. UX quality and product refinement
- Every data view has loading (skeleton), empty, error and stale states; a
  failing widget is contained by an error boundary.
- Responsive layout at phone width; no horizontal scroll.
- First-run onboarding, settings/preferences, keyboard shortcuts, command
  palette where the product warrants it.
- Design tokens in one place; no hard-coded colors; light/dark parity.
- Recent feature work is coherent: no half-shipped features behind dead UI,
  no stale copy.

---

## Product and code group

### 16. AI/LLM features (N/A if none)
- Model output is untrusted: validated against a schema, never executed or
  rendered raw, never the source of data the user takes as fact.
- Prompt-injection defenses on anything the model reads (catalog metadata,
  user content), with tests.
- Timeouts, retries with backoff, bounded repair loops, rate and cost limits.
- A redacted generation log; an eval harness for prompt changes.
- Provider is swappable; a stub provider for tests and demos.

### 17. Project structure and code health
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

### 18. Architecture and extensibility
- Shared contracts (schemas, IR, API types) are versioned with an upgrade path
  for stored data.
- Extension points are registries or interfaces rather than `switch`
  statements spread across the code (panel types, drivers, providers).
- Import/export, templates, APIs and tokens make the product usable beyond its
  UI.
- New features since the last audit follow the same patterns instead of adding
  parallel ones.

---

## Project health group

### 19. GitHub repository and community health
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

### 20. Documentation
- README is a landing page: what it is, a screenshot, quick start, links.
- A docs site or `docs/` covering getting started, concepts, operations
  (config reference, deploy, upgrade, migrations, security), and reference
  (API routes, config variables).
- Architecture decisions recorded (ADRs or architecture pages).
- Docs match the code: spot-check the config reference against the config
  schema and the API reference against the routes.
- **Enforced looks like**: a docs-drift test, a link checker in CI, a
  contributing checklist that maps source files to doc pages.

### 21. AI agent instructions
- `AGENTS.md` (and `CLAUDE.md` pointing to it) states the product's
  invariants, the framework versions to respect, the repo map, the commands,
  the CI constraints, and what not to do.
- It is accurate: every file path, script and rule it names exists. Check a
  sample of paths and commands.
- It stays in step with `CONTRIBUTING.md`.
- Project skills/commands exist for repeated workflows where useful.
- **Enforced looks like**: a test that the paths named in AGENTS.md exist.
