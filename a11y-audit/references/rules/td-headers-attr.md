---
id: td-headers-attr
title: A table cell's headers attribute points to cells that aren't valid headers
wcag: [1.3.1]
level: A
impact: serious
---

## The problem

A cell uses the `headers` attribute to list the ids of the header cells that describe it, but at least one of those ids is wrong. axe fails the cell when an id:

- does not exist in the same table (a typo, a stale id, or an id in a different table),
- points to a data cell (`<td>`) instead of a header cell (`<th>`), or
- points to the cell itself.

An empty `headers=""` is reported as "needs review". When the references are broken, screen readers either announce nothing or announce the wrong header, which is worse than no header at all.

## Who it affects

- Screen reader users reading complex tables, who rely on the explicit header associations to understand each value.

## How to fix

Make every id in `headers` match the `id` of a `<th>` in the same table. Generate ids from the same data the headers come from so they cannot drift.

```html
<!-- Before -->
<table>
  <tr>
    <th id="item">Item</th>
    <td id="price">Price</td>
  </tr>
  <tr>
    <td headers="itme">Coffee</td>
    <td headers="price">$3</td>
  </tr>
</table>

<!-- After -->
<table>
  <tr>
    <th id="item" scope="col">Item</th>
    <th id="price" scope="col">Price</th>
  </tr>
  <tr>
    <td headers="item">Coffee</td>
    <td headers="price">$3</td>
  </tr>
</table>
```

```tsx
// Build ids from the column key so the reference always matches
<th id={`${tableId}-${col.key}`} scope="col">{col.label}</th>
...
<td headers={`${tableId}-${col.key}`}>{row[col.key]}</td>
```

For most tables, `headers` is unnecessary: `<th>` with `scope="col"` or `scope="row"` is simpler and less fragile. Reserve `headers` for tables with multiple levels of headers.

## Common false positives

- **Duplicate ids across components**: if the same table component renders twice with hard-coded ids, a cell can point at a header in the other table. This is a real bug; prefix ids with a unique value such as React's `useId()`.

## How to verify

For each flagged cell, search the DOM for each id in its `headers` and confirm it is a `<th>` inside the same `<table>`. With a screen reader, move into the cell and confirm the expected headers are announced. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [axe rule: td-headers-attr](https://dequeuniversity.com/rules/axe/4.13/td-headers-attr)
