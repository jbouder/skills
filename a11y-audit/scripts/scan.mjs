#!/usr/bin/env node
// a11y-audit scanner: crawl (or take a URL list), scan each page with axe-core at
// desktop and mobile widths, run keyboard-focus and reflow heuristics, capture
// highlighted element screenshots, and group repeated instances into issues.
//
// Usage: node scan.mjs <url> [<url> ...] [options]
//        node scan.mjs urls.txt [options]
// Run with --help for options.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');
const AXE_VERSION = require('axe-core/package.json').version;

// ---------------------------------------------------------------- arguments

const HELP = `a11y-audit scanner

  node scan.mjs <url> [<url> ...] [options]
  node scan.mjs urls.txt [options]

One URL crawls the site from it. Several URLs (or a file with one per line)
scans exactly those pages.

Options
  --out <dir>            Output folder (default ./a11y-report-<host>-<timestamp>)
  --standard <s>         wcag22aa (default) | wcag21aa | wcag2aa | wcag22a | wcag22aaa
  --best-practices       Also run axe best-practice rules
  --no-crawl             Scan only the given URL(s), even if there is just one
  --max-pages <n>        Crawl page cap (default 50)
  --max-depth <n>        Crawl link depth cap (default 6)
  --per-template <n>     Max pages per URL pattern like /items/:id (default 3)
  --include <regex>      Only crawl URLs matching this
  --exclude <regex>      Never visit URLs matching this (added to the built-in
                         skip list for logout, delete and similar links)
  --viewports <list>     desktop,mobile (default both)
  --login                Open a browser window to log in before scanning
  --login-url <url>      Page to open for --login (default: first URL)
  --session <file>       Reuse a saved login session and save new ones there
  --headed               Run the whole scan in a visible browser
  --no-keyboard          Skip keyboard focus checks
  --no-reflow            Skip the 320px reflow check
  --no-screenshots       Skip screenshots
  --concurrency <n>      Pages scanned in parallel (default 4, max 16; alias -j)
  --wait <ms>            Extra settle time after each page load (default 500)
  --timeout <ms>         Navigation timeout (default 30000)
  --login-timeout <s>    How long to wait for a manual login (default 600)
`;

