#!/usr/bin/env node
// Collects the facts about a PR that the review and the HTML report both need:
// metadata, checks, every changed file classified by kind, lines grouped by area,
// whether the UI changed, and how big the PR is.
//
//   node pr-data.mjs <pr number or url> [--out <dir>] [--repo-dir <dir>]
//        [--generated <regex>] [--large-lines 1500] [--large-files 50]
//
// Writes <out>/pr.json and <out>/pr.diff, and fetches the PR head into the local
// clone so `git show <headSha>:<path>` works. Needs an authenticated `gh`.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
if (!argv.length || argv.includes("--help")) {
  console.log("usage: pr-data.mjs <pr number|url> [--out <dir>] [--repo-dir <dir>] [--generated <regex>] [--large-lines N] [--large-files N]");
  process.exit(argv.length ? 0 : 1);
}
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const target = argv[0];
const repoDir = resolve(opt("--repo-dir", process.cwd()));
const largeLines = Number(opt("--large-lines", 1500));
const largeFiles = Number(opt("--large-files", 50));
const extraGenerated = opt("--generated") ? new RegExp(opt("--generated")) : null;

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: repoDir, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
const gh = (args) => run("gh", args);

const fields = [
  "number", "title", "body", "url", "author", "state", "isDraft", "baseRefName", "headRefName",
  "headRefOid", "baseRefOid", "additions", "deletions", "changedFiles", "createdAt", "updatedAt",
  "isCrossRepository", "reviewRequests", "reviews", "statusCheckRollup", "commits", "labels",
].join(",");
const view = JSON.parse(gh(["pr", "view", target, "--json", fields]));
const m = view.url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
if (!m) throw new Error(`Cannot read owner/repo from ${view.url}`);
const [, owner, repo] = m;

const files = gh([
  "api", "--paginate", `repos/${owner}/${repo}/pulls/${view.number}/files?per_page=100`,
  "--jq", ".[] | {path: .filename, status, additions, deletions, previous: .previous_filename}",
]).split("\n").filter(Boolean).map((l) => JSON.parse(l));

