// kit-ui: kit index and contract audit. Run through the Figma MCP's use_figma tool. Read-only.
// Returns every component in the file (name, id, page, behavior hint), the icon
// names (components named Icon/<Name>), and the places the kit breaks references/kit-contract.md.
// Optional: `const ARGS = { skipPages: ['Cover'] };` on a line above this script.
const A = typeof ARGS === 'object' && ARGS ? ARGS : {};
const skip = A.skipPages || [];
const findings = [];
const flag = (rule, where, detail) => findings.push({ rule, where, detail });
// Variables
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
if (!cols.length) flag('variables', 'file', 'No local variable collections.');
const colorCols = cols.filter((c) => vars.some((v) => v.variableCollectionId === c.id && v.resolvedType === 'COLOR'));
for (const c of colorCols) if (!c.modes.some((m) => /dark/i.test(m.name))) flag('modes', c.name, 'Color collection has no Dark mode.');
const seen = {};
for (const v of vars) {
  const web = (v.codeSyntax && v.codeSyntax.WEB) || '';
  if (!web) flag('code-syntax', v.name, 'No WEB code syntax.');
  else if (!/^var\(--[\w-]+\)$/.test(web) && !/^calc\(.+\)$/.test(web)) flag('code-syntax', v.name, 'WEB code syntax is not var(--name) or calc(): ' + web);
  else if (/^var/.test(web)) { if (seen[web]) flag('code-syntax', v.name, 'Same CSS name as ' + seen[web] + ': ' + web); seen[web] = v.name; }
  if (v.scopes.indexOf('ALL_SCOPES') >= 0) flag('scopes', v.name, 'Scopes are ALL_SCOPES.');
}
if (!(await figma.getLocalTextStylesAsync()).length) flag('text-styles', 'file', 'No local text styles.');
// Components
const components = [], icons = [];
for (const page of figma.root.children) {
  if (skip.indexOf(page.name) >= 0 || /^(-|_)/.test(page.name)) continue;
  await page.loadAsync();
  for (const n of page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) {
    if (n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET') continue;
    const desc = n.description || '';
    const beh = /^Behavior:\s*(.+)$/m.exec(desc);
    const isIcon = /^icon\//i.test(n.name);
    if (isIcon) { icons.push(n.name.replace(/^icon\//i, '')); continue; }
    components.push({ name: n.name, id: n.id, page: page.name, behavior: beh ? beh[1].trim() : null });
    if (!desc) flag('description', n.name, 'No description.');
    else if (!beh) flag('behavior', n.name, 'Description has no "Behavior:" line.');
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
// `components` and `icons` go into kit.lock.json as they are.
return { collections: cols.map((c) => ({ name: c.name, modes: c.modes.map((m) => m.name), variables: c.variableIds.length })), components, icons, findings };