function parseArgs(argv) {
  const o = {
    urls: [], out: null, standard: 'wcag22aa', bestPractices: false, crawl: null,
    maxPages: 50, maxDepth: 6, perTemplate: 3, include: null, exclude: null,
    viewports: ['desktop', 'mobile'], login: false, loginUrl: null, session: null,
    headed: false, keyboard: true, reflow: true, screenshots: true, wait: 500,
    timeout: 30000, loginTimeout: 600, concurrency: 4,
  };
  const need = (i) => { if (i + 1 >= argv.length) die(`Missing value for ${argv[i]}`); return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h': case '--help': console.log(HELP); process.exit(0);
      case '--out': o.out = need(i); i++; break;
      case '--standard': o.standard = need(i).toLowerCase().replace(/[\s.-]/g, ''); i++; break;
      case '--best-practices': o.bestPractices = true; break;
      case '--no-crawl': o.crawl = false; break;
      case '--crawl': o.crawl = true; break;
      case '--max-pages': o.maxPages = +need(i); i++; break;
      case '--max-depth': o.maxDepth = +need(i); i++; break;
      case '--per-template': o.perTemplate = +need(i); i++; break;
      case '--include': o.include = new RegExp(need(i)); i++; break;
      case '--exclude': o.exclude = new RegExp(need(i)); i++; break;
      case '--viewports': o.viewports = need(i).split(',').map((s) => s.trim()).filter(Boolean); i++; break;
      case '--login': o.login = true; break;
      case '--login-url': o.loginUrl = need(i); o.login = true; i++; break;
      case '--session': o.session = need(i); i++; break;
      case '--headed': o.headed = true; break;
      case '--no-keyboard': o.keyboard = false; break;
      case '--no-reflow': o.reflow = false; break;
      case '--no-screenshots': o.screenshots = false; break;
      case '--wait': o.wait = +need(i); i++; break;
      case '--timeout': o.timeout = +need(i); i++; break;
      case '--login-timeout': o.loginTimeout = +need(i); i++; break;
      case '-j': case '--concurrency': o.concurrency = Math.max(1, Math.min(16, +need(i) || 1)); i++; break;
      default:
        if (a.startsWith('--')) die(`Unknown option ${a}\n\n${HELP}`);
        o.urls.push(a);
    }
  }
  // A positional arg that is an existing file is a URL list.
  o.urls = o.urls.flatMap((u) => {
    if (!/^https?:\/\//i.test(u) && fs.existsSync(u) && fs.statSync(u).isFile()) {
      return fs.readFileSync(u, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    }
    return [u];
  }).map((u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`));
  if (!o.urls.length) die(`No URL given.\n\n${HELP}`);
  for (const u of o.urls) { try { new URL(u); } catch { die(`Not a valid URL: ${u}`); } }
  if (o.crawl === null) o.crawl = o.urls.length === 1;
  for (const v of o.viewports) if (!VIEWPORTS[v]) die(`Unknown viewport ${v} (use desktop, mobile)`);
  if (!STANDARDS[o.standard]) die(`Unknown standard ${o.standard} (use ${Object.keys(STANDARDS).join(', ')})`);
  return o;
}

function die(msg) { console.error(`[a11y] ERROR ${msg}`); process.exit(2); }
const log = (msg) => console.log(`[a11y] ${msg}`);

// ---------------------------------------------------------------- constants

const STANDARDS = {
  wcag2a: { label: 'WCAG 2.0 A', tags: ['wcag2a'] },
  wcag2aa: { label: 'WCAG 2.0 AA', tags: ['wcag2a', 'wcag2aa'] },
  wcag21a: { label: 'WCAG 2.1 A', tags: ['wcag2a', 'wcag21a'] },
  wcag21aa: { label: 'WCAG 2.1 AA', tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  wcag22a: { label: 'WCAG 2.2 A', tags: ['wcag2a', 'wcag21a'] },
  wcag22aa: { label: 'WCAG 2.2 AA', tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  wcag22aaa: { label: 'WCAG 2.2 AAA', tags: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa', 'wcag22aa', 'wcag22aaa'] },
};

const VIEWPORTS = {
  desktop: { width: 1366, height: 900 },
  mobile: { width: 390, height: 844 },
};

const LOGIN_PATH_RE = /(^|[\/_.-])(login|log-in|signin|sign-in|sign_in|auth|sso|oauth2?|authorize|saml|session\/new|accounts\/login)([\/_.?-]|$)/i;
const SKIP_RE = /(^|[\/_.?=&-])(logout|log-out|signout|sign-out|sign_out|logoff|delete|destroy|remove|unsubscribe|deactivate|revoke|reset-password)([\/_.?=&-]|$)/i;
const NON_HTML_RE = /\.(pdf|zip|gz|tgz|rar|7z|dmg|exe|msi|pkg|png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mov|mp3|wav|ogg|csv|xlsx?|docx?|pptx?|json|xml|txt|woff2?|ttf|css|js|map)$/i;
const TRACKING_PARAMS = /^(utm_\w+|fbclid|gclid|msclkid|mc_cid|mc_eid|_ga|ref|ref_src)$/i;
const IMPACT_ORDER = { critical: 4, serious: 3, moderate: 2, minor: 1 };

// ---------------------------------------------------------------- url helpers

function normalizeUrl(raw, base) {
  let u;
  try { u = new URL(raw, base); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  // Keep hash-router fragments (#/route, #!/route); drop plain anchors.
  if (!/^#!?\//.test(u.hash)) u.hash = '';
  const params = [...u.searchParams.entries()].filter(([k]) => !TRACKING_PARAMS.test(k)).sort(([a], [b]) => a.localeCompare(b));
  u.search = params.length ? `?${new URLSearchParams(params)}` : '';
  if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
  return u.toString();
}

function templateOf(url) {
  const u = new URL(url);
  const seg = (s) => {
    if (/^\d+$/.test(s)) return ':n';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return ':uuid';
    if (/^[0-9a-f]{12,}$/i.test(s)) return ':hash';
    if (/\d/.test(s) && s.length > 8 && /[-_]/.test(s)) return ':slug';
    return s;
  };
  const p = u.pathname.split('/').map(seg).join('/');
  const h = u.hash ? u.hash.split('/').map(seg).join('/') : '';
  const q = [...u.searchParams.keys()].sort().join('&');
  return `${p}${q ? `?${q}` : ''}${h}`;
}

const shortHash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

// ---------------------------------------------------------------- grouping

// Generated class names (CSS modules, styled-components, emotion) carry a hash with a digit.
const UNSTABLE_CLASS = /^(css|sc|jsx|emotion|svelte|astro|tw|chakra|mui|Mui\w*|ng-tns|ng-star|_|\d)|[_-](?=[a-z]*\d)[a-z0-9]{5,}$|\d{2,}/i;

function htmlShape(html) {
  const m = /^<\s*([a-z][a-z0-9-]*)([^>]*)>/i.exec(html || '');
  if (!m) return (html || '').slice(0, 40);
  const tag = m[1].toLowerCase();
  const attrs = m[2];
  const get = (name) => { const r = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attrs); return r ? (r[2] ?? r[3] ?? r[4] ?? '') : null; };
  const classes = (get('class') || '').split(/\s+/).filter((c) => c && !UNSTABLE_CLASS.test(c)).sort().slice(0, 4);
  const role = get('role');
  const type = get('type');
  let s = tag;
  if (role) s += `[role=${role}]`;
  if (type) s += `[type=${type}]`;
  if (classes.length) s += `.${classes.join('.')}`;
  return s;
}

function normSelector(sel) {
  return String(sel)
    .replace(/:nth-(child|of-type)\(\d+\)/g, '')
    .replace(/#[\w-]*\d[\w-]*/g, '#*')
    .replace(/\d+/g, '#')
    .split(/\s*>\s*|\s+/).slice(-2).join(' > ');
}

function groupKey(ruleId, node, ctx) {
  if (ruleId === 'color-contrast' || ruleId === 'color-contrast-enhanced') {
    const d = (node.any?.[0] || node.all?.[0] || node.none?.[0])?.data || {};
    if (d.fgColor && d.bgColor) return `${ruleId}|${d.fgColor}|${d.bgColor}|${d.expectedContrastRatio || ''}`;
  }
  const shape = htmlShape(node.html);
  const hasClass = shape.includes('.');
  if (hasClass) return `${ruleId}|${shape}`;
  // No stable class: group by structural context (nearest landmark, id or classed
  // container) so a template's images or links form one issue, not one per element.
  return `${ruleId}|${shape}|${ctx || normSelector(targetString(node.target))}`;
}

function targetString(target) {
  if (!Array.isArray(target)) return String(target);
  return target.map((t) => (Array.isArray(t) ? t.join(' >> ') : t)).join(' |iframe| ');
}

// ---------------------------------------------------------------- page helpers

async function settle(page, extraWait) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  // Wait until the DOM stops changing for 400ms (max 5s), for client-rendered apps.
  await page.evaluate(() => new Promise((resolve) => {
    let timer; const done = () => { obs.disconnect(); resolve(); };
    const obs = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(done, 400); });
    obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    timer = setTimeout(done, 400);
    setTimeout(done, 5000);
  })).catch(() => {});
  if (extraWait) await page.waitForTimeout(extraWait);
}

async function looksLikeLogin(page, response, requestedUrl, targetOrigin, explicit = false) {
  const status = response?.status?.() ?? 0;
  const reqPath = new URL(requestedUrl).pathname + new URL(requestedUrl).hash;
  const requestedIsLogin = LOGIN_PATH_RE.test(reqPath);
  if (status === 401 || status === 403) return { login: true, reason: `HTTP ${status}` };
  let final;
  try { final = new URL(page.url()); } catch { return { login: false }; }
  if (requestedIsLogin) return { login: false };
  if (final.origin !== targetOrigin && LOGIN_PATH_RE.test(final.pathname + final.search)) return { login: true, reason: `redirected to ${final.host}` };
  if (LOGIN_PATH_RE.test(final.pathname + final.hash)) return { login: true, reason: `redirected to ${final.pathname}` };
  // A URL the user listed on purpose that shows a sign-in form without
  // redirecting is the page they want audited, not a login wall.
  if (explicit && normalizeUrl(final.href) === normalizeUrl(requestedUrl)) return { login: false };
  const pw = await page.locator('input[type=password]').first().isVisible().catch(() => false);
  if (pw) return { login: true, reason: 'page shows a password field' };
  return { login: false };
}

async function injectAxe(page) {
  const has = await page.evaluate(() => typeof window.axe !== 'undefined').catch(() => false);
  if (!has) await page.addScriptTag({ path: AXE_PATH });
}

async function runAxe(page, tags) {
  await injectAxe(page);
  return page.evaluate(async (runTags) => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, {
      runOnly: { type: 'tag', values: runTags },
      rules: Object.fromEntries(axe.getRules(['experimental']).filter((r) => r.ruleId !== 'hidden-content' && r.tags.some((t) => runTags.includes(t))).map((r) => [r.ruleId, { enabled: true }])),
      resultTypes: ['violations', 'incomplete'],
      iframes: true,
    });
    const slim = (list) => list.map((v) => ({
      id: v.id, impact: v.impact, help: v.help, description: v.description, helpUrl: v.helpUrl, tags: v.tags,
      nodes: v.nodes.map((n) => ({
        target: n.target, html: n.html, impact: n.impact, failureSummary: n.failureSummary,
        any: n.any.map((c) => ({ id: c.id, message: c.message, data: c.data })),
        all: n.all.map((c) => ({ id: c.id, message: c.message, data: c.data })),
        none: n.none.map((c) => ({ id: c.id, message: c.message, data: c.data })),
      })),
    }));
    return {
      violations: slim(r.violations), incomplete: slim(r.incomplete),
      passes: r.passes.map((p) => p.id), inapplicable: r.inapplicable.map((p) => p.id),
    };
  }, tags);
}

function locatorFor(page, target) {
  if (!Array.isArray(target) || !target.length) return null;
  let scope = page;
  for (let i = 0; i < target.length - 1; i++) {
    const t = target[i];
    scope = scope.frameLocator(Array.isArray(t) ? t.join(' >> ') : t);
  }
  const last = target[target.length - 1];
  return scope.locator(Array.isArray(last) ? last.join(' >> ') : last).first();
}

// Screenshot an element with a highlight ring drawn in an overlay (the element
// itself is never restyled, so colors and layout stay exactly as audited).
async function shootElement(page, locator, file, vp) {
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 2000 });
    let box = await locator.boundingBox({ timeout: 2000 });
    if (!box || box.width < 1 || box.height < 1) return false;
    // Wide block elements (a full-width paragraph) give an unreadable sliver;
    // frame the text they contain instead.
    if (box.width > 420) {
      const text = await locator.evaluate((el) => {
        const r = document.createRange(); r.selectNodeContents(el);
        const b = r.getBoundingClientRect();
        return b.width > 0 && b.height > 0 ? { x: b.left, y: b.top, width: b.width, height: b.height } : null;
      }).catch(() => null);
      if (text && text.width < box.width * 0.7) box = { x: text.x, y: text.y, width: Math.min(text.width, 700), height: text.height };
    }
    return await shootBox(page, box, file, vp);
  } catch { return false; }
}

async function shootBox(page, box, file, vp, pad = 40) {
  const ring = { x: box.x - 4, y: box.y - 4, w: box.width + 8, h: box.height + 8 };
  await page.evaluate((r) => {
    const d = document.createElement('div');
    d.id = '__a11y_audit_ring__';
    d.style.cssText = `position:fixed;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;border:3px solid #e5157a;border-radius:4px;box-shadow:0 0 0 2px #fff,0 0 0 9999px rgba(0,0,0,.08);pointer-events:none;z-index:2147483647;`;
    document.documentElement.appendChild(d);
  }, ring);
  // Fixed-size window around the element, slid (not cut) to stay inside the viewport.
  const w = Math.min(vp.width, Math.ceil(box.width + pad * 2), 1100);
  const h = Math.min(vp.height, Math.ceil(box.height + pad * 2), 560);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const x = clamp(Math.floor(box.x - pad), 0, vp.width - w);
  const y = clamp(Math.floor(box.y - pad), 0, vp.height - h);
  let ok = false;
  if (w > 4 && h > 4) {
    const buf = await page.screenshot({ clip: { x, y, width: w, height: h }, animations: 'disabled' }).catch(() => null);
    if (buf) { ok = file ? (fs.writeFileSync(file, buf), true) : buf; }
  }
  await page.evaluate(() => document.getElementById('__a11y_audit_ring__')?.remove()).catch(() => {});
  return ok;
}

