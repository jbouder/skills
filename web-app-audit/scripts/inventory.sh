#!/usr/bin/env bash
# inventory.sh — fast, read-only evidence sweep for web-app-audit.
#
# Usage: inventory.sh [repo-path]
#
# Prints a markdown inventory of what the repo has (and lacks) across the
# audit dimensions: repo hygiene files, CI and its pinning, dependency
# automation, containers, deploy assets, tests, docs, agent instructions, and
# a handful of grep-level signals. It never writes, installs, builds or runs
# the app; it is the starting evidence, not the verdict. Every line is a fact
# the auditor still has to read and judge.
#
# Portable across macOS (BSD) and Linux (GNU) userlands; needs only git, find,
# grep, sed, awk and wc. Uses gh only if it is installed and authenticated.

set -u
ROOT="${1:-.}"
cd "$ROOT" || { echo "inventory: cannot cd to $ROOT" >&2; exit 1; }

# Files git tracks (falls back to find outside a git checkout). Excludes
# vendored and generated trees so counts mean something.
list_files() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git ls-files
  else
    find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | sed 's|^\./||'
  fi
}
FILES="$(list_files | grep -Ev '(^|/)(node_modules|dist|build|\.next|vendor|coverage|\.venv|__pycache__)/')"

has() { printf '%s\n' "$FILES" | grep -Eiq "$1"; }
count() { printf '%s\n' "$FILES" | grep -Eic "$1" || true; }
first() { printf '%s\n' "$FILES" | grep -Ei "$1" | head -n "${2:-5}"; }
mark() { if has "$1"; then echo "- [x] $2 — $(first "$1" 3 | tr '\n' ' ')"; else echo "- [ ] $2"; fi; }
# Grep tracked source for a pattern; prints the hit count.
src_grep() {
  printf '%s\n' "$FILES" | grep -Ev '\.(md|mdx|lock|svg|png|jpg|snap)$|package-lock\.json|pnpm-lock|yarn\.lock' \
    | tr '\n' '\0' | xargs -0 grep -EIl "$1" 2>/dev/null | wc -l | tr -d ' '
}

echo "# Inventory — $(basename "$(pwd)")"
echo
echo "_Generated $(date -u +%Y-%m-%dT%H:%MZ) by web-app-audit/scripts/inventory.sh. Facts only; judge them in the report._"
echo

echo "## Repository"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "- Branch: $(git rev-parse --abbrev-ref HEAD), HEAD $(git rev-parse --short HEAD)"
  echo "- Commits: $(git rev-list --count HEAD), first $(git log --reverse --format=%as | head -1), last $(git log -1 --format=%as)"
  echo "- Commits in last 90 days: $(git log --since=90.days --oneline | wc -l | tr -d ' ')"
  echo "- Tags: $(git tag | wc -l | tr -d ' ') (latest: $(git describe --tags --abbrev=0 2>/dev/null || echo none))"
  CC=$(git log -50 --format=%s | grep -Ec '^(feat|fix|docs|chore|ci|build|refactor|perf|test|style|revert)(\(.+\))?!?: ' || true)
  echo "- Conventional Commit subjects in last 50: $CC/50"
fi
echo "- Tracked files: $(printf '%s\n' "$FILES" | wc -l | tr -d ' ')"
echo

echo "## Stack signals"
for f in package.json pyproject.toml requirements.txt go.mod Cargo.toml pom.xml build.gradle Gemfile composer.json; do
  [ -f "$f" ] && echo "- \`$f\`"
done
for f in package-lock.json pnpm-lock.yaml yarn.lock bun.lockb uv.lock poetry.lock Pipfile.lock go.sum Cargo.lock; do
  [ -f "$f" ] && echo "- lockfile: \`$f\`"
