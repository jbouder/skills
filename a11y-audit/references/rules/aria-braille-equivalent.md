---
id: aria-braille-equivalent
title: A braille-only label or role description has no regular equivalent
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

`aria-braillelabel` and `aria-brailleroledescription` let you supply a shorter version of a name or role description for refreshable braille displays. They are only meant to abbreviate something that already exists. axe found one of these two cases:

- `aria-braillelabel` on an element that has no accessible name at all.
- `aria-brailleroledescription` on an element with no `aria-roledescription`, or an empty one.

In both cases, braille users get text that speech users never hear, and the element may still have no real name. axe reports this rule as needs review.

## Who it affects

- Screen reader users using speech, who get no name or role description.
- Braille display users, who may get an abbreviation without the full text to fall back on.

## How to fix

Give the element a normal accessible name or role description first, then add the braille version only if an abbreviation genuinely helps.

```html
<!-- Before: braille label but no accessible name -->
<button aria-braillelabel="snd">
  <svg aria-hidden="true"><!-- icon --></svg>
</button>

<!-- After -->
<button aria-label="Send" aria-braillelabel="snd">
  <svg aria-hidden="true"><!-- icon --></svg>
</button>
```

```html
<!-- Before: braille role description with no aria-roledescription -->
<section aria-brailleroledescription="sld" aria-label="Quarterly results">...</section>

<!-- After -->
<section
  aria-roledescription="slide"
  aria-brailleroledescription="sld"
  aria-label="Quarterly results"
>...</section>
```

In most apps the right answer is to remove both braille attributes. Screen readers already have braille contraction and abbreviation settings that users configure themselves.

## Common false positives

- **Names computed from complex content** can leave axe unable to decide whether a name exists. Check the element's computed name in DevTools.

## How to verify

Open the DevTools Accessibility pane, select the element, and confirm it has a non-empty name (and role description, if used). Re-run the audit and confirm the rule no longer appears in needs review.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: aria-braille-equivalent](https://dequeuniversity.com/rules/axe/4.13/aria-braille-equivalent)