// ---------------------------------------------------------------- heuristics

// Tab through the page. For each newly seen focus target, compare a screenshot
// while focused with one after blur: identical pixels means no visible focus
// indicator (2.4.7). Also sample whether the focused element is entirely covered
// by another element such as a sticky header or cookie banner (2.4.11), and flag
// focus that does not move after repeated Tab presses (2.1.2).
async function keyboardChecks(page, vp, seen, opts, encountered = []) {
  const findings = [];
  const maxStops = 40;
  await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur?.(); });
  await page.locator('body').click({ position: { x: 1, y: 1 }, force: true, timeout: 2000 }).catch(() => {});
  let prevKey = null; let sameCount = 0;
  for (let i = 0; i < maxStops; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(120);
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (el.tagName === 'IFRAME') return { iframe: true };
      const r = el.getBoundingClientRect();
      const cssPath = (node) => {
        const parts = [];
        while (node && node.nodeType === 1 && parts.length < 5) {
          if (node.id && !/\d{3,}/.test(node.id)) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
          let p = node.tagName.toLowerCase();
          const parent = node.parentElement;
          if (parent) {
            const same = [...parent.children].filter((c) => c.tagName === node.tagName);
            if (same.length > 1) p += `:nth-of-type(${same.indexOf(node) + 1})`;
          }
          parts.unshift(p); node = parent;
        }
        return parts.join(' > ');
      };
      // Sample points inside the element; if every visible point hits something
      // outside it, the element is entirely obscured.
      const pts = [[0.5, 0.5], [0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]];
      let inView = 0; let covered = 0; let coverer = null;
      for (const [fx, fy] of pts) {
        const x = r.left + r.width * fx; const y = r.top + r.height * fy;
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        inView++;
        const hit = document.elementFromPoint(x, y);
        if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) { covered++; coverer = coverer || hit; }
      }
      const outer = el.outerHTML;
      const open = outer.slice(0, outer.indexOf('>') + 1);
      const text = (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 60);
      return {
        selector: cssPath(el), html: open.length < 400 ? (outer.length < 400 ? outer : `${open}…`) : `${open.slice(0, 400)}…`,
        key: `${el.tagName}|${el.className && typeof el.className === 'string' ? el.className : ''}|${text}`,
        box: { x: r.left, y: r.top, width: r.width, height: r.height },
        visible: r.width > 0 && r.height > 0,
        obscured: inView > 0 && covered === inView,
        cover: coverer ? (coverer.outerHTML.slice(0, coverer.outerHTML.indexOf('>') + 1)).slice(0, 300) : null,
      };
    }).catch(() => null);
    if (!info) { if (i > 2) break; continue; }
    if (info.iframe) continue;
    if (info.key === prevKey) { sameCount++; } else { sameCount = 0; }
    if (sameCount >= 3) {
      findings.push({ check: 'keyboard-trap', selector: info.selector, html: info.html, message: 'Focus did not move after pressing Tab four times in a row. Keyboard users may be stuck on this element.' });
      break;
    }
    prevKey = info.key;
    encountered.push(info.key);
    if (seen.has(info.key) || !info.visible) continue;
    seen.add(info.key);

    if (info.obscured) {
      const f = { key: info.key, check: 'focus-not-obscured', selector: info.selector, html: info.html, box: info.box, message: `When this element receives keyboard focus, it is completely hidden behind another element${info.cover ? ` (${info.cover})` : ''}.`, data: { coveredBy: info.cover } };
      if (opts.screenshots) f.shot = await shootBox(page, info.box, null, vp, 220).catch(() => null) || undefined;
      findings.push(f);
    }
    // Pixel comparison of focused vs. blurred state.
    const pad = 8;
    const clip = {
      x: Math.max(0, info.box.x - pad), y: Math.max(0, info.box.y - pad),
      width: Math.min(vp.width, info.box.width + pad * 2), height: Math.min(vp.height, info.box.height + pad * 2),
    };
    clip.width = Math.min(clip.width, vp.width - clip.x); clip.height = Math.min(clip.height, vp.height - clip.y);
    if (clip.width < 2 || clip.height < 2 || info.obscured) continue;
    const focused = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' }).catch(() => null);
    const restore = await page.evaluate(() => { const el = document.activeElement; window.__a11yFocused = el; el.blur(); return true; }).catch(() => false);
    if (!restore || !focused) continue;
    await page.waitForTimeout(80);
    const blurred = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' }).catch(() => null);
    await page.evaluate(() => window.__a11yFocused?.focus({ preventScroll: true })).catch(() => {});
    if (blurred && focused.equals(blurred)) {
      const f = { key: info.key, check: 'focus-visible', selector: info.selector, html: info.html, box: info.box, message: 'Nothing visibly changes when this element receives keyboard focus, so keyboard users cannot tell where they are.' };
      if (opts.screenshots) f.shot = await shootBox(page, info.box, null, vp).catch(() => null) || undefined;
      findings.push(f);
    }
  }
  return findings;
}

