---
id: form-field-multiple-labels
title: A form field has more than one label element
wcag: [3.3.2]
level: A
impact: moderate
---

## The problem

axe found an `<input>`, `<select>`, or `<textarea>` that is associated with more than one `<label>`, either through several `<label for="...">` elements pointing at the same `id`, or a wrapping `<label>` plus a separate `for` label. Browsers and screen readers handle this inconsistently: some read only the first label, some only the last, and some combine them. Users may miss part of the label, such as a required indicator or a format hint.

axe reports this rule as needs review.

## Who it affects

- Screen reader users, who may hear only part of the field's label.
- Voice control users, who may not know which label text to say.

## How to fix

Use one `<label>` per field. Move hints and error text into a separate element connected with `aria-describedby`.

```html
<!-- Before -->
<label for="dob">Date of birth</label>
<input id="dob" name="dob">
<label for="dob">Format: MM/DD/YYYY</label>

<!-- After -->
<label for="dob">Date of birth</label>
<input id="dob" name="dob" aria-describedby="dob-hint">
<p id="dob-hint">Format: MM/DD/YYYY</p>
```

```tsx
// Before: wrapping label plus a second label for the error
<label>
  Email
  <input id="email" type="email" aria-invalid={!!error} />
</label>
<label htmlFor="email" className="error">{error}</label>

// After
const errorId = useId();
<label>
  Email
  <input type="email" aria-invalid={!!error} aria-describedby={error ? errorId : undefined} />
</label>
{error && <p id={errorId} className="error">{error}</p>}
```

If two labels both really need to name the field (for example a column header and a row header in a grid of inputs), use `aria-labelledby` with both `id`s, which has a well-defined reading order.

## Common false positives

- **Multiple labels where the first contains everything needed** work acceptably in most screen readers. It is still cleaner to merge them.

## How to verify

Select the field in the DevTools Accessibility pane and confirm the computed Name is the full label and the Description holds the hint. With a screen reader, tab to the field and listen. Re-run the audit and confirm the rule no longer appears in needs review.

## References

- [Understanding SC 3.3.2 Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)
- [axe rule: form-field-multiple-labels](https://dequeuniversity.com/rules/axe/4.13/form-field-multiple-labels)
