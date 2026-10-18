---
id: heading-order
title: A heading skips one or more levels
wcag: []
level: best-practice
impact: moderate
---

## The problem

axe found a heading that is more than one level deeper than the heading before it, such as an `<h2>` followed directly by an `<h4>`. Screen reader users often skim a page through its heading outline, and heading levels tell them how sections nest. A skipped level makes it look like a section is missing, or that content belongs to a different part of the page than it does.

Only going deeper is checked. Jumping back up any number of levels, such as from `<h4>` to `<h2>`, is fine. The first heading on the page is not checked against anything.

The usual cause is choosing a heading level for its default font size rather than its place in the outline.

## Who it affects

- Screen reader users navigating by headings, who get a misleading picture of the page structure.
- People using browser extensions or reader modes that build an outline from headings.

## How to fix

Choose the level based on the outline, then style it however you need with CSS.

```html
<!-- Before: h4 chosen because it looks smaller -->
<h1>Account settings</h1>
<h2>Profile</h2>
<h4>Display name</h4>

<!-- After -->
<h1>Account settings</h1>
<h2>Profile</h2>
<h3 class="text-sm">Display name</h3>
```

In component-based apps, a card or widget often hard-codes its heading level, which is wrong in some of the places it is used. Pass the level in:

```tsx
type HeadingLevel = 2 | 3 | 4 | 5 | 6;

function Card({ title, level = 3, children }: { title: string; level?: HeadingLevel; children: React.ReactNode }) {
  const H = `h${level}` as const;
  return (
    <section className="card">
      <H className="card-title">{title}</H>
      {children}
    </section>
  );
}

// On a page where cards sit directly under an h1:
<Card title="Recent orders" level={2}>...</Card>
```

If text is styled like a heading but does not start a section, such as a tagline or a large number on a stat tile, it should not be a heading at all. Use a `<p>` with a class.

## Common false positives

- **Headings inside iframes or embedded widgets** are counted in page order and can create skips you do not control. Fix the embed if possible; otherwise note it.
- **Headings hidden on some breakpoints** still count if they are exposed to assistive technology.

## How to verify

Use a headings outline tool, such as the HeadingsMap extension or the Accessibility Insights headings view, and confirm each level follows logically from the one before. Re-run the audit and confirm the rule no longer fires.

## References

- [WAI tutorial: Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/)
- [axe rule: heading-order](https://dequeuniversity.com/rules/axe/4.13/heading-order)
