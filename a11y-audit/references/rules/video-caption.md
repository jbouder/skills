---
id: video-caption
title: A video doesn't have captions
wcag: [1.2.2]
level: A
impact: critical
---

## The problem

A `<video>` element has no `<track kind="captions">` child. Without captions, the dialogue, narration, and meaningful sounds in the video (a doorbell, laughter, music that sets the mood) are unavailable to anyone who cannot hear the audio.

axe only checks for the presence of a captions track. It cannot tell whether the video has audio, whether the captions are accurate, or whether captions are burned into the picture, so it reports a missing track as **needs review** rather than a definite violation. A `kind="subtitles"` track does not count, because subtitles translate dialogue but usually leave out speaker names and sound effects.

## Who it affects

- People who are deaf or hard of hearing.
- Anyone watching with the sound off, in a noisy place, or in a language they read better than they hear.
- People with auditory processing differences who understand text more easily than speech.

## How to fix

Create a WebVTT caption file and add it with a `<track>` element. Include speaker identification and important non-speech sounds, not just dialogue.

```html
<!-- Before -->
<video src="/media/demo.mp4" controls></video>

<!-- After -->
<video controls>
  <source src="/media/demo.mp4" type="video/mp4" />
  <track kind="captions" src="/media/demo.en.vtt" srclang="en" label="English" default />
</video>
```

```text
WEBVTT

00:00:01.000 --> 00:00:04.000
[upbeat music]

00:00:04.500 --> 00:00:08.000
MAYA: Let's walk through the new dashboard.
```

In React, note the camelCase `srcLang`:

```tsx
<video controls>
  <source src={video.url} type="video/mp4" />
  <track kind="captions" src={video.captionsUrl} srcLang="en" label="English" default />
</video>
```

If you embed a third-party player (YouTube, Vimeo), enable and review captions in that platform; axe cannot see inside those iframes.

## Common false positives

- **Videos with no audio**, such as a silent background loop, do not need captions. Add the `muted` attribute and consider whether the video conveys anything that needs a text alternative instead.
- **Open (burned-in) captions** satisfy the requirement even without a `<track>`. Confirm they are present for the whole video.
- **Custom players** that load captions with JavaScript after the audit runs can be flagged. Check the player in the browser.

## How to verify

Play the video with sound off and turn on captions from the player controls. Confirm captions appear, stay in sync, and include speaker changes and meaningful sounds. Re-run the audit and confirm the rule no longer reports this video.

## References

- [Understanding SC 1.2.2 Captions (Prerecorded)](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html)
- [axe rule: video-caption](https://dequeuniversity.com/rules/axe/4.13/video-caption)