done
if [ -f package.json ]; then
  ENG=$(grep -A3 '"engines"' package.json | tr -d '\n ' | sed 's/^"engines"://' | cut -c1-80)
  echo "- package.json engines: ${ENG:-none}"
  echo "- frameworks: $(grep -Eo '"(next|react|vue|nuxt|svelte|@sveltejs/kit|astro|express|fastify|hono|remix|@remix-run/[a-z]+|vite|@angular/core)": *"[^"]+"' package.json | tr '\n' ' ')"
  echo "- scripts: $(grep -A60 '"scripts"' package.json | sed -n '2,60p' | sed '/^ *}/q' | grep -Eo '^ *"[^"]+"' | tr -d ' "' | tr '\n' ' ')"
fi
for f in .nvmrc .node-version .python-version .tool-versions; do [ -f "$f" ] && echo "- runtime pin: \`$f\` = $(head -1 "$f")"; done
echo

echo "## Repo hygiene"
mark '^LICEN[CS]E' 'LICENSE'
mark '^SECURITY\.md|^\.github/SECURITY\.md' 'SECURITY.md'
mark '^CONTRIBUTING\.md|^\.github/CONTRIBUTING\.md' 'CONTRIBUTING.md'
mark 'CODE_OF_CONDUCT\.md' 'CODE_OF_CONDUCT.md'
mark '^\.github/CODEOWNERS|^CODEOWNERS|^docs/CODEOWNERS' 'CODEOWNERS'
mark '^\.github/(pull_request_template|PULL_REQUEST_TEMPLATE)' 'PR template'
mark '^\.github/ISSUE_TEMPLATE/' 'Issue templates/forms'
mark '^CHANGELOG' 'CHANGELOG'
mark '^\.editorconfig' '.editorconfig'
mark '^\.devcontainer/' 'Devcontainer'
mark '^\.gitattributes' '.gitattributes'
echo

echo "## Agent instructions"
mark '(^|/)AGENTS\.md$' 'AGENTS.md'
mark '(^|/)CLAUDE\.md$' 'CLAUDE.md'
mark '^\.github/copilot-instructions\.md|^\.cursor/rules|^\.cursorrules' 'Other agent rules (Copilot/Cursor)'
mark '^\.claude/(skills|commands|agents)/' 'Project skills/commands/agents'
echo

echo "## CI/CD"
WF="$(first '^\.github/workflows/.*\.ya?ml$' 50)"
if [ -n "$WF" ]; then
  echo "- Workflows: $(printf '%s\n' "$WF" | wc -l | tr -d ' ') — $(printf '%s\n' "$WF" | xargs -n1 basename | tr '\n' ' ')"
  USES=$(printf '%s\n' "$WF" | tr '\n' '\0' | xargs -0 grep -hE '^\s*-?\s*uses:' 2>/dev/null | grep -v 'uses: \./' )
  TOTAL=$(printf '%s\n' "$USES" | grep -c 'uses:' || true)
  PINNED=$(printf '%s\n' "$USES" | grep -cE '@[0-9a-f]{40}' || true)
  echo "- Action refs pinned to a full SHA: $PINNED/$TOTAL"
  printf '%s\n' "$USES" | grep -vE '@[0-9a-f]{40}' | grep 'uses:' | sed 's/^ *-\{0,1\} *//' | sort -u | head -10 | sed 's/^/  - unpinned: /'
  grep -lE '^permissions:' $WF >/dev/null 2>&1 && echo "- Top-level \`permissions:\` in: $(grep -lE '^permissions:' $WF | xargs -n1 basename | tr '\n' ' ')" || echo "- No workflow sets top-level \`permissions:\`"
  grep -lE '^concurrency:' $WF >/dev/null 2>&1 && echo "- \`concurrency:\` in: $(grep -lE '^concurrency:' $WF | xargs -n1 basename | tr '\n' ' ')"
  for k in 'lint' 'typecheck|tsc|mypy' 'test' 'build' 'docker|buildx' 'codeql|trivy|grype|snyk|osv-scanner|npm audit|pip-audit|dependency-review|scorecard|zizmor|gitleaks|trufflehog' 'playwright|cypress' 'helm' 'migrat' 'coverage|codecov' 'sbom|syft|cosign|attest' 'release-please|semantic-release|changesets'; do
    n=$(grep -lEi "$k" $WF 2>/dev/null | wc -l | tr -d ' ')
    echo "- mentions \`$k\`: $n workflow(s)"
  done
else
  echo "- [ ] No GitHub Actions workflows"
fi
mark '^\.gitlab-ci\.yml|^\.circleci/|^Jenkinsfile|^azure-pipelines' 'Other CI'
mark '^\.github/dependabot\.ya?ml|renovate\.json|^\.github/renovate' 'Dependency update automation'
mark '^\.pre-commit-config|^\.husky/|^lefthook' 'Pre-commit hooks'
echo

echo "## Containers and deploy"
DF="$(first '(^|/)(Dockerfile|Containerfile)[^/]*$' 20)"
if [ -n "$DF" ]; then
  for d in $DF; do
    froms=$(grep -cE '^FROM ' "$d" || true)
    digests=$(grep -cE '^FROM .*@sha256:' "$d" || true)
    user=$(grep -cE '^USER ' "$d" || true)
    hc=$(grep -cE '^HEALTHCHECK' "$d" || true)
    echo "- \`$d\`: $froms FROM ($digests by digest), USER lines: $user, HEALTHCHECK: $hc"
  done
else
  echo "- [ ] No Dockerfile"
fi
mark '(^|/)\.dockerignore$' '.dockerignore'
mark '(^|/)(docker-)?compose[^/]*\.ya?ml$' 'Compose file'
mark '(^|/)Chart\.yaml$' 'Helm chart'
mark '(^|/)kustomization\.ya?ml$' 'Kustomize'
mark '\.tf$' 'Terraform'
mark '(^|/)wrangler\.(toml|jsonc?)$|(^|/)vercel\.json$|(^|/)netlify\.toml$|(^|/)fly\.toml$' 'PaaS config'
echo

echo "## Database"
mark '(^|/)migrations?/' 'Migrations directory'
echo "- Migration files: $(count '(^|/)migrations?/.*\.(sql|ts|js|py)$')"
mark '(^|/)(seed|seeds)[^/]*\.' 'Seed scripts'
echo "- Files mentioning statement_timeout / read only / row level security: $(src_grep 'statement_timeout|READ ONLY|read_only|ROW LEVEL SECURITY|row_security')"
echo

echo "## Tests"
echo "- Test files: $(count '(\.|_)(test|spec)\.[a-z]+$|(^|/)tests?/.*\.(py|ts|tsx|js|go|rb)$')"
echo "- E2E: $(count '(^|/)e2e/|playwright\.config|cypress\.config') files"
echo "- Fuzz/property: $(src_grep 'fast-check|hypothesis|proptest|testing/quick|jsverify')"
echo "- Testcontainers: $(src_grep 'testcontainers')"
echo "- axe/a11y tests: $(src_grep '@axe-core|axe-core|jest-axe|pa11y')"
echo "- Snapshot/visual: $(count '__snapshots__/|(^|/)snapshots?/|\.snap$')"
echo "- Coverage config: $(src_grep 'coverageThreshold|--check-coverage|fail_under|--cov-fail-under|thresholds')"
echo

echo "## Docs"
mark '^README' 'README'
echo "- README lines: $( [ -f README.md ] && wc -l < README.md | tr -d ' ' || echo 0)"
echo "- docs/ files: $(count '^docs/.*\.(md|mdx)$')"
mark '(^|/)(adr|adrs|decisions)/' 'ADRs'
mark '(^|/)(openapi|swagger)\.(ya?ml|json)$' 'OpenAPI spec'
echo

echo "## Code-level signals (counts of files; read them before judging)"
echo "- Security headers / CSP: $(src_grep 'Content-Security-Policy|contentSecurityPolicy|helmet\(|Strict-Transport-Security')"
echo "- Rate limiting: $(src_grep 'rate.?limit|ratelimit|RateLimit|throttl|token.?bucket|slowapi|express-rate-limit')"
echo "- Structured logging libs/usages: $(src_grep 'pino|winston|structlog|zap\.|logrus|slog\.|bunyan')"
echo "- Redaction: $(src_grep 'redact')"
echo "- Metrics: $(src_grep 'prom-client|prometheus_client|/metrics|opentelemetry')"
echo "- Health/ready endpoints: $(src_grep '/health|/ready|/livez|/readyz|healthz')"
echo "- Graceful shutdown: $(src_grep 'SIGTERM')"
echo "- Schema validation (zod/pydantic/joi/valibot): $(src_grep 'from .zod.|from "zod"|pydantic|joi\.|valibot')"
echo "- Error boundaries: $(src_grep 'ErrorBoundary|error\.tsx|componentDidCatch')"
echo "- Reduced-motion handling: $(src_grep 'prefers-reduced-motion|useReducedMotion|motion-safe|motion-reduce|data-motion')"
echo "- console.* in src: $( [ -d src ] && grep -rEl 'console\.(log|debug|info)\(' src 2>/dev/null | wc -l | tr -d ' ' || echo n/a)"
echo "- TODO/FIXME/HACK: $(src_grep 'TODO|FIXME|HACK|XXX')"
echo "- dangerouslySetInnerHTML / innerHTML / eval(: $(src_grep 'dangerouslySetInnerHTML|\.innerHTML *=|[^a-zA-Z.]eval\(')"
echo "- Possible hardcoded secrets (key/secret/password = literal): $(src_grep '(api[_-]?key|secret|passw(or)?d|token)[\"'"'"']? *[:=] *[\"'"'"'][A-Za-z0-9_\-]{12,}')"
ENVS=$(printf '%s\n' "$FILES" | grep -E '(^|/)\.env($|\.[a-z]+$)' | grep -Ev '\.(example|sample|template|dist)$')
echo "- Committed .env files (excluding examples): $(printf '%s' "$ENVS" | grep -c . || true) $(printf '%s' "$ENVS" | tr '\n' ' ')"
echo

echo "## Structure and size"
echo "- Top-level entries (tracked): $(printf '%s\n' "$FILES" | cut -d/ -f1 | sort -u | wc -l | tr -d ' ')"
echo "- Files per top-level directory (top 12):"
printf '%s\n' "$FILES" | grep / | cut -d/ -f1 | sort | uniq -c | sort -rn | head -12 | awk '{printf "  - %s: %s\n", $2, $1}'
echo "- Max path depth: $(printf '%s\n' "$FILES" | awk -F/ '{print NF}' | sort -n | tail -1)"
SRC=$(printf '%s\n' "$FILES" | grep -E '\.(ts|tsx|js|jsx|mjs|vue|svelte|py|go|rs|rb|java|kt|cs|php|css|scss|sql)$' | grep -Ev '(\.min\.|\.d\.ts$|generated|__generated__|fixtures?/|snapshots?/)')
echo "- Source files: $(printf '%s\n' "$SRC" | grep -c . || true); over 500 lines: $(printf '%s\n' "$SRC" | tr '\n' '\0' | xargs -0 wc -l 2>/dev/null | grep -v ' total$' | awk '$1>500' | wc -l | tr -d ' '); over 1000 lines: $(printf '%s\n' "$SRC" | tr '\n' '\0' | xargs -0 wc -l 2>/dev/null | grep -v ' total$' | awk '$1>1000' | wc -l | tr -d ' ')"
echo "- Longest source files (lines):"
printf '%s\n' "$SRC" | tr '\n' '\0' | xargs -0 wc -l 2>/dev/null | grep -v ' total$' | sort -rn | head -10 | awk '{printf "  - %s: %s\n", $2, $1}'
echo "- Largest tracked files (KB, any type):"
printf '%s\n' "$FILES" | while IFS= read -r f; do [ -f "$f" ] && printf '%s\t%s\n' "$(wc -c < "$f" | tr -d ' ')" "$f"; done | sort -rn | head -8 | awk -F'\t' '{printf "  - %s: %d\n", $2, $1/1024}'
echo "- Tracked binaries/media over 1 MB: $(printf '%s\n' "$FILES" | while IFS= read -r f; do [ -f "$f" ] && [ "$(wc -c < "$f")" -gt 1048576 ] && echo "$f"; done | tr '\n' ' ')"
echo "- Git LFS: $( [ -f .gitattributes ] && grep -c 'filter=lfs' .gitattributes || echo 0) patterns"
echo "- Barrel files (index.ts/js re-exports): $(printf '%s\n' "$FILES" | grep -Ec '(^|/)index\.(ts|js)$' || true)"
echo "- Generated/build output tracked by mistake: $(printf '%s\n' "$(list_files)" | grep -Ec '(^|/)(dist|build|\.next|coverage|node_modules)/' || true)"
echo

# gh api prints the error body to stdout on failure; keep it out of the report.
ghq() { local out; out=$(gh api "$@" 2>/dev/null) && printf '%s' "$out" || echo "${GHQ_FALLBACK:-unreadable}"; }

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1 && SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null); then
  echo "## GitHub ($SLUG)"
  DEF=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null)
  echo "- Default branch: $DEF"
  echo "- Description/topics: $(gh repo view --json description,repositoryTopics -q '.description + " | " + ([.repositoryTopics[]?.name]|join(","))' 2>/dev/null)"
  P=$(gh api "repos/$SLUG/branches/$DEF/protection" 2>/dev/null) && [ "${P#*\"message\"}" = "$P" ] && echo "- Branch protection: on; required checks: $(printf '%s' "$P" | grep -Eo '"context":"[^"]+"' | cut -d'"' -f4 | tr '\n' ',' )" || echo "- Branch protection: none readable (may be rulesets, or no admin access)"
  echo "- Rulesets: $(ghq "repos/$SLUG/rulesets" -q 'length')"
  echo "- Open Dependabot alerts: $(GHQ_FALLBACK='unreadable (disabled or no access)' ghq "repos/$SLUG/dependabot/alerts?state=open&per_page=100" -q 'length')"
  echo "- Open code-scanning alerts: $(GHQ_FALLBACK='none (code scanning not enabled)' ghq "repos/$SLUG/code-scanning/alerts?state=open&per_page=100" -q 'length')"
  echo "- Open secret-scanning alerts: $(GHQ_FALLBACK='unreadable (disabled or no access)' ghq "repos/$SLUG/secret-scanning/alerts?state=open&per_page=100" -q 'length')"
  echo "- Labels: $(gh label list --limit 200 --json name -q 'length' 2>/dev/null), milestones: $(ghq "repos/$SLUG/milestones?state=all&per_page=100" -q 'length')"
  echo "- Issues open/closed: $(gh issue list --state open --limit 1000 --json number -q length 2>/dev/null)/$(gh issue list --state closed --limit 1000 --json number -q length 2>/dev/null)"
  echo "- Last 10 runs on $DEF: $(gh run list --branch "$DEF" --limit 10 --json conclusion -q '[.[].conclusion // "running"] | group_by(.) | map("\(.[0])=\(length)") | join(" ")' 2>/dev/null)"
else
  echo "## GitHub"
  echo "- gh not available or not authenticated; skipped remote signals"
fi
