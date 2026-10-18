---
id: object-alt
title: An embedded object has no text alternative
wcag: [1.1.1]
level: A
impact: serious
---

## The problem

An `<object>` element that loaded content (via its `data` attribute) has no accessible name. Objects often embed images, PDFs, SVG files or other documents, and without a name a screen reader announces only something like "object" or skips it, so users have no idea what is there. axe accepts `aria-label`, `aria-labelledby`, a non-empty `title`, or `role="none"`/`role="presentation"` for decorative content.

Note that fallback text placed inside `<object>` is only shown when the object fails to load, so axe does not count it as the accessible name.

## Who it affects

- Screen reader users, who cannot tell what the embedded content is or whether it matters.
- Voice control users, who have no name to refer to it by.

## How to fix

Give the object a short name describing what it contains. Keep fallback content inside as well, for browsers that cannot render it.

```html
<!-- Before -->
<object data="/reports/q3.pdf" type="application/pdf" width="600" height="800"></object>

<!-- After -->
<object data="/reports/q3.pdf" type="application/pdf" width="600" height="800"
        aria-label="Q3 2025 sales report (PDF)">
  <a href="/reports/q3.pdf">Download the Q3 2025 sales report (PDF)</a>
</object>
```

If the object is an image, a native `<img>` with `alt` is usually the better choice:

```tsx
// Before
<object data="/diagram.svg" type="image/svg+xml" />
// After
<img src="/diagram.svg" alt="Request flow from browser to API gateway to database" />
```

If the embedded content is purely decorative, hide it from assistive technology with `role="presentation"`.

## Common false positives

- **Objects that failed to load** are not checked, so a result always means the object rendered content.
- **Decorative embeds** that axe flags should get `role="presentation"` rather than a meaningless name like "object".

## How to verify

In the browser DevTools Accessibility pane, select the `<object>` and confirm it has a meaningful name. With a screen reader, move to it and confirm what it contains is announced. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)
- [axe rule: object-alt](https://dequeuniversity.com/rules/axe/4.13/object-alt)
