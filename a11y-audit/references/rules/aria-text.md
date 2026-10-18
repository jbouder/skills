---
id: aria-text
title: An element with role="text" contains focusable elements
wcag: []
level: best-practice
impact: serious
---

## The problem

`role="text"` is a non-standard role supported mainly by VoiceOver on Apple platforms. It flattens everything inside it into a single string so that text split across several tags, such as a price `<span>$</span><span>19</span>`, is read in one go. axe found `role="text"` on an element that contains a link, button, or other focusable element.

Flattening removes the semantics of everything inside, so a link inside `role="text"` is no longer announced as a link, even though it still receives keyboard focus. Users land on something they cannot identify.

## Who it affects

- VoiceOver users on macOS and iOS, who reach a control that is announced as plain text.
- Keyboard users of other screen readers, where behavior with this non-standard role is unpredictable.

## How to fix

Keep interactive elements out of `role="text"`. Apply the role only to the static text that needs to be read as one string, or remove it.

```html
<!-- Before -->
<p role="text">
  Read our <a href="/terms">terms</a> before continuing.
</p>

<!-- After: no role needed -->
<p>
  Read our <a href="/terms">terms</a> before continuing.
</p>
```

```tsx
// Before
<span role="text">
  <span>$19</span><span>.99</span> <a href="/pricing">Details</a>
</span>

// After: role="text" only wraps the static price
<span>
  <span role="text"><span>$19</span><span>.99</span></span>{" "}
  <a href="/pricing">Details</a>
</span>
```

## Common false positives

- None in practice. If a focusable element is inside, it loses its role for VoiceOver users.

## How to verify

Use VoiceOver to navigate to the content and confirm the link or button is announced with its role. Re-run the audit and confirm the rule no longer fires.

## References

- [APG: Read Me First (no ARIA is better than bad ARIA)](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)
- [axe rule: aria-text](https://dequeuniversity.com/rules/axe/4.13/aria-text)
