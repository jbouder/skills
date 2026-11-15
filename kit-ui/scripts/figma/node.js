// kit-ui: node spec. Run through the Figma MCP's use_figma tool. Read-only.
// Required: `const ARGS = { ids: ['12:34'] };` on a line above this script.
//   ids       component set, component, or frame ids (from kit.js, or a frame URL's node-id)
//   where     optional, component sets only: keep variants matching every pair, e.g. { State: 'Default' }
//   hashOnly  optional: return only { id, name, hash } for each id (drift check)
// A component set comes back as its default variant in full plus, for every other
// variant, only what differs. A frame comes back as one tree whose kit-component
// instances are leaves. Colors are token names (the variable's CSS name), never hex,
// unless the paint is unbound: then the value is a hex string and is a kit defect.
// A suffix like primary/80 is paint opacity. Instance props equal to the default are left out.
if (typeof ARGS !== 'object' || !ARGS || !Array.isArray(ARGS.ids)) throw new Error('Set ARGS.ids above this script.');
const vname = {}, vraw = {}, valpha = {};
for (const v of await figma.variables.getLocalVariablesAsync()) {
  const m = /^var\(--([\w-]+)\)$/.exec((v.codeSyntax && v.codeSyntax.WEB) || '');
  vname[v.id] = m ? m[1] : v.name;
  vraw[v.id] = v;
}
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
async function describe(n, top) {
  const o = { n: n.name };
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
    o.chars = n.characters.length > 60 ? n.characters.slice(0, 57) + '...' : n.characters;
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
    if (/^icon\//i.test(o.of)) { const g = n.children[0]; if (g && 'fills' in g) o.color = paints(g.fills); return o; }
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
    if (c) { o.stroke = { c }; const w = typeof n.strokeWeight === 'number' ? n.strokeWeight : [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight]; o.stroke.w = w; if (n.strokeAlign !== 'INSIDE') o.stroke.at = n.strokeAlign.toLowerCase(); if (n.dashPattern && n.dashPattern.length) o.stroke.dash = true; }
  }
  if (typeof n.cornerRadius === 'number' && n.cornerRadius > 0) o.radius = n.cornerRadius >= 500 ? 'full' : n.cornerRadius;
  if (typeof n.effectStyleId === 'string' && sname[n.effectStyleId]) o.effect = sname[n.effectStyleId];
  else if (n.effects && n.effects.length) {
    const e = n.effects.find((x) => x.type === 'DROP_SHADOW' && x.visible !== false);
    if (e && e.radius === 0 && e.spread) { const b = e.boundVariables && e.boundVariables.color; o.ring = { w: e.spread, c: b ? vname[b.id] : 'rgb(' + [e.color.r, e.color.g, e.color.b].map((x) => Math.round(x * 255)).join(' ') + ' / ' + r1(e.color.a) + ')' }; }
    else if (e) o.effect = 'unstyled shadow';
  }
  if ('children' in n && n.children.length) { o.kids = []; for (const c of n.children) o.kids.push(await describe(c, false)); }
  return o;
}
const flat = (o, path, acc) => {
  const self = {}; for (const k in o) if (k !== 'kids') self[k] = o[k];
  acc[path] = self;
  const count = {};
  for (const c of o.kids || []) { count[c.n] = (count[c.n] || 0) + 1; flat(c, path + '/' + c.n + (count[c.n] > 1 ? '#' + count[c.n] : ''), acc); }
  return acc;
};
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
const results = [];
for (const id of ARGS.ids) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { results.push({ id, error: 'not found' }); continue; }
  let r;
  if (n.type === 'COMPONENT_SET') {
    const defs = n.componentPropertyDefinitions, props = {};
    for (const k in defs) props[strip(k)] = defs[k].type === 'VARIANT' ? defs[k].variantOptions : { type: defs[k].type, default: defs[k].type === 'INSTANCE_SWAP' ? ((await figma.getNodeByIdAsync(defs[k].defaultValue)) || {}).name : defs[k].defaultValue };
    const base = n.defaultVariant;
    const baseTree = await describe(base, true);
    const baseFlat = flat(baseTree, '', {});
    const variants = {};
    for (const c of n.children) {
      if (c.id === base.id) continue;
      const f = flat(await describe(c, true), '', {});
      const d = {};
      for (const p in f) {
        if (!baseFlat[p]) { d[p || '/'] = f[p]; continue; }
        const diff = {};
        for (const k of new Set(Object.keys(f[p]).concat(Object.keys(baseFlat[p])))) if (k !== 'n' && JSON.stringify(f[p][k]) !== JSON.stringify(baseFlat[p][k])) diff[k] = f[p][k] === undefined ? null : f[p][k];
        if (Object.keys(diff).length) d[p || '/'] = diff;
      }
      for (const p in baseFlat) if (!f[p]) d[p] = null;
      variants[c.name] = d;
    }
    const full = { id, name: n.name, type: 'set', description: n.description, props, default: base.name, base: baseTree, variants };
    r = full; r.hash = fnv(JSON.stringify(full));
    if (ARGS.where) { const keep = {}; for (const k in variants) if (Object.keys(ARGS.where).every((a) => k.split(', ').indexOf(a + '=' + ARGS.where[a]) >= 0)) keep[k] = variants[k]; r.variants = keep; r.filtered = ARGS.where; }
  } else {
    const tree = await describe(n, true);
    r = { id, name: n.name, type: n.type === 'COMPONENT' ? 'component' : 'frame', tree };
    if (n.type === 'COMPONENT') r.description = n.description;
    r.hash = fnv(JSON.stringify(tree));
  }
  results.push(ARGS.hashOnly ? { id, name: r.name, hash: r.hash } : r);
}
return results;