// ---- classify ----------------------------------------------------------------
const GENERATED = [
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|go\.sum|uv\.lock|poetry\.lock|Cargo\.lock|Gemfile\.lock|composer\.lock)$/,
  /\.gen\.[a-z]+$/, /_gen\.go$/, /\.pb\.go$/, /_pb2(_grpc)?\.py$/, /\.generated\./, /\.min\.(js|css)$/, /\.snap$/, /\.map$/,
  /(^|\/)(sqlcgen|generated|__generated__|vendor|node_modules|dist|build)\//,
  /(^|\/)openapi\.(json|ya?ml)$/, /(^|\/)schema\.graphql$/,
  /\.(svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf|mp4|webm)$/i,
];
const TESTS = [
  /_test\.(go|py|rb)$/, /(^|\/)test_[^/]+\.py$/, /\.(test|spec|stories)\.[cm]?[jt]sx?$/, /Tests?\.(java|kt|cs|swift)$/,
  /(^|\/)(tests?|__tests__|__mocks__|testdata|testutil|testutils|fixtures|mocks?|e2e|cypress|playwright)\//,
  /(^|\/)[a-z0-9]+test\/[^/]+\.go$/,
  /(^|\/)conftest\.py$/,
];
const DOCS = [/\.(md|mdx|rst|adoc|txt)$/i, /(^|\/)docs?\//, /(^|\/)(LICENSE|NOTICE|CHANGELOG)[^/]*$/];
const UI = [/\.(tsx|jsx|vue|svelte|astro|css|scss|sass|less|html)$/];

const kindOf = (p) => {
  if (extraGenerated?.test(p) || GENERATED.some((r) => r.test(p))) return "generated";
  if (TESTS.some((r) => r.test(p))) return "tests";
  if (DOCS.some((r) => r.test(p))) return "docs";
  return "product";
};
for (const f of files) f.kind = kindOf(f.path);

const zero = () => ({ product: 0, tests: 0, generated: 0, docs: 0 });
const totals = { additions: 0, deletions: 0, added: zero(), changed: zero(), files: zero() };
for (const f of files) {
  totals.additions += f.additions;
  totals.deletions += f.deletions;
  totals.added[f.kind] += f.additions;
  totals.changed[f.kind] += f.additions + f.deletions;
  totals.files[f.kind] += 1;
}

// ---- group by area -----------------------------------------------------------
// Start at top-level folders, then keep splitting whichever area holds more than a
// sixth of the change, so the bars show where the work is instead of "src: 100%".
const keyAt = (path, depth) => {
  const parts = path.split("/");
  if (parts.length <= depth) return parts.slice(0, -1).join("/") || "(repo root)";
  return parts.slice(0, depth).join("/");
};
const weight = (fs) => fs.reduce((n, f) => n + f.additions + f.deletions, 0);
const grand = Math.max(1, weight(files));
const groups = new Map();
const put = (map, key, depth, f) => {
  if (!map.has(key)) map.set(key, { key, depth, files: [], done: false });
  map.get(key).files.push(f);
};
for (const f of files) put(groups, keyAt(f.path, 1), 1, f);
for (let i = 0; i < 40; i++) {
  const big = [...groups.values()]
    .filter((g) => !g.done && g.files.length > 1 && weight(g.files) / grand > 0.15)
    .sort((a, b) => weight(b.files) - weight(a.files))[0];
  if (!big) break;
  const sub = new Map();
  for (const f of big.files) put(sub, keyAt(f.path, big.depth + 1), big.depth + 1, f);
  if (sub.size === 1 && sub.has(big.key)) { big.done = true; continue; }
  groups.delete(big.key);
  for (const [k, g] of sub) {
    if (groups.has(k)) groups.get(k).files.push(...g.files);
    else groups.set(k, g);
  }
}
let areas = [...groups.values()].map((g) => {
  const single = g.files.length === 1;
  const a = { name: single ? g.files[0].path : g.key, isDir: !single, files: g.files.length, additions: 0, deletions: 0, added: zero() };
  if (g.key === "(repo root)" && !single) a.noLink = true;
  for (const f of g.files) { a.additions += f.additions; a.deletions += f.deletions; a.added[f.kind] += f.additions; }
  return a;
}).sort((a, b) => b.additions - a.additions || b.deletions - a.deletions);
if (areas.length > 18) {
  const rest = areas.slice(17);
  const merged = { name: `${rest.length} smaller areas`, isDir: false, noLink: true, files: 0, additions: 0, deletions: 0, added: zero(), members: rest.map((a) => a.name) };
  for (const a of rest) {
    merged.files += a.files; merged.additions += a.additions; merged.deletions += a.deletions;
    for (const k of Object.keys(merged.added)) merged.added[k] += a.added[k];
  }
  areas = [...areas.slice(0, 17), merged];
}

// ---- size and UI -------------------------------------------------------------
const uiFiles = files.filter((f) => f.kind !== "generated" && f.status !== "removed" && UI.some((r) => r.test(f.path))).map((f) => f.path);
const reviewFiles = totals.files.product + totals.files.tests;
const large = totals.changed.product > largeLines || reviewFiles > largeFiles;

const checks = { passed: 0, failed: 0, pending: 0, skipped: 0, failing: [] };
for (const c of view.statusCheckRollup ?? []) {
  const s = (c.conclusion || c.state || c.status || "").toUpperCase();
  if (["SUCCESS", "NEUTRAL"].includes(s)) checks.passed++;
  else if (s === "SKIPPED") checks.skipped++;
  else if (["FAILURE", "ERROR", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "STARTUP_FAILURE"].includes(s)) { checks.failed++; checks.failing.push(c.name || c.context); }
  else checks.pending++;
}

const diffAnchors = {};
for (const f of files) diffAnchors[f.path] = createHash("sha256").update(f.path).digest("hex");

const outDir = resolve(opt("--out", join(homedir(), "pr-reviews", `${owner}-${repo}-pr-${view.number}`)));
mkdirSync(outDir, { recursive: true });

// ---- local objects and the diff ------------------------------------------------
// Fetching only updates FETCH_HEAD. It makes the head commit readable locally, which
// the report builder uses to check cited lines and to quote unchanged code.
let headLocal = true;
try {
  run("git", ["fetch", "--quiet", "origin", `pull/${view.number}/head`]);
  run("git", ["cat-file", "-e", `${view.headRefOid}^{commit}`]);
} catch {
  headLocal = false;
  console.error(`warning: could not fetch the PR head into ${repoDir}. Line checks and unchanged-code snippets will be skipped.`);
}
let diffSaved = false;
try {
  writeFileSync(join(outDir, "pr.diff"), gh(["pr", "diff", String(view.number)]));
  diffSaved = true;
} catch {
  // GitHub refuses very large diffs. Build the same three-dot diff locally.
  try {
    run("git", ["fetch", "--quiet", "origin", view.baseRefName]);
    writeFileSync(join(outDir, "pr.diff"), run("git", ["diff", `${view.baseRefOid}...${view.headRefOid}`]));
    diffSaved = true;
  } catch (e) {
    console.error(`warning: could not save pr.diff (${String(e.message).split("\n")[0]}). The report will have no diff excerpts.`);
  }
}

const pr = {
  owner, repo, number: view.number, title: view.title, body: view.body, url: view.url,
  repoUrl: `https://github.com/${owner}/${repo}`, repoDir,
  author: view.author?.login, state: view.state, isDraft: view.isDraft, fromFork: view.isCrossRepository,
  base: view.baseRefName, head: view.headRefName, headSha: view.headRefOid, baseSha: view.baseRefOid,
  createdAt: view.createdAt, updatedAt: view.updatedAt,
  reviewers: (view.reviewRequests ?? []).map((r) => r.login || r.name || r.slug).filter(Boolean),
  reviews: (view.reviews ?? []).map((r) => ({ author: r.author?.login, state: r.state })),
  labels: (view.labels ?? []).map((l) => l.name),
  commits: (view.commits ?? []).map((c) => ({ sha: c.oid, date: c.committedDate, subject: c.messageHeadline })),
  checks, totals, areas, files, diffAnchors,
  uiChanged: uiFiles.length > 0, uiFiles,
  size: { tier: large ? "large" : "standard", productLinesChanged: totals.changed.product, reviewFiles, largeLines, largeFiles },
  diffSaved, headLocal,
};
writeFileSync(join(outDir, "pr.json"), JSON.stringify(pr, null, 2));

const n = (x) => x.toLocaleString("en-US");
console.log(`PR #${pr.number}  ${pr.title}`);
console.log(`${owner}/${repo}  ${pr.head} -> ${pr.base}  head ${pr.headSha.slice(0, 10)}  by ${pr.author}${pr.fromFork ? "  (from a fork)" : ""}`);
console.log(`+${n(totals.additions)} -${n(totals.deletions)} in ${files.length} files, ${pr.commits.length} commits`);
console.log(`added lines: product ${n(totals.added.product)}, tests ${n(totals.added.tests)}, generated ${n(totals.added.generated)}, docs ${n(totals.added.docs)}`);
console.log(`checks: ${checks.passed} passed, ${checks.failed} failed, ${checks.pending} pending, ${checks.skipped} skipped${checks.failing.length ? "  failing: " + checks.failing.join(", ") : ""}`);
console.log(`size: ${pr.size.tier}  (${n(totals.changed.product)} product lines changed, ${reviewFiles} product and test files; large is over ${n(largeLines)} lines or ${largeFiles} files)`);
console.log(`ui changed: ${pr.uiChanged ? `yes, ${uiFiles.length} files` : "no"}`);
console.log(`out: ${outDir}`);
