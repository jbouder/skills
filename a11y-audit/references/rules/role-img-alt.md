---
id: role-img-alt
title: An element with role="img" has no text alternative
wcag: [1.1.1]
level: A
impact: serious
---

## The problem

An HTML element such as a `<div>`, `<span>` or `<i>` has `role="img"` but no accessible name. The role tells screen readers "this is an image," so they announce it, but with no name all the user hears is "image" or nothing at all. This is common with CSS background images, emoji wrappers, icon fonts and star-rating widgets. axe accepts `aria-label`, `aria-labelledby`, or a non-empty `title` attribute. SVG elements are covered by `svg-img-alt` instead.

## Who it affects

- Screen reader users, who hear "image" with no indication of what it shows.
- Voice control users, who cannot refer to it.

## How to fix

Add an `aria-label` describing what the image conveys. If the element is decorative, remove `role="img"` and hide it instead.

```html
<!-- Before -->
<div class="rating" role="img">
  <span class="star"></span><span class="star"></span><span class="star"></span>
</div>

<!-- After -->
<div class="rating" role="img" aria-label="Rated 3 out of 5 stars">
  <span class="star"></span><span class="star"></span><span class="star"></span>
</div>
```

```tsx
// Before
<span role="img">🎉</span>
// After: meaningful emoji
<span role="img" aria-label="Celebration">🎉</span>
// After: decorative emoji, removed from the accessibility tree
<span aria-hidden="true">🎉</span>
```

If the element is a real photo or illustration, a native `<img src="..." alt="...">` is better than `role="img"` on a `<div>` with a background image.

## Common false positives

- **Decorative elements** that have `role="img"` by mistake are real failures, but the fix is to remove the role and add `aria-hidden="true"`, not to invent a label.

## How to verify

In the DevTools Accessibility pane, select the element and confirm its role is img and its name describes the content. With a screen reader, confirm it is announced meaningfully or skipped if decorative. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)
- [axe rule: role-img-alt](https://dequeuniversity.com/rules/axe/4.13/role-img-alt)
