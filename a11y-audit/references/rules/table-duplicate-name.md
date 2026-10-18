---
id: table-duplicate-name
title: A table's caption and summary repeat the same text
wcag: []
level: best-practice
impact: minor
---

## The problem

The table has a `<caption>` and a `summary` attribute whose text is identical (ignoring case and extra whitespace). Some screen readers announce both, so users hear the same sentence twice before reaching the data.

The two were meant to do different jobs. The `<caption>` is the table's visible title. The `summary` attribute was meant to describe how the table is organized, and it is obsolete in HTML5, so it should not be used in new code at all.

## Who it affects

- Screen reader users, who hear redundant announcements every time they enter the table.

## How to fix

Keep the `<caption>` and remove the `summary` attribute. If the table's structure genuinely needs explaining, put that explanation in visible text, or inside the caption, or connect it with `aria-describedby`.

```html
<!-- Before -->
<table summary="Quarterly revenue by region">
  <caption>Quarterly revenue by region</caption>
  ...
</table>

<!-- After -->
<table aria-describedby="revenue-note">
  <caption>Quarterly revenue by region</caption>
  ...
</table>
<p id="revenue-note">Regions are listed in rows; quarters run across columns.</p>
```

```tsx
// Before
<table summary={title}>
  <caption>{title}</caption>
</table>
// After
<table>
  <caption>{title}</caption>
</table>
```

## Common false positives

- This rule rarely produces false positives. If axe reports "needs review", it could not inspect the table's children, which can happen with unusual DOM structures. Check the markup by hand.

## How to verify

Inspect the `<table>` and confirm there is no `summary` attribute, or that its text differs from the caption. With a screen reader, move into the table and confirm the title is announced only once. Re-run the audit and confirm the rule no longer fires.

## References

- [MDN: the caption element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption)
- [WAI Tables Tutorial: caption and summary](https://www.w3.org/WAI/tutorials/tables/caption-summary/)
- [axe rule: table-duplicate-name](https://dequeuniversity.com/rules/axe/4.13/table-duplicate-name)
