# Vibe Project: GitHub workflows and repository scripts

Use these exact file contents when scaffolding a `--vibe` project. Paths are
relative to `$TARGET_DIR`. Replace every placeholder (the table is in
SKILL.md's Pre-flight) before writing; `{{THEME_SCRIPT_HASH}}` is filled in
after `index.html` is written (SKILL.md, Step V3). These files were generated
from a scaffold that passed every check in CI (`scripts/vibe_refs.py`); do not
"improve" them while scaffolding.

---

## `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

# Least privilege by default. `pull_request` (never `pull_request_target`)
# keeps fork PRs on a read-only token with no access to repository secrets.
permissions:
  contents: read

# A new push to a PR cancels that PR's older run. Runs on `main` queue
# instead of cancelling, so every commit on `main` gets a result (and
# .github/workflows/deploy.yml, which follows a successful run, a trigger).
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  check:
    # Stable name: make "check" a required status check on `main`
    # (docs/self-hosting.md).
    name: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0
        with:
          # The version in package.json's `packageManager`, everywhere.
          bun-version-file: package.json
      - uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lock') }}
          restore-keys: bun-${{ runner.os }}-
      - run: bun install --frozen-lockfile
      # Every installed package's license against the allowlist in
      # scripts/licenses.ts (exceptions are named there, with reasons).
      - run: bun run licenses
      # Known advisories in the installed packages, moderate and up. One
      # with no fixed release yet is skipped by id with `--ignore=GHSA-…`
      # and a comment saying why.
      - run: bun audit --audit-level=moderate
      - run: bunx wrangler types
      - run: bunx biome ci .
      # Unused files, exports and dependencies (knip.jsonc).
      - run: bunx knip
      - run: bunx tsc -b
      - run: bunx vite build
      # The entry's JS and CSS (gzip) against scripts/budget.ts.
      - run: bun run budget
      - run: bunx vitest run

  # The browser suite (e2e/, Playwright + axe) against the built app under
  # `vite preview`, desktop and phone projects. After `check`, so a lint or
  # type error fails fast. When it grows past a few minutes, split it with
  # a `--shard` matrix and one aggregate job named `e2e`, as datapad does.
  e2e:
    # Stable name: make "e2e" a required status check on `main`.
    name: e2e
    needs: check
    runs-on: ubuntu-latest
    # Chromium and its system libraries come with the image: no browser
    # download or apt step. Pinned by digest, as the actions are by SHA: a
    # tag can be pushed again. The tag in the comment must match
    # @playwright/test in package.json (pinned exactly there); move the two
    # together, and resolve the new digest with `docker buildx imagetools
    # inspect mcr.microsoft.com/playwright:<tag>` (test/workflows.test.ts).
    container:
      image: mcr.microsoft.com/playwright@sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea # v1.64.1-noble
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      # setup-bun needs `unzip`, which the image lacks; npm's bun package
      # ships the binary without it. The version is package.json's
      # `packageManager`, as setup-bun reads it for `check`.
      - run: npm install --global "bun@$(node -p "require('./package.json').packageManager.split('@')[1]")"
      - uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ~/.bun/install/cache
          key: bun-container-${{ hashFiles('bun.lock') }}
          restore-keys: bun-container-
      - run: bun install --frozen-lockfile
      - run: bunx playwright test
      - if: failure()
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

---

## `.github/workflows/codeql.yml`

```yaml
name: CodeQL

on:
  pull_request:
  push:
    branches: [main]
  # Weekly, so a new query catches code that has not changed.
  schedule:
    - cron: "27 5 * * 1"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: codeql-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  # Stable names: make "codeql (javascript-typescript)" and
  # "codeql (actions)" required status checks on `main`
  # (docs/self-hosting.md).
  analyze:
    name: codeql (${{ matrix.language }})
    runs-on: ubuntu-latest
    permissions:
      contents: read
      # Upload the results to the repository's code scanning alerts.
      security-events: write
    strategy:
      fail-fast: false
      matrix:
        # The app, Worker and shared code; and the workflows themselves.
        language: [javascript-typescript, actions]
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      # No build step: both languages are analysed from source.
      - uses: github/codeql-action/init@9b3254085494b55a0f7c4c2b3d2d52cc712ce370 # v4.39.1
        with:
          languages: ${{ matrix.language }}
          build-mode: none
          queries: security-extended
      - uses: github/codeql-action/analyze@9b3254085494b55a0f7c4c2b3d2d52cc712ce370 # v4.39.1
        with:
          category: /language:${{ matrix.language }}
```

---

## `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  # After CI finishes on `main`. The `gate` job below only lets a successful
  # run of a commit pushed to this repository's `main` through.
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]
  # Re-deploy the current `main` (new Cloudflare token, a `wrangler.jsonc`
  # var change) without re-running CI.
  workflow_dispatch:

