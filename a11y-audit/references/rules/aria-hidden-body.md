---
id: aria-hidden-body
title: The whole page is hidden from assistive technology
wcag: [1.3.1, 4.1.2]
level: A
impact: critical
---

## The problem

The `<body>` element has `aria-hidden="true"`. That removes the entire page from the accessibility tree. Screen readers have nothing to read, even though everything still looks normal on screen and keyboard focus still moves through the page.

This is almost always a side effect of a modal or drawer library that hides "everything else" while a dialog is open and either targets the wrong element or fails to clean up when the dialog closes.

## Who it affects

- Screen reader users, for whom the page is completely silent or empty.
- Users of other assistive technology that reads the accessibility tree, such as some voice control and switch tools.

## How to fix

Never put `aria-hidden` on `<body>`. To hide background content while a modal is open, use the native `<dialog>` element with `showModal()`, which makes the rest of the page inert automatically.

```html
<!-- Before -->
<body aria-hidden="true">
  <main>...</main>
  <div role="dialog" aria-modal="true">...</div>
</body>

<!-- After: native modal dialog -->
<body>
  <main>...</main>
  <dialog id="confirm" aria-labelledby="confirm-title">...</dialog>
</body>
<script>
  document.getElementById("confirm").showModal();
</script>
```

If you need a custom modal, render it as a sibling of the app root and set `inert` on the app root, not on `<body>`:

```tsx
useEffect(() => {
  const root = document.getElementById("root");
  if (!root) return;
  root.inert = open;
  return () => { root.inert = false; };
}, [open]);
```

If a library is setting the attribute, check that the dialog's portal container is outside the element it hides, and that the cleanup runs on close and on unmount.

## Common false positives

- **Scanning while a modal is mid-transition** can catch a library's temporary state. Re-scan with the modal fully closed. If the attribute is still on `<body>`, it is a real bug.

## How to verify

In the DevTools Elements panel, confirm `<body>` has no `aria-hidden` attribute, both with a modal open and after closing it. With a screen reader, confirm page content is announced. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: aria-hidden-body](https://dequeuniversity.com/rules/axe/4.13/aria-hidden-body)
