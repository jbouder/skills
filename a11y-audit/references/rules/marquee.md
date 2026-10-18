---
id: marquee
title: The page uses a scrolling marquee element
wcag: [2.2.2]
level: A
impact: serious
---

## The problem

The page contains a visible `<marquee>` element. It is obsolete HTML that scrolls text continuously, and it gives users no built-in way to pause, stop or hide the movement. WCAG requires that any moving content that starts automatically and lasts more than 5 seconds can be paused, stopped or hidden. axe flags every `<marquee>` that is rendered on screen.

## Who it affects

- People with attention or cognitive disabilities, who find constant motion distracting.
- People with low vision or reading disabilities, who cannot read text before it scrolls away.
- Screen reader users, since support for `<marquee>` is inconsistent.

## How to fix

Replace the marquee with static text. If the content really must animate, build it with CSS and give users a visible pause control, and respect reduced-motion preferences.

```html
<!-- Before -->
<marquee>Free shipping on orders over $50!</marquee>

<!-- After -->
<p class="promo">Free shipping on orders over $50!</p>
```

```css
/* If you animate, stop it for users who ask for less motion */
@media (prefers-reduced-motion: reduce) {
  .ticker { animation: none; }
}
```

## Common false positives

- None in practice. A `<marquee>` hidden with `display: none` is not flagged, so any result points at a visible element.

## How to verify

Search the codebase for `<marquee` and confirm no instances remain. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- [axe rule: marquee](https://dequeuniversity.com/rules/axe/4.13/marquee)
