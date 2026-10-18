#!/usr/bin/env node
// Check a built report: data integrity, then open report.html in Chromium, visit
// every view in light and dark at desktop and mobile widths, expand every issue,
// collect console errors, and run axe (WCAG 2.2 AA) on the report itself.
//
//   node check-report.mjs <scan-dir> [--shots <dir>]
//
// --shots saves a screenshot of each view so you can look at the rendered result.
// Exit code 1 when any ERROR is found.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');
const argv = process.argv.slice(2);
if (!argv[0]) { console.log('Usage: node check-report.mjs <scan-dir> [--shots <dir>]'); process.exit(2); }
const dir = path.resolve(argv[0]);
const shotsDir = argv.includes('--shots') ? path.resolve(argv[argv.indexOf('--shots') + 1]) : null;
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

const errors = []; const warns = [];
const E = (m) => errors.push(m); const W = (m) => warns.push(m);

// ---------------------------------------------------------------- data
const reportPath = path.join(dir, 'report.json');
const htmlPath = path.join(dir, 'report.html');
if (!fs.existsSync(reportPath)) E('report.json is missing');
if (!fs.existsSync(htmlPath)) E('report.html is missing');
let report = null;
if (!errors.length) {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (report.schema !== 'a11y-audit/report@1') E(`Unexpected schema ${report.schema}`);
  for (const k of ['meta', 'summary', 'pages', 'issues', 'criteria', 'plan']) if (!(k in report)) E(`report.json has no "${k}"`);
  const pageIds = new Set(report.pages.map((p) => p.id));
  const ids = new Set();
  for (const i of report.issues) {
    if (ids.has(i.id)) E(`Duplicate issue id ${i.id}`); ids.add(i.id);
    if (!i.instances?.length) E(`${i.id} has no instances`);
    for (const x of i.instances) {
      if (!pageIds.has(x.page)) E(`${i.id} references unknown page ${x.page}`);
      if (x.screenshot && !fs.existsSync(path.join(dir, x.screenshot))) E(`Missing screenshot ${x.screenshot}`);
    }
    if (!i.rule && i.source === 'axe') W(`${i.ruleId} has no rule doc, so ${i.id} shows only axe's one-line help`);
    if (i.kind === 'violation' && !i.enrichment && (i.impact === 'critical' || i.impact === 'serious')) W(`${i.id} (${i.ruleId}, ${i.impact}) has no tailored enrichment`);
  }
  for (const p of report.plan) for (const id of p.issues) if (!ids.has(id)) E(`Plan step "${p.title}" references unknown issue ${id}`);
  for (const p of report.pages) for (const k of ['screenshot', 'mobileScreenshot']) if (p[k] && !fs.existsSync(path.join(dir, p[k]))) E(`Missing screenshot ${p[k]}`);
  const size = fs.statSync(htmlPath).size;
  if (size > 15.5 * 1024 * 1024) W(`report.html is ${(size / 1048576).toFixed(1)} MB, too big to publish as an artifact`);
}

// ---------------------------------------------------------------- browser
if (report) {
  const browser = await chromium.launch();
  const url = pathToFileURL(htmlPath).href;
  const routes = ['overview', 'issues', 'pages', 'review', 'checklist', ...report.pages.slice(0, 3).map((p) => `page/${p.id}`)];
  const combos = [
    { name: 'desktop-light', viewport: { width: 1366, height: 900 }, scheme: 'light' },
    { name: 'desktop-dark', viewport: { width: 1366, height: 900 }, scheme: 'dark' },
    { name: 'mobile-light', viewport: { width: 390, height: 844 }, scheme: 'light' },
  ];
  const seenAxe = new Set();
  for (const c of combos) {
    const ctx = await browser.newContext({ viewport: c.viewport, colorScheme: c.scheme });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) E(`[${c.name}] console error: ${m.text()}`); });
    page.on('pageerror', (e) => E(`[${c.name}] page error: ${e.message}`));
    await page.goto(`${url}#/overview`);
    await page.waitForTimeout(300);
    for (const r of routes) {
      await page.evaluate((h) => { location.hash = `#/${h}`; }, r);
      await page.waitForTimeout(150);
      if (r === 'issues' || r === 'review') {
        // Expand every issue so their bodies render and get audited.
        await page.evaluate(() => document.querySelectorAll('details.issue').forEach((d) => { d.open = true; }));
        await page.waitForTimeout(200);
        const empty = await page.evaluate(() => [...document.querySelectorAll('details.issue')].filter((d) => !d.querySelector('.issue-body')?.dataset.ready).length);
        if (empty) E(`[${c.name}] ${empty} issue(s) on #/${r} did not render their details`);
      }
      const h1 = await page.locator('main h1').first().textContent().catch(() => null);
      if (!h1) E(`[${c.name}] #/${r} has no h1`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) E(`[${c.name}] #/${r} scrolls sideways by ${overflow}px`);
      await page.addScriptTag({ path: AXE_PATH }).catch(() => {});
      const res = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        const out = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'] });
        return out.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, target: v.nodes[0]?.target?.join(' '), html: v.nodes[0]?.html?.slice(0, 160) }));
      });
      for (const v of res) {
        // The contrast demo intentionally renders the site's failing colors.
        if (v.id === 'color-contrast' && /class="sample"/.test(v.html || '')) continue;
        const key = `${v.id}|${v.target}`;
        if (seenAxe.has(key)) continue; seenAxe.add(key);
        (v.impact === 'minor' ? W : E)(`[${c.name}] #/${r} axe ${v.id} (${v.impact}, ${v.n} nodes) e.g. ${v.target}: ${v.html}`);
      }
      if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `${c.name}-${r.replace('/', '-')}.png`), fullPage: false });
    }
    if (c.name === 'desktop-light') {
      // Deep links: every plan step and a sample of issues must open their issue.
      const linkIds = [...new Set([...report.plan.flatMap((p) => p.issues), ...report.issues.slice(0, 25).map((i) => i.id)])];
      for (const id of linkIds) {
        await page.evaluate((h) => { location.hash = h; }, `#/issue/${id}`);
        await page.waitForTimeout(60);
        const open = await page.evaluate((iid) => { const d = document.getElementById(`issue-${iid}`); return Boolean(d && d.open && d.querySelector('.issue-body')?.dataset.ready); }, id);
        if (!open) E(`[${c.name}] link #/issue/${id} does not open that issue`);
      }
    }
    await ctx.close();
  }
  await browser.close();
}

for (const w of warns) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`${errors.length} error(s), ${warns.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
