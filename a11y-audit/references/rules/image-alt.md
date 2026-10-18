---
id: image-alt
title: An image has no text alternative
wcag: [1.1.1]
level: A
impact: critical
---

## The problem

An `<img>` element has no `alt` attribute and no other accessible name. Screen readers then fall back to announcing the file name, such as "IMG underscore 4032 dot jpeg", or just "image", and the information in the picture is lost.

axe passes an image that has any of these: an `alt` attribute (an empty `alt=""` counts, and marks it as decorative), `aria-label`, `aria-labelledby`, a non-empty `title`, or `role="none"` / `role="presentation"`. It also fails `alt=" "` (a single space), because some screen readers do not treat that as empty.

## Who it affects

- Blind and low-vision screen reader users, who cannot see the image.
- People who browse with images turned off or on slow connections where images fail to load.
- Search engines and translation tools, which rely on text alternatives.

## How to fix

Decide what the image is for, then write `alt` text for that purpose.

- **Informative image**: describe the information it conveys, briefly.
- **Functional image** (inside a link or button): describe the action or destination, not the picture.
- **Decorative image**: use an empty `alt=""` so screen readers skip it.

```html
<!-- Before -->
<img src="/img/q3-chart.png">
<a href="/"><img src="/logo.svg"></a>
<img src="/divider.png">

<!-- After -->
<img src="/img/q3-chart.png" alt="Revenue grew 18% in Q3, from $2.1M to $2.5M">
<a href="/"><img src="/logo.svg" alt="Acme home"></a>
<img src="/divider.png" alt="">
```

In React, make `alt` a required prop on your image component so it cannot be forgotten:

```tsx
type ImageProps = { src: string; alt: string }; // alt is required; pass "" for decorative

export function Image({ src, alt }: ImageProps) {
  return <img src={src} alt={alt} />;
}
```

Prefer `alt` over `aria-label` or `title` on images. It is the native mechanism and is supported everywhere.

## Common false positives

- **Images hidden from everyone** (`display: none`, `hidden`, or `aria-hidden="true"`) are skipped by axe. If one is flagged, check that it is actually visible to assistive technology.
- This rule only checks that a text alternative exists. An image with `alt="image"` or `alt="photo.jpg"` passes but still fails WCAG, so review alt text quality manually.

## How to verify

Inspect the image in the DevTools Accessibility pane and confirm its computed name is meaningful, or empty for decorative images. With a screen reader, tab or arrow through the page and listen to how each image is announced.

## References

- [Understanding SC 1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)
- [axe rule: image-alt](https://dequeuniversity.com/rules/axe/4.13/image-alt)
