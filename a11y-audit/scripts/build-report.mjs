#!/usr/bin/env node
// Build report.json and report.html from a scan folder.
//
//   node build-report.mjs <scan-dir> [--enrichment <file>] [--inline-images] [--title <text>]
//
// Inputs:  <scan-dir>/scan.json (from scan.mjs), optional <scan-dir>/enrichment.json
//          (Claude's tailored explanations, see references/enrichment.md), the rule
//          knowledge base in references/rules/*.md and assets/wcag22.json.
// Outputs: <scan-dir>/report.json (machine-readable, markdown fields) and
//          <scan-dir>/report.html (self-contained interactive report).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(here, '..');

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
if (!argv.length || argv.includes('-h') || argv.includes('--help')) {
  console.log('Usage: node build-report.mjs <scan-dir> [--enrichment <file>] [--inline-images] [--title <text>]');
  process.exit(argv.length ? 0 : 2);
}
const dir = path.resolve(argv[0]);
const opt = (name) => { const i = argv.indexOf(name); return i > -1 ? argv[i + 1] : null; };
const inlineImages = argv.includes('--inline-images');
const enrichmentPath = opt('--enrichment') || path.join(dir, 'enrichment.json');
const warn = (m) => console.log(`[a11y] WARN ${m}`);

const scan = JSON.parse(fs.readFileSync(path.join(dir, 'scan.json'), 'utf8'));
const wcag = JSON.parse(fs.readFileSync(path.join(skillDir, 'assets', 'wcag22.json'), 'utf8'));
let enrichment = {};
if (fs.existsSync(enrichmentPath)) {
  enrichment = JSON.parse(fs.readFileSync(enrichmentPath, 'utf8'));
  console.log(`[a11y] Using enrichment ${enrichmentPath}`);
} else {
  warn('No enrichment.json found. The report will use the generic rule guidance only.');
}

// ---------------------------------------------------------------- rule docs
function parseRuleDoc(text) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[')) v = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    fm[kv[1]] = v;
  }
  const sections = {};
  const parts = m[2].split(/^## +/m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf('\n');
    const head = p.slice(0, nl).trim().toLowerCase();
    const body = p.slice(nl + 1).trim();
    const key = { 'the problem': 'problem', 'who it affects': 'who', 'how to fix': 'fix', 'common false positives': 'falsePositives', 'how to verify': 'verify', references: 'references' }[head] || head;
    sections[key] = body;
  }
  return { ...fm, sections };
}
const ruleDocs = {};
const rulesDir = path.join(skillDir, 'references', 'rules');
for (const f of fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md'))) {
  const d = parseRuleDoc(fs.readFileSync(path.join(rulesDir, f), 'utf8'));
  if (d?.id) ruleDocs[d.id] = d;
}

