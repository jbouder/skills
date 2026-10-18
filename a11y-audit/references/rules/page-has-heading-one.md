---
id: page-has-heading-one
title: The page has no level-one heading
wcag: []
level: best-practice
impact: moderate
---

## The problem

The page has no `<h1>` and no other element exposed as a level-one heading (`role="heading"` with `aria-level="1"`). The `<h1>` names what the page is about and is where many screen reader users start reading: they press `1` or open the headings list to jump straight to it. Without one, they have to guess where the content begins.

Common causes are pages whose title is styled text in a `<div>`, pages that start at `<h2>` because the logo was once the `<h1>`, and SPAs where the heading renders only after data loads. The check passes if an `<h1>` exists in the page or in one of its frames, and passes automatically while a modal dialog is open. A visually hidden `<h1>` counts, but one hidden with `display: none` or `aria-hidden="true"` does not.

## Who it affects

- Screen reader users who navigate by headings to find the start of the main content.
- People using browser outline or reader-mode tools that rely on the heading structure.

## How to fix

Give every page one `<h1>` that describes its main content, ideally at the start of `<main>`. Then nest `<h2>` to `<h6>` below it in order.

```html
<!-- Before: the page title is just styled text -->
<main>
  <div class="page-title">Billing settings</div>
  <h2>Payment method</h2>
</main>

<!-- After -->
<main>
  <h1 class="page-title">Billing settings</h1>
  <h2>Payment method</h2>
</main>
```

```tsx
// Before: the heading only appears after data loads
{project && <h1>{project.name}</h1>}

// After: render a heading immediately, refine it when data arrives
<h1>{project ? project.name : 'Project'}</h1>
```

If the design has no visible title, add a visually hidden one with a screen-reader-only utility class such as `sr-only`, rather than leaving the page without an `<h1>`.

## Common false positives

- **Embedded documents and widgets** loaded in an iframe, such as a chat or payment frame, are often scanned as their own page and do not need an `<h1>`.
- **Pages scanned before rendering finished** may report this. Re-scan once the content has loaded.

## How to verify

Open a headings list with a screen reader or a headings extension and confirm there is a level 1 entry that names the page. Or run `document.querySelectorAll('h1')` in the console. Re-run the audit.

## References

- [WAI Tutorials: Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/)
- [MDN: The heading elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements)
- [axe rule: page-has-heading-one](https://dequeuniversity.com/rules/axe/4.13/page-has-heading-one)
