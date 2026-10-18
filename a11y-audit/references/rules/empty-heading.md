---
id: empty-heading
title: A heading has no text
wcag: []
level: best-practice
impact: minor
---

## The problem

axe found an `<h1>` to `<h6>` (or `role="heading"`) element with no accessible text. Screen reader users often navigate a page by jumping from heading to heading, and an empty heading shows up in that list as a blank entry: they hear "heading level 2" and nothing else.

Empty headings usually come from one of these:

- A heading used for spacing or styling, with no content.
- A heading whose only content is an icon or an image with empty `alt`.
- A heading filled by JavaScript or a CMS field that was left blank.

## Who it affects

- Screen reader users navigating by headings, who hit blank stops and lose track of the page structure.

## How to fix

Give the heading real text, or remove it if it is not a heading.

```html
<!-- Before: used for spacing -->
<h2></h2>

<!-- After: use CSS for spacing -->
<div class="section-spacer"></div>
```

```html
<!-- Before: icon-only heading -->
<h2><img src="cart.svg" alt=""></h2>

<!-- After -->
<h2><img src="cart.svg" alt=""> Your cart</h2>
```

In React, do not render the heading element when there is nothing to put in it:

```tsx
// Before
<h3 className="card-title">{post.subtitle}</h3>

// After
{post.subtitle && <h3 className="card-title">{post.subtitle}</h3>}
```

If the heading must exist for structure but has no visible text in the design, visually hidden text is acceptable: `<h2 class="sr-only">Filters</h2>`.

## Common false positives

- **Headings filled after an async load** may be empty when axe scans. Re-scan after content has loaded; if it is still empty, render a heading only when it has content.
- **Headings hidden with `display: none`** are not checked.

## How to verify

Use a headings outline tool, such as the HeadingsMap extension or the Accessibility Insights headings view, and confirm no entry is blank. Re-run the audit and confirm the rule no longer fires.

## References

- [WAI tutorial: Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/)
- [axe rule: empty-heading](https://dequeuniversity.com/rules/axe/4.13/empty-heading)
