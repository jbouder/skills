---
id: table-fake-caption
title: A table uses a spanning cell as a fake caption instead of a caption element
wcag: [1.3.1]
level: A
impact: serious
---

## The problem

The first row of a data table is a single cell that spans every column, styled to look like a title. Visually it reads as the table's caption, but to assistive technology it is just another cell, so the table has no programmatic name, and the "title" row can confuse the header structure of every column underneath it.

HTML has a dedicated element for this: `<caption>`. It names the table, it is announced when a screen reader user enters the table, and it shows up in table lists.

This rule is tagged **experimental** in axe 4.13, so it may not run unless experimental rules are enabled.

## Who it affects

- Screen reader users, who hear the title as a data cell and may hear it repeated as a column header for every cell.
- Users who navigate by a list of tables and need each one to have a name.

## How to fix

Move the title text into a `<caption>` as the first child of the `<table>`, and delete the spanning row. Style the caption however you like.

```html
<!-- Before -->
<table>
  <tr>
    <td colspan="3" class="table-title">Shipping rates</td>
  </tr>
  <tr>
    <th scope="col">Zone</th>
    <th scope="col">Standard</th>
    <th scope="col">Express</th>
  </tr>
  ...
</table>

<!-- After -->
<table>
  <caption class="table-title">Shipping rates</caption>
  <tr>
    <th scope="col">Zone</th>
    <th scope="col">Standard</th>
    <th scope="col">Express</th>
  </tr>
  ...
</table>
```

```tsx
<table>
  <caption className="text-left text-lg font-semibold">Shipping rates</caption>
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

If the design needs the title outside the table, use a heading and point the table at it with `aria-labelledby`.

## Common false positives

- **Layout tables** are not checked, because axe only runs this on tables it judges to be data tables. If a flagged table is purely for layout, replace it with CSS layout instead.
- **A genuine spanning header row**, such as a group header above several columns, can look similar. If the row really labels the columns below it, make it a `<th>` with `colspan` and `scope="colgroup"`.

## How to verify

Inspect the table and confirm the first child is a `<caption>` and there is no full-width title row. In the DevTools Accessibility pane, the table's name should match the caption. With a screen reader, entering the table should announce the caption. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [axe rule: table-fake-caption](https://dequeuniversity.com/rules/axe/4.13/table-fake-caption)
