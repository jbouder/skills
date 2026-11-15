// kit-ui: tokens. Run through the Figma MCP's use_figma tool. Read-only.
// Returns the theme CSS for the kit's variables, text styles and effect styles,
// a text-style-to-class map, and a hash for kit.lock.json.
// Optional: put `const ARGS = { darkSelector: '.dark', names: {...} };` on a line above this script.
// `names` is the adapter's { derive, ignoreSyntax, map } from kit.json (see references/adapter.md).
// After writing `css` to a file, `node scripts/hash.mjs <file>` must print the returned `hash`.
// `skipped` lists variables with no usable CSS name (see references/kit-contract.md).
const A = typeof ARGS === 'object' && ARGS ? ARGS : {};
const DARK = A.darkSelector || '.dark';
const h2 = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
const hex = (c) => '#' + h2(c.r) + h2(c.g) + h2(c.b) + (c.a !== undefined && c.a < 0.999 ? h2(c.a) : '');
const num = (n) => String(Math.round(n * 1000) / 1000);
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) byId[v.id] = v;
const colName = {};
for (const c of cols) colName[c.id] = c.name;
// The CSS name of a variable: the adapter's map, else its WEB code syntax, else derived from its name.
// '' means "has calc() syntax, emit nothing"; null means "no usable name".
const N = A.names || {};
const cssOf = (v) => {
  if (N.map && N.map[v.name]) return '--' + String(N.map[v.name]).replace(/^--/, '');
  const web = (v.codeSyntax && v.codeSyntax.WEB) || '';
  const ignore = (N.ignoreSyntax || []).indexOf(colName[v.variableCollectionId]) >= 0;
  if (!ignore && /^calc\(.+\)$/.test(web)) return '';
  const m = ignore ? null : /^var\((--[\w-]+)\)$/.exec(web);
  if (m) return m[1];
  if (web && !ignore) return null;
  if (!N.derive && !ignore) return null;
  return '--' + v.name.toLowerCase().replace(/^color\//, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};
const cssName = (v) => cssOf(v) || null;
const unit = (name) => (/duration|delay/.test(name) ? 'ms' : 'px');
const out = (v, raw, depth) => {
  if (raw && raw.type === 'VARIABLE_ALIAS') {
    const t = byId[raw.id];
    if (!t) return null;
    const n = cssName(t);
    // An alias to a variable with the same CSS name would point at itself: use the value.
    if (n && n !== cssName(v)) return 'var(' + n + ')';
    if (depth > 5) return null;
    const c = cols.find((x) => x.id === t.variableCollectionId);
    return out(t, t.valuesByMode[c.defaultModeId], (depth || 0) + 1);
  }
  if (v.resolvedType === 'COLOR') return hex(raw);
  if (v.resolvedType === 'FLOAT') return num(raw) + unit(v.name);
  return String(raw);
};
const root = [], dark = [], theme = [], skipped = [], done = {};
for (const c of cols) {
  const light = c.modes.find((m) => /light/i.test(m.name)) || c.modes.find((m) => m.modeId === c.defaultModeId);
  const dk = c.modes.find((m) => /dark/i.test(m.name));
  for (const id of c.variableIds) {
    const v = byId[id];
    const n = cssOf(v);
    if (!n) { if (n === null) skipped.push(v.name); continue; }
    // A string variable (a font family) is emitted from the text styles below, not from here.
    if (v.resolvedType === 'STRING' || v.resolvedType === 'BOOLEAN') continue;
    // A length with a derived name is not a token: lengths map to the Tailwind scale by value. Radius is the exception.
    if (v.resolvedType === 'FLOAT' && !/^--radius/.test(n) && !(N.map && N.map[v.name]) && !/^var\(/.test((v.codeSyntax && v.codeSyntax.WEB) || '')) continue;
    if (done[n]) continue; // the first variable to claim a name wins; kit.js reports a real clash
    done[n] = 1;
    const a = out(v, v.valuesByMode[light.modeId]);
    if (v.resolvedType === 'COLOR') {
      root.push(n + ': ' + a + ';');
      theme.push('--color-' + n.slice(2) + ': var(' + n + ');');
      if (dk) { const b = out(v, v.valuesByMode[dk.modeId]); if (b !== a) dark.push(n + ': ' + b + ';'); }
    } else if (/^--radius/.test(n)) theme.push(n + ': ' + a + ';');
    else root.push(n + ': ' + a + ';');
  }
}
// Text styles: the font families, and one utility-class string per style.
const SCALE = { 12: ['xs', 16], 14: ['sm', 20], 16: ['base', 24], 18: ['lg', 28], 20: ['xl', 28], 24: ['2xl', 32], 30: ['3xl', 36], 36: ['4xl', 40], 48: ['5xl', 48] };
const WEIGHT = { Thin: 'font-thin', ExtraLight: 'font-extralight', Light: 'font-light', Regular: '', Medium: 'font-medium', SemiBold: 'font-semibold', Bold: 'font-bold', ExtraBold: 'font-extrabold', Black: 'font-black' };
const text = {}, fams = {};
for (const s of await figma.getLocalTextStylesAsync()) {
  const mono = /mono|code/i.test(s.fontName.family);
  fams[s.fontName.family] = { mono, n: ((fams[s.fontName.family] || {}).n || 0) + 1 };
  const lh = s.lineHeight.unit === 'PIXELS' ? s.lineHeight.value : s.lineHeight.unit === 'PERCENT' ? (s.fontSize * s.lineHeight.value) / 100 : null;
  const step = SCALE[s.fontSize];
  let cls = step ? 'text-' + step[0] : 'text-[' + num(s.fontSize) + 'px]';
  if (lh !== null && !(step && Math.abs(step[1] - lh) < 0.01)) cls += '/[' + num(lh) + 'px]';
  const w = WEIGHT[s.fontName.style.replace(/\s|Italic/g, '')];
  if (w) cls += ' ' + w;
  if (/Italic/.test(s.fontName.style)) cls += ' italic';
  if (mono) cls += ' font-mono';
  const ls = s.letterSpacing;
  if (ls && ls.value) cls += ' tracking-[' + (ls.unit === 'PERCENT' ? num(ls.value / 100) + 'em' : num(ls.value) + 'px') + ']';
  text[s.name] = cls;
}
const fonts = [];
const sans = Object.keys(fams).filter((f) => !fams[f].mono).sort((a, b) => fams[b].n - fams[a].n)[0];
const mono = Object.keys(fams).filter((f) => fams[f].mono)[0];
if (sans) fonts.push('--font-sans: "' + sans + '", ui-sans-serif, system-ui, sans-serif;');
if (mono) fonts.push('--font-mono: "' + mono + '", ui-monospace, SFMono-Regular, monospace;');
// Effect styles named shadow/<step> become --shadow-<step>.
const effects = {};
for (const s of await figma.getLocalEffectStylesAsync()) {
  const parts = s.effects.filter((e) => e.type === 'DROP_SHADOW' && e.visible !== false).map((e) =>
    num(e.offset.x) + 'px ' + num(e.offset.y) + 'px ' + num(e.radius) + 'px ' + num(e.spread || 0) + 'px rgb(' + [e.color.r, e.color.g, e.color.b].map((x) => Math.round(x * 255)).join(' ') + ' / ' + num(e.color.a) + ')');
  if (!parts.length || effects[s.name]) continue; // two styles with one name: the first wins
  const n = s.name.toLowerCase().replace(/[\s/]+/g, '-');
  theme.push('--' + n + ': ' + parts.join(', ') + ';');
  effects[s.name] = n.indexOf('shadow-') === 0 ? n : 'shadow-[var(--' + n + ')]';
}
const block = (sel, lines) => (lines.length ? sel + ' {\n  ' + lines.join('\n  ') + '\n}\n' : '');
const css = '/* Generated by kit-ui from the Figma kit. Do not edit: run the sync again. */\n' +
  block('@theme inline', fonts.concat(theme)) + '\n' + block(':root', root) + '\n' + block(DARK, dark);
let hash = 2166136261;
for (let i = 0; i < css.length; i++) { hash ^= css.charCodeAt(i); hash = Math.imul(hash, 16777619); }
return { hash: (hash >>> 0).toString(16), counts: { root: root.length, dark: dark.length, theme: theme.length + fonts.length }, skipped, text, effects, css };