// At 320 CSS px, content should not need horizontal scrolling (1.4.10).
async function reflowCheck(page) {
  return page.evaluate(() => {
    const doc = document.scrollingElement || document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    if (overflow <= 2) return null;
    const vw = doc.clientWidth;
    const exempt = (el) => el.closest('table, pre, code, canvas, video, [role=grid], [role=application], math, svg, iframe');
    const scrollsItself = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if ((ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') && p.clientWidth <= vw) return true;
      }
      return false;
    };
    const offenders = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= vw + 2) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (exempt(el) || scrollsItself(el)) continue;
      // Keep the outermost offenders only.
      if (offenders.some((o) => o.el.contains(el))) continue;
      offenders.push({ el, right: Math.round(r.right) });
      if (offenders.length >= 5) break;
    }
    if (!offenders.length) return null;
    return {
      overflow,
      offenders: offenders.map(({ el, right }) => {
        const open = el.outerHTML.slice(0, el.outerHTML.indexOf('>') + 1).slice(0, 300);
        let sel = el.tagName.toLowerCase();
        if (el.id) sel += `#${el.id}`; else if (typeof el.className === 'string' && el.className.trim()) sel += `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`;
        return { selector: sel, html: open, right };
      }),
    };
  }).catch(() => null);
}

// ---------------------------------------------------------------- login

async function waitForEnterOrFile(sentinel, signal) {
  return new Promise((resolve) => {
    let rl = null;
    if (process.stdin.isTTY) {
      rl = readline.createInterface({ input: process.stdin });
      rl.on('line', () => resolve('enter'));
    }
    const t = setInterval(() => { if (fs.existsSync(sentinel)) { fs.rmSync(sentinel, { force: true }); resolve('file'); } }, 500);
    signal.finally = () => { clearInterval(t); rl?.close(); };
  });
}

