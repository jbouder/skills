---
id: scope-attr-valid
title: A table cell uses the scope attribute incorrectly
wcag: []
level: best-practice
impact: moderate
---

## The problem

The `scope` attribute tells assistive technology which cells a header cell labels. It only means something on a `<th>`, and it only accepts four values: `col`, `row`, `colgroup` and `rowgroup`. axe flags two mistakes: `scope` placed on a `<td>` in an HTML5 document, and a `scope` value that is not one of the four allowed keywords, such as `scope="column"`, `scope="header"` or `scope="true"`.

Browsers ignore an invalid `scope`, so the header relationship you intended is silently lost. Screen readers then fall back to guessing, which often works for simple tables and fails for anything with row headers or grouped columns.

## Who it affects

- Screen reader users navigating a table cell by cell, who rely on the header being announced as they move ("Price, 12 dollars").
- Users of other assistive technology that builds a table model from the markup.

## How to fix

Put `scope` only on `<th>` elements, and use one of the four valid values. If a cell is acting as a header, make it a `<th>` rather than adding `scope` to a `<td>`.

```html
<!-- Before -->
<table>
  <tr>
    <td scope="column">Plan</td>
    <td scope="column">Price</td>
  </tr>
  <tr>
    <td scope="row">Starter</td>
    <td>$12</td>
  </tr>
</table>

<!-- After -->
<table>
  <tr>
    <th scope="col">Plan</th>
    <th scope="col">Price</th>
  </tr>
  <tr>
    <th scope="row">Starter</th>
    <td>$12</td>
  </tr>
</table>
```

In React, `scope` is passed through as-is, so the same rules apply to typed props:

```tsx
// Before
<td scope="header">{plan.name}</td>
// After
<th scope="row">{plan.name}</th>
```

Use `colgroup` or `rowgroup` only when the header genuinely spans a group of columns or rows defined by `<colgroup>` or `<tbody>`.

## Common false positives

- **Legacy documents** without an HTML5 doctype are allowed to use `scope` on `<td>`. axe only fails `scope` on `<td>` when the page is HTML5, which is almost every modern page.
- **Layout tables** that are not data tables do not need `scope` at all. Remove the attribute rather than "fixing" it.

## How to verify

Inspect the table in DevTools and confirm every `scope` sits on a `<th>` and uses `col`, `row`, `colgroup` or `rowgroup`. With a screen reader, move across a row and down a column with table navigation keys and confirm the correct header is announced for each cell. Re-run the audit and confirm the rule no longer fires.

## References

- [MDN: the th element and its scope attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th#scope)
- [WAI Tables Tutorial: tables with two headers](https://www.w3.org/WAI/tutorials/tables/two-headers/)
- [axe rule: scope-attr-valid](https://dequeuniversity.com/rules/axe/4.13/scope-attr-valid)
