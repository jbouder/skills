---
id: th-has-data-cells
title: A table header cell has no data cells under or beside it
wcag: [1.3.1]
level: A
impact: serious
---

## The problem

A data table contains a `<th>` (or an element with `role="columnheader"` or `role="rowheader"`) that does not describe any data cell. A column header should have data cells below it, and a row header should have data cells to its right. axe walks down from each column header and right from each row header, and fails the table if a non-empty header labels nothing. A header also passes if a cell references its `id` through `headers` or `aria-labelledby`.

This usually means the markup does not match the visual structure: a `<th>` used for a decorative label, a header row for a column that was removed, `<th>` cells used for a whole row of totals, or a table where every cell was made a `<th>` for styling.

## Who it affects

- Screen reader users, who hear header announcements that relate to nothing and lose track of which header applies to which value.

## How to fix

Make sure every header labels real data. Change cells that hold data into `<td>`, remove headers for columns that no longer exist, and set `scope` so the header's direction is explicit.

```html
<!-- Before: every cell is a th, so the headers have no data cells -->
<table>
  <tr><th>Name</th><th>Role</th></tr>
  <tr><th>Ada</th><th>Engineer</th></tr>
</table>

<!-- After -->
<table>
  <tr><th scope="col">Name</th><th scope="col">Role</th></tr>
  <tr><th scope="row">Ada</th><td>Engineer</td></tr>
</table>
```

If the `<th>` was used only to get bold text, use a `<td>` and style it with CSS instead:

```tsx
// Before
<th className="font-bold">{row.total}</th>
// After
<td className="font-bold">{row.total}</td>
```

When a table has no data at all yet, such as an empty search result, render a message instead of a header row with no body rows.

## Common false positives

- **Empty tables** waiting for data are reported as "needs review" rather than a violation. Show an empty-state message instead of an empty table.
- **Layout tables** are skipped because axe only checks data tables. If a layout table is being treated as data, remove the `<th>` elements or replace the table with CSS layout.

## How to verify

Look at each header and confirm there is at least one non-empty data cell below it (for column headers) or to its right (for row headers). With a screen reader, use table navigation to move through the cells and confirm each header is announced with real values. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [axe rule: th-has-data-cells](https://dequeuniversity.com/rules/axe/4.13/th-has-data-cells)
