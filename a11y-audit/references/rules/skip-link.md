---
id: skip-link
title: A skip link points to a target that does not exist
wcag: []
level: best-practice
impact: moderate
---

## The problem

A "skip to content" style link points to an `id` that is not on the page, so activating it does nothing. Skip links let keyboard users bypass repeated navigation, and a broken one is worse than none because it promises a shortcut and then leaves focus at the top of the page.

axe treats a link as a skip link when its `href` points to the same page (for example `#main`) and it appears before the first link to another page. It only checks skip links that are hidden off screen until focused. It fails when no element matches the fragment, and asks for review when the target exists but is hidden from screen readers.

Common causes: the `id` on `<main>` was renamed or removed, the target is rendered later by client-side code, or the link uses a fragment like `#` or `#/route` meant for a router.

## Who it affects

- Keyboard users, who would otherwise tab through every navigation link on every page.
- Screen reader users and switch users who use skip links to reach content quickly.

## How to fix

Make the `href` match an element `id` that is always rendered. Pointing at `<main>` is the most robust choice.

```html
<!-- Before: no element with id="content" -->
<a class="skip-link" href="#content">Skip to main content</a>
<main id="main">...</main>

<!-- After -->
<a class="skip-link" href="#main">Skip to main content</a>
<main id="main" tabindex="-1">...</main>
```

`tabindex="-1"` on the target lets browsers move focus to it reliably without adding it to the tab order.

```tsx
// Keep the link and its target in the same layout so they cannot drift apart
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <SiteHeader />
      <main id="main" tabIndex={-1}>{children}</main>
    </>
  );
}
```

Make sure the skip link becomes visible when focused, for example with a `.skip-link:focus` style that brings it on screen.

## Common false positives

- **Hash-based routers** use links like `#/settings` that look like same-page links. If such a link appears off screen before other links, axe may treat it as a skip link. Use path-based routing or real paths for those links.
- **Targets rendered after hydration** may not exist when the scan runs. Re-scan after the page has fully loaded.

## How to verify

Load the page, press Tab once to reveal the skip link, press Enter, then press Tab again. Focus should move to the first focusable item inside the main content, not back into the header. Re-run the audit.

## References

- [WCAG Technique G1: Adding a link at the top of each page that goes directly to the main content area](https://www.w3.org/WAI/WCAG22/Techniques/general/G1)
- [MDN: Linking to an element on the same page](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#linking_to_an_element_on_the_same_page)
- [axe rule: skip-link](https://dequeuniversity.com/rules/axe/4.13/skip-link)