permissions:
  contents: read

jobs:
  # Jobs cannot be skipped on a secret directly, so this one reads the secret
  # once and hands the answer to `deploy`. Without CLOUDFLARE_API_TOKEN
  # (forks, fresh clones) `deploy` is skipped and the run stays green.
  gate:
    runs-on: ubuntu-latest
    # `branches: [main]` above matches a fork PR whose branch is also named
    # `main`, so check the event and the head repository as well.
    if: >-
      (github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main') ||
      (github.event.workflow_run.conclusion == 'success' &&
       github.event.workflow_run.event != 'pull_request' &&
       github.event.workflow_run.head_repository.full_name == github.repository)
    outputs:
      enabled: ${{ steps.secret.outputs.enabled }}
    steps:
      - id: secret
        env:
          CF_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          if [ -n "$CF_API_TOKEN" ]; then
            echo "enabled=true" >> "$GITHUB_OUTPUT"
          else
            echo "enabled=false" >> "$GITHUB_OUTPUT"
            echo "No CLOUDFLARE_API_TOKEN secret; skipping deploy. See docs/self-hosting.md." >> "$GITHUB_STEP_SUMMARY"
          fi

  deploy:
    needs: gate
    if: needs.gate.outputs.enabled == 'true'
    runs-on: ubuntu-latest
    environment:
      name: production
    concurrency:
      group: deploy-production
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          # The commit CI passed, not whatever `main` points at by now.
          ref: ${{ github.event.workflow_run.head_sha || github.sha }}
      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0
        with:
          # The version in package.json's `packageManager`, everywhere.
          bun-version-file: package.json
      - uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lock') }}
          restore-keys: bun-${{ runner.os }}-
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: cloudflare/wrangler-action@953926a2e2182532811c01a25e53647d93bf07c0 # v4.1.3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
```

---

## `.github/workflows/preview.yml`

```yaml
name: Preview

# Each pull request from a branch in this repository gets its own Worker,
# `{{PROJECT_NAME}}-pr-<number>`, on workers.dev, and one comment on the PR that links
# to it. The Worker is deleted when the PR closes. A separate Worker, not a
# version preview URL, because those are not generated for a Worker that
# implements a Durable Object, and so that a preview's storage never touches
# production's.
#
# Previews are public on workers.dev. Turn this workflow off (delete it)
# before the app holds anything private, or put Access in front of the
# previews too (docs/self-hosting.md).
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  contents: read

# A new push cancels that PR's in-flight preview deploy. Closing the PR
# waits for it instead, so the delete always runs last.
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: ${{ github.event.action != 'closed' }}

env:
  WORKER_NAME: {{PROJECT_NAME}}-pr-${{ github.event.pull_request.number }}
  # Marks the one comment this workflow keeps up to date on the PR.
  MARKER: "<!-- {{PROJECT_NAME}}-preview -->"
  PR_NUMBER: ${{ github.event.pull_request.number }}

jobs:
  # Same shape as deploy.yml: read the secret once, skip the rest without
  # it. Fork PRs never see repository secrets, so they skip here too, and so
  # do Dependabot PRs (they only get Dependabot secrets).
  gate:
    runs-on: ubuntu-latest
    if: github.event.pull_request.head.repo.full_name == github.repository
    outputs:
      enabled: ${{ steps.secret.outputs.enabled }}
    steps:
      - id: secret
        env:
          CF_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          if [ -n "$CF_API_TOKEN" ]; then
            echo "enabled=true" >> "$GITHUB_OUTPUT"
          else
            echo "enabled=false" >> "$GITHUB_OUTPUT"
            echo "No CLOUDFLARE_API_TOKEN secret; skipping preview. See docs/self-hosting.md." >> "$GITHUB_STEP_SUMMARY"
          fi

  deploy:
    needs: gate
    if: needs.gate.outputs.enabled == 'true' && github.event.action != 'closed'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0
        with:
          bun-version-file: package.json
      - uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
        with:
          path: ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lock') }}
          restore-keys: bun-${{ runner.os }}-
      - run: bun install --frozen-lockfile
      - run: bun run build
      # `wrangler deploy` reads the config the Vite plugin wrote into dist/.
      # Rename the Worker so the preview never replaces production. A rate
      # limiter's `namespace_id` is account-wide: give the preview its own
      # here too when the app gets one.
      - name: Point the build at the preview Worker
        run: |
          config=dist/{{PROJECT_NAME}}/wrangler.json
          jq --arg name "$WORKER_NAME" '.name = $name' "$config" > "$config.tmp"
          mv "$config.tmp" "$config"
      - id: wrangler
        uses: cloudflare/wrangler-action@953926a2e2182532811c01a25e53647d93bf07c0 # v4.1.3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
      - name: Comment the preview URL
        env:
          GH_TOKEN: ${{ github.token }}
          URL: ${{ steps.wrangler.outputs.deployment-url }}
          SHA: ${{ github.event.pull_request.head.sha }}
        run: |
          body="$MARKER
          **Preview:** $URL

          Built from $SHA. Separate from production; deleted when this PR closes."
          bash .github/scripts/preview-comment.sh "$body"

  delete:
    needs: gate
    if: needs.gate.outputs.enabled == 'true' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0
        with:
          bun-version-file: package.json
      - run: bun install --frozen-lockfile
      # `--force` in case the Worker owns a Durable Object namespace.
      - uses: cloudflare/wrangler-action@953926a2e2182532811c01a25e53647d93bf07c0 # v4.1.3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: delete ${{ env.WORKER_NAME }} --force
      - name: Update the preview comment
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          bash .github/scripts/preview-comment.sh "$MARKER
          **Preview:** deleted when this PR closed."
```

---

## `.github/workflows/release.yml`

```yaml
# A release is a `v*` tag on `main`. This workflow refuses a tag that
# disagrees with package.json's version or has no section in CHANGELOG.md,
# then creates the GitHub Release with that section as its notes and the
# merged pull requests appended. It does not deploy: every green `main` is
# already deployed (deploy.yml). Cutting one is in CONTRIBUTING.md.
name: Release

on:
  push:
    tags: ["v*"]

permissions:
  contents: read

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  release:
    name: GitHub Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - name: The tag, package.json and CHANGELOG.md agree
        id: version
        run: |
          tag="${GITHUB_REF_NAME#v}"
          pkg="$(jq -r .version package.json)"
          if [ "$tag" != "$pkg" ]; then
            echo "::error::Tag v$tag does not match package.json ($pkg). Bump it in a pull request, merge it, and tag that commit."
            exit 1
          fi
          # This version's section, from its heading to the next one.
          awk -v v="$tag" '
            /^## / { on = index($0, "## [" v "]") == 1 }
            on { print }
          ' CHANGELOG.md | tail -n +2 > notes.md
          if [ ! -s notes.md ]; then
            echo "::error::CHANGELOG.md has no '## [$tag]' section."
            exit 1
          fi
          echo "version=$tag" >> "$GITHUB_OUTPUT"
      - name: Create the release
        env:
          GH_TOKEN: ${{ github.token }}
          VERSION: ${{ steps.version.outputs.version }}
        run: |
          gh release create "v$VERSION" \
            --title "v$VERSION" \
            --notes-file notes.md \
            --generate-notes \
            --verify-tag
```

---

## `.github/scripts/preview-comment.sh`

```bash
#!/usr/bin/env bash
# Creates or updates the single preview comment on the current pull request.
# The comment is found by $MARKER, which the body must start with.
# Usage: preview-comment.sh <body>   (needs GH_TOKEN, MARKER, PR_NUMBER)
set -euo pipefail

body=$1
id=$(gh api --paginate "repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/comments" \
  --jq ".[] | select(.body | startswith(\"$MARKER\")) | .id" | head -n 1)

if [ -n "$id" ]; then
  gh api --method PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$id" -f body="$body" >/dev/null
else
  gh api --method POST "repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/comments" -f body="$body" >/dev/null
fi
```

---

## `.github/dependabot.yml`

```yaml
# Monthly dependency and workflow updates as pull requests. They run the CI
# `check` job like any other PR and never deploy (docs/self-hosting.md).
version: 2
updates:
  # package.json + bun.lock. Dependabot regenerates bun.lock, so
  # `bun install --frozen-lockfile` in CI keeps passing.
  - package-ecosystem: bun
    directory: /
    schedule:
      interval: monthly
    open-pull-requests-limit: 5
    labels: [dependencies]
    groups:
      # Minors and patches land as one PR; each major gets its own.
      minor-and-patch:
        update-types: [minor, patch]
    ignore:
      # Stay on Node 24 types (the LTS the Workers and CI toolchain target):
      # nothing from @types/node 25 up.
      - dependency-name: "@types/node"
        versions: [">=25"]

  # Workflows pin each action to a commit SHA with a `# vX.Y.Z` comment.
  # Dependabot moves both together.
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
    open-pull-requests-limit: 5
    labels: [dependencies]
    groups:
      actions:
        update-types: [minor, patch]
```

---

## `.github/pull_request_template.md`

```markdown
## What changed

<!-- The change itself, in a sentence or two. -->

## Why

<!--
Why this, and why now. Link the issue it closes ("Closes #123"). If the diff
takes a non-obvious route, say why the obvious one did not work.
-->

## Screenshots

<!--
For a UI change: desktop and phone (Pixel 7 width), Light and Dark where it
matters, with fictional data. Drag the images into this box (GitHub
attachments); never commit them. Delete this section for a change with no UI.
-->

| Desktop | Phone |
| --- | --- |
|  |  |

## Checks

<!-- CI runs these too. Tick what you ran locally; note anything you skipped. -->

- [ ] `bunx biome ci .`, `bunx knip`, `bunx tsc -b`
- [ ] `npm run build && npm run budget`
- [ ] `npm test`
- [ ] `npm run e2e` (for a UI change)
- [ ] Checked at phone width and in Light and Dark (for a UI change)
- [ ] `CHANGELOG.md` and the docs updated for anything they describe
```

---

## `scripts/budget.ts`

```ts
/**
 * The bundle budget: what the first visit downloads before the app can
 * run, gzipped, after `vite build`. CI's `check` job runs it after the
 * build and fails when either budget is exceeded:
 *
 *   npm run build && npm run budget
 *
 * "Entry" is everything dist/client/index.html loads up front: its module
 * script, the chunks it modulepreloads, and its stylesheets. Lazy pages
 * (`lazy(() => import(…))`) are not in it: put anything big that only
 * one page needs there.
 *
 * Raise a budget only on purpose, in the same change that needs it, and
 * say why in the pull request. Keep a little headroom, not a lot.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * Gzipped kilobytes (1 KB = 1000 bytes, as Vite reports them). The
 * scaffold's entry is about 139 KB of JS (React, Base UI, the shell) and
 * 12 KB of CSS. Each time one goes up, say here from what to what, and why.
 */
const BUDGET_KB = { js: 145, css: 14 };

const CLIENT = resolve(import.meta.dirname, '..', 'dist', 'client');

function entryFiles(html: string): { js: string[]; css: string[] } {
  const js: string[] = [];
  const css: string[] = [];
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const src = /\b(?:src|href)="(\/assets\/[^"]+)"/i.exec(tag)?.[1];
    if (!src) continue;
    if (src.endsWith('.js')) js.push(src);
    else if (src.endsWith('.css')) css.push(src);
  }
  return { js, css };
}

