---
id: dlitem
title: A dt or dd element is not inside a description list
wcag: [1.3.1]
level: A
impact: serious
---

## The problem

`<dt>` (term) and `<dd>` (description) only have meaning inside a `<dl>`, either as direct children or inside a `<div>` that is a direct child of the `<dl>`. axe found one outside that structure. Screen readers will not announce it as part of a list or associate the term with its description, so the relationship the markup implies is lost.

This often happens when a component renders `<dt>`/`<dd>` pairs and the parent forgets the `<dl>`, or when `<dd>` is used just for its default indentation.

## Who it affects

- Screen reader users, who do not hear the list structure or the link between each term and its value.

## How to fix

Wrap the items in a `<dl>`. If the content is not really a list of name-value pairs, use different elements.

```html
<!-- Before -->
<div class="specs">
  <dt>Weight</dt>
  <dd>1.2 kg</dd>
</div>

<!-- After -->
<dl class="specs">
  <dt>Weight</dt>
  <dd>1.2 kg</dd>
</dl>
```

```tsx
// Before: a Field component used on its own
function Field({ label, value }: { label: string; value: string }) {
  return (<><dt>{label}</dt><dd>{value}</dd></>);
}

// After: always render Fields inside a <dl>
<dl>
  <Field label="Status" value="Shipped" />
  <Field label="Carrier" value="UPS" />
</dl>
```

If you used `<dd>` only for its indentation, replace it with a `<p>` or `<div>` and indent with CSS.

## Common false positives

- **A `<dt>` or `<dd>` with an explicit `role`** is not checked by this rule.

## How to verify

Inspect the element in the DevTools Elements panel and confirm its parent is a `<dl>`, or a `<div>` whose parent is a `<dl>`. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [MDN: the dl element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dl)
- [axe rule: dlitem](https://dequeuniversity.com/rules/axe/4.13/dlitem)
