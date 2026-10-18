---
id: link-name
title: A link has no text for screen readers to announce
wcag: [2.4.4, 4.1.2]
level: A
impact: serious
---

## The problem

An `<a href>` has no accessible name. Screen readers announce it as just "link", or read out the URL, and the user cannot tell where it goes. axe passes a link that has visible text content, `aria-label`, `aria-labelledby`, or a non-empty `title`. It also fails a link that is in the tab order but has no name.

The most common causes are icon-only links (an SVG or icon font with no label), image links whose `<img>` has an empty or missing `alt`, and links that are empty placeholders, such as a card overlay link with no text.

## Who it affects

- Screen reader users, who hear "link" with no destination, often many times on one page.
- Voice control users, who have no name to say to follow the link.
- Keyboard users of some browsers that show the link name in the status bar.

## How to fix

Give the link text that describes its destination. For icon links, add visually hidden text or an `aria-label`, and hide the icon itself.

```html
<!-- Before: icon-only link -->
<a href="https://github.com/acme"><svg>...</svg></a>

<!-- After: visually hidden text -->
<a href="https://github.com/acme">
  <svg aria-hidden="true" focusable="false">...</svg>
  <span class="sr-only">Acme on GitHub</span>
</a>

<!-- Before: image link with empty alt -->
<a href="/"><img src="/logo.svg" alt=""></a>

<!-- After: alt describes the destination -->
<a href="/"><img src="/logo.svg" alt="Acme home"></a>
```

```tsx
// Before
<a href={profileUrl}><UserIcon /></a>
// After
<a href={profileUrl} aria-label="Your profile">
  <UserIcon aria-hidden="true" />
</a>
```

For a clickable card, put the link on the card heading and stretch its click area with CSS, rather than adding an empty overlay `<a>`.

## Common false positives

- **Links hidden from everyone** with `display: none` or `hidden` are not checked.
- **Anchors without `href`** are not links and are not checked. If they are clickable, they have a different problem: use a real link or button.
- A name from `title` alone passes this rule, but it is not visible to keyboard or touch users. Prefer real text.

## How to verify

Inspect the link in the DevTools Accessibility pane and confirm the computed name describes the destination. Open the screen reader links list (VoiceOver rotor or NVDA Insert+F7) and confirm no entry is blank or a raw URL.

## References

- [Understanding SC 2.4.4 Link Purpose (In Context)](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)
- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: link-name](https://dequeuniversity.com/rules/axe/4.13/link-name)
