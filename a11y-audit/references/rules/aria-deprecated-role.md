---
id: aria-deprecated-role
title: An element uses an ARIA role that has been deprecated
wcag: [4.1.2]
level: A
impact: minor
---

## The problem

axe found a `role` value that has been deprecated in the ARIA or DPUB-ARIA specifications. In axe 4.13 these are `directory`, `doc-biblioentry`, and `doc-endnote`. Browsers and screen readers are dropping support for deprecated roles, so the element may be announced with no role at all, or with a role that does not match its content.

## Who it affects

- Screen reader users, who may lose the structure (for example, that this is a list of entries) the role was meant to convey.

## How to fix

Replace the deprecated role with its modern equivalent, which is usually plain list markup.

```html
<!-- Before -->
<ul role="directory">
  <li><a href="#intro">Introduction</a></li>
</ul>

<!-- After: a list is already a list -->
<ul>
  <li><a href="#intro">Introduction</a></li>
</ul>
```

```html
<!-- Before -->
<section role="doc-endnotes">
  <ol>
    <li role="doc-endnote" id="note-1">Source: annual report.</li>
  </ol>
</section>

<!-- After -->
<section role="doc-endnotes">
  <ol>
    <li id="note-1">Source: annual report.</li>
  </ol>
</section>
```

The same applies to `doc-biblioentry`: drop it and keep the `<li>` inside a list in a `role="doc-bibliography"` section.

## Common false positives

- None in practice. If a library adds the role, upgrade it or override the rendered markup.

## How to verify

Inspect the element in the DevTools Accessibility pane and confirm its computed role is `list` or `listitem` as expected. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: aria-deprecated-role](https://dequeuniversity.com/rules/axe/4.13/aria-deprecated-role)