async function interactiveLogin(state, url, reason) {
  const { opts, targetOrigin } = state;
  const sentinel = path.join(state.outDir, 'LOGIN_DONE');
  log(`LOGIN REQUIRED (${reason}).`);
  log(`A browser window is opening at ${url}. Log in there.`);
  log(`The scan resumes automatically once you are signed in. To resume manually, press Enter here or create the file ${sentinel}`);
  const headed = await chromium.launch({ headless: false });
  const ctx = await headed.newContext({ viewport: VIEWPORTS.desktop, storageState: state.storageState || undefined, bypassCSP: true });
  await ctx.addInitScript(() => {
    const show = () => {
      if (document.getElementById('__a11y_login_banner__') || !document.body) return;
      const host = document.createElement('div');
      host.id = '__a11y_login_banner__';
      host.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483647;pointer-events:none;';
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = '<div style="font:500 14px/1.4 system-ui,sans-serif;background:#1b1530;color:#fff;padding:10px 16px;border-radius:999px;box-shadow:0 6px 24px rgba(0,0,0,.25)">a11y-audit is waiting for you to sign in. Scanning resumes automatically.</div>';
      document.body.appendChild(host);
    };
    document.addEventListener('DOMContentLoaded', show); setTimeout(show, 500);
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeout }).catch(() => {});
  const ctl = {};
  let manual = false;
  waitForEnterOrFile(sentinel, ctl).then(() => { manual = true; });
  const deadline = Date.now() + opts.loginTimeout * 1000;
  let stable = 0; let lastState = null; let closed = false;
  headed.on('disconnected', () => { closed = true; });
  while (Date.now() < deadline && !manual && !closed) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      lastState = await ctx.storageState({ indexedDB: true });
      const pages = ctx.pages();
      const p = pages.find((pg) => { try { return new URL(pg.url()).origin === targetOrigin; } catch { return false; } }) || pages[0];
      if (!p) break;
      const cur = new URL(p.url());
      const onTarget = cur.origin === targetOrigin && !LOGIN_PATH_RE.test(cur.pathname + cur.hash);
      const pw = onTarget ? await p.locator('input[type=password]').first().isVisible().catch(() => false) : true;
      stable = onTarget && !pw ? stable + 1 : 0;
      if (stable >= 3) break;
    } catch { /* page navigating */ }
  }
  ctl.finally?.();
  if (!closed) {
    try { lastState = await ctx.storageState({ indexedDB: true }); } catch { /* keep last */ }
    await headed.close().catch(() => {});
  }
  if (Date.now() >= deadline) log('Login wait timed out. Continuing with whatever session exists.');
  if (lastState) {
    state.storageState = lastState;
    const file = opts.session || path.join(state.outDir, 'session.json');
    fs.writeFileSync(file, JSON.stringify(lastState));
    state.sessionFile = file;
    log(`Login captured. Session saved to ${file} (it holds auth cookies: keep it private, delete it when done).`);
  }
  state.logins++;
}