function gzipKb(files: string[]): number {
  let bytes = 0;
  for (const file of files) {
    bytes += gzipSync(readFileSync(resolve(CLIENT, `.${file}`)), {
      level: 9,
    }).length;
  }
  return bytes / 1000;
}

const html = readFileSync(resolve(CLIENT, 'index.html'), 'utf8');
const entry = entryFiles(html);
const failures: string[] = [];

if (entry.js.length === 0) failures.push('no entry script in index.html');

for (const kind of ['js', 'css'] as const) {
  const kb = gzipKb(entry[kind]);
  const budget = BUDGET_KB[kind];
  const line = `entry ${kind.toUpperCase()}: ${kb.toFixed(1)} KB gzip (budget ${budget} KB, ${entry[kind].length} file${entry[kind].length === 1 ? '' : 's'})`;
  console.log(line);
  if (kb > budget)
    failures.push(`${line}: over by ${(kb - budget).toFixed(1)} KB`);
}

if (failures.length) {
  for (const failure of failures) console.error(`budget: ${failure}`);
  process.exit(1);
}
console.log('budget: ok');
```

---

## `scripts/licenses.ts`

```ts
/**
 * The license allowlist: every package `bun install` put in node_modules
 * (dependencies, dev dependencies, and everything they pull in) must carry
 * a license from ALLOWED, or be listed in EXCEPTIONS with the reason. CI's
 * `check` job runs it after the install:
 *
 *   npm run licenses
 *
 * An SPDX expression passes when one side of each `OR` is allowed and both
 * sides of each `AND` are. A package with no license field fails. Add to
 * ALLOWED only a permissive license; anything else is an exception, by
 * name, with why it is acceptable here.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ALLOWED = new Set([
  '0BSD',
  'Apache-2.0',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'MIT',
  // File-level copyleft: using the files unmodified asks nothing of us.
  // lightningcss (Tailwind's CSS build) and axe-core (the e2e checks).
  'MPL-2.0',
  // The bundled fonts (@fontsource-variable/*): free to embed and serve.
  'OFL-1.1',
  // caniuse-lite: browser support data, attribution in its own package.
  'CC-BY-4.0',
]);

/** Packages (or a name prefix ending in `*`) allowed anyway, and why. */
const EXCEPTIONS: Record<string, string> = {
  // sharp's prebuilt libvips binary for the build machine's platform, from
  // wrangler's local tooling. Dynamically linked, never bundled or
  // deployed: nothing of it reaches the Worker or the browser.
  '@img/sharp-libvips-*': 'LGPL-3.0-or-later, build tooling only',
};

