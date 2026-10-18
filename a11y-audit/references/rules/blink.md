---
id: blink
title: The page uses the obsolete blink element
wcag: [2.2.2]
level: A
impact: serious
---

## The problem

axe found a `<blink>` element. It is obsolete and no modern browser makes it blink, but it signals content that was meant to flash on and off, and blinking content that users cannot pause is a WCAG failure. Some older browsers and tools may still render it blinking.

## Who it affects

- People with attention or cognitive disabilities, who find moving content distracting.
- People with low vision, who cannot read text that keeps disappearing.

## How to fix

Remove the element and use static emphasis instead.

```html
<!-- Before -->
<blink>Sale ends today!</blink>

<!-- After -->
<strong class="callout">Sale ends today!</strong>
```

Do not recreate blinking with CSS animations. If you need attention-grabbing motion, keep it under five seconds, provide a way to pause it, and respect `prefers-reduced-motion`.

## Common false positives

- None. The element should always be removed.

## How to verify

Search the codebase for `<blink`. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- [axe rule: blink](https://dequeuniversity.com/rules/axe/4.13/blink)