// ---------------------------------------------------------------- main

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const first = new URL(opts.urls[0]);
  const targetOrigin = first.origin;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
  const outDir = path.resolve(opts.out || `a11y-report-${first.hostname}-${stamp}`);
  const shotDir = path.join(outDir, 'screenshots');
  fs.mkdirSync(shotDir, { recursive: true });

  const tags = [...STANDARDS[opts.standard].tags, ...(opts.bestPractices ? ['best-practice'] : [])];
  const state = { opts, targetOrigin, outDir, storageState: null, sessionFile: null, logins: 0 };
  if (opts.session && fs.existsSync(opts.session)) {
    state.storageState = JSON.parse(fs.readFileSync(opts.session, 'utf8'));
    log(`Using saved session ${opts.session}`);
  }

  log(`Standard: ${STANDARDS[opts.standard].label}${opts.bestPractices ? ' + best practices' : ''}. Mode: ${opts.crawl ? `crawl (max ${opts.maxPages} pages)` : `${opts.urls.length} listed page(s)`}. Output: ${outDir}`);

  if (opts.login) await interactiveLogin(state, opts.loginUrl || opts.urls[0], '--login requested');

  const browser = await chromium.launch({ headless: !opts.headed });
  const newContext = async () => {
    const c = await browser.newContext({ viewport: VIEWPORTS.desktop, deviceScaleFactor: 2, storageState: state.storageState || undefined, bypassCSP: true, ignoreHTTPSErrors: true });
    c.setDefaultTimeout(opts.timeout);
    return c;
  };
  let context = await newContext();
  // One login at a time: the first worker to hit a login wall opens the browser
  // window; the others wait on the same gate, then retry with the new session.
  let loginGate = null; let loginGen = 0;
  const login = (url, reason) => {
    if (!loginGate) {
      loginGate = (async () => {
        await interactiveLogin(state, url, reason);
        const old = context; context = await newContext(); loginGen++;
        setTimeout(() => old.close().catch(() => {}), 60000);
      })().finally(() => { loginGate = null; });
    }
    return loginGate;
  };

  const queue = opts.urls.map((u) => ({ url: normalizeUrl(u), depth: 0, from: null }));
  const queued = new Set(queue.map((q) => q.url));
  const templates = new Map();
  const pages = [];
  const nodesByKey = new Map(); // groupKey -> { kind, rule meta, instances[] }
  const shotsPerKey = new Map();
  const focusSeen = new Set();
  const focusFirstPage = new Map(); // focus key -> first page (by id) whose tab order contains it
  const pageNum = (pid) => +pid.slice(1);
  const skipped = [];
  const started = Date.now();

  const recordNodes = async (page, pageRec, kind, list, vpName, vp) => {
    for (const rule of list) {
      const ctxs = await page.evaluate((targets) => targets.map((t) => {
        if (!t) return null;
        let el; try { el = document.querySelector(t); } catch { return null; }
        const unstable = /^(css|sc|jsx|emotion|svelte|astro|tw|chakra|mui|ng-)|[_-](?=[a-z]*\d)[a-z0-9]{5,}$|\d{2,}/i;
        for (let p = el?.parentElement, depth = 0; p && p !== document.body && depth < 8; p = p.parentElement, depth++) {
          const tag = p.tagName.toLowerCase();
          if (p.id && !/\d{3,}/.test(p.id)) return `${tag}#${p.id}`;
          if (['header', 'nav', 'main', 'footer', 'aside', 'form', 'dialog'].includes(tag) || p.getAttribute('role')) return p.getAttribute('role') ? `[role=${p.getAttribute('role')}]` : tag;
          const cls = typeof p.className === 'string' ? p.className.split(/\s+/).filter((c) => c && !unstable.test(c)) : [];
          if (cls.length) return `${tag}.${cls.slice(0, 2).join('.')}`;
        }
        return 'body';
      }), rule.nodes.map((n) => (n.target.length === 1 && !Array.isArray(n.target[0]) ? n.target[0] : null))).catch(() => []);
      for (const [ni, node] of rule.nodes.entries()) {
        const key = `${kind}|${groupKey(rule.id, node, ctxs[ni])}`;
        let g = nodesByKey.get(key);
        if (!g) {
          g = { key, kind, context: htmlShape(node.html).includes('.') ? null : (ctxs[ni] || null), ruleId: rule.id, source: 'axe', impact: rule.impact, help: rule.help, description: rule.description, helpUrl: rule.helpUrl, tags: rule.tags, instances: [] };
          nodesByKey.set(key, g);
        }
        if (IMPACT_ORDER[node.impact] > (IMPACT_ORDER[g.impact] || 0)) g.impact = node.impact;
        const target = targetString(node.target);
        const existing = g.instances.find((i) => i.page === pageRec.id && i.target === target);
        if (existing) { if (!existing.viewports.includes(vpName)) existing.viewports.push(vpName); continue; }
        const inst = {
          page: pageRec.id, target, html: node.html, viewports: [vpName], failureSummary: node.failureSummary,
          checks: [...node.any, ...node.all, ...node.none].filter((c) => c.message).map((c) => ({ id: c.id, message: c.message, data: c.data ?? null })),
        };
        const n = shotsPerKey.get(key) || 0;
        if (opts.screenshots && n < 4 && node.target.length === 1) {
          const file = `screenshots/${pageRec.id}-${shortHash(key + target + vpName)}.png`;
          const loc = locatorFor(page, node.target);
          if (loc && await shootElement(page, loc, path.join(outDir, file), vp)) { inst.screenshot = file; shotsPerKey.set(key, n + 1); }
        }
        g.instances.push(inst);
      }
    }
  };

  const recordCustom = (pageRec, check, f, extra = {}) => {
    const key = `review|custom:${check}|${htmlShape(f.html)}|${htmlShape(f.html).includes('.') ? '' : normSelector(f.selector)}`;
    let g = nodesByKey.get(key);
    if (!g) {
      g = { key, kind: 'review', ruleId: check, source: 'heuristic', impact: CUSTOM[check].impact, help: CUSTOM[check].help, description: CUSTOM[check].description, helpUrl: CUSTOM[check].helpUrl, tags: CUSTOM[check].tags, instances: [] };
      nodesByKey.set(key, g);
    }
    g.instances.push({ focusKey: f.key, page: pageRec.id, target: f.selector, html: f.html, viewports: [extra.viewport || 'desktop'], failureSummary: f.message, checks: [{ id: check, message: f.message, data: f.data || null }], screenshot: extra.screenshot });
  };

  const scanOne = async (item, pageRec, total) => {
    const { id } = pageRec;
    log(`[${id.slice(1)}/${total}] ${item.url}`);
    const t0 = Date.now();
    const gen = loginGen;
    let page = await context.newPage();
    try {
      let resp = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: opts.timeout });
      await settle(page, opts.wait);
      let auth = await looksLikeLogin(page, resp, item.url, targetOrigin, item.depth === 0 && !opts.crawl);
      // Retry once with a fresh session: either another worker already logged in
      // since this page opened, or this worker triggers the login.
      if (auth.login && (gen < loginGen || loginGate || state.logins < 3)) {
        await page.close();
        if (gen === loginGen) await login(item.url, auth.reason); else if (loginGate) await loginGate;
        page = await context.newPage();
        resp = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: opts.timeout });
        await settle(page, opts.wait);
        auth = await looksLikeLogin(page, resp, item.url, targetOrigin, item.depth === 0 && !opts.crawl);
      }
      if (auth.login) { pageRec.authWall = true; pageRec.note = `Still behind a login after sign-in (${auth.reason}); scanned what was shown.`; log(`  still behind a login (${auth.reason})`); }

      pageRec.status = resp?.status() ?? null;
      pageRec.finalUrl = page.url();
      pageRec.title = await page.title().catch(() => '');
      const ct = resp?.headers()?.['content-type'] || '';
      if (ct && !/html/i.test(ct)) { pageRec.error = `Not an HTML page (${ct})`; return; }

      // Links for the crawl, collected before any interaction.
      if (opts.crawl && item.depth < opts.maxDepth) {
        const base = page.url();
        const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href], area[href]')].map((a) => a.href)).catch(() => []);
        item.links = hrefs.map((h) => normalizeUrl(h, base)).filter(Boolean);
      }


      const ruleResults = { passes: new Set(), inapplicable: new Set(), violations: new Set(), incomplete: new Set() };
      for (const vpName of opts.viewports) {
        const vp = VIEWPORTS[vpName];
        await page.setViewportSize(vp);
        await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
        await page.waitForTimeout(250);
        const res = await runAxe(page, tags);
        res.passes.forEach((r) => ruleResults.passes.add(r));
        res.inapplicable.forEach((r) => ruleResults.inapplicable.add(r));
        res.violations.forEach((r) => ruleResults.violations.add(r.id));
        res.incomplete.forEach((r) => ruleResults.incomplete.add(r.id));
        if (opts.screenshots) {
          const file = `screenshots/${id}-${vpName}.jpg`;
          await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
          await page.screenshot({ path: path.join(outDir, file), fullPage: vpName === 'desktop', type: 'jpeg', quality: 60, scale: 'css', animations: 'disabled' }).then(() => { pageRec[vpName === 'desktop' ? 'screenshot' : 'mobileScreenshot'] = file; }).catch(() => {});
        }
        const isExperimental = (r) => r.tags.includes('experimental');
        await recordNodes(page, pageRec, 'violation', res.violations.filter((r) => !isExperimental(r)), vpName, vp);
        await recordNodes(page, pageRec, 'review', res.violations.filter(isExperimental), vpName, vp);
        await recordNodes(page, pageRec, 'review', res.incomplete, vpName, vp);
        pageRec.viewports.push(vpName);

        if (vpName === 'desktop' && opts.keyboard) {
          const encountered = [];
          const kf = await keyboardChecks(page, vp, focusSeen, opts, encountered).catch((e) => { log(`  keyboard check failed: ${e.message}`); return []; });
          for (const k of encountered) if (!focusFirstPage.has(k) || pageNum(focusFirstPage.get(k)) > pageNum(id)) focusFirstPage.set(k, id);
          for (const f of kf) {
            let shot;
            if (opts.screenshots && f.box && (shotsPerKey.get(`kb|${f.check}`) || 0) < 12) {
              const file = `screenshots/${id}-${f.check}-${shortHash(f.selector)}.png`;
              if (f.shot) { fs.writeFileSync(path.join(outDir, file), f.shot); shot = file; } else {
                await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
                const loc = page.locator(f.selector).first();
                if (await shootElement(page, loc, path.join(outDir, file), vp)) shot = file;
              }
              if (shot) shotsPerKey.set(`kb|${f.check}`, (shotsPerKey.get(`kb|${f.check}`) || 0) + 1);
            }
            recordCustom(pageRec, f.check, f, { screenshot: shot });
          }
        }
      }
      if (opts.reflow) {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.waitForTimeout(300);
        const rf = await reflowCheck(page);
        if (rf) {
          let shot;
          if (opts.screenshots) {
            const file = `screenshots/${id}-reflow.jpg`;
            await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
            await page.screenshot({ path: path.join(outDir, file), type: 'jpeg', quality: 60, scale: 'css' }).then(() => { shot = file; }).catch(() => {});
          }
          const o = rf.offenders[0];
          recordCustom(pageRec, 'reflow', { selector: o.selector, html: o.html, message: `At 320px wide the page scrolls sideways by ${rf.overflow}px. The widest offenders: ${rf.offenders.map((x) => `${x.selector} (right edge ${x.right}px)`).join(', ')}.`, data: rf }, { screenshot: shot, viewport: '320px' });
        }
        await page.setViewportSize(VIEWPORTS.desktop);
      }
      pageRec.rules = { failed: [...ruleResults.violations], review: [...ruleResults.incomplete], passed: [...ruleResults.passes].filter((r) => !ruleResults.violations.has(r)), inapplicable: [...ruleResults.inapplicable].filter((r) => !ruleResults.violations.has(r) && !ruleResults.passes.has(r) && !ruleResults.incomplete.has(r)) };
    } catch (e) {
      pageRec.error = e.message.split('\n')[0];
      log(`  failed: ${pageRec.error}`);
    } finally {
      pageRec.durationMs = Date.now() - t0;
      await page.close().catch(() => {});
    }
  };

  // Breadth-first, one depth level at a time. Pages in a level are scanned in
  // parallel, but links are admitted in page order after the level finishes, so
  // the set of pages (and their ids) is the same at any concurrency.
  const admit = (item, fromId) => {
    const next = [];
    for (const n of item.links || []) {
      if (queued.has(n)) continue;
      queued.add(n);
      const u = new URL(n);
      if (u.origin !== targetOrigin) continue;
      if (NON_HTML_RE.test(u.pathname)) continue;
      if (SKIP_RE.test(u.pathname + u.search + u.hash) || (opts.exclude && opts.exclude.test(n))) { skipped.push({ url: n, reason: 'skip list' }); continue; }
      if (opts.include && !opts.include.test(n)) continue;
      const tpl = templateOf(n);
      const c = templates.get(tpl) || 0;
      if (c >= opts.perTemplate) { skipped.push({ url: n, reason: `template ${tpl} already sampled ${opts.perTemplate}x` }); continue; }
      templates.set(tpl, c + 1);
      next.push({ url: n, depth: item.depth + 1, from: fromId });
    }
    return next;
  };
  const runPool = async (jobs) => {
    let i = 0;
    const worker = async () => { while (i < jobs.length) { const job = jobs[i++]; if (loginGate) await loginGate; await job(); } };
    await Promise.all(Array.from({ length: Math.min(Math.max(1, opts.concurrency), jobs.length) }, worker));
  };
  log(`Scanning with ${opts.concurrency} parallel worker(s).`);
  let level = queue.splice(0);
  while (level.length) {
    const room = opts.crawl ? opts.maxPages - pages.length : level.length;
    if (room <= 0) break;
    const batch = level.slice(0, room);
    const overflow = level.slice(room);
    const recs = batch.map((item) => {
      const rec = { id: `p${pages.length + 1}`, url: item.url, depth: item.depth, foundOn: item.from, template: templateOf(item.url), viewports: [], counts: {} };
      pages.push(rec);
      return rec;
    });
    const total = opts.crawl ? `${pages.length}+` : String(opts.urls.length);
    await runPool(batch.map((item, k) => () => scanOne(item, recs[k], total)));
    const next = [];
    if (opts.crawl && batch[0].depth < opts.maxDepth) batch.forEach((item, k) => next.push(...admit(item, recs[k].id)));
    if (overflow.length) { next.unshift(...overflow); }
    level = next;
    if (opts.crawl && pages.length >= opts.maxPages && level.length) {
      log(`Reached the ${opts.maxPages}-page cap. ${level.length} discovered URL(s) not scanned.`);
      skipped.push(...level.map((q) => ({ url: q.url, reason: 'page cap' })));
      break;
    }
  }
  await browser.close().catch(() => {});
  // Focus checks skip elements already tested on another page, and which page
  // got there first depends on timing. Credit each finding to the first page
  // whose tab order contains the element, so output is stable between runs.
  for (const g of nodesByKey.values()) for (const inst of g.instances) {
    if (inst.focusKey && focusFirstPage.has(inst.focusKey)) inst.page = focusFirstPage.get(inst.focusKey);
    delete inst.focusKey;
  }
  // Workers finish in any order; sort so output is stable between runs.
  for (const g of nodesByKey.values()) g.instances.sort((a, b) => pageNum(a.page) - pageNum(b.page) || a.target.localeCompare(b.target));

  // ------------------------------------------------------------ assemble
  const pageIndex = Object.fromEntries(pages.map((p) => [p.id, p]));
  const issues = [...nodesByKey.values()].map((g) => {
    const pagesHit = [...new Set(g.instances.map((i) => i.page))];
    const wcag = (g.tags || []).map((t) => /^wcag(\d)(\d)(\d+)$/.exec(t)).filter(Boolean).map((m) => `${m[1]}.${m[2]}.${m[3]}`);
    const level = levelOf(g.tags || []);
    const first = g.instances[0];
    let headline = null;
    if (g.ruleId.startsWith('color-contrast')) {
      const d = first.checks.find((c) => c.data?.fgColor)?.data;
      if (d) headline = `${d.fgColor} text on ${d.bgColor}: ${d.contrastRatio}:1, needs ${d.expectedContrastRatio}`;
    }
    return {
      id: `${g.kind === 'violation' ? 'V' : 'R'}-${shortHash(g.key)}`,
      kind: g.kind, source: g.source, ruleId: g.ruleId, impact: g.impact || 'moderate', help: g.help, description: g.description, helpUrl: g.helpUrl,
      wcag, level, tags: g.tags, context: g.context || null, shape: g.ruleId.startsWith('color-contrast') ? null : htmlShape(first.html), headline,
      pageCount: pagesHit.length, instanceCount: g.instances.length, pages: pagesHit, instances: g.instances,
    };
  });
  issues.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'violation' ? -1 : 1) || IMPACT_ORDER[b.impact] - IMPACT_ORDER[a.impact] || b.pageCount - a.pageCount || b.instanceCount - a.instanceCount);
  for (const p of pages) {
    const mine = issues.filter((i) => i.pages.includes(p.id));
    p.counts = { violations: mine.filter((i) => i.kind === 'violation').length, review: mine.filter((i) => i.kind === 'review').length, instances: mine.filter((i) => i.kind === 'violation').reduce((s, i) => s + i.instances.filter((x) => x.page === p.id).length, 0) };
  }

  const scan = {
    schema: 'a11y-audit/scan@1',
    meta: {
      tool: 'a11y-audit', axeVersion: AXE_VERSION, playwright: require('playwright/package.json').version,
      standard: opts.standard, standardLabel: STANDARDS[opts.standard].label, bestPractices: opts.bestPractices, tags,
      mode: opts.crawl ? 'crawl' : 'list', startUrls: opts.urls, origin: targetOrigin,
      startedAt: new Date(started).toISOString(), finishedAt: new Date().toISOString(), durationMs: Date.now() - started,
      viewports: opts.viewports.map((v) => ({ name: v, ...VIEWPORTS[v] })), keyboard: opts.keyboard, reflow: opts.reflow,
      authenticated: Boolean(state.storageState), maxPages: opts.maxPages,
    },
    pages, issues, skipped: skipped.slice(0, 500),
  };
  fs.writeFileSync(path.join(outDir, 'scan.json'), JSON.stringify(scan, null, 1));
  fs.writeFileSync(path.join(outDir, 'digest.md'), digest(scan, pageIndex));

  const v = issues.filter((i) => i.kind === 'violation');
  log(`Done in ${Math.round((Date.now() - started) / 1000)}s. ${pages.length} page(s), ${v.length} unique issue(s) / ${v.reduce((s, i) => s + i.instanceCount, 0)} instance(s), ${issues.length - v.length} needing review.`);
  log(`Wrote ${path.join(outDir, 'scan.json')} and ${path.join(outDir, 'digest.md')}`);
  if (state.sessionFile) log(`Session file: ${state.sessionFile} (private; do not publish).`);
}

