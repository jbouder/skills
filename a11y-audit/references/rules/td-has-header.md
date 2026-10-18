---
id: td-has-header
title: Data cells in a large table have no header to explain them
wcag: [1.3.1]
level: A
impact: critical
---

## The problem

The table is a data table of at least 3 by 3 cells, and one or more non-empty `<td>` cells have no associated header. Nothing in the markup says which row or column heading applies, so a screen reader announces a bare value such as "42" with no context about what it measures.

Usually the header row was built with `<td>` and bold styling instead of `<th>`, or the table has a `<thead>` but the row labels on the left are plain `<td>`s. axe treats a cell as covered if it has a header through `<th>` placement, `scope`, the `headers` attribute, or its own accessible label.

This rule is tagged **experimental** in axe 4.13, so it may not run unless experimental rules are enabled.

## Who it affects

- Screen reader users, who move through tables cell by cell and depend on hearing the row and column header with each value.
- Users of braille displays, who see only one cell at a time.

## How to fix

Mark up header cells as `<th>` and add `scope` so the direction is unambiguous.

```html
<!-- Before -->
<table>
  <tr>
    <td><b>Region</b></td><td><b>Q1</b></td><td><b>Q2</b></td>
  </tr>
  <tr>
    <td>North</td><td>42</td><td>51</td>
  </tr>
</table>

<!-- After -->
<table>
  <tr>
    <th scope="col">Region</th><th scope="col">Q1</th><th scope="col">Q2</th>
  </tr>
  <tr>
    <th scope="row">North</th><td>42</td><td>51</td>
  </tr>
</table>
```

```tsx
<thead>
  <tr>
    {columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}
  </tr>
</thead>
<tbody>
  {rows.map((r) => (
    <tr key={r.id}>
      <th scope="row">{r.name}</th>
      {r.values.map((v, i) => <td key={i}>{v}</td>)}
    </tr>
  ))}
</tbody>
```

For complex tables with multiple header levels, give each `<th>` an `id` and list the relevant ids in each cell's `headers` attribute.

## Common false positives

- **Layout tables** are not data tables. If a flagged table only arranges content visually, replace it with CSS grid or flexbox, or add `role="presentation"`.
- **Empty header cells**, such as the blank top-left corner, do not count as headers. That is fine as long as every data cell still has at least one non-empty header.

## How to verify

In DevTools, confirm the header row and row labels are `<th>` elements. With a screen reader, use table navigation (Ctrl+Alt+arrow keys in NVDA, VO+arrow keys in VoiceOver) to move across and down, and confirm each cell is announced with its header. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [axe rule: td-has-header](https://dequeuniversity.com/rules/axe/4.13/td-has-header)
