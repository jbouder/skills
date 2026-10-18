---
id: accesskeys
title: Two or more elements use the same accesskey value
wcag: []
level: best-practice
impact: serious
---

## The problem

The `accesskey` attribute assigns a keyboard shortcut to an element. axe found more than one element on the page using the same key. When keys collide, the browser either activates only one of them or cycles between them, so the shortcut does not do what the user expects.

axe checks hidden elements too, so a duplicate can come from a menu that is rendered twice (for example a desktop nav and a mobile nav) even if only one is visible.

Beyond duplicates, `accesskey` is a fragile feature in general. The modifier keys differ by browser and operating system, the keys are not discoverable, and they often clash with shortcuts that screen readers, browsers, and other assistive tools already use.

## Who it affects

- Keyboard users who rely on the shortcut and end up somewhere unexpected.
- Screen reader and voice control users, whose own shortcuts can be overridden by the page.
- People using non-English keyboard layouts, where the chosen letter may be hard to reach.

## How to fix

The simplest fix is usually to remove `accesskey` entirely and rely on good headings, landmarks, and a skip link. If you must keep shortcuts, give every element a unique key.

```html
<!-- Before: both links use "s" -->
<a href="/search" accesskey="s">Search</a>
<a href="/settings" accesskey="s">Settings</a>

<!-- After: unique keys -->
<a href="/search" accesskey="s">Search</a>
<a href="/settings" accesskey="t">Settings</a>

<!-- Better: no accesskey at all -->
<a href="/search">Search</a>
<a href="/settings">Settings</a>
```

In React, a shared component that hard-codes an `accessKey` will produce a duplicate every time it renders. Pass the key in, or drop it.

```tsx
// Before: every NavLink gets accessKey="n"
<a href={href} accessKey="n">{label}</a>

// After: no hard-coded shortcut
<a href={href}>{label}</a>
```

If you offer custom shortcuts, document them on the page and let users turn them off or remap them.

## Common false positives

- **Responsive duplicates** where the same nav is rendered twice and one copy is hidden with CSS still count, because the hidden copy keeps its `accesskey`. Render one nav, or remove the attribute from the hidden copy.

## How to verify

Run `document.querySelectorAll('[accesskey]')` in the DevTools console and confirm each value appears once. Try each shortcut in Chrome and Firefox. Re-run the audit and confirm the rule no longer fires.

## References

- [MDN: accesskey](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/accesskey)
- [axe rule: accesskeys](https://dequeuniversity.com/rules/axe/4.13/accesskeys)
