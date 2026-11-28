#!/usr/bin/env node
// Captures screenshots of a running app for the review report.
//
//   node screenshot.mjs --out <review dir> --base-url http://localhost:5173 \
//        --route /settings/connectors [--route /other ...] \
//        [--state after|before] [--mobile] [--dark] [--wait-for "<css selector>"] \
//        [--wait-ms 400] [--storage-state <file>] [--viewport-only]
//
// Writes JPEGs to <out>/shots/ and adds one entry per image to <out>/shots.json.
// Copy the entries you keep into review.json's "screenshots" and add a caption.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const one = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const many = (name) => argv.flatMap((a, i) => (a === name ? [argv[i + 1]] : []));
const has = (name) => argv.includes(name);

if (has("--help") || !one("--out") || !one("--base-url") || !many("--route").length) {
  console.log("usage: screenshot.mjs --out <review dir> --base-url <url> --route <path> [--route <path> ...] [--state after|before] [--mobile] [--dark] [--wait-for <selector>] [--wait-ms N] [--storage-state <file>] [--viewport-only]");
  process.exit(has("--help") ? 0 : 1);
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is not installed for this skill. Run:\n  npm ci --prefix <skill-dir> --no-audit --no-fund && (cd <skill-dir> && npx playwright install chromium)");
  process.exit(2);
}

const out = resolve(one("--out"));
mkdirSync(join(out, "shots"), { recursive: true });
const baseUrl = one("--base-url").replace(/\/$/, "");
const state = one("--state", "after");
const waitFor = one("--wait-for");
const waitMs = Number(one("--wait-ms", 400));
const storageState = one("--storage-state");
const theme = has("--dark") ? "dark" : "light";
const viewports = [{ name: "desktop", width: 1440, height: 900 }];
if (has("--mobile")) viewports.push({ name: "mobile", width: 390, height: 844 });

const manifestPath = join(out, "shots.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : [];
const slug = (s) => s.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() || "home";

const browser = await chromium.launch();
let failed = 0;
for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.name === "mobile" ? 2 : 1,
    colorScheme: theme,
    reducedMotion: "reduce",
    ...(storageState ? { storageState } : {}),
  });
  for (const route of many("--route")) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message).split("\n")[0]));
    const url = baseUrl + (route.startsWith("/") ? route : "/" + route);
    const file = `shots/${state}-${slug(route)}-${vp.name}-${theme}.jpg`;
    try {
      const res = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => {
        if (!/Timeout/.test(e.message)) throw e;
        return null; // the page never went quiet (polling, websockets): shoot what is there
      });
      if (waitFor) await page.waitForSelector(waitFor, { timeout: 15000 });
      await page.waitForTimeout(waitMs);
      const status = res ? res.status() : 0;
      const loginWall = (await page.locator('input[type="password"]').count()) > 0;
      const title = await page.title();
      await page.screenshot({ path: join(out, file), fullPage: !has("--viewport-only"), type: "jpeg", quality: 82 });
      const entry = { file, route, state, viewport: `${vp.width}x${vp.height}`, device: vp.name, theme, title, status, finalUrl: page.url() };
      const i = manifest.findIndex((s) => s.file === file);
      if (i >= 0) manifest[i] = entry; else manifest.push(entry);
      const notes = [];
      if (status >= 400) notes.push(`HTTP ${status}`);
      if (loginWall) notes.push("has a password field: look at the image, it may be a login wall or just a form");
      if (errors.length) notes.push(`page error: ${errors[0]}`);
      console.log(`${notes.length ? "CHECK" : "ok   "} ${file}  ${route}${notes.length ? "  <- " + notes.join("; ") : ""}`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${route} (${vp.name}): ${String(e.message).split("\n")[0]}`);
    }
    await page.close();
  }
  await context.close();
}
await browser.close();
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`manifest: ${manifestPath}`);
process.exit(failed ? 1 : 0);
