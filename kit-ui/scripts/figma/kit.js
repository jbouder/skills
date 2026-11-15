// kit-ui: kit index and contract audit. Run through the Figma MCP's use_figma tool. Read-only.
// Returns every component in the file (name, id, page, behavior hint), the icon
// names, and the places the kit breaks references/kit-contract.md.
// Optional: `const ARGS = {...};` on a line above this script. Every key is optional and
// comes from the `adapter` block of kit.json (see references/adapter.md):
//   skipPages  page names to leave out, without their emoji prefix
//   iconPage   every component on this page is an icon, whatever its name
//   names      { derive, ignoreSyntax, map }: where a variable's CSS name comes from
//   behavior   { 'Component name': 'hint' }: used when a description has no Behavior: line
//   stateAxes  axis names to accept as the State axis, besides "State"
const A = typeof ARGS === 'object' && ARGS ? ARGS : {};
const clean = (s) => s.replace(/^[^A-Za-z0-9]+/, '').trim();
const skip = (A.skipPages || []).map(clean);
const findings = [];
const flag = (rule, where, detail) => findings.push({ rule, where, detail });
// Variables
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const colName = {};
for (const c of cols) colName[c.id] = c.name;
if (!cols.length) flag('variables', 'file', 'No local variable collections.');
const colorCols = cols.filter((c) => vars.some((v) => v.variableCollectionId === c.id && v.resolvedType === 'COLOR'));
// A one-mode color collection holds primitives. Only a collection with modes, or a file with no Dark at all, is a finding.
for (const c of colorCols) if (c.modes.length > 1 && !c.modes.some((m) => /dark/i.test(m.name))) flag('modes', c.name, 'Color collection has modes but no Dark mode.');
if (colorCols.length && !colorCols.some((c) => c.modes.some((m) => /dark/i.test(m.name)))) flag('modes', 'file', 'No color collection has a Dark mode.');
// The CSS name of a variable: the adapter's map, else its WEB code syntax, else derived from its name.
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
const aliasOf = (a, b) => { const vals = Object.values(a.valuesByMode); return vals.length > 0 && vals.every((x) => x && x.type === 'VARIABLE_ALIAS' && x.id === b.id); };
const seen = {};
let derived = 0;
for (const v of vars) {
  const web = (v.codeSyntax && v.codeSyntax.WEB) || '';
  const n = cssOf(v);
  if (n === null) flag('code-syntax', v.name, web ? 'WEB code syntax is not var(--name) or calc(): ' + web : 'No WEB code syntax.');
  else if (n) {
    // Two variables may share a name when one is only an alias of the other (a semantic radius over a primitive one).
    if (seen[n] && !aliasOf(v, seen[n]) && !aliasOf(seen[n], v)) flag('code-syntax', v.name, 'Same CSS name as ' + seen[n].name + ': ' + n);
    seen[n] = v;
    if (!/^var\(/.test(web) || (N.ignoreSyntax || []).indexOf(colName[v.variableCollectionId]) >= 0) derived++;
  }
  if (v.scopes.indexOf('ALL_SCOPES') >= 0) flag('scopes', v.name, 'Scopes are ALL_SCOPES.');
}
if (!(await figma.getLocalTextStylesAsync()).length) flag('text-styles', 'file', 'No local text styles.');
// Components
const B = A.behavior || {};
const mapped = (name) => {
  if (B[name]) return B[name];
  for (const k in B) if (k.slice(-1) === '*' && name.indexOf(k.slice(0, -1)) === 0) return B[k];
  return null;
};
const stateAxes = ['state'].concat((A.stateAxes || []).map((s) => s.toLowerCase()));
const iconPage = A.iconPage ? clean(A.iconPage) : null;
const components = [], icons = [];
let iconCount = 0;
for (const page of figma.root.children) {
  const pname = clean(page.name);
  if (!pname || /^(-|_|=)/.test(page.name) || skip.indexOf(pname) >= 0) continue;
  await page.loadAsync();
  for (const n of page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) {
    if (n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET') continue;
    if (iconPage ? pname === iconPage : /^icon\//i.test(n.name)) { iconCount++; if (!iconPage) icons.push(n.name.replace(/^icon\//i, '')); continue; }
    if (/^[_.]/.test(n.name)) continue; // Figma's own mark for a private component
    const desc = n.description || '';
    const beh = /^Behavior:\s*(.+)$/m.exec(desc);
    const hint = beh ? beh[1].trim() : mapped(n.name);
    components.push({ name: n.name, id: n.id, page: pname, behavior: hint });
    if (!hint) flag(desc ? 'behavior' : 'description', n.name, desc ? 'Description has no "Behavior:" line.' : 'No description.');
    if (n.type === 'COMPONENT_SET') {
      let defs = {};
      try { defs = n.componentPropertyDefinitions; } catch (e) { flag('names', n.name, 'The set has conflicting variants: ' + String(e.message || e).slice(0, 80)); }
      for (const k in defs) if (defs[k].type === 'VARIANT' && stateAxes.indexOf(k.toLowerCase()) < 0 && (defs[k].variantOptions || []).some((o) => /^(hover|focus|focused)$/i.test(o))) flag('state-axis', n.name, 'Axis "' + k + '" holds interaction states but is not named State.');
    }
    // Raw paints: a fill or stroke that is not bound to a variable.
    const roots = n.type === 'COMPONENT_SET' ? n.children : [n];
    let raw = 0;
    for (const r of roots) for (const x of [r].concat(r.findAll((y) => !y.id.startsWith('I')))) {
      for (const key of ['fills', 'strokes']) {
        const ps = x[key];
        if (Array.isArray(ps)) for (const p of ps) if (p.visible !== false && p.type === 'SOLID' && !(p.boundVariables && p.boundVariables.color)) raw++;
      }
    }
    if (raw) flag('raw-paint', n.name, raw + ' fill or stroke paints are not bound to a variable.');
  }
}
const names = {};
for (const c of components) { if (names[c.name]) flag('names', c.name, 'Two components share this name (pages ' + names[c.name] + ' and ' + c.page + ').'); names[c.name] = c.page; }
// `components` and `icons` go into kit.lock.json as they are. With an icon page, `icons` is { page, count }.
return { collections: cols.map((c) => ({ name: c.name, modes: c.modes.map((m) => m.name), variables: c.variableIds.length })), derivedNames: derived, components, icons: iconPage ? { page: iconPage, count: iconCount } : icons, findings };
