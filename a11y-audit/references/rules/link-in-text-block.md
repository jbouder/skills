---
id: link-in-text-block
title: A link inside a paragraph can only be told apart by its color
wcag: [1.4.1]
level: A
impact: serious
---

## The problem

A link sits inside a block of text and the only thing that marks it as a link is its color. Often the underline was removed with `text-decoration: none`. axe checks links that appear within running text and passes them if either is true:

- The link has a non-color style that sets it apart from the surrounding text, such as an underline, a border, or a different font weight or style.
- The link text has a contrast ratio of at least **3:1** against the surrounding text color, or the link's background contrasts 3:1 with the surrounding background.

axe reports the measured ratio between the link color and the surrounding text color. Links that stand alone, such as navigation menus or buttons, are not checked.

## Who it affects

- People with color-vision deficiency, who may see blue link text and black body text as the same color.
- People with low vision or using high-contrast or grayscale modes.
- Anyone reading on a low-quality or washed-out screen.

## How to fix

The most reliable fix is to keep the underline on links within text. Style it if you want, but keep it.

```css
/* Before: color is the only cue */
p a { color: #2563eb; text-decoration: none; }

/* After: underline restored and tuned */
p a {
  color: #1d4ed8;
  text-decoration: underline;
  text-underline-offset: 0.15em;
  text-decoration-thickness: 1px;
}
```

With Tailwind, scope it to prose so navigation links are unaffected:

```tsx
// Before
<p>Read our <a className="text-blue-600 no-underline" href="/terms">terms</a>.</p>
// After
<p>Read our <a className="text-blue-700 underline underline-offset-2" href="/terms">terms</a>.</p>
```

Relying on 3:1 contrast against the surrounding text is allowed by this rule, but the text also needs 4.5:1 against the background, and very few color pairs satisfy both. WCAG technique G183 also expects a visual cue on hover and focus. An underline avoids all of that.

## Common false positives

- **Links that are visually separate**, such as a list of links or a link styled as a button, may be picked up if they are inline. If the link is clearly not part of a sentence, the result can be ignored.
- **Background images, gradients and pseudo-element styles** can make axe report "needs review" because it cannot measure the difference. Check those by eye.

## How to verify

View the page in grayscale (DevTools Rendering panel, emulate achromatopsia) and confirm every link within text is still identifiable. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [axe rule: link-in-text-block](https://dequeuniversity.com/rules/axe/4.13/link-in-text-block)
