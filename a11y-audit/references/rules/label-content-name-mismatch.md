---
id: label-content-name-mismatch
title: A control's accessible name doesn't include its visible text
wcag: [2.5.3]
level: A
impact: serious
---

## The problem

A control such as a button, link, tab or menu item shows one label on screen, but an `aria-label` or `aria-labelledby` replaces it with a name that does not contain that visible text. For example, a button that reads "Send" but has `aria-label="Submit message"`. axe checks widgets whose role gets its name from content, and that have both visible text and an ARIA label, and fails them when the visible text is not contained in the accessible name (ignoring case).

This rule is tagged **experimental** in axe 4.13, so it only runs when experimental rules are enabled. Treat its results as strong hints.

## Who it affects

- Voice control users, who say what they see ("click Send") and get no response because the control is really named "Submit message".
- Screen reader users with partial sight, who hear a different label than the one on screen.

## How to fix

The simplest fix is to remove the `aria-label` so the visible text becomes the name. If you need extra context, keep the visible text at the start of the name and add to it.

```html
<!-- Before: visible "Send", name "Submit message" -->
<button aria-label="Submit message">Send</button>

<!-- After: name comes from the visible text -->
<button>Send</button>

<!-- After: visible text first, context appended -->
<button aria-label="Send message">Send</button>
```

For extra context, prefer visually hidden text over `aria-label`, so the visible words stay part of the name automatically:

```tsx
// Before
<a href={url} aria-label={`Article: ${title}`}>Read more</a>
// After
<a href={url}>
  Read more<span className="sr-only"> about {title}</span>
</a>
```

## Common false positives

- **Symbols and icon fonts**: text that is not human-readable, such as an "X" glyph or an icon ligature, is ignored or reported as needs review. A close button showing "X" with `aria-label="Close"` is acceptable.
- **Punctuation and abbreviations** such as "Qty" visible and "Quantity" as the name can be flagged. Matching the visible text exactly is still the safer choice.

## How to verify

Inspect the control in the DevTools Accessibility pane and confirm the computed name contains the visible label, ideally at the start. With voice control (macOS Voice Control or Dragon), say "click" plus the visible label and confirm it activates.

## References

- [Understanding SC 2.5.3 Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)
- [axe rule: label-content-name-mismatch](https://dequeuniversity.com/rules/axe/4.13/label-content-name-mismatch)
