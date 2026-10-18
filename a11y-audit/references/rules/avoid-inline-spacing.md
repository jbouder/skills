---
id: avoid-inline-spacing
title: Inline styles lock text spacing so users cannot adjust it
wcag: [1.4.12]
level: AA
impact: serious
---

## The problem

Some readers override a page's text spacing with a browser extension or custom stylesheet: more space between lines, letters, and words makes text much easier to read. axe found an inline `style` attribute that sets `line-height`, `letter-spacing`, or `word-spacing` with `!important` below the WCAG threshold. An inline `!important` declaration beats any user stylesheet, so the user's spacing is ignored.

The thresholds are:

- `line-height` at least **1.5** times the font size (only checked on text that wraps to multiple lines).
- `letter-spacing` at least **0.12em**.
- `word-spacing` at least **0.16em**.

The failure message shows the current value and the minimum.

## Who it affects

- People with dyslexia, low vision, or cognitive disabilities who rely on increased spacing to read.

## How to fix

Remove `!important` from the inline style. Better, move the spacing into a stylesheet, where user styles can override it.

```html
<!-- Before -->
<p style="line-height: 1.2 !important;">Long paragraph...</p>

<!-- After: no !important, user overrides work -->
<p style="line-height: 1.2;">Long paragraph...</p>
```

```css
/* Better: in a stylesheet */
.prose { line-height: 1.5; }
```

Inline `!important` spacing often comes from HTML produced by a rich-text editor or CMS, or from JavaScript that sets an important priority. Fix it at the source:

```js
// Before
el.style.setProperty("line-height", "1.2", "important");

// After
el.style.setProperty("line-height", "1.2");
```

For CMS content rendered with `dangerouslySetInnerHTML`, strip `line-height`, `letter-spacing`, and `word-spacing` declarations when you sanitize the HTML.

If you genuinely need `!important` on spacing, set the value at or above the threshold so it never blocks users from reaching the minimum.

Separately, make sure layouts do not break when users do increase spacing: avoid fixed heights on text containers and let content wrap.

## Common false positives

- **Single-line text** with a low `line-height !important` is not flagged, since line height only matters when text wraps.
- **Values already at or above the threshold** pass even with `!important`.

## How to verify

Remove the `!important` and apply a text-spacing bookmarklet or extension that sets line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, and paragraph spacing 2em. Confirm the spacing changes and no text is clipped or overlaps. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
- [axe rule: avoid-inline-spacing](https://dequeuniversity.com/rules/axe/4.13/avoid-inline-spacing)