const NODE_MODULES = resolve(import.meta.dirname, '..', 'node_modules');

interface Found {
  name: string;
  version: string;
  license: string | undefined;
  path: string;
}

function licenseOf(pkg: Record<string, unknown>): string | undefined {
  const field = pkg.license ?? pkg.licenses;
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object' && 'type' in field) {
    return String((field as { type: unknown }).type);
  }
  if (Array.isArray(field)) {
    return field
      .map((l) => (typeof l === 'string' ? l : String(l?.type)))
      .join(' OR ');
  }
  return undefined;
}

function walk(dir: string, out: Found[]) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (entry.startsWith('@')) {
      walk(path, out);
      continue;
    }
    const manifest = join(path, 'package.json');
    if (!existsSync(manifest)) continue;
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(manifest, 'utf8'));
    } catch {
      continue;
    }
    if (typeof pkg.name === 'string') {
      out.push({
        name: pkg.name,
        version: String(pkg.version ?? ''),
        license: licenseOf(pkg),
        path,
      });
    }
    walk(join(path, 'node_modules'), out);
  }
}

/** Whether an SPDX expression is satisfied by the allowlist. */
function allowed(expression: string): boolean {
  const text = expression.trim();
  // Parentheses around the whole expression, or around one group.
  const inner = text.replace(/^\((.*)\)$/, '$1');
  if (inner !== text) return allowed(inner);
  const anyOf = splitTop(text, 'OR');
  if (anyOf.length > 1) return anyOf.some(allowed);
  const allOf = splitTop(text, 'AND');
  if (allOf.length > 1) return allOf.every(allowed);
  return ALLOWED.has(text);
}

