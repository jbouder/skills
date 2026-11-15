#!/usr/bin/env node
// kit-ui: compare a screenshot of the built UI with the Figma frame's export.
// No dependencies. Reads 8-bit, non-interlaced PNGs.
//
//   node visual-diff.mjs <built.png> <figma.png> [--max 2] [--threshold 0.1]
//                        [--tolerance 1] [--fit] [--out diff.png]
//
//   --max        percent of differing pixels allowed before exit code 1 (default 2)
//   --threshold  per-pixel color distance, 0 to 1 (default 0.1)
//   --tolerance  a pixel passes if a similar one sits within this many pixels in the
//                other image; absorbs antialiasing and 1px shifts (default 1)
//   --fit        compare the shared top-left area when the sizes differ (else exit 2)
//   --out        write a PNG with the differing pixels in red
//
// Prints JSON: size, differing pixels, percent, and the grid cells that differ most.
import { readFileSync, writeFileSync } from 'node:fs';
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
const max = Number(opt('max', 2)), threshold = Number(opt('threshold', 0.1)), tol = Number(opt('tolerance', 1)), outPath = opt('out', null), fit = flag('fit');
if (args.length !== 2) { console.error('usage: visual-diff.mjs <built.png> <figma.png> [--max 2] [--threshold 0.1] [--tolerance 1] [--fit] [--out diff.png]'); process.exit(2); }

const A = decode(args[0]), B = decode(args[1]);
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
const COLS = 8, ROWS = 6;
const cells = new Uint32Array(COLS * ROWS);
const out = outPath ? new Uint8Array(w * h * 3) : null;
let diff = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = (y * A.w + x) * 3, j = (y * B.w + x) * 3;
  const same = dist(A.rgb, i, B.rgb, j) <= limit || (tol > 0 && near(A.rgb, A.w, x, y, B.rgb, B.w, B.h) && near(B.rgb, B.w, x, y, A.rgb, A.w, A.h));
  if (!same) { diff++; cells[Math.min(ROWS - 1, Math.floor((y / h) * ROWS)) * COLS + Math.min(COLS - 1, Math.floor((x / w) * COLS))]++; }
  if (out) { const k = (y * w + x) * 3; if (same) { const g = 255 - (255 - (A.rgb[i] * 0.3 + A.rgb[i + 1] * 0.59 + A.rgb[i + 2] * 0.11)) * 0.25; out[k] = out[k + 1] = out[k + 2] = g; } else { out[k] = 220; out[k + 1] = 0; out[k + 2] = 40; } }
}
if (out) writeFileSync(outPath, encode(w, h, out));
const percent = Math.round((diff / (w * h)) * 10000) / 100;
const worst = [...cells].map((n, k) => ({ n, k })).filter((c) => c.n).sort((a, b) => b.n - a.n).slice(0, 5)
  .map(({ n, k }) => ({ x: Math.round(((k % COLS) / COLS) * w), y: Math.round((Math.floor(k / COLS) / ROWS) * h), w: Math.round(w / COLS), h: Math.round(h / ROWS), pixels: n }));
console.log(JSON.stringify({ width: w, height: h, compared: fit && (A.w !== B.w || A.h !== B.h) ? 'shared area' : 'full', differing: diff, percent, max, pass: percent <= max, worst }, null, 2));
process.exit(percent <= max ? 0 : 1);
