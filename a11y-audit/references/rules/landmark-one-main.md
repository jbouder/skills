---
id: landmark-one-main
title: The page has no main landmark
wcag: []
level: best-practice
impact: moderate
---

## The problem

The page has no `<main>` element and no element with `role="main"` that is exposed to screen readers. The main landmark marks where the page's primary content starts. Without it, screen reader users have no one-key way to skip the header and navigation, and landmark-based skip features do nothing.

The rule is evaluated once per page, on the `<html>` element. It passes automatically while a modal dialog is open, since the page behind is inert. A `<main>` hidden with `display: none`, `hidden` or `aria-hidden="true"` does not count.

## Who it affects

- Screen reader users who jump to main content with a landmark shortcut.
- Keyboard users who rely on landmark navigation extensions or skip links that target main.

## How to fix

Wrap the primary content of every page in a single `<main>`. Use the native element rather than `role="main"` on a `<div>`.

```html
<!-- Before -->
<header>...</header>
<div id="content">
  <h1>Invoices</h1>
  ...
</div>
<footer>...</footer>

<!-- After -->
<header>...</header>
<main id="content">
  <h1>Invoices</h1>
  ...
</main>
<footer>...</footer>
```

```tsx
// Before
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="content">{children}</div>
    </>
  );
}

// After
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="content">{children}</main>
    </>
  );
}
```

## Common false positives

- **Pages scanned mid-load**, such as a SPA still showing a spinner, may not have rendered `<main>` yet. Re-scan after the app has finished loading.
- **Embedded pages and iframes** such as payment widgets are their own documents and do not need a main.

## How to verify

In the console, run `document.querySelector('main, [role=main]')` and confirm it returns the content area. With a screen reader, use the main landmark shortcut and confirm it lands at the start of the content. Re-run the audit.

## References

- [ARIA APG: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [MDN: The main element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main)
- [axe rule: landmark-one-main](https://dequeuniversity.com/rules/axe/4.13/landmark-one-main)