/** Split on ` OP ` outside parentheses. */
function splitTop(text: string, op: 'OR' | 'AND'): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  const token = ` ${op} `;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (depth === 0 && text.startsWith(token, i)) {
      parts.push(text.slice(start, i));
      start = i + token.length;
      i += token.length - 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

function excepted(name: string): boolean {
  return Object.keys(EXCEPTIONS).some((pattern) =>
    pattern.endsWith('*')
      ? name.startsWith(pattern.slice(0, -1))
      : name === pattern,
  );
}

const found: Found[] = [];
walk(NODE_MODULES, found);
if (found.length === 0) {
  console.error('licenses: nothing in node_modules; run `bun install` first');
  process.exit(1);
}

const failures = found.filter(
  (p) => !excepted(p.name) && !(p.license && allowed(p.license)),
);
if (failures.length) {
  for (const p of failures) {
    console.error(
      `licenses: ${p.name}@${p.version} is ${p.license ?? 'unlicensed (no license field)'}`,
    );
  }
  console.error(
    'Allow the license in scripts/licenses.ts only if it is permissive; otherwise add the package to EXCEPTIONS with the reason.',
  );
  process.exit(1);
}
const names = new Set(found.map((p) => p.name)).size;
console.log(`licenses: ok, ${names} packages`);
```
