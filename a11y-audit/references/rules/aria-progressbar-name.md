---
id: aria-progressbar-name
title: A progress bar has no accessible name
wcag: [1.1.1]
level: A
impact: serious
---

## The problem

axe found an element with `role="progressbar"` that has no accessible name. A screen reader can announce the value ("40%") or that something is loading, but not what is in progress. If a page has several progress bars, such as one per file upload, they are impossible to tell apart.

The name must come from `aria-labelledby`, `aria-label`, or `title`. Text inside the progress bar does not count.

## Who it affects

- Screen reader users, who hear a percentage with no context.
- Voice control users, who cannot refer to the element by name.

## How to fix

Connect the progress bar to visible text with `aria-labelledby`, or use the native `<progress>` element with a `<label>`.

```html
<!-- Before -->
<span>Uploading report.pdf</span>
<div role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">
  <div class="bar" style="width: 40%"></div>
</div>

<!-- After: custom, labeled -->
<span id="upload-1">Uploading report.pdf</span>
<div role="progressbar" aria-labelledby="upload-1"
     aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">
  <div class="bar" style="width: 40%"></div>
</div>

<!-- After: native progress element -->
<label for="upload-2">Uploading report.pdf</label>
<progress id="upload-2" max="100" value="40">40%</progress>
```

For an indeterminate spinner, leave out `aria-valuenow` but still name it:

```tsx
<div role="progressbar" aria-label="Loading search results" className="spinner" />
```

If the spinner is purely decorative and a separate live region already says "Loading", hide the spinner with `aria-hidden="true"` instead of giving it a role.

## Common false positives

- **Native `<progress>` elements** are named with `<label>` and are not the target of this rule. If one is unlabeled, fix it the same way.

## How to verify

Select the progress bar in the DevTools Accessibility pane and confirm the computed Name describes the task. With a screen reader, navigate to it and confirm the name and value are announced. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)
- [MDN: ARIA progressbar role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role)
- [axe rule: aria-progressbar-name](https://dequeuniversity.com/rules/axe/4.13/aria-progressbar-name)
