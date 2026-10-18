---
id: aria-tab-name
title: A tab has no accessible name
wcag: [4.1.2]
level: A
impact: serious
---

## The problem

axe found an element with `role="tab"` that has no accessible name. It has no text content, no `aria-label`, no `aria-labelledby`, and no `title`. A screen reader announces "tab, 2 of 4" but not what the tab is, so the user cannot choose between tabs without opening each one.

This usually happens with icon-only tabs, or tabs whose label is a background image or an icon font glyph.

## Who it affects

- Screen reader users, who cannot tell tabs apart.
- Voice control users, who cannot say the tab's name to select it.

## How to fix

Give each tab visible text. If the design calls for icon-only tabs, add an `aria-label` and hide the icon.

```html
<!-- Before -->
<div role="tablist" aria-label="Account">
  <button role="tab" aria-selected="true"><i class="icon-user"></i></button>
  <button role="tab" aria-selected="false" tabindex="-1"><i class="icon-gear"></i></button>
</div>

<!-- After -->
<div role="tablist" aria-label="Account">
  <button role="tab" aria-selected="true" aria-label="Profile">
    <i class="icon-user" aria-hidden="true"></i>
  </button>
  <button role="tab" aria-selected="false" tabindex="-1" aria-label="Settings">
    <i class="icon-gear" aria-hidden="true"></i>
  </button>
</div>
```

```tsx
<button role="tab" aria-selected={active} tabIndex={active ? 0 : -1}>
  <GearIcon aria-hidden="true" />
  <span>Settings</span>
</button>
```

Visible text is better than `aria-label` because it helps everyone, including sighted users who do not recognize the icon.

## Common false positives

- **Names set after render** (for example from a translations file that loads later) can be missed if axe scanned too early. Re-scan once the page has settled.

## How to verify

Select each tab in the DevTools Accessibility pane and confirm the computed Name. With a screen reader, arrow through the tabs and listen. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [APG: Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [axe rule: aria-tab-name](https://dequeuniversity.com/rules/axe/4.13/aria-tab-name)
