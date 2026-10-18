---
id: landmark-main-is-top-level
title: The main landmark is nested inside another landmark
wcag: []
level: best-practice
impact: moderate
---

## The problem

The `<main>` element (or `role="main"`) is inside another landmark, such as a `<header>`, `<nav>`, `<aside>`, a labeled `<section>` or `role="region"`. The main landmark is where screen reader users jump to skip past navigation and get to the page content. When it is nested, the landmark list shows a confusing hierarchy and the shortcut to "main" lands somewhere unexpected.

A plain `<form>` without an explicit role does not count as a containing landmark for this check.

## Who it affects

- Screen reader users who press a single key to jump to the main content.
- Keyboard users who rely on landmark navigation extensions.

## How to fix

Make `<main>` a top-level sibling of the site `<header>` and `<footer>`. If you wrapped the page in a labeled `<section>` or `role="region"`, remove that wrapper or turn it into a plain `<div>`.

```html
<!-- Before: main inside a labeled region -->
<section aria-label="Page">
  <main>
    <h1>Orders</h1>
  </main>
</section>

<!-- After -->
<div class="page">
  <main>
    <h1>Orders</h1>
  </main>
</div>
```

```tsx
// Before: a Layout renders <main> inside <AppShell>, which is already <main>
function AppShell({ children }: { children: React.ReactNode }) {
  return <div role="main">{children}</div>;
}
<AppShell><main>{page}</main></AppShell>

// After: exactly one component owns <main>
function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">{children}</div>;
}
<AppShell><main>{page}</main></AppShell>
```

## Common false positives

- **Embedded documents** such as an iframe with its own `<main>` are evaluated separately and are fine.
- **Generic wrappers** like `<div>` never cause this. If it fires, look for an ancestor with an explicit landmark `role` or a `<section>` that has an `aria-label`.

## How to verify

In the DevTools Accessibility tree, confirm main is not a descendant of another landmark. With a screen reader, use the landmark shortcut to jump to main and confirm it lands at the start of the page content. Re-run the audit.

## References

- [ARIA APG: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [MDN: The main element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main)
- [axe rule: landmark-main-is-top-level](https://dequeuniversity.com/rules/axe/4.13/landmark-main-is-top-level)
