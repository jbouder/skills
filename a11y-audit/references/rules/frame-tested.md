---
id: frame-tested
title: The scanner could not test the content inside an iframe
wcag: []
level: best-practice
impact: critical
---

## The problem

axe tests iframe content by running inside each frame and reporting back to the top page. For this frame, that did not happen, so nothing inside it was checked. This is not an accessibility defect in your markup. It is a gap in coverage: the frame may contain any number of real issues that this report does not show.

axe reports this rule as needs review. Common reasons the frame was not tested:

- axe-core was never loaded inside the frame. axe only tests frames that also have axe-core running, so the scanner must inject it into every frame, including cross-origin ones.
- The frame had not finished loading, or timed out, when the scan ran.
- The frame is sandboxed or blocked by a Content Security Policy in a way that prevents script injection.
- The frame's `src` failed to load, or it is a `data:` or `about:blank` frame filled in later by script.

## Who it affects

- Everyone using the embedded content, since any problems inside it are unreported.

## How to fix

Make sure the frame's content gets tested, either in place or on its own.

Scan the frame's URL directly as its own page:

```html
<!-- The page embeds this frame -->
<iframe src="/widgets/calendar" title="Booking calendar"></iframe>
<!-- Add /widgets/calendar to the list of URLs the audit scans -->
```

If the frame loads slowly, wait for it before scanning, for example in a Playwright script:

```js
await page.waitForLoadState("networkidle");
await page.frameLocator('iframe[title="Booking calendar"]').locator("body").waitFor();
```

For third-party embeds you cannot change, such as payment forms, maps, or chat widgets, ask the vendor for an accessibility conformance report (ACR or VPAT), and test the embed manually with a keyboard and a screen reader.

## Common false positives

- **Frames that are empty or purely decorative**, such as ad slots or tracking frames, can be ignored, ideally after hiding them with `aria-hidden="true"` and `tabindex="-1"`.

## How to verify

Re-run the audit after the frame has fully loaded and confirm the rule no longer appears in needs review, and that results now include elements inside the frame.

## References

- [MDN: the iframe element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
- [axe rule: frame-tested](https://dequeuniversity.com/rules/axe/4.13/frame-tested)
