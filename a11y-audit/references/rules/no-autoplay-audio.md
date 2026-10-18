---
id: no-autoplay-audio
title: Audio or video plays sound automatically with no way to stop it
wcag: [1.4.2]
level: A
impact: moderate
---

## The problem

A `<video>` or `<audio>` element has `autoplay`, is not muted, and plays sound for more than 3 seconds without offering controls to pause or mute it. WCAG requires that any audio playing automatically for more than 3 seconds can be paused, stopped or turned down independently of the system volume.

axe skips elements with the `muted` attribute, and passes the element if it has the `controls` attribute or plays for 3 seconds or less (it honors media fragments like `#t=0,2`). An element with `loop` and no `controls` always fails. If the media metadata has not loaded when axe runs, it reports "needs review" instead.

## Who it affects

- Screen reader users, whose speech output is drowned out by the audio, making it hard to even find the stop button.
- People with attention or cognitive disabilities, who are distracted by unexpected sound.
- Anyone in a quiet place who is startled by sound they did not ask for.

## How to fix

The best fix is not to autoplay sound. If the media must autoplay, mute it and show controls.

```html
<!-- Before -->
<video src="/intro.mp4" autoplay loop></video>

<!-- After: muted, with controls the user can operate -->
<video src="/intro.mp4" autoplay muted loop playsinline controls></video>
```

In React, the `muted` prop sets the DOM property but is not reliably rendered as an HTML attribute, so axe may still flag it. Add `controls`, or set the attribute through a ref.

```tsx
// Before
<video src="/intro.mp4" autoPlay loop />
// After
<video src="/intro.mp4" autoPlay muted loop playsInline controls />
```

A custom player also works, as long as its pause or mute button is visible, focusable, labeled and reachable near the top of the page.

## Common false positives

- **Silent video**, such as a background clip with no audio track, cannot be detected by axe as silent. If the file truly has no sound, the result can be ignored, but muting it is still the simplest way to clear the rule.
- **Custom controls** elsewhere on the page are not recognized by axe. If they pause or mute this element and are keyboard accessible, the issue is resolved.

## How to verify

Load the page with sound on and confirm nothing plays audio for more than 3 seconds without your action, or that a pause or mute control is available and works with the keyboard. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.4.2 Audio Control](https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html)
- [axe rule: no-autoplay-audio](https://dequeuniversity.com/rules/axe/4.13/no-autoplay-audio)