// ---------------------------------------------------------------- markdown
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(s) {
  const codes = [];
  let out = esc(s).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  out = out
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|#[^)\s]*)\)/g, (_, t, u) => `<a href="${u}"${u.startsWith('#') ? '' : ' target="_blank" rel="noopener"'}>${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
}
// Fenced blocks may carry a role after the language: ```html before / ```tsx after
function md(src) {
  if (!src) return '';
  const lines = String(src).replace(/\r/g, '').split('\n');
  const out = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^\s*```\s*([\w+-]*)\s*(\w*)\s*$/.exec(line);
    if (fence) {
      const buf = []; i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      const lang = fence[1] || 'text'; const role = (fence[2] || '').toLowerCase();
      const label = role === 'before' ? 'Before' : role === 'after' ? 'After' : lang.toUpperCase();
      out.push(`<figure class="code${role ? ` code-${role}` : ''}"><figcaption><span>${esc(label)}</span>${role ? `<span class="lang">${esc(lang)}</span>` : ''}<button type="button" class="copy" data-copy>Copy</button></figcaption><pre tabindex="0"><code>${esc(buf.join('\n'))}</code></pre></figure>`);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { const lvl = Math.min(6, h[1].length + 3); out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); i++; continue; }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
        let item = lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/, ''); i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*```/.test(lines[i])) { item += ` ${lines[i].trim()}`; i++; }
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^\s*```/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) && !/^\s*([-*]|\d+[.)])\s+/.test(lines[i])) { para.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- color math
const hexToRgb = (hex) => { const h = hex.replace('#', ''); const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6); return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); };
const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
function rgbToHsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); let h = 0; let s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hslToRgb([h, s, l]) { if (!s) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q; const f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
// Smallest lightness change to `fg` (keeping hue and saturation) that reaches `target` against `bg`.
function nearestPassing(fgHex, bgHex, target) {
  try {
    const fg = hexToRgb(fgHex); const bg = hexToRgb(bgHex); const [h, s, l0] = rgbToHsl(fg);
    let best = null;
    for (const dir of [-1, 1]) {
      for (let d = 0.005; d <= 1; d += 0.005) {
        const l = l0 + dir * d; if (l < 0 || l > 1) break;
        const c = hslToRgb([h, s, l]).map(Math.round);
        const r = ratio(c, bg);
        if (r >= target + 0.02) { if (!best || d < best.d) best = { d, hex: rgbToHex(c), ratio: Math.floor(r * 100) / 100 }; break; }
      }
    }
    return best ? { hex: best.hex, ratio: best.ratio } : null;
  } catch { return null; }
}

// ---------------------------------------------------------------- assemble
const IMPACT_W = { critical: 8, serious: 4, moderate: 2, minor: 1 };
const pageById = Object.fromEntries(scan.pages.map((p) => [p.id, p]));
const enrichIssues = enrichment.issues || {};
const knownIds = new Set(scan.issues.map((i) => i.id));
for (const id of Object.keys(enrichIssues)) if (!knownIds.has(id)) warn(`enrichment.json mentions unknown issue ${id}`);

const issues = scan.issues.map((i) => {
  const doc = ruleDocs[i.ruleId] || null;
  const e = enrichIssues[i.id] || {};
  if (!doc && i.source === 'axe') warn(`No rule doc for ${i.ruleId}`);
  let contrast = null;
  if (i.ruleId.startsWith('color-contrast')) {
    const d = i.instances.flatMap((x) => x.checks).find((c) => c.data?.fgColor)?.data;
    if (d) {
      const need = parseFloat(String(d.expectedContrastRatio || '4.5'));
      contrast = { fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio, needed: need, fontSize: d.fontSize, fontWeight: d.fontWeight, suggestion: nearestPassing(d.fgColor, d.bgColor, need) };
    }
  }
  const leverage = (IMPACT_W[i.impact] || 1) * i.pageCount + Math.log2(1 + i.instanceCount);
  return {
    ...i,
    title: e.title || doc?.title || i.help,
    rule: doc ? { title: doc.title, level: doc.level, wcag: doc.wcag, problem: doc.sections.problem, who: doc.sections.who, fix: doc.sections.fix, falsePositives: doc.sections.falsePositives, verify: doc.sections.verify, references: doc.sections.references } : null,
    enrichment: Object.keys(e).length ? e : null,
    contrast, leverage: Math.round(leverage * 100) / 100,
  };
});

const violations = issues.filter((i) => i.kind === 'violation');
const reviewIssues = issues.filter((i) => i.kind === 'review');

// Fix-first plan: from enrichment if given, else greedy by leverage.
let plan = Array.isArray(enrichment.plan) ? enrichment.plan.map((p) => ({ title: p.title, why: p.why || '', issues: (p.issues || []).filter((id) => knownIds.has(id)) })).filter((p) => p.issues.length) : null;
if (!plan || !plan.length) {
  // With no automated failures, the review queue is where the work is.
  const pool = violations.length ? violations : reviewIssues;
  plan = [...pool].sort((a, b) => b.leverage - a.leverage).slice(0, 6).map((i) => ({ title: i.title, why: '', issues: [i.id] }));
}
// Cumulative effect of the plan on pages passing automated checks.
const scannedPages = scan.pages.filter((p) => !p.error);
const failingByPage = Object.fromEntries(scannedPages.map((p) => [p.id, new Set(violations.filter((v) => v.pages.includes(p.id)).map((v) => v.id))]));
const fixed = new Set();
const cleanNow = scannedPages.filter((p) => failingByPage[p.id].size === 0).length;
for (const step of plan) {
  step.issues.forEach((id) => fixed.add(id));
  step.instances = step.issues.reduce((s, id) => s + (issues.find((x) => x.id === id)?.instanceCount || 0), 0);
  step.pages = new Set(step.issues.flatMap((id) => issues.find((x) => x.id === id)?.pages || [])).size;
  step.cleanAfter = scannedPages.filter((p) => [...failingByPage[p.id]].every((id) => fixed.has(id))).length;
}

// WCAG criteria in scope for the chosen standard, with an automated status.
const std = scan.meta.standard;
const levels = std.endsWith('aaa') ? ['A', 'AA', 'AAA'] : std.endsWith('aa') ? ['A', 'AA'] : ['A'];
const maxVersion = std.startsWith('wcag22') ? 2.2 : std.startsWith('wcag21') ? 2.1 : 2.0;
const passedRules = new Set(scan.pages.flatMap((p) => p.rules?.passed || []));
const failedRules = new Set(scan.pages.flatMap((p) => p.rules?.failed || []));
const inapplicableRules = new Set(scan.pages.flatMap((p) => p.rules?.inapplicable || []));
const criteria = wcag.filter((c) => levels.includes(c.level) && parseFloat(c.since) <= maxVersion).map((c) => {
  const failing = violations.filter((v) => v.wcag.includes(c.sc)).map((v) => v.id);
  const review = reviewIssues.filter((v) => v.wcag.includes(c.sc)).map((v) => v.id);
  const rules = c.axeRules || [];
  let status;
  if (failing.length) status = 'fail';
  else if (review.length) status = 'review';
  else if (rules.some((r) => passedRules.has(r) && !failedRules.has(r))) status = 'pass';
  else if (rules.length && rules.every((r) => inapplicableRules.has(r))) status = 'na';
  else status = 'manual';
  return { ...c, status, failing, review };
});

const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
violations.forEach((v) => { byImpact[v.impact] = (byImpact[v.impact] || 0) + 1; });
const instancesByImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
violations.forEach((v) => { instancesByImpact[v.impact] = (instancesByImpact[v.impact] || 0) + v.instanceCount; });

const summary = {
  pages: scan.pages.length, pagesScanned: scannedPages.length, pagesWithErrors: scan.pages.filter((p) => p.error).length,
  pagesClean: cleanNow, issues: violations.length, instances: violations.reduce((s, v) => s + v.instanceCount, 0),
  review: reviewIssues.length, byImpact, instancesByImpact,
  criteria: { total: criteria.length, fail: criteria.filter((c) => c.status === 'fail').length, review: criteria.filter((c) => c.status === 'review').length, pass: criteria.filter((c) => c.status === 'pass').length, manual: criteria.filter((c) => c.status === 'manual' || c.status === 'na').length },
};

function defaultNarrative() {
  if (!violations.length) return `No automated ${scan.meta.standardLabel} violations were found on the ${summary.pagesScanned} page(s) scanned. Automated tools only catch part of WCAG, so work through the manual checklist before calling the site conformant.`;
  const top = [...violations].sort((a, b) => b.pageCount - a.pageCount)[0];
  return `${summary.issues} distinct problems (${summary.instances} instances) were found across ${summary.pagesScanned - summary.pagesClean} of ${summary.pagesScanned} pages. The most widespread is "${top.title}", which appears on ${top.pageCount} page(s). Problems that repeat across pages usually live in a shared component, so fixing one place clears many instances.`;
}

const report = {
  schema: 'a11y-audit/report@1',
  generatedAt: new Date().toISOString(),
  title: opt('--title') || enrichment.title || `Accessibility audit: ${new URL(scan.meta.origin).host}`,
  meta: scan.meta,
  summary,
  narrative: enrichment.summary || defaultNarrative(),
  enriched: Boolean(Object.keys(enrichIssues).length),
  plan,
  pages: scan.pages.map((p) => ({ ...p, narrative: enrichment.pages?.[p.id] || null })),
  issues,
  criteria,
  skipped: scan.skipped,
};
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 1));

// ---------------------------------------------------------------- html view model
const mdFields = (o, keys) => { const r = {}; for (const k of keys) if (o?.[k]) r[k] = md(o[k]); return r; };
let imgCount = 0;
const img = (p) => {
  if (!p) return null;
  if (!inlineImages) return p;
  const abs = path.join(dir, p);
  if (!fs.existsSync(abs)) return null;
  imgCount++;
  const mime = p.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
};
const vm = {
  ...report,
  narrativeHtml: md(report.narrative),
  plan: plan.map((p) => ({ ...p, whyHtml: md(p.why) })),
  pages: report.pages.map((p) => ({ ...p, screenshot: img(p.screenshot), mobileScreenshot: img(p.mobileScreenshot) })),
  issues: issues.map((i) => ({
    ...i,
    instances: i.instances.map((x) => ({ ...x, screenshot: img(x.screenshot) })),
    ruleHtml: i.rule ? mdFields(i.rule, ['problem', 'who', 'fix', 'falsePositives', 'verify', 'references']) : null,
    enrichmentHtml: i.enrichment ? mdFields(i.enrichment, ['explanation', 'fix', 'where', 'verify']) : null,
  })),
};

const template = fs.readFileSync(path.join(skillDir, 'assets', 'report-template.html'), 'utf8');
const json = JSON.stringify(vm).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const html = template
  .replace('__REPORT_TITLE__', esc(report.title))
  .replace('"__REPORT_DATA__"', () => json);
fs.writeFileSync(path.join(dir, 'report.html'), html);
const size = fs.statSync(path.join(dir, 'report.html')).size;
console.log(`[a11y] Wrote ${path.join(dir, 'report.json')}`);
console.log(`[a11y] Wrote ${path.join(dir, 'report.html')} (${(size / 1024).toFixed(0)} KB${inlineImages ? `, ${imgCount} images inlined` : ''})`);
if (size > 15.5 * 1024 * 1024) warn('report.html is over 15.5 MB, too large to publish as an artifact. Rebuild without --inline-images or rescan with --no-screenshots.');
