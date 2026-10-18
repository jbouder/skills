---
id: landmark-no-duplicate-main
title: The page has more than one main landmark
wcag: []
level: best-practice
impact: moderate
---

## The problem

The page contains two or more visible main landmarks, from `<main>` elements or `role="main"`. There should be exactly one primary content area. Screen reader users use a single shortcut to jump to main, and with two of them they cannot tell which holds the real content. The HTML specification also allows only one visible `<main>` per document.

This usually happens when both a layout component and a page component render `<main>`, or when a route transition keeps the old page's `<main>` mounted next to the new one. Mains hidden from screen readers, for example with the `hidden` attribute, are not counted.

## Who it affects

- Screen reader users who jump to the main landmark.
- Keyboard users of landmark navigation extensions.

## How to fix

Pick one component to own `<main>`, normally the app shell or layout, and have pages render a `<div>` or fragment.

```html
<!-- Before -->
<main>
  <main id="content">
    <h1>Settings</h1>
  </main>
</main>

<!-- After -->
<main id="content">
  <h1>Settings</h1>
</main>
```

```tsx
// Before: both layout and page render <main>
function Layout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>;
}
function SettingsPage() {
  return <main><h1>Settings</h1></main>;
}

// After: only the layout does
function SettingsPage() {
  return <div><h1>Settings</h1></div>;
}
```

For single-page apps that keep several views mounted, add the `hidden` attribute to every inactive `<main>`.

## Common false positives

- **Hidden alternates** with the `hidden` attribute or `display: none` are ignored, so they will not trigger this.
- **Iframe documents** have their own main and do not count against the parent page.

## How to verify

Run `document.querySelectorAll('main, [role=main]')` in the console and confirm only one is visible. With a screen reader, open the landmarks list and confirm "main" appears once. Re-run the audit.

## References

- [ARIA APG: Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [MDN: The main element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main)
- [axe rule: landmark-no-duplicate-main](https://dequeuniversity.com/rules/axe/4.13/landmark-no-duplicate-main)
