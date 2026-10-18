---
id: document-title
title: The page has no title
wcag: [2.4.2]
level: A
impact: serious
---

## The problem

The document has no `<title>` element, or the `<title>` is empty. The page title is the first thing a screen reader announces when a page loads, and it is what appears in the browser tab, history, bookmarks, and search results. Without one, users cannot tell which page they are on or tell tabs apart.

Single-page apps often have one static title, or none, in `index.html` and never update it when the route changes.

## Who it affects

- Screen reader users, who hear the URL or nothing when the page loads.
- People with cognitive disabilities who juggle several tabs.
- Everyone scanning browser tabs and history.

## How to fix

Add a unique, descriptive `<title>` to every page. Put the page-specific part first and the site name last.

```html
<!-- Before -->
<head>
  <meta charset="utf-8">
</head>

<!-- After -->
<head>
  <meta charset="utf-8">
  <title>Order history | Acme Store</title>
</head>
```

In a React single-page app, update the title on every route change. React 19 hoists a `<title>` rendered anywhere in the tree into `<head>`:

```tsx
export function OrdersPage() {
  return (
    <>
      <title>Order history | Acme Store</title>
      <h1>Order history</h1>
    </>
  );
}
```

On older React versions, set `document.title` in an effect, or use your framework's metadata API (for example `export const metadata = { title: "..." }` in the Next.js App Router).

Reflect important state in the title as well, such as "Error: Checkout | Acme Store" after a failed submission, or "Search results for 'boots'".

## Common false positives

- **Titles set by JavaScript after load** may be missed if axe scanned before the app rendered. Re-scan after the page settles; if it still fires, the title is not being set.

## How to verify

Look at the browser tab, or run `document.title` in the DevTools console, on each page and after each route change. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 2.4.2 Page Titled](https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html)
- [axe rule: document-title](https://dequeuniversity.com/rules/axe/4.13/document-title)
