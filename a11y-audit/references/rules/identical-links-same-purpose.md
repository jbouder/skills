---
id: identical-links-same-purpose
title: Links with the same text go to different places
wcag: [2.4.9]
level: AAA
impact: minor
---

## The problem

Two or more links on the page have the same accessible name, such as "Read more" or "Details", but point to different URLs. Out of context, a user cannot tell them apart. axe groups links by their accessible name (ignoring case, punctuation and emoji) and compares their `href` values.

This rule never reports a hard violation. When same-named links go to different URLs, axe marks them as **needs review**, because only a human can decide whether the destinations serve the same purpose. Two "Home" links to `/` and `/index.html` are fine; three "Read more" links to three different articles are not.

## Who it affects

- Screen reader users who navigate by pulling up a list of links, where every entry reads "Read more".
- Voice control users, who say "click Read more" and get asked which of several matches they meant.
- People with cognitive disabilities, who benefit from link text that says where it goes.

## How to fix

Give each link text that describes its own destination. Visible text is best. If the design requires short visible text, extend the accessible name with visually hidden text, and keep the visible words at the start of the name.

```html
<!-- Before: three identical names, three destinations -->
<a href="/blog/caching">Read more</a>
<a href="/blog/testing">Read more</a>

<!-- After: descriptive visible text -->
<a href="/blog/caching">Read more about caching</a>

<!-- After: short visible text, full name for assistive tech -->
<a href="/blog/testing">Read more<span class="sr-only"> about testing</span></a>
```

```tsx
// Before
<a href={post.url}>Read more</a>
// After
<a href={post.url}>
  Read more<span className="sr-only"> about {post.title}</span>
</a>
```

Making the whole card title the link and removing the separate "Read more" link is often the cleanest fix.

## Common false positives

- **Links that do the same thing** with different URLs, such as a logo and a "Home" link, or URLs that differ only in tracking parameters. Mark these as reviewed and move on.
- **Links that are intentionally ambiguous** to everyone, for example in a game or puzzle.

## How to verify

Open the screen reader links list (VoiceOver rotor or NVDA Insert+F7) and check that each name makes sense on its own. Search the DOM for repeated link text and confirm each repeat goes to an equivalent destination.

## References

- [Understanding SC 2.4.9 Link Purpose (Link Only)](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-link-only.html)
- [axe rule: identical-links-same-purpose](https://dequeuniversity.com/rules/axe/4.13/identical-links-same-purpose)
