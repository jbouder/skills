---
id: bypass
title: There is no way to skip past repeated content to the main content
wcag: [2.4.1]
level: A
impact: serious
---

## The problem

Most pages repeat the same header, navigation, and sidebar on every page. Keyboard and screen reader users need a quick way to jump past those blocks to the main content. axe found none of the three mechanisms it looks for:

- A same-page link, such as a "Skip to main content" link.
- At least one heading (`<h1>` to `<h6>` or `role="heading"`).
- A `<main>` element or `role="main"` landmark.

Without any of these, a keyboard user may have to press Tab dozens of times on every page just to reach the content. axe reports this rule as needs review, and only checks pages that contain links.

## Who it affects

- Keyboard users, who must tab through every navigation link on every page.
- Screen reader users, who rely on landmarks and headings to jump around.
- Switch and voice control users, for whom every extra step is slow.

## How to fix

Add a `<main>` landmark around the primary content, a skip link as the first focusable element, and real headings. All three together is the robust fix.

```html
<!-- Before -->
<body>
  <div class="header">...</div>
  <div class="nav">...30 links...</div>
  <div class="content">
    <div class="title">Order history</div>
    ...
  </div>
</body>

<!-- After -->
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header>...</header>
  <nav aria-label="Main">...</nav>
  <main id="main" tabindex="-1">
    <h1>Order history</h1>
    ...
  </main>
</body>
```

```css
.skip-link { position: absolute; left: -9999px; }
.skip-link:focus { left: 1rem; top: 1rem; z-index: 1000; }
```

In a React single-page app, put the skip link and `<main>` in the root layout so every route gets them.

```tsx
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <Header />
      <main id="main" tabIndex={-1}>{children}</main>
    </>
  );
}
```

## Common false positives

- **Pages with very little repeated content**, such as a login page or a single-purpose embed, may not need a bypass mechanism. Confirm by tabbing through the page.

## How to verify

Load the page, press Tab once, and confirm a skip link appears and moves focus to the main content when activated. With a screen reader, use landmark navigation to jump to "main". Re-run the audit and confirm the rule no longer appears in needs review.

## References

- [Understanding SC 2.4.1 Bypass Blocks](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)
- [axe rule: bypass](https://dequeuniversity.com/rules/axe/4.13/bypass)
