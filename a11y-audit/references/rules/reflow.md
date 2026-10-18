---
id: reflow
title: Page scrolls sideways at 320 pixels wide
wcag: [1.4.10]
level: AA
impact: serious
---

## The problem

At a viewport 320 CSS pixels wide, the page is wider than the screen, so people have to scroll horizontally to read it. 320px is what a 1280px desktop window looks like at 400% zoom, which is the case WCAG is protecting. The scanner resized the page to 320px, measured how far it overflows, and listed the outermost elements that stick out past the right edge. Tables, code blocks, maps and other content that needs two dimensions are exempt and were ignored.

Typical causes are fixed widths (`width: 900px`), `min-width` on containers, long unbroken strings like URLs, wide images without `max-width`, and flex rows that do not wrap.

## Who it affects

- People with low vision who zoom to 200% to 400%, who would otherwise have to scroll sideways on every line.
- Phone users on small screens.
- Anyone using browser text zoom.

## How to fix

Replace fixed widths with fluid ones, and let rows wrap.

```css before
.wide { width: 900px; }
.nav { display: flex; }
```

```css after
.wide { width: 100%; max-width: 900px; }
.nav { display: flex; flex-wrap: wrap; gap: 8px 16px; }
```

Other common fixes:

```css
img, video { max-width: 100%; height: auto; }
.prose { overflow-wrap: anywhere; } /* long URLs and tokens */
.table-container { overflow-x: auto; } /* tables may scroll on their own */
```

For a navigation bar with many links, collapse it into a menu button below a breakpoint.

## Common false positives

- **Off-screen elements** such as closed slide-out menus positioned past the right edge can cause overflow without being visible. They still create a horizontal scrollbar, so fix them with `overflow-x: clip` on the container or by hiding them with `display: none` or `visibility: hidden` when closed.
- **Content that needs two dimensions**, such as data tables, maps, diagrams and toolbars, is allowed to scroll inside its own container.

## How to verify

Set the browser window to 1280px wide and zoom to 400%, or use responsive mode at 320px. Read the page top to bottom. You should never need to scroll sideways, except inside a table, code block or similar.

## References

- [Understanding SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
