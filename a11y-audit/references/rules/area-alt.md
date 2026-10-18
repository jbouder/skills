---
id: area-alt
title: Image map links have no text alternative
wcag: [2.4.4, 4.1.2]
level: A
impact: critical
---

## The problem

An `<area>` element with an `href` inside an image `<map>` is a link, and every link needs a name. axe found an `<area>` with no `alt`, `aria-label`, `aria-labelledby`, or `title`, so assistive technology has nothing to announce. Screen readers fall back to reading the URL or say nothing useful, such as "link" or "map area".

The `alt` on the `<img>` that uses the map describes the image as a whole. It does not name the individual clickable regions.

## Who it affects

- Screen reader users, who hear an unlabeled link and cannot tell where it goes.
- Voice control users, who have no name to say to activate the region.

## How to fix

Add an `alt` to each `<area>` that describes where the link goes, not what the shape looks like.

```html
<!-- Before -->
<img src="campus.png" alt="Campus map" usemap="#campus">
<map name="campus">
  <area shape="rect" coords="0,0,120,80" href="/library">
  <area shape="circle" coords="200,60,40" href="/gym">
</map>

<!-- After -->
<img src="campus.png" alt="Campus map" usemap="#campus">
<map name="campus">
  <area shape="rect" coords="0,0,120,80" href="/library" alt="Library">
  <area shape="circle" coords="200,60,40" href="/gym" alt="Gym and recreation center">
</map>
```

```tsx
<map name="campus">
  {buildings.map((b) => (
    <area key={b.id} shape="rect" coords={b.coords} href={b.href} alt={b.name} />
  ))}
</map>
```

Image maps are hard to use on touch screens and at high zoom. If you can, replace the map with a list of regular links next to the image, or with an inline SVG where each region is an `<a>` with a `<title>`.

## Common false positives

- **`<area>` without `href`** is not a link and is not checked by this rule.
- **`alt` that is present but unhelpful**, such as `alt="area 1"`, passes axe but still fails users. Check that each label names the destination.

## How to verify

Inspect each `<area>` in the DevTools Accessibility pane and confirm it has a meaningful name. With a screen reader, tab through the map and listen to each link. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 2.4.4 Link Purpose (In Context)](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)
- [Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [axe rule: area-alt](https://dequeuniversity.com/rules/axe/4.13/area-alt)
