---
id: audio-caption
title: Audio content may have no text alternative for people who cannot hear it
wcag: [1.2.1]
level: A
impact: critical
---

## The problem

axe found an `<audio>` element without a `<track kind="captions">`. Prerecorded audio, such as a podcast episode, an interview, or a recorded announcement, needs a text alternative so that people who cannot hear it can still get the content.

axe cannot tell whether a transcript exists elsewhere on the page, so it reports this rule as needs review rather than a violation. The rule is also deprecated and disabled by default in axe, so it only appears when a scan enables it explicitly. WCAG 1.2.1 is satisfied by a full text transcript; a captions track on `<audio>` is not required and most browsers do not display one.

## Who it affects

- People who are Deaf or hard of hearing.
- Anyone in a setting where they cannot play sound, or who prefers to skim text.
- Deafblind users, who read transcripts on a braille display.

## How to fix

Publish a transcript next to the audio and link the two. Include speaker names and meaningful non-speech sounds.

```html
<!-- Before -->
<audio controls src="/episodes/42.mp3"></audio>

<!-- After -->
<figure>
  <figcaption id="ep42-title">Episode 42: Designing for screen readers</figcaption>
  <audio controls src="/episodes/42.mp3" aria-describedby="ep42-title"></audio>
  <p><a href="/episodes/42/transcript">Read the transcript of episode 42</a></p>
</figure>
```

```tsx
<section aria-labelledby="ep-title">
  <h2 id="ep-title">{episode.title}</h2>
  <audio controls src={episode.src} />
  <details>
    <summary>Transcript</summary>
    <div dangerouslySetInnerHTML={{ __html: episode.transcriptHtml }} />
  </details>
</section>
```

If the audio is part of a video, the `video-caption` rule applies instead, and synchronized captions are required.

## Common false positives

- **A transcript already exists** on the page or one click away. The result is then satisfied; mark it as reviewed.
- **Audio that is itself a text alternative**, such as a spoken version of an article already on the page, does not need a separate transcript.
- **Decorative or UI sounds** that carry no information do not need a transcript.

## How to verify

Find the transcript for each audio file and confirm it covers all spoken content and important sounds. Confirm it is reachable by keyboard and announced by a screen reader.

## References

- [Understanding SC 1.2.1 Audio-only and Video-only (Prerecorded)](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html)
- [axe rule: audio-caption](https://dequeuniversity.com/rules/axe/4.13/audio-caption)
