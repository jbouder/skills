# Demos and code examples

Demos are what people remember, and a misleading demo undoes the credibility the rest of the talk earned. Most of this file is about keeping demos honest and useful.

## Contents
- Pick demos that illustrate the point
- Comprehension demos
- Make comparisons fair
- Measure on the presenter's machine
- Build for failure
- Show code
- Static code snippets
- Testing demos in a browser

## Pick demos that illustrate the point

A demo should prove a claim the talk makes. "Hello world" demos (a spinning triangle, doubling an array) show that the API works but not why anyone would use it; a reviewer called those out as illustrating nothing. Better:
- **A comparison with a visible, measured gap**: the same work done the new way and the old way, side by side or behind a toggle, with the numbers on screen.
- **A real use case from the "where it fits" slide**: if the talk claims "data viz at scale", demo 1M points; if it claims "local ML", run a small model.
- **Something the audience can steer**: a pointer that pulls particles, a slider for problem size, a prompt box. Steering makes the gap felt.

Two or three demos is the most a 30-minute talk holds. A chat or model-loading demo deserves its own slide.

## Comprehension demos

Not every demo is about speed. A UI/UX demo usually shows that something is easier to understand or use (an animated transition versus an instant swap, an accessible pattern versus an inaccessible one). The same honesty rules apply in a different form:
- **One toggle, one difference.** Run the same update with the feature on and off, so the feature is the only variable.
- **Make the difference visible at presentation speed.** Offer a slow-motion or step option so the room can see what changed.
- **The status line reports what happened**, not a speed score: what changed, how long the update took versus the animation, whether the user's reduced-motion setting is in effect.
- **Show the accessible path working**: focus moves where it should, reduced motion is honored, keyboard works.
- "Measure on the presenter's machine" still applies to anything timing-sensitive, but matters less here than for a speed comparison.

## Make comparisons fair

If one side of a comparison produces a nicer picture or does less work, the audience will (rightly) suspect a rigged demo.
- **Same output on both sides.** Same coloring, blending, resolution and algorithm. If the fast path draws speed-colored, blended particles, the slow path must too.
- **Same work.** Don't skip steps on one side for convenience.
- **Report what's included.** "GPU time includes reading the image back; the first run also compiled the shader, reported separately."
- **Say where the old way is fine.** Light work per element, small sizes, one-off jobs. The notes should give the presenter that honest line.

## Measure on the presenter's machine

A gap that shows on a slow laptop can vanish on a fast one; a high-end Mac's CPU kept up at 1M particles at 120 fps, so the demo showed nothing at its largest size. Before finalizing:
- Measure frame times or run times on the machine that will present (ask the user, or measure in their browser if you can drive it).
- Offer sizes that span "both keep up" to "the old way collapses", e.g. 250k / 1M / 4M. Stop before the new way also struggles.
- Default to a size where both keep up, and script the reveal in the notes: "both hold at 1M; now go to 4M".
- Write measured numbers into the notes, labeled with the machine they came from.

## Build for failure

- **Feature-detect and fall back.** Without the capability, run the old path only and say so in the demo's status line, instead of a blank box.
- **Run on demand.** Start on a button press, or on entering the slide (`onEnter.sN`) for a cheap ambient element such as a frame meter; stop when the slide is left (`onLeave.sN`). Background GPU or CPU work on a slide nobody is looking at wastes the presenter's battery.
- **Downloads are a demo risk.** Anything that downloads (models, large assets) must show progress, cache, and come with a note to preload before the talk because venue wifi will fail. External downloads may conflict with a host's "no server calls" rule; flag it to the user.
- **Pin CDN versions exactly** (`@0.2.85`) and check the package's real API in the bundle you load. Don't write calls from memory.
- **Status text is part of the demo**: fps, ms, tokens/s, iteration counts. The number is the punchline.

## Show code

Each demo card gets a `</>` icon button in its header row, next to the status text, that swaps the visual for the code and back (`data-code` + the `CODE` registry in the template).
- **Show the code that actually runs.** Keep shaders in JS strings and CPU paths in named functions, then register `fnName.toString()` and the shader strings. What the audience sees is exactly what executed.
- **For library-heavy demos**, where the real handler is mostly UI wiring, show a trimmed snippet of the essential calls and label it as trimmed.
- **Label every block** with what it is and where it runs ("Compute shader (WGSL): runs once per particle, every frame").
- **Wrap long lines** and let the panel scroll; the template's `.code` styles do this.

## Static code snippets

Use a static snippet when the audience needs to see the shape of something they'd otherwise have to imagine: the new language's syntax, the init sequence, the one call that matters.
- ≤ 12 lines, real and compilable, not pseudo-code.
- Light syntax highlighting with `.k` (keywords), `.s` (strings), `.a` (attributes/annotations), `.c` (comments) spans.
- Say in the notes not to teach it: "show it for ten seconds so the room knows it exists".
- Put the explanation in cards beside the code, not as comments crammed into it.

## Testing demos

### Without a browser

You can still catch logic bugs:
- Load the deck in jsdom (`npm i jsdom` in a scratch directory), stub the APIs it lacks, and click every control from a script. jsdom has no canvas rendering, `Worker`, `OffscreenCanvas`, WebGPU or `startViewTransition`, so provide small stand-ins that call through synchronously. This catches stale labels, wrong ids and exceptions.
- For timing, run the demo's pure compute function in Node to size the options, and label those numbers as Node numbers in the notes. They are a guide, not the presenter's browser.
- Say clearly in your summary which parts only a real browser can confirm: rendering, both themes, phone width, real frame rates.

### In a browser

If you can drive a browser (Claude in Chrome or similar):
- Serve the deck locally (`python3 -m http.server`) and open the slide by hash (`#s16`).
- Check the console for errors after exercising every control.
- Check that every slide fits the screen. This snippet lists slides taller than the viewport, by how many pixels:
  ```js
  [...document.querySelectorAll(".slide")].map(s => { document.querySelectorAll(".slide").forEach(x => x.classList.toggle("active", x === s)); return [s.id, s.scrollHeight - (innerHeight - 56)]; }).filter(x => x[1] > 4)
  ```
- A hidden or background tab never runs `requestAnimationFrame` and heavily throttles timers after a few minutes, so fps reads 0 and waits stall. Use a fresh tab, keep scripted waits short, and read measured frame times from a visible tab. If you can't get a visible tab, say what you couldn't verify.
- Measure fps by timing `requestAnimationFrame` intervals, not just by reading the demo's own counter.
