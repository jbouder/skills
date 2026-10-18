---
id: summary-name
title: A disclosure summary has no accessible name
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

The first `<summary>` inside a `<details>` element has no text, so the browser exposes it as an expand/collapse button with no name. Screen readers announce only "button, collapsed," and users cannot tell what will be revealed. This usually happens when the summary contains only an icon, such as a chevron SVG or an icon-font glyph. axe accepts visible text, `aria-label`, `aria-labelledby` or a `title`.

## Who it affects

- Screen reader users, who hear an unnamed button.
- Voice control users, who have no name to say.
- Sighted users, too, when an icon alone does not explain what the section contains.

## How to fix

Put visible text in the summary. Hide decorative icons.

```html
<!-- Before -->
<details>
  <summary><svg aria-hidden="true">...</svg></summary>
  <p>Returns are accepted within 30 days.</p>
</details>

<!-- After -->
<details>
  <summary>Return policy <svg aria-hidden="true">...</svg></summary>
  <p>Returns are accepted within 30 days.</p>
</details>
```

```tsx
// Before
<details><summary><ChevronIcon /></summary>{children}</details>
// After
<details>
  <summary>
    {title} <ChevronIcon aria-hidden="true" />
  </summary>
  {children}
</details>
```

If the visible design has no text, use `aria-label` on the `<summary>`, but visible text is preferred.

## Common false positives

- **Extra `<summary>` elements** after the first are not interactive and are not checked.
- **Summaries in a shadow DOM slot** are skipped by axe, so check web components manually.

## How to verify

With a screen reader, tab to the summary and confirm it announces a meaningful name plus its expanded or collapsed state. In the DevTools Accessibility pane, confirm the summary has a name. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: summary-name](https://dequeuniversity.com/rules/axe/4.13/summary-name)
