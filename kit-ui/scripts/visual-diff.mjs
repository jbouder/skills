#!/usr/bin/env node
// kit-ui: compare a screenshot of the built UI with the Figma frame's export.
// No dependencies. Reads 8-bit, non-interlaced PNGs.
//
//   node visual-diff.mjs <built.png> <figma.png> [--max 2] [--max-content N]
//                        [--threshold 0.05] [--tolerance 1] [--fit] [--out diff.png]
//
//   --max          percent of all pixels allowed to differ before exit code 1 (default 2)
//   --max-content  percent of content pixels allowed to differ (default: not enforced).
//                  Content pixels are those that are not background in either image.
//                  This is the honest number: a blank page scores near 100 here and
//                  only a few percent on --max.
//   --threshold    per-pixel color distance, 0 to 1 (default 0.05)
//   --tolerance  a pixel passes if a similar one sits within this many pixels in the
//                other image; absorbs antialiasing and 1px shifts (default 1)
//   --fit        compare the shared top-left area when the sizes differ (else exit 2)
//   --out        write a PNG with the differing pixels in red
//   --tiles      write side-by-side tiles to this folder, at 1:1 scale: the Figma frame on the
//                left, the build on the right. For looking at, not for scoring. A full screen
//                shown whole is scaled down and hides a wrong fill or alignment; a tile does not.
//
// The percentages are a smoke test. They catch a broken or empty page. They are not a
// fidelity measure: a one-pixel shift nobody can see moves them more than a wrong color does.
//
// Prints JSON: size, differing pixels, percent of all pixels, percent of content
// pixels (ofContent), and the grid cells that differ most.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function decode(path) {
  const b = readFileSync(path);
  if (!SIG.every((v, i) => b[i] === v)) throw new Error(`${path}: not a PNG`);
  let pos = 8, head, palette, alpha;
  const data = [];
  while (pos < b.length) {
    const len = b.readUInt32BE(pos);
    const type = b.toString('latin1', pos + 4, pos + 8);
    const body = b.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') head = { w: body.readUInt32BE(0), h: body.readUInt32BE(4), depth: body[8], color: body[9], interlace: body[12] };
    else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') alpha = body;
    else if (type === 'IDAT') data.push(body);
    else if (type === 'IEND') break;
    pos += len + 12;
  }
  if (!head || head.depth !== 8 || head.interlace !== 0 || !(head.color in CHANNELS)) throw new Error(`${path}: only 8-bit, non-interlaced PNGs are supported`);
  const { w, h } = head;
  const n = CHANNELS[head.color];
  const raw = inflateSync(Buffer.concat(data));
  const stride = w * n;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= n ? px[dst + x - n] : 0;
      const up = y ? px[dst - stride + x] : 0;
      const c = x >= n && y ? px[dst - stride + x - n] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      px[dst + x] = v & 255;
    }
  }
  // To RGB over white.
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    let r, g, bl, al = 255;
    if (head.color === 6) { r = px[i * 4]; g = px[i * 4 + 1]; bl = px[i * 4 + 2]; al = px[i * 4 + 3]; }
    else if (head.color === 2) { r = px[i * 3]; g = px[i * 3 + 1]; bl = px[i * 3 + 2]; }
    else if (head.color === 0) { r = g = bl = px[i]; }
    else if (head.color === 4) { r = g = bl = px[i * 2]; al = px[i * 2 + 1]; }
    else { const k = px[i]; r = palette[k * 3]; g = palette[k * 3 + 1]; bl = palette[k * 3 + 2]; al = alpha && k < alpha.length ? alpha[k] : 255; }
    const t = al / 255;
    rgb[i * 3] = r * t + 255 * (1 - t); rgb[i * 3 + 1] = g * t + 255 * (1 - t); rgb[i * 3 + 2] = bl * t + 255 * (1 - t);
  }
  return { w, h, rgb };
}

const TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const v of buf) c = TABLE[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function encode(w, h, rgb) {
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  const chunk = (type, body) => { const out = Buffer.alloc(body.length + 12); out.writeUInt32BE(body.length, 0); out.write(type, 4, 'latin1'); body.copy(out, 8); out.writeUInt32BE(crc(out.subarray(4, body.length + 8)), body.length + 8); return out; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from(SIG), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Perceptual distance in YIQ, as pixelmatch does it.
function dist(a, i, b, j) {
  const dr = a[i] - b[j], dg = a[i + 1] - b[j + 1], db = a[i + 2] - b[j + 2];
  const y = dr * 0.29889531 + dg * 0.58662247 + db * 0.11448223;
  const ii = dr * 0.59597799 - dg * 0.2741761 - db * 0.32180189;
  const q = dr * 0.21147017 - dg * 0.52261711 + db * 0.31114694;
  return 0.5053 * y * y + 0.299 * ii * ii + 0.1957 * q * q;
}

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); if (i < 0) return fallback; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const maxContentArg = opt('max-content', null), maxContent = maxContentArg === null ? null : Number(maxContentArg);
const scale = Number(opt('scale', 1));
const max = Number(opt('max', 2)), threshold = Number(opt('threshold', 0.05)), tol = Number(opt('tolerance', 1)), outPath = opt('out', null), tilesDir = opt('tiles', null), fit = flag('fit');
if (args.length !== 2) { console.error('usage: visual-diff.mjs <built.png> <figma.png> [--max 2] [--max-content N] [--threshold 0.05] [--tolerance 1] [--fit] [--out diff.png] [--tiles dir]'); process.exit(2); }

// Average down by an integer factor. Glyph edges that Figma and a browser rasterize
// differently wash out, while a wrong color, size or position survives.
const shrink = (img, f) => {
  if (f <= 1) return img;
  const w = Math.floor(img.w / f), h = Math.floor(img.h / f), rgb = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    let sum = 0;
    for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) sum += img.rgb[((y * f + dy) * img.w + x * f + dx) * 3 + c];
    rgb[(y * w + x) * 3 + c] = Math.round(sum / (f * f));
  }
  return { w, h, rgb };
};
const fullA = decode(args[0]), fullB = decode(args[1]);
// Tiles: each about 480 by 450, the frame on the left and the build on the right, split by a gray bar.
if (tilesDir) {
  mkdirSync(tilesDir, { recursive: true });
  const W = Math.min(fullA.w, fullB.w), H = Math.min(fullA.h, fullB.h), gap = 8;
  const cols = Math.max(1, Math.round(W / 480)), rows = Math.max(1, Math.round(H / 450));
  const tw = Math.ceil(W / cols), th = Math.ceil(H / rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x0 = c * tw, y0 = r * th, cw = Math.min(tw, W - x0), ch = Math.min(th, H - y0), ow = cw * 2 + gap;
    const out = new Uint8Array(ow * ch * 3).fill(128);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) for (let k = 0; k < 3; k++) {
      out[(y * ow + x) * 3 + k] = fullB.rgb[((y0 + y) * fullB.w + x0 + x) * 3 + k];
      out[(y * ow + cw + gap + x) * 3 + k] = fullA.rgb[((y0 + y) * fullA.w + x0 + x) * 3 + k];
    }
    writeFileSync(join(tilesDir, `r${r + 1}c${c + 1}.png`), encode(ow, ch, out));
  }
}
const A = shrink(fullA, scale), B = shrink(fullB, scale);
if ((A.w !== B.w || A.h !== B.h) && !fit) {
  console.error(JSON.stringify({ error: 'sizes differ', built: [A.w, A.h], figma: [B.w, B.h], hint: 'Export the frame at 1x and screenshot at the frame size and device scale factor 1, or pass --fit.' }));
  process.exit(2);
}
const w = Math.min(A.w, B.w), h = Math.min(A.h, B.h);
const limit = 35215 * threshold * threshold;
const near = (src, sw, x, y, other, ow, oh) => {
  const i = (y * sw + x) * 3;
  for (let dy = -tol; dy <= tol; dy++) for (let dx = -tol; dx <= tol; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= ow || yy >= oh) continue;
    if (dist(src, i, other, (yy * ow + xx) * 3) <= limit) return true;
  }
  return false;
};
// Most of a screen is background, so a share of all pixels flatters a bad build.
// Content pixels are the ones that differ from their own image's background color.
const background = (img) => {
  const seen = new Map();
  for (let i = 0; i < img.w * img.h; i += 7) { const k = (img.rgb[i * 3] << 16) | (img.rgb[i * 3 + 1] << 8) | img.rgb[i * 3 + 2]; seen.set(k, (seen.get(k) || 0) + 1); }
  let best = 0, key = 0;
  for (const [k, n] of seen) if (n > best) { best = n; key = k; }
  return new Uint8Array([key >> 16, (key >> 8) & 255, key & 255]);
};
const bgA = background(A), bgB = background(B);
let content = 0;
const COLS = 8, ROWS = 6;
const cells = new Uint32Array(COLS * ROWS);
const out = outPath ? new Uint8Array(w * h * 3) : null;
let diff = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = (y * A.w + x) * 3, j = (y * B.w + x) * 3;
  const same = dist(A.rgb, i, B.rgb, j) <= limit || (tol > 0 && near(A.rgb, A.w, x, y, B.rgb, B.w, B.h) && near(B.rgb, B.w, x, y, A.rgb, A.w, A.h));
  if (dist(A.rgb, i, bgA, 0) > limit || dist(B.rgb, j, bgB, 0) > limit) content++;
  if (!same) { diff++; cells[Math.min(ROWS - 1, Math.floor((y / h) * ROWS)) * COLS + Math.min(COLS - 1, Math.floor((x / w) * COLS))]++; }
  if (out) { const k = (y * w + x) * 3; if (same) { const g = 255 - (255 - (A.rgb[i] * 0.3 + A.rgb[i + 1] * 0.59 + A.rgb[i + 2] * 0.11)) * 0.25; out[k] = out[k + 1] = out[k + 2] = g; } else { out[k] = 220; out[k + 1] = 0; out[k + 2] = 40; } }
}
if (out) writeFileSync(outPath, encode(w, h, out));
const percent = Math.round((diff / (w * h)) * 10000) / 100;
const worst = [...cells].map((n, k) => ({ n, k })).filter((c) => c.n).sort((a, b) => b.n - a.n).slice(0, 5)
  .map(({ n, k }) => ({ x: Math.round(((k % COLS) / COLS) * w), y: Math.round((Math.floor(k / COLS) / ROWS) * h), w: Math.round(w / COLS), h: Math.round(h / ROWS), pixels: n }));
const ofContent = content ? Math.min(100, Math.round((diff / content) * 10000) / 100) : diff ? 100 : 0;
const pass = percent <= max && (maxContent === null || ofContent <= maxContent);
console.log(JSON.stringify({ width: w, height: h, compared: fit && (A.w !== B.w || A.h !== B.h) ? 'shared area' : 'full', differing: diff, percent, max, contentPixels: content, ofContent, maxContent, pass, worst }, null, 2));
process.exit(pass ? 0 : 1);
