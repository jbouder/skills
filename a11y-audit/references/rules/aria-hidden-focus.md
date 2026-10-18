---
id: aria-hidden-focus
title: Hidden content still contains elements that receive keyboard focus
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

An element has `aria-hidden="true"`, which removes it and everything inside it from the accessibility tree. But it contains a link, button, input, or other element that can still receive keyboard focus. When a keyboard user tabs onto it, the screen reader has nothing to announce: focus lands on an invisible "ghost" control.

Typical causes are off-screen menus and carousels hidden with `aria-hidden` instead of being truly hidden, and decorative wrappers marked `aria-hidden` that happen to contain a link.

## Who it affects

- Screen reader users, who hear silence or a confusing announcement when focus lands inside hidden content.
- Sighted keyboard users, who may see focus disappear into content that is visually hidden.

## How to fix

Pick the option that matches your intent.

If the content should be completely hidden, hide it for everyone. `hidden` or `display: none` removes it from both the screen and the tab order.

```html
<!-- Before -->
<nav class="drawer closed" aria-hidden="true">
  <a href="/account">Account</a>
</nav>

<!-- After -->
<nav class="drawer" hidden>
  <a href="/account">Account</a>
</nav>
```

If it must stay visible but non-interactive (for example, slides not currently shown in a carousel), use `inert`, which removes it from the tab order and the accessibility tree together.

```tsx
<div className="slide" inert={!isActive}>
  <a href={slide.href}>{slide.title}</a>
</div>
```

If the element is purely decorative and duplicates a link elsewhere, remove the focusable child or give it `tabindex="-1"`.

```html
<div class="card-image" aria-hidden="true">
  <a href="/post/42" tabindex="-1"><img src="cover.jpg" alt=""></a>
</div>
<h3><a href="/post/42">Post title</a></h3>
```

Do not use `aria-hidden` on content that keyboard users need to reach.

## Common false positives

- **Content hidden while a modal is open**: axe reports this as needs review, since focus may be trapped in the modal. Confirm Tab cannot reach the hidden content.
- **Focusable elements that immediately move focus elsewhere**, such as focus sentinels in a focus trap, are also reported as needs review.

## How to verify

Press Tab through the page and watch for focus landing on something you cannot see or that the screen reader does not announce. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [MDN: inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert)
- [axe rule: aria-hidden-focus](https://dequeuniversity.com/rules/axe/4.13/aria-hidden-focus)
