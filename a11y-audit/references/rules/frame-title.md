---
id: frame-title
title: An iframe has no title describing its content
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

axe found an `<iframe>` or `<frame>` with no accessible name: no `title`, no `aria-label`, and no `aria-labelledby`. When a screen reader reaches the frame, it announces only "frame" or the file name from the URL, so the user cannot tell whether it holds a video, a map, a form, or an ad, and whether it is worth entering.

Embed codes from third parties often leave out `title`, and frames created by scripts (chat widgets, payment fields, analytics) frequently have none.

## Who it affects

- Screen reader users, who cannot tell what a frame contains before entering it.

## How to fix

Add a short `title` that describes the frame's content or purpose.

```html
<!-- Before -->
<iframe src="https://www.google.com/maps/embed?pb=..."></iframe>

<!-- After -->
<iframe src="https://www.google.com/maps/embed?pb=..." title="Map of our downtown office"></iframe>
```

```tsx
<iframe
  src={`https://player.vimeo.com/video/${videoId}`}
  title={`Video: ${videoTitle}`}
  allow="fullscreen"
/>
```

For frames injected by a third-party script, set the title after the frame is created if the vendor offers no option for it, and ask the vendor to add one.

If a frame is purely decorative or technical and contains nothing users need, hide it with `aria-hidden="true"` and `tabindex="-1"`. Frames with `tabindex="-1"` are not checked by this rule.

## Common false positives

- **Hidden tracking frames** that are not hidden from assistive technology will be flagged. Hide them properly, as described above, rather than titling them.

## How to verify

Select the iframe in the DevTools Accessibility pane and confirm the computed Name describes its content. With a screen reader, tab into the frame and listen. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: frame-title](https://dequeuniversity.com/rules/axe/4.13/frame-title)
