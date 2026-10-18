---
id: frame-title-unique
title: Two or more iframes have the same title
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

axe found more than one `<iframe>` or `<frame>` with the same `title`. Screen readers use the title to name each frame, and many let users list frames or jump between them. When several frames share a title, such as two embeds both titled "YouTube video player", users cannot tell which is which without entering each one.

axe reports this rule as needs review, since identical titles are acceptable when the frames genuinely show the same content.

## Who it affects

- Screen reader users, who cannot distinguish between frames in a frames list or when tabbing into them.

## How to fix

Give each frame a title that describes its specific content.

```html
<!-- Before -->
<iframe src="https://www.youtube.com/embed/abc" title="YouTube video player"></iframe>
<iframe src="https://www.youtube.com/embed/xyz" title="YouTube video player"></iframe>

<!-- After -->
<iframe src="https://www.youtube.com/embed/abc" title="Video: Getting started with the dashboard"></iframe>
<iframe src="https://www.youtube.com/embed/xyz" title="Video: Setting up billing"></iframe>
```

```tsx
// Before: embed component hard-codes the title
<iframe src={`https://www.youtube.com/embed/${id}`} title="YouTube video player" />

// After: title comes from the content
<iframe src={`https://www.youtube.com/embed/${id}`} title={`Video: ${videoTitle}`} />
```

Copy-pasted embed codes from video and map providers almost always carry a generic title. Update it every time you paste one.

## Common false positives

- **Frames that show the same content**, for example the same map embedded twice at different sizes, can share a title. Mark the result as reviewed.

## How to verify

Run `[...document.querySelectorAll('iframe')].map(f => f.title)` in the DevTools console and confirm the titles are distinct. With a screen reader, open the frames list and confirm each is identifiable. Re-run the audit and confirm the rule no longer appears in needs review.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: frame-title-unique](https://dequeuniversity.com/rules/axe/4.13/frame-title-unique)
