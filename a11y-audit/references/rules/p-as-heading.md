---
id: p-as-heading
title: A paragraph is styled to look like a heading but is not marked up as one
wcag: [1.3.1]
level: A
impact: serious
---

## The problem

A `<p>` element is styled as a heading (bold, italic or noticeably larger than the paragraph after it) and is followed by regular text, so sighted users see a heading but assistive technology sees an ordinary paragraph. Screen reader users cannot find it in the headings list or jump to it, and the structure of the page is lost.

axe compares the `<p>` with the next `<p>` sibling. It flags it when the text is short (at most half the length of the next paragraph) and, compared with that paragraph, it is heavier (by 150 or more font-weight units) and italic, heavier or italic plus at least 1.15 times the font size, or at least 1.4 times the font size. Paragraphs containing two or more sentences are skipped, and cases inside a `<blockquote>` are reported for review. This rule is **experimental** in axe 4.13, so it only runs when the scanner enables experimental rules.

## Who it affects

- Screen reader users who navigate by headings or skim the headings list.
- Users of reader modes and outline tools that build a table of contents from headings.

## How to fix

Use a real heading element at the correct level and style it with CSS. Pick the level from the document outline, not from the size you want.

```html
<!-- Before -->
<p><strong>Shipping options</strong></p>
<p>We ship to most countries within five business days.</p>

<!-- After -->
<h2>Shipping options</h2>
<p>We ship to most countries within five business days.</p>
```

```tsx
// Before: a styled paragraph used as a section title
<p className="text-xl font-bold">Shipping options</p>

// After: semantic heading with the same look
<h2 className="text-xl font-bold">Shipping options</h2>
```

If a component needs a flexible level, accept it as a prop, for example `as: 'h2' | 'h3'`, rather than rendering a `<p>`.

## Common false positives

- **Lead-in text or pull quotes** that are deliberately emphasized, such as a bold intro sentence, are not headings. Leave them as paragraphs if they do not introduce a section.
- **Short labels inside cards** like a bold price above a description may be flagged. Decide whether it actually names a section of content.

## How to verify

Open a headings list with a screen reader or a headings extension and confirm every visual section title appears at a sensible level. Re-run the audit with experimental rules enabled.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [axe rule: p-as-heading](https://dequeuniversity.com/rules/axe/4.13/p-as-heading)