function levelOf(tags) {
  if (tags.includes('best-practice')) return 'best-practice';
  if (tags.some((t) => /^wcag2\d?aaa$/.test(t))) return 'AAA';
  if (tags.some((t) => /^wcag2\d?aa$/.test(t))) return 'AA';
  if (tags.some((t) => /^wcag2\d?a$/.test(t))) return 'A';
  return 'other';
}

const CUSTOM = {
  'focus-visible': { impact: 'serious', help: 'Keyboard focus is not visible', description: 'Checks that tabbing to an element changes how it looks.', helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html', tags: ['wcag2aa', 'wcag247', 'heuristic'] },
  'focus-not-obscured': { impact: 'serious', help: 'Focused element is hidden behind other content', description: 'Checks that a focused element is not entirely covered by sticky headers, banners or overlays.', helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html', tags: ['wcag22aa', 'wcag2411', 'heuristic'] },
  'keyboard-trap': { impact: 'critical', help: 'Keyboard focus appears to be trapped', description: 'Checks that pressing Tab moves focus forward.', helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html', tags: ['wcag2a', 'wcag212', 'heuristic'] },
  reflow: { impact: 'serious', help: 'Page scrolls sideways at 320px wide', description: 'Checks that content reflows to a 320 CSS px wide viewport without horizontal scrolling.', helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html', tags: ['wcag21aa', 'wcag1410', 'heuristic'] },
};

// A compact, model-friendly summary used to write enrichment.json.
function digest(scan, pageIndex) {
  const L = [];
  const v = scan.issues.filter((i) => i.kind === 'violation');
  const r = scan.issues.filter((i) => i.kind === 'review');
  L.push(`# Scan digest`, '', `${scan.meta.standardLabel} on ${scan.meta.origin}. ${scan.pages.length} pages. ${v.length} violation groups, ${r.length} needs-review groups.`, '');
  L.push('## Pages', '');
  for (const p of scan.pages) L.push(`- ${p.id} ${p.url} "${p.title || ''}" violations=${p.counts.violations ?? 0}${p.error ? ` ERROR ${p.error}` : ''}${p.authWall ? ' AUTH-WALL' : ''}`);
  const block = (i) => {
    L.push(`### ${i.id} ${i.ruleId} (${i.impact}, ${i.level}${i.wcag.length ? `, SC ${i.wcag.join(' ')}` : ''}${i.source === 'heuristic' ? ', heuristic' : ''})`);
    L.push(`${i.help}. ${i.instanceCount} instance(s) on ${i.pageCount} page(s): ${i.pages.slice(0, 12).join(' ')}${i.pages.length > 12 ? ' …' : ''}`);
    if (i.headline) L.push(`Colors: ${i.headline}`);
    if (i.shape) L.push(`Element shape: ${i.shape}${i.context ? `, inside ${i.context}` : ''}`);
    const samples = i.instances.slice(0, 3);
    for (const s of samples) {
      L.push(`- [${s.page} ${pageIndex[s.page]?.url}] \`${s.target}\``);
      L.push('  ```html', `  ${(s.html || '').slice(0, 500).replace(/\n/g, ' ')}`, '  ```');
      const msgs = [...new Set(s.checks.map((c) => c.message))].slice(0, 4);
      for (const m of msgs) L.push(`  - ${m}`);
    }
    L.push('');
  };
  L.push('', '## Violations', '');
  v.forEach(block);
  L.push('## Needs review', '');
  r.forEach(block);
  return L.join('\n');
}

main().catch((e) => { console.error(`[a11y] FATAL ${e.stack || e}`); process.exit(1); });
