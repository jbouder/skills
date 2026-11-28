#!/usr/bin/env node
// Builds the standalone HTML review report.
//
//   node build-report.mjs <review dir>
//
// Reads <dir>/pr.json and <dir>/pr.diff (from pr-data.mjs) and <dir>/review.json (written
// by the reviewer, see references/report.md). Writes <dir>/report.html: one file, with
// screenshots inlined, a GitHub permalink for every cited line, and the diff excerpt
// for every cited line taken from the real PR diff.
//
// Exits 1 without writing when the review data is broken (a cited file that does not
// exist at the PR head, a line past the end of a file, a missing screenshot, ...).

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = resolve(process.argv[2] ?? "");
if (!process.argv[2] || !existsSync(join(dir, "pr.json")) || !existsSync(join(dir, "review.json"))) {
  console.error("usage: build-report.mjs <review dir>   (the dir must hold pr.json and review.json)");
  process.exit(1);
}
const pr = JSON.parse(readFileSync(join(dir, "pr.json"), "utf8"));
const review = JSON.parse(readFileSync(join(dir, "review.json"), "utf8"));
const errors = [];
const warnings = [];

// ---- the file at the PR head ---------------------------------------------------
const fileCache = new Map();
function headLines(path) {
  if (!pr.headLocal) return undefined; // unknown
  if (!fileCache.has(path)) {
    try {
      const text = execFileSync("git", ["show", `${pr.headSha}:${path}`], { cwd: pr.repoDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
      fileCache.set(path, text.split("\n"));
    } catch {
      fileCache.set(path, null);
    }
  }
  return fileCache.get(path);
}
function pathKind(path) {
  if (!pr.headLocal) return "unknown";
  try {
    return execFileSync("git", ["cat-file", "-t", `${pr.headSha}:${path.replace(/\/$/, "")}`], { cwd: pr.repoDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "missing";
  }
}

// ---- the PR diff ---------------------------------------------------------------
const hunksByPath = new Map();
if (existsSync(join(dir, "pr.diff"))) {
  let path = null, hunk = null, o = 0, n = 0, oldPath = null;
  for (const line of readFileSync(join(dir, "pr.diff"), "utf8").split("\n")) {
    if (line.startsWith("diff --git ")) { path = null; hunk = null; oldPath = null; continue; }
    if (!hunk && line.startsWith("--- ")) { oldPath = line.slice(4).replace(/^a\//, ""); continue; }
    if (!hunk && line.startsWith("+++ ")) {
      const p = line.slice(4);
      path = p === "/dev/null" ? oldPath : p.replace(/^b\//, "");
      if (!hunksByPath.has(path)) hunksByPath.set(path, []);
      continue;
    }
    const h = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (h && path) {
      o = Number(h[1]); n = Number(h[2]);
      hunk = { lines: [] };
      hunksByPath.get(path).push(hunk);
      continue;
    }
    if (!hunk) continue;
    const t = line[0];
    if (t === "+") hunk.lines.push({ t, n: n++, s: line.slice(1) });
    else if (t === "-") hunk.lines.push({ t, o: o++, at: n, s: line.slice(1) });
    else if (t === " ") hunk.lines.push({ t, o: o++, n: n++, s: line.slice(1) });
  }
} else {
  warnings.push("pr.diff is missing, so the report has no diff excerpts.");
}

const MAX_LINES = 80;
// The part of the PR diff around a cited range. Falls back to the unchanged source
// when the range is outside every hunk, so the reader still sees the code.
function excerpt(ref, ctx = 3) {
  if (!ref.line) return null;
  const from = ref.line - ctx, to = (ref.endLine ?? ref.line) + ctx;
  const inRange = (l) => { const pos = l.t === "-" ? l.at : l.n; return pos >= from && pos <= to; };
  const isHit = (l) => l.t !== "-" && l.n >= ref.line && l.n <= (ref.endLine ?? ref.line);
  for (const hunk of hunksByPath.get(ref.path) ?? []) {
    if (!hunk.lines.some(isHit)) continue;
    let lines = hunk.lines.filter(inRange).map((l) => ({ ...l, hit: isHit(l) || undefined, at: undefined }));
    const truncated = lines.length > MAX_LINES;
    if (truncated) lines = lines.slice(0, MAX_LINES);
    return { path: ref.path, line: ref.line, endLine: ref.endLine, changed: true, truncated, lines };
  }
  const src = headLines(ref.path);
  if (!src) return null;
  const lines = [];
  for (let i = Math.max(1, from); i <= Math.min(src.length, to) && lines.length < MAX_LINES; i++) {
    lines.push({ t: " ", n: i, o: undefined, s: src[i - 1], hit: (i >= ref.line && i <= (ref.endLine ?? ref.line)) || undefined });
  }
  return { path: ref.path, line: ref.line, endLine: ref.endLine, changed: false, lines };
}

// A proposed fix shown as a diff: the real lines at the head against the replacement.
function suggestionDiff(s, where) {
  const src = headLines(s.path);
  if (!src) { warnings.push(`${where}: suggestion skipped, ${s.path} is not readable at the PR head.`); return null; }
  const end = s.endLine ?? s.line, lines = [];
  for (let i = Math.max(1, s.line - 2); i < s.line; i++) lines.push({ t: " ", n: i, s: src[i - 1] });
  for (let i = s.line; i <= end; i++) lines.push({ t: "-", o: i, s: src[i - 1] ?? "" });
  String(s.replacement).replace(/\n$/, "").split("\n").forEach((text) => lines.push({ t: "+", s: text }));
  for (let i = end + 1; i <= Math.min(src.length, end + 2); i++) lines.push({ t: " ", n: i, s: src[i - 1] });
  return { path: s.path, line: s.line, endLine: s.endLine, suggestion: true, lines };
}

// ---- validate ------------------------------------------------------------------
function checkRef(ref, where) {
  if (!ref?.path) { errors.push(`${where}: a ref has no path.`); return; }
  const kind = pathKind(ref.path);
  if (kind === "missing") { errors.push(`${where}: ${ref.path} does not exist at the PR head ${pr.headSha.slice(0, 10)}.`); return; }
  if (kind === "tree") { ref.isDir = true; if (ref.line) errors.push(`${where}: ${ref.path} is a folder, it cannot take a line.`); return; }
  if (!ref.line) return;
  if (ref.endLine && ref.endLine < ref.line) errors.push(`${where}: ${ref.path} has endLine before line.`);
  const src = headLines(ref.path);
  if (src && (ref.endLine ?? ref.line) > src.length) errors.push(`${where}: ${ref.path}:${ref.endLine ?? ref.line} is past the end of the file (${src.length} lines at the PR head).`);
}
const parseToken = (t) => {
  const m = t.match(/^(.*?)(?::(\d+)(?:-(\d+))?)?$/);
  return { path: m[1], line: m[2] ? Number(m[2]) : undefined, endLine: m[3] ? Number(m[3]) : undefined };
};
const dirTokens = [];
function checkText(value, where) {
  if (typeof value === "string") {
    for (const m of value.matchAll(/\[\[([^\]\s]+?)\]\]/g)) {
      const ref = parseToken(m[1]);
      checkRef(ref, `${where} (inline [[${m[1]}]])`);
      if (ref.isDir) dirTokens.push(ref.path.replace(/\/$/, ""));
    }
  } else if (Array.isArray(value)) value.forEach((v) => checkText(v, where));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) if (k !== "refs" && k !== "suggestion") checkText(v, where);
}

if (!["approve", "request-changes"].includes(review.verdict)) errors.push('verdict must be "approve" or "request-changes".');
if (!review.summary) errors.push("summary is missing: say what the PR does in two to four sentences.");
if (!["panel", "quick"].includes(review.mode)) errors.push('mode must be "panel" or "quick".');
if (!review.recommendation?.text) errors.push("recommendation.text is missing: the report ends with the consolidated recommendation.");

review.findings ??= [];
review.findings.forEach((f, i) => {
  const where = `finding ${f.id ?? i + 1}`;
  f.id ??= `F${i + 1}`;
  if (!f.title) errors.push(`${where}: title is missing.`);
  if (!["blocking", "should-fix"].includes(f.severity)) errors.push(`${where}: severity must be "blocking" or "should-fix".`);
  if (!f.refs?.length) errors.push(`${where}: needs at least one ref with a path and line.`);
  (f.refs ?? []).forEach((r) => checkRef(r, where));
  checkText(f, where);
  f.diffs = (f.refs ?? []).map((r) => excerpt(r)).filter(Boolean);
  if (f.suggestion) { checkRef(f.suggestion, `${where} suggestion`); f.fixDiff = suggestionDiff(f.suggestion, where); }
});
if (review.verdict === "approve" && review.findings.some((f) => f.severity === "blocking")) errors.push("verdict is approve but there is a blocking finding.");

for (const key of ["keyChanges", "worthKnowing", "readingOrder"]) {
  review[key] ??= [];
  review[key].forEach((item, i) => {
    const where = `${key}[${i}]`;
    (item.refs ?? []).forEach((r) => checkRef(r, where));
    checkText(item, where);
    if (key === "keyChanges") item.diffs = (item.refs ?? []).map((r) => excerpt(r)).filter(Boolean);
  });
}
checkText({ summary: review.summary, flow: review.flow, recommendation: review.recommendation, reviewers: review.reviewers, verdictReason: review.verdictReason, notDone: review.notDone }, "text");

review.reviewers ??= [];
if (review.mode === "panel" && review.reviewers.length !== 3) errors.push(`mode is "panel" but there are ${review.reviewers.length} reviewers, expected 3.`);
review.reviewers.forEach((r, i) => {
  if (!r.id || !r.lens) errors.push(`reviewers[${i}]: needs an id and a lens.`);
});
const lensIds = new Set(review.reviewers.map((r) => r.id));
for (const f of review.findings) for (const id of f.raisedBy ?? []) if (!lensIds.has(id)) errors.push(`finding ${f.id}: raisedBy "${id}" is not a reviewer id.`);

review.screenshots ??= [];
if (pr.uiChanged && !review.screenshots.length && !review.screenshotsNote) errors.push("UI files changed but there are no screenshots. Capture them, or set screenshotsNote to say why not.");
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
let imageBytes = 0;
for (const s of review.screenshots) {
  const p = resolve(dir, s.file ?? "");
  if (!s.file || !existsSync(p)) { errors.push(`screenshot ${s.file ?? "(no file)"} was not found in ${dir}.`); continue; }
  if (!s.caption) errors.push(`screenshot ${s.file}: caption is missing. Say what the reader is looking at.`);
  const buf = readFileSync(p);
  imageBytes += buf.length;
  s.src = `data:${MIME[extname(p).toLowerCase()] ?? "image/png"};base64,${buf.toString("base64")}`;
}
if (imageBytes > 25 * 1024 * 1024) warnings.push(`Screenshots add ${(imageBytes / 1048576).toFixed(0)} MB to the report. Drop some or use --viewport-only.`);
if (!pr.headLocal) warnings.push("The PR head is not in the local clone, so cited paths and lines were not checked.");

for (const w of warnings) console.error(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error(`\n${errors.length} problem${errors.length === 1 ? "" : "s"} in review.json. report.html was not written.`);
  process.exit(1);
}

// ---- write ---------------------------------------------------------------------
const data = {
  pr: { ...pr, files: undefined, body: undefined, repoDir: undefined, commits: undefined, commitCount: pr.commits.length },
  review,
  dirs: [...new Set(dirTokens)],
  generatedAt: new Date().toISOString(),
};
const template = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "report-template.html"), "utf8");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const html = template
  .replace("__TITLE__", () => esc(`PR #${pr.number} review · ${pr.repo}`))
  .replace("__DATA__", () => JSON.stringify(data).replace(/</g, "\\u003c"));
const out = join(dir, "report.html");
writeFileSync(out, html);
const diffs = review.findings.reduce((n, f) => n + f.diffs.length + (f.fixDiff ? 1 : 0), 0) + review.keyChanges.reduce((n, k) => n + (k.diffs?.length ?? 0), 0);
console.log(`report: ${out}`);
console.log(`${review.findings.length} findings, ${diffs} diff excerpts, ${review.screenshots.length} screenshots, ${(html.length / 1024).toFixed(0)} KB`);
