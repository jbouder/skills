---
id: hidden-content
title: Some content was hidden during the scan and was not tested
wcag: []
level: best-practice
impact: minor
---

## The problem

axe found elements with content that were hidden with `display: none` or `visibility: hidden` when the scan ran. axe skips hidden content, so anything inside, such as a collapsed menu, a closed modal, an inactive tab panel, or an error message that has not been triggered, was not checked. This is not a defect. It is a reminder that the report does not cover those parts of the page.

This rule is experimental in axe and reports its results as needs review.

## Who it affects

- Anyone who later opens that content, since any problems inside it are unreported.

## How to fix

Put the page into the state where the hidden content is visible, then scan again. For example, open each menu, modal, accordion, and tab panel, and trigger validation errors.

```js
// Example with Playwright: reveal content before scanning
await page.getByRole("button", { name: "Open menu" }).click();
await page.getByRole("tab", { name: "Billing" }).click();
await page.getByRole("button", { name: "Submit" }).click(); // shows validation errors
// ...then run the scan again
```

Make sure the controls that reveal content are themselves accessible:

```html
<button type="button" aria-expanded="false" aria-controls="faq-1">Shipping costs</button>
<div id="faq-1" hidden>Shipping is free on orders over $50.</div>
```

## Common false positives

- **Content that is never shown to anyone**, such as server-rendered templates or feature-flagged sections that are turned off, can be ignored.
- **Large result counts** are normal on pages with many collapsed sections. Prioritize content users are likely to open.

## How to verify

Review the list of hidden elements, reveal each important one, and scan again. Confirm the newly visible content has no violations.

## References

- [MDN: the hidden attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden)
- [axe rule: hidden-content](https://dequeuniversity.com/rules/axe/4.13/hidden-content)
