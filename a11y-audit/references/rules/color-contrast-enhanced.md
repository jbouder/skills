---
id: color-contrast-enhanced
title: Text doesn't meet the enhanced (AAA) contrast ratio against its background
wcag: [1.4.6]
level: AAA
impact: serious
---

## The problem

The text and background colors do not meet the stricter AAA contrast requirement. WCAG 2.2 AAA requires a contrast ratio of at least **7:1** for normal text and **4.5:1** for large text, which means 24px and up, or 18.66px and up when bold. axe reports the measured ratio, the two colors it compared, and the ratio this text needed.

This rule is disabled by default in axe because most organizations target AA, where the regular `color-contrast` rule applies (4.5:1 and 3:1). If you see it, your scan explicitly opted into AAA checks. Text can pass AA and still fail here.

## Who it affects

- People with moderately low vision who do not use assistive technology such as screen magnifiers.
- Older users and people with reduced contrast sensitivity.
- Anyone reading in glare or on a low-quality display.

## How to fix

Increase the contrast until it reaches 7:1 (or 4.5:1 for large text). Darkening body text is usually the least disruptive change. Fix the values at the design-token level.

```css
/* Before: 4.54:1 on white, passes AA, fails AAA */
.body-text { color: #767676; }

/* After: 7.0:1 on white */
.body-text { color: #595959; }
```

```css
:root {
  --text-default: #1f1f1f; /* about 16:1 on white */
  --text-muted: #595959;   /* about 7:1 on white, was #767676 */
}
```

```tsx
// Before: gray-500 is not enough for AAA on white
<p className="text-gray-500">{summary}</p>
// After: gray-700 clears 7:1 on white
<p className="text-gray-700">{summary}</p>
```

If meeting AAA everywhere is not a goal, prioritize body text and long-form reading content, and consider offering a high-contrast theme.

## Common false positives

- **Disabled controls, logos, and decorative text** are exempt, as with the AA rule.
- **Gradients, background images, and overlapping elements** can make axe report needs review because it cannot determine the background. Check those manually.

## How to verify

Use the DevTools color picker, which shows the ratio with both AA and AAA thresholds, or enter both colors into the WebAIM Contrast Checker. Re-run the audit with the rule enabled and confirm it no longer fires.

## References

- [Understanding SC 1.4.6 Contrast (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html)
- [axe rule: color-contrast-enhanced](https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced)
