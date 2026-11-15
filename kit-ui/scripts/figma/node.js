// kit-ui: node spec. Run through the Figma MCP's use_figma tool. Read-only.
// Required: `const ARGS = { ids: ['12:34', '56:78'] };` on a line above this script.
//   ids       component set, component, or frame ids. Pass every id you need in ONE call.
//   where     optional, sets only: keep options, e.g. { State: ['Default', 'Hover'] }
//   whereNot  optional, sets only: drop options, e.g. { Size: ['xs', 'lg'] }
//   hashOnly  optional: return only { id, name, hash } per id (drift check)
//   names     optional: the adapter's { derive, ignoreSyntax, map } from kit.json
//   iconPage  optional: the adapter's icon page; instances of its components are icons
//
// A component set comes back factored by axis:
//   tree        the base variant in full (each axis at its option named "default", else false/off, else the file's default)
//   axes        the axes and their options
//   changes     for each axis and option, what changes from the base when only that axis changes
//   exceptions  for a variant that differs in two or more axes, only what the axis changes
//               do not already predict. An axis missing from an exception's name means
//               it holds for every option of that axis.
// A change is a map from a layer path to the properties that differ; null means gone.
// A frame comes back as one tree whose kit-component instances are leaves.
// Colors are token names (the variable's CSS name). A hex value means the paint is unbound: a kit defect.
// A suffix like primary/80 is paint opacity. Instance props equal to the default are left out.
if (typeof ARGS !== 'object' || !ARGS || !Array.isArray(ARGS.ids)) throw new Error('Set ARGS.ids above this script.');
const vname = {}, vraw = {}, valpha = {}, colName = {};
for (const c of await figma.variables.getLocalVariableCollectionsAsync()) colName[c.id] = c.name;
// The CSS name of a variable: the adapter's map, else its WEB code syntax, else derived from its name.
const N = ARGS.names || {};
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
for (const v of await figma.variables.getLocalVariablesAsync()) {
  const n = cssOf(v);
  vname[v.id] = n ? n.slice(2) : v.name;
  vraw[v.id] = v;
}
const clean = (s) => s.replace(/^[^A-Za-z0-9]+/, '').trim();
const iconPage = ARGS.iconPage ? clean(ARGS.iconPage) : null;
const pageOf = (n) => { let p = n; while (p && p.type !== 'PAGE') p = p.parent; return p ? clean(p.name) : ''; };
// A library component has no page in the file that uses it. There, an icon is a loose component (not in a set) drawn with shapes only.
const SHAPES = ['VECTOR', 'BOOLEAN_OPERATION', 'GROUP', 'ELLIPSE', 'LINE', 'RECTANGLE', 'POLYGON', 'STAR'];
const onIconPage = (n, mc, set) => {
  if (!iconPage || !mc) return false;
  if (!mc.remote) return pageOf(mc) === iconPage;
  return !set && n.children.length > 0 && !n.findOne((x) => SHAPES.indexOf(x.type) < 0);
};
// A color variable's own alpha shows up as the paint's opacity. It belongs to the token, not the paint.
const alphas = (id, depth) => {
  const out = [];
  for (const val of Object.values(vraw[id].valuesByMode)) {
    if (val && val.type === 'VARIABLE_ALIAS') { if (vraw[val.id] && (depth || 0) < 5) out.push(...alphas(val.id, (depth || 0) + 1)); }
    else if (val && typeof val.a === 'number') out.push(val.a);
  }
  return out;
};
for (const id in vraw) if (vraw[id].resolvedType === 'COLOR') valpha[id] = alphas(id).filter((x) => x < 0.999);
const sname = {};
for (const s of (await figma.getLocalTextStylesAsync()).concat(await figma.getLocalEffectStylesAsync())) sname[s.id] = s.name;
// A file that uses the kit as a library has none of the kit's variables or styles as local ones.
// `need` loads the ones a node uses, so a frame drawn outside the kit file reads the same as one inside it.
// It runs per node as the node is described: Figma fills in library bindings as it goes, so one scan up front misses some.
const loadVar = async (id, depth) => {
  if (vraw[id]) return;
  const v = await figma.variables.getVariableByIdAsync(id);
  if (!v) return;
  if (!colName[v.variableCollectionId]) { const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId); if (c) colName[v.variableCollectionId] = c.name; }
  vraw[id] = v;
  const n = cssOf(v);
  vname[id] = n ? n.slice(2) : v.name;
  if (depth < 5) for (const val of Object.values(v.valuesByMode)) if (val && val.type === 'VARIABLE_ALIAS') await loadVar(val.id, depth + 1);
  if (v.resolvedType === 'COLOR') valpha[id] = alphas(id).filter((x) => x < 0.999);
};
const need = async (x) => {
  for (const k of ['fills', 'strokes', 'effects']) { const ps = x[k]; if (Array.isArray(ps)) for (const p of ps) { const b = p.boundVariables && p.boundVariables.color; if (b && !vraw[b.id]) await loadVar(b.id, 0); } }
  for (const k of ['textStyleId', 'effectStyleId']) { const id = x[k]; if (typeof id === 'string' && id && !sname[id]) { const st = await figma.getStyleByIdAsync(id); if (st) sname[id] = st.name; } }
};
const h2 = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
const r1 = (n) => Math.round(n * 10) / 10;
const strip = (k) => k.replace(/#\d+:\d+$/, '');
const paint = (p) => {
  if (!p || p.visible === false) return null;
  if (p.type !== 'SOLID') return p.type;
  const b = p.boundVariables && p.boundVariables.color;
  const own = b && valpha[b.id] && valpha[b.id].some((x) => Math.abs(x - p.opacity) < 0.005);
  const o = !own && p.opacity !== undefined && p.opacity < 0.999 ? '/' + Math.round(p.opacity * 100) : '';
  return (b ? vname[b.id] || '?' : '#' + h2(p.color.r) + h2(p.color.g) + h2(p.color.b)) + o;
};
const paints = (ps) => { if (!Array.isArray(ps)) return null; const r = ps.map(paint).filter(Boolean); return r.length ? (r.length === 1 ? r[0] : r) : null; };
const size = (n, ax) => { const m = ax === 'w' ? n.layoutSizingHorizontal : n.layoutSizingVertical; return m === 'HUG' ? 'hug' : m === 'FILL' ? 'fill' : r1(ax === 'w' ? n.width : n.height); };
async function describe(n, top, cap) {
  const o = { n: n.name };
  await need(n);
  if (n.visible === false) o.hidden = true;
  if (!top) { o.w = size(n, 'w'); o.h = size(n, 'h'); } else { o.w = n.layoutMode ? size(n, 'w') : r1(n.width); o.h = n.layoutMode ? size(n, 'h') : r1(n.height); }
  if (n.layoutPositioning === 'ABSOLUTE') o.abs = { x: r1(n.x), y: r1(n.y), pin: n.constraints.horizontal + ' ' + n.constraints.vertical };
  if (n.opacity < 0.999) o.op = r1(n.opacity * 100);
  const refs = n.componentPropertyReferences;
  if (refs && Object.keys(refs).length) { o.prop = {}; if (refs.characters) o.prop.text = strip(refs.characters); if (refs.visible) o.prop.show = strip(refs.visible); if (refs.mainComponent) o.prop.swap = strip(refs.mainComponent); }
  if (n.type === 'TEXT') {
    o.t = 'text';
    o.style = typeof n.textStyleId === 'string' && sname[n.textStyleId] ? sname[n.textStyleId] : r1(n.fontSize) + 'px ' + (n.fontName.style || '');
    o.color = paints(n.fills);
    o.chars = n.characters.length > cap ? n.characters.slice(0, cap - 3) + '...' : n.characters;
    if (n.textDecoration && n.textDecoration !== 'NONE') o.deco = n.textDecoration.toLowerCase();
    if (n.textTruncation === 'ENDING') o.truncate = n.maxLines || 1;
    if (n.textAlignHorizontal !== 'LEFT') o.align = n.textAlignHorizontal.toLowerCase();
    return o;
  }
  if (n.type === 'INSTANCE') {
    const mc = await n.getMainComponentAsync();
    const set = mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent : null;
    o.t = 'inst';
    o.of = set ? set.name : mc ? mc.name : '?';
    if (set) o.variant = mc.name;
    if (/^icon\//i.test(o.of) || onIconPage(n, mc, set)) {
      if (!/^icon\//i.test(o.of)) o.icon = true;
      for (const x of n.findAll(() => true)) await need(x);
      const g = n.children[0];
      if (g && 'fills' in g) o.color = paints(g.fills);
      // A stroked icon (Lucide) carries its color on the strokes of its vectors.
      if (!o.color) { const s = n.findOne((x) => 'strokes' in x && paints(x.strokes)); if (s) o.color = paints(s.strokes); }
      return o;
    }
    const cp = n.componentProperties, props = {};
    const defs = mc ? (set || mc).componentPropertyDefinitions : {};
    for (const k in cp) {
      if (cp[k].type === 'VARIANT' || (defs[k] && defs[k].defaultValue === cp[k].value)) continue;
      if (cp[k].type === 'INSTANCE_SWAP') { const t = await figma.getNodeByIdAsync(cp[k].value); props[strip(k)] = t ? t.name : cp[k].value; }
      else props[strip(k)] = cp[k].value;
    }
    if (Object.keys(props).length) o.props = props;
    return o;
  }
  o.t = 'layoutMode' in n ? 'box' : 'shape';
  if ('layoutMode' in n && n.layoutMode !== 'NONE') {
    o.dir = n.layoutMode === 'VERTICAL' ? 'col' : 'row';
    if (n.itemSpacing && n.children.length > 1) o.gap = r1(n.itemSpacing);
    const p = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(r1);
    if (p.some((x) => x)) o.pad = p[0] === p[2] && p[1] === p[3] ? (p[0] === p[1] ? p[0] : [p[0], p[1]]) : p;
    if (n.primaryAxisAlignItems !== 'MIN') o.justify = n.primaryAxisAlignItems.toLowerCase();
    if (n.counterAxisAlignItems !== 'MIN') o.align = n.counterAxisAlignItems.toLowerCase();
    if (n.layoutWrap === 'WRAP') o.wrap = true;
  }
  if (n.minWidth) o.minW = r1(n.minWidth);
  if (n.minHeight) o.minH = r1(n.minHeight);
  if ('fills' in n) { const f = paints(n.fills); if (f) o.fill = f; }
  if ('strokes' in n && n.strokes.length) {
    const c = paints(n.strokes);
    if (c) { o.stroke = { c }; o.stroke.w = typeof n.strokeWeight === 'number' ? n.strokeWeight : [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight]; if (n.strokeAlign !== 'INSIDE') o.stroke.at = n.strokeAlign.toLowerCase(); if (n.dashPattern && n.dashPattern.length) o.stroke.dash = true; if (n.strokesIncludedInLayout) o.stroke.layout = true; }
  }
  if (typeof n.cornerRadius === 'number' && n.cornerRadius > 0) o.radius = n.cornerRadius >= 500 ? 'full' : n.cornerRadius;
  if (typeof n.effectStyleId === 'string' && sname[n.effectStyleId]) o.effect = sname[n.effectStyleId];
  else if (n.effects && n.effects.length) {
    const e = n.effects.find((x) => x.type === 'DROP_SHADOW' && x.visible !== false);
    if (e && e.radius === 0 && e.spread) { const b = e.boundVariables && e.boundVariables.color; o.ring = { w: e.spread, c: b ? vname[b.id] : 'rgb(' + [e.color.r, e.color.g, e.color.b].map((x) => Math.round(x * 255)).join(' ') + ' / ' + r1(e.color.a) + ')' }; }
    else if (e) o.effect = 'unstyled shadow';
  }
  if ('children' in n && n.children.length) { o.kids = []; for (const c of n.children) o.kids.push(await describe(c, false, cap)); }
  return o;
}
const flat = (o, path, acc) => {
  const self = {}; for (const k in o) if (k !== 'kids' && k !== 'n') self[k] = o[k];
  acc[path || '/'] = self;
  const count = {};
  for (const c of o.kids || []) { count[c.n] = (count[c.n] || 0) + 1; flat(c, path + '/' + c.n + (count[c.n] > 1 ? '#' + count[c.n] : ''), acc); }
  return acc;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// What `f` changes relative to `g`, by layer path.
const delta = (f, g) => {
  const d = {};
  for (const p in f) {
    if (!g[p]) { d[p] = f[p]; continue; }
    const c = {};
    for (const k of new Set(Object.keys(f[p]).concat(Object.keys(g[p])))) if (!same(f[p][k], g[p][k])) c[k] = f[p][k] === undefined ? null : f[p][k];
    if (Object.keys(c).length) d[p] = c;
  }
  for (const p in g) if (!f[p]) d[p] = null;
  return d;
};
const apply = (g, d) => {
  for (const p in d) {
    if (d[p] === null) delete g[p];
    else if (!g[p]) g[p] = JSON.parse(JSON.stringify(d[p]));
    else for (const k in d[p]) { if (d[p][k] === null) delete g[p][k]; else g[p][k] = d[p][k]; }
  }
  return g;
};
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
const opts = (name) => { const o = {}; for (const part of name.split(', ')) { const i = part.indexOf('='); o[part.slice(0, i)] = part.slice(i + 1); } return o; };
const W = ARGS.where || {}, WN = ARGS.whereNot || {};
const keep = (o) => Object.keys(W).every((a) => [].concat(W[a]).indexOf(o[a]) >= 0) && !Object.keys(WN).some((a) => [].concat(WN[a]).indexOf(o[a]) >= 0);
const results = [];
for (const id of ARGS.ids) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { results.push({ id, error: 'not found' }); continue; }
  let r;
  if (n.type === 'COMPONENT_SET') {
    const defs = n.componentPropertyDefinitions, props = {}, axes = {};
    for (const k in defs) {
      if (defs[k].type === 'VARIANT') axes[k] = defs[k].variantOptions;
      else props[strip(k)] = { type: defs[k].type, default: defs[k].type === 'INSTANCE_SWAP' ? ((await figma.getNodeByIdAsync(defs[k].defaultValue)) || {}).name : defs[k].defaultValue };
    }
    const fileDefault = opts(n.defaultVariant.name), want = {};
    for (const a in axes) want[a] = axes[a].find((o) => /^default$/i.test(o)) || axes[a].find((o) => /^(false|off|no|none)$/i.test(o)) || fileDefault[a];
    const all = n.children.map((c) => ({ c, o: opts(c.name) }));
    const baseEntry = all.find((e) => Object.keys(axes).every((a) => e.o[a] === want[a])) || all.find((e) => e.c.id === n.defaultVariant.id);
    const baseO = baseEntry.o;
    const tree = await describe(baseEntry.c, true, 60);
    const baseFlat = flat(tree, '', {});
    const flats = {};
    for (const e of all) flats[e.c.name] = e === baseEntry ? baseFlat : flat(await describe(e.c, true, 60), '', {});
    const differs = (o) => Object.keys(axes).filter((a) => o[a] !== baseO[a]);
    const axisOut = {}, axisAll = {};
    for (const e of all) { const d = differs(e.o); if (d.length === 1) { const a = d[0]; (axisAll[a] = axisAll[a] || {})[e.o[a]] = delta(flats[e.c.name], baseFlat); } }
    const exceptions = {}, excAll = {};
    for (const e of all) {
      const d = differs(e.o);
      if (d.length < 2) continue;
      const predicted = JSON.parse(JSON.stringify(baseFlat));
      for (const a of Object.keys(axes)) if (e.o[a] !== baseO[a] && axisAll[a] && axisAll[a][e.o[a]]) apply(predicted, axisAll[a][e.o[a]]);
      const rest = delta(flats[e.c.name], predicted);
      if (Object.keys(rest).length) { excAll[e.c.name] = rest; if (keep(e.o)) exceptions[e.c.name] = rest; }
    }
    // The same exception across every option of an axis is one exception without that axis.
    const group = (list) => {
      const out = {}, by = {};
      for (const name in list) (by[JSON.stringify(list[name])] = by[JSON.stringify(list[name])] || []).push(opts(name));
      for (const body in by) {
        let rows = by[body];
        for (const a of Object.keys(axes)) {
          const parts = {};
          for (const r of rows) { const k = Object.keys(r).filter((x) => x !== a).map((x) => x + '=' + r[x]).join(', '); (parts[k] = parts[k] || []).push(r[a]); }
          if (rows.every((r) => a in r) && Object.values(parts).every((v) => axes[a].every((o) => v.indexOf(o) >= 0))) {
            const seen = {}; rows = rows.map((r) => { const c = Object.assign({}, r); delete c[a]; return c; }).filter((r) => { const k = JSON.stringify(r); if (seen[k]) return false; seen[k] = 1; return true; });
          }
        }
        for (const r of rows) out[Object.keys(r).map((x) => x + '=' + r[x]).join(', ')] = JSON.parse(body);
      }
      return out;
    };
    for (const a in axisAll) for (const o in axisAll[a]) { const probe = Object.assign({}, baseO); probe[a] = o; if (keep(probe)) (axisOut[a] = axisOut[a] || {})[o] = axisAll[a][o]; }
    r = { id, name: n.name, type: 'set', description: n.description, axes: axes, props, base: baseEntry.c.name, tree, changes: axisOut, exceptions: group(exceptions), variants: all.length };
    r.hash = fnv(JSON.stringify([tree, axisAll, excAll, props]));
    if (ARGS.where || ARGS.whereNot) r.filtered = true;
  } else {
    const tree = await describe(n, true, n.type === 'COMPONENT' ? 60 : 400);
    r = { id, name: n.name, type: n.type === 'COMPONENT' ? 'component' : 'frame', tree };
    if (n.type === 'COMPONENT') r.description = n.description;
    r.hash = fnv(JSON.stringify(tree));
  }
  results.push(ARGS.hashOnly ? { id, name: r.name, hash: r.hash } : r);
}
return results;
