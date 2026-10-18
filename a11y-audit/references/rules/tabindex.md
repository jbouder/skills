---
id: tabindex
title: An element has a positive tabindex that changes the keyboard order
wcag: []
level: best-practice
impact: serious
---

## The problem

An element has a `tabindex` greater than 0, such as `tabindex="1"` or `tabindex="99"`. Positive values pull the element out of the natural order: the browser visits every positive-tabindex element first, in numeric order, and only then the rest of the page in source order. The result is focus jumping around the page in a sequence that does not match what users see, and it breaks the moment anyone adds a new control.

Only `tabindex="0"` (add to the natural tab order) and `tabindex="-1"` (focusable by script, not by Tab) are safe values.

## Who it affects

- Keyboard users, who see focus jump unpredictably and may skip content.
- Screen reader users, whose reading and focus order no longer match.
- Users with cognitive disabilities, who rely on a predictable order.

## How to fix

Remove the positive value. If the element is natively focusable (links, buttons, inputs), remove `tabindex` entirely. If it is a custom control that must be focusable, use `tabindex="0"`. If the order is wrong, change the order of the elements in the DOM rather than overriding it.

```html
<!-- Before: search box forced to be first -->
<input type="search" tabindex="1" aria-label="Search">
<a href="/" tabindex="2">Home</a>

<!-- After: natural order; move the search field earlier in the markup if it should come first -->
<input type="search" aria-label="Search">
<a href="/">Home</a>
```

```tsx
// Before
<div tabIndex={3} onClick={toggle}>Filters</div>

// After: use a native button, which is focusable and keyboard operable
<button type="button" onClick={toggle}>Filters</button>
```

If CSS such as `order`, `flex-direction: row-reverse` or grid placement moves things visually, fix the DOM order to match the visual order instead of compensating with tabindex.

## Common false positives

- There are very few. A positive tabindex is almost never the right solution. Even on a page with a single positive value, it still forces that element ahead of everything else.

## How to verify

Click in the address bar, then press Tab repeatedly through the page. Focus should move top to bottom and left to right, following the visual layout. In the console, `document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex^="-"])')` lists remaining offenders. Re-run the audit.

## References

- [MDN: tabindex](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex)
- [ARIA APG: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [axe rule: tabindex](https://dequeuniversity.com/rules/axe/4.13/tabindex)
