---
id: aria-dialog-name
title: A dialog has no accessible name
wcag: []
level: best-practice
impact: serious
---

## The problem

axe found an element with `role="dialog"` or `role="alertdialog"` that has no accessible name. When focus moves into a dialog, the screen reader announces the dialog's name so the user knows where they are and why. Without one, they hear only "dialog" and have to explore the contents to figure out what it is for.

Visible text inside the dialog does not count toward its name. The name must come from `aria-labelledby`, `aria-label`, or `title`.

## Who it affects

- Screen reader users, who land in an unnamed dialog with no context.
- Users with cognitive disabilities who rely on clear announcements when the context changes.

## How to fix

Point `aria-labelledby` at the dialog's visible heading. Use `aria-label` only when there is no visible title.

```html
<!-- Before -->
<div role="dialog" aria-modal="true">
  <h2>Delete project?</h2>
  <p>This cannot be undone.</p>
</div>

<!-- After -->
<div role="dialog" aria-modal="true" aria-labelledby="delete-title">
  <h2 id="delete-title">Delete project?</h2>
  <p>This cannot be undone.</p>
</div>
```

The native `<dialog>` element is a better starting point, since `showModal()` handles focus trapping and makes the rest of the page inert. It still needs a name:

```tsx
function DeleteDialog() {
  const titleId = useId();
  return (
    <dialog ref={dialogRef} aria-labelledby={titleId}>
      <h2 id={titleId}>Delete project?</h2>
      <p>This cannot be undone.</p>
    </dialog>
  );
}
```

Most component libraries (Radix, Headless UI, React Aria) wire this up automatically when you use their Title component. If axe flags one, check that you rendered the Title part.

## Common false positives

- **Hidden dialogs** that are never opened are not checked. If axe flags a dialog, it was visible or present in the accessibility tree during the scan.

## How to verify

Open the dialog, select it in the DevTools Accessibility pane, and confirm the computed Name is the dialog's title. With a screen reader, open it and confirm the title is announced. Re-run the audit and confirm the rule no longer fires.

## References

- [APG: Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [axe rule: aria-dialog-name](https://dequeuniversity.com/rules/axe/4.13/aria-dialog-name)
