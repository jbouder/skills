---
id: empty-table-header
title: A table header cell has no visible text
wcag: []
level: best-practice
impact: minor
---

## The problem

axe found a `<th>` (or an element with `role="columnheader"` or `role="rowheader"`) with no text. Header cells name the column or row for every data cell under them. When a screen reader user moves through the table, the header is read before each cell value; with an empty header, a value like "42" is announced with no context.

For this rule, the text must be content inside the cell. An `aria-label` on the `<th>` does not count, although visually hidden text inside it does.

Common cases are a checkbox column for selecting rows, an "actions" column of edit and delete buttons, and the top-left corner cell of a two-way table.

## Who it affects

- Screen reader users, who hear values without knowing which column they belong to.

## How to fix

Put text in the header. If the design shows no text, use visually hidden text. If the cell is not really a header, make it a `<td>`.

```html
<!-- Before -->
<table>
  <tr>
    <th></th>
    <th>Name</th>
    <th></th>
  </tr>
  <tr>
    <td><input type="checkbox" aria-label="Select Ada Lovelace"></td>
    <td>Ada Lovelace</td>
    <td><button>Edit</button></td>
  </tr>
</table>

<!-- After -->
<table>
  <tr>
    <th><span class="sr-only">Select</span></th>
    <th>Name</th>
    <th><span class="sr-only">Actions</span></th>
  </tr>
  ...
</table>
```

```tsx
// Corner cell of a two-way table that has no meaning: use td
<tr>
  <td />
  {quarters.map((q) => <th key={q} scope="col">{q}</th>)}
</tr>
```

## Common false positives

- **Header text added by CSS** (for example via `::before` content) is not reliable. Put the text in the markup.
- **Icon-only headers** where the icon is an `<img>` with good `alt` text pass; ones using an icon font or background image do not.

## How to verify

With a screen reader, use table navigation to move across a row and confirm each cell is announced with a sensible column name. Re-run the audit and confirm the rule no longer fires.

## References

- [WAI tutorial: Tables](https://www.w3.org/WAI/tutorials/tables/)
- [axe rule: empty-table-header](https://dequeuniversity.com/rules/axe/4.13/empty-table-header)
