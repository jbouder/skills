---
id: scrollable-region-focusable
title: A scrollable area can't be reached or scrolled with the keyboard
wcag: [2.1.1, 2.1.3]
level: A
impact: serious
---

## The problem

An element has content that overflows and scrolls (`overflow: auto` or `overflow: scroll`), but neither the element itself nor anything inside it can receive keyboard focus. A mouse or touch user can scroll it, but a keyboard user has no way to get focus into the region, so the arrow and Page Down keys never reach it and the hidden content is unreachable.

Some browsers now make scroll containers focusable automatically, but Safari does not, so you cannot rely on that. axe passes the region if it is in the tab order itself, is `contenteditable`, or contains at least one tabbable element. It skips combobox popups and regions whose overflowing content is empty.

Common culprits are code blocks, data tables in a fixed-height wrapper, chat logs, terms-of-service boxes, and side panels with `max-height`.

## Who it affects

- Keyboard-only users, who cannot read or reach content below the fold of the region.
- Screen reader users in browse mode may still read the text, but switch and voice-control users who scroll with keyboard commands cannot.

## How to fix

Make the scroll container focusable with `tabindex="0"`, and give it a role and an accessible name so screen readers announce what it is when it receives focus. Also make sure it has a visible focus style.

```html
<!-- Before -->
<div class="log" style="max-height: 300px; overflow: auto">
  <p>...</p>
</div>

<!-- After -->
<div
  class="log"
  style="max-height: 300px; overflow: auto"
  tabindex="0"
  role="region"
  aria-label="Build log"
>
  <p>...</p>
</div>
```

```tsx
// Before
<pre className="max-h-80 overflow-auto">{code}</pre>
// After
<pre
  className="max-h-80 overflow-auto focus-visible:outline-2"
  tabIndex={0}
  role="region"
  aria-label="Example code"
>
  {code}
</pre>
```

If the region already contains links or buttons spread throughout its content, keyboard users can scroll it by tabbing through them, and the rule passes. Often the better fix is to remove the fixed height so the content simply flows with the page.

## Common false positives

- **Regions with focusable children only at the top** pass the rule, but a keyboard user may still be unable to scroll to the text further down. Check these manually.
- **Hidden overflow used for animation** (for example a carousel track with `overflow: auto`) can be flagged. If the content is reachable some other way, such as next and previous buttons, this is acceptable.

## How to verify

Press Tab until focus lands on the region, confirm a visible focus indicator appears, then use the arrow keys and Page Down to scroll it. Test in Safari as well as Chrome. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- [Understanding SC 2.1.3 Keyboard (No Exception)](https://www.w3.org/WAI/WCAG22/Understanding/keyboard-no-exception.html)
- [axe rule: scrollable-region-focusable](https://dequeuniversity.com/rules/axe/4.13/scrollable-region-focusable)
