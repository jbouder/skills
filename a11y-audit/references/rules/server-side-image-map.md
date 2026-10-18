---
id: server-side-image-map
title: A server-side image map can only be used with a mouse
wcag: [2.1.1]
level: A
impact: minor
---

## The problem

An `<img>` has the `ismap` attribute, which makes it a server-side image map. When clicked, the browser sends the mouse's x and y coordinates to the server, which decides where to go. There is no way to choose a region with a keyboard, and the regions have no names, so screen readers have nothing to announce. axe flags every `<img ismap>`.

## Who it affects

- Keyboard-only users, who cannot activate any region.
- Screen reader users, who cannot discover what regions exist or where they lead.
- Voice control and switch users, who rely on named, focusable targets.

## How to fix

Replace it with ordinary links, or with a client-side image map whose `<area>` elements each have an `alt` and an `href`.

```html
<!-- Before -->
<a href="/cgi-bin/map"><img src="/regions.png" ismap alt="Sales regions"></a>

<!-- After: client-side image map -->
<img src="/regions.png" usemap="#regions" alt="Sales regions">
<map name="regions">
  <area shape="rect" coords="0,0,200,150" href="/regions/north" alt="North region">
  <area shape="rect" coords="0,150,200,300" href="/regions/south" alt="South region">
</map>
```

A plain list of links is often simpler and more responsive:

```tsx
<nav aria-label="Sales regions">
  <ul>
    {regions.map((r) => (
      <li key={r.id}><a href={`/regions/${r.id}`}>{r.name}</a></li>
    ))}
  </ul>
</nav>
```

## Common false positives

- None in practice. If an image map is genuinely needed, a client-side `<map>` covers every use case of `ismap`.

## How to verify

Search the codebase for `ismap` and confirm none remain. Tab through the replacement and confirm every region can be reached and activated with the keyboard and has a meaningful name. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- [axe rule: server-side-image-map](https://dequeuniversity.com/rules/axe/4.13/server-side-image-map)
