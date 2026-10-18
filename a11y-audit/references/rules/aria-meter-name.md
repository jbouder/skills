---
id: aria-meter-name
title: A meter has no accessible name
wcag: [1.1.1]
level: A
impact: serious
---

## The problem

axe found an element with `role="meter"` that has no accessible name. A meter shows a value within a known range, such as disk usage, password strength, or battery level. Without a name, a screen reader announces only a number like "75%" with no indication of what is being measured.

The name must come from `aria-labelledby`, `aria-label`, or `title`. Text inside the meter does not count.

## Who it affects

- Screen reader users, who hear a value with no context.
- Voice control users, who cannot refer to the meter by name.

## How to fix

Connect the meter to its visible label with `aria-labelledby`, or use the native `<meter>` element with a `<label>`.

```html
<!-- Before -->
<p>Storage used</p>
<div role="meter" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
  <div class="fill" style="width: 75%"></div>
</div>

<!-- After: custom meter, labeled -->
<p id="storage-label">Storage used</p>
<div role="meter" aria-labelledby="storage-label"
     aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"
     aria-valuetext="7.5 of 10 GB">
  <div class="fill" style="width: 75%"></div>
</div>

<!-- After: native meter -->
<label for="storage">Storage used</label>
<meter id="storage" min="0" max="10" value="7.5">7.5 of 10 GB</meter>
```

```tsx
<div
  role="meter"
  aria-label="Password strength"
  aria-valuenow={score}
  aria-valuemin={0}
  aria-valuemax={4}
  aria-valuetext={strengthLabels[score]}
/>
```

Add `aria-valuetext` when the raw number is not meaningful on its own, such as "Strong" instead of "3".

## Common false positives

- **Native `<meter>` elements** are named through `<label>` and are not the target of this rule. If one is unlabeled, fix it the same way.

## How to verify

Select the meter in the DevTools Accessibility pane and confirm it has a computed Name. With a screen reader, navigate to it and confirm both the name and value are announced. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)
- [APG: Meter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/meter/)
- [axe rule: aria-meter-name](https://dequeuniversity.com/rules/axe/4.13/aria-meter-name)
