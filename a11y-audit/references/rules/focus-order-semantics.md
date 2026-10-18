---
id: focus-order-semantics
title: A focusable element has no interactive role
wcag: []
level: best-practice
impact: minor
---

## The problem

axe found a `<div>`, `<span>`, `<p>`, or heading that has been made keyboard focusable with `tabindex="0"` (or a positive value) but has no interactive role. When a keyboard user tabs to it, the screen reader announces it as plain text or a heading. The user has no idea whether it does anything, or how to activate it.

Usually this is a click handler on a non-interactive element, with `tabindex` added to get it into the tab order. Sometimes `tabindex` was added to a static element for no reason, which just adds a pointless tab stop.

This rule is experimental in axe and may not run in every scan configuration.

## Who it affects

- Screen reader users, who reach a focus stop with no role and no hint of what it does.
- Keyboard users, who must tab past extra stops that do nothing.

## How to fix

If the element is a control, use the native element. If it is not a control, remove `tabindex`.

```html
<!-- Before: clickable div -->
<div class="card-action" tabindex="0" onclick="openDetails()">View details</div>

<!-- After -->
<button type="button" class="card-action" onclick="openDetails()">View details</button>
```

```html
<!-- Before: static text in the tab order -->
<p tabindex="0">Shipping is free on orders over $50.</p>

<!-- After -->
<p>Shipping is free on orders over $50.</p>
```

```tsx
// Before
<span tabIndex={0} onClick={() => navigate("/settings")}>Settings</span>

// After: it navigates, so it is a link
<Link to="/settings">Settings</Link>
```

If you must keep a custom element, give it the correct widget role (for example `role="button"`) and support the expected keys (Enter and Space for buttons).

## Common false positives

- **Scrollable regions** made focusable so keyboard users can scroll them are valid. Give them a role such as `region` and a name: `<div tabindex="0" role="region" aria-label="Code sample">`.
- **Elements that receive focus programmatically**, such as a heading you move focus to after navigation, should use `tabindex="-1"`, which is not flagged.

## How to verify

Tab through the page with a screen reader running and confirm every stop announces a role such as button, link, or a named region. Re-run the audit and confirm the rule no longer fires.

## References

- [APG: Developing a keyboard interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [axe rule: focus-order-semantics](https://dequeuniversity.com/rules/axe/4.13/focus-order-semantics)
