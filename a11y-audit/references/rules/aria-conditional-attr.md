---
id: aria-conditional-attr
title: An ARIA attribute conflicts with how this element is being used
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

Some ARIA attributes are only valid under certain conditions. axe flags two cases:

- **`aria-checked` on a native checkbox or radio** (`<input type="checkbox">` or `<input type="radio">`) that does not match the input's real state. The browser exposes the real `checked` state, so a stale or contradictory `aria-checked` gives assistive technology two answers.
- **Tree attributes on table or grid rows**: `aria-posinset`, `aria-setsize`, `aria-expanded`, and `aria-level` are only supported on rows inside a `role="treegrid"`. On a row in a regular `<table>` or a `role="grid"`, they are ignored.

The failure message names the attribute and, for checkboxes, the value that would match the real state.

## Who it affects

- Screen reader users, who may hear "checked" for a box that is unchecked, or miss that a row can be expanded.

## How to fix

For native checkboxes and radios, remove `aria-checked` and let the `checked` attribute or property carry the state. For the mixed state, set the `indeterminate` property in JavaScript.

```html
<!-- Before -->
<input type="checkbox" id="terms" aria-checked="true">
<label for="terms">I agree</label>

<!-- After -->
<input type="checkbox" id="terms" checked>
<label for="terms">I agree</label>
```

```tsx
// Before
<input type="checkbox" checked={allSelected} aria-checked={someSelected ? "mixed" : allSelected} />

// After: use the indeterminate property instead of aria-checked
<input
  type="checkbox"
  checked={allSelected}
  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
  onChange={toggleAll}
/>
```

For expandable rows, either remove the tree attributes from a plain table, or turn the widget into a real tree grid if rows really do expand and collapse.

```html
<!-- Before: aria-expanded on a row in a plain table -->
<table>
  <tr aria-expanded="false"><td>Q1 totals</td></tr>
</table>

<!-- After: put the state on a button inside the row -->
<table>
  <tr>
    <td><button type="button" aria-expanded="false" aria-controls="q1-detail">Q1 totals</button></td>
  </tr>
</table>
```

## Common false positives

- **Third-party table libraries** sometimes add `aria-expanded` to rows for grouping. Check whether the library offers a tree grid mode or a button-based expand control.

## How to verify

Inspect the element in the DevTools Accessibility pane and confirm the Checked or Expanded state matches what you see on screen. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [APG: Treegrid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/)
- [axe rule: aria-conditional-attr](https://dequeuniversity.com/rules/axe/4.13/aria-conditional-attr)
