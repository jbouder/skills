# Design: a deck that belongs to its audience

A Q&A deck sits in front of a customer or a team for an hour while they answer questions about their own work. If it looks like a generic form, it reads as a template someone filled in. If it looks like their world, it reads as work done for them, and that buys attention for every question in it. Treat the design as half the deliverable.

## Contents
- Sources
- The concept line
- What the concept decides
- Worked directions
- Constraints
- Review checklist

## Sources

Collect material from three places before choosing anything:
- **The subject.** What the project works on: instruments, materials, documents, units, diagrams, the shapes on its screens. A fiber photometry tool has scope traces, graph paper and two light wavelengths. A logistics app has manifests, route maps and barcodes. A clinical system has charts, vitals monitors and forms.
- **The audience.** Their field, how formal they are, the colors and type they use publicly. Take the feel and the palette family. Don't copy logos, marks or layouts, and don't make the page pass as an official publication of theirs. Name them in text, not with their branding.
- **The room.** A live session on a projector needs larger type and higher contrast than a link people fill in alone. Engineers forgive density. Leadership wants the summary slide to read at a glance.

Read the project's own UI if it has one, through screenshots, the repo's CSS, or the docs. The deck can rhyme with it without copying it.

## The concept line

Write one sentence that names a metaphor from the subject and how it shows up. Put it in the theme comment, after `Concept:`. The checker requires it.

Good: "Instrument panel: graph-paper ground, hairline-ruled sheets for each step, a dark scope readout in the hero. Today's system reads in the 465 nm signal blue, the compared destination in the 405 nm isosbestic violet."

Weak: "Clean and modern with a blue accent." It says nothing about this audience, and any deck could claim it.

## What the concept decides

Each item lives in the THEME block or the HERO figure.

- **Palette.** Pick `--bg`, `--surface`, `--surface-2`, `--ink`, `--muted` and `--rule` first. Then the two roles the engine colors:
  - `--accent` (with `-ink` and `-soft`): the baseline, "today", and the deck's primary actions.
  - `--alt` (with `-ink` and `-soft`): the compared variant, notes and question tags.
  When the deck compares something, make the pair mean something in the subject: two wavelengths, two map layers, old and new. Keep `--good`, `--bad`, `--warn` and `--unk` legible and conventional, because they carry fit grades and pros and cons.
- **Type.** Pair a display face, a body face and a mono face from Google Fonts. The display face carries the concept: a wide grotesque for instruments, a slab for logistics, a humanist serif for an archive. The mono face labels eyebrows, counts and tags. Set `--display-weight`, `--display-stretch` and `--display-tracking`. Load only the weights you use.
- **Ground.** `--ground` and `--ground-size` set the page background image. CSS gradients make graph paper, blueprint grids, ruled ledger lines, dot grids or paper grain. Keep it low contrast so text on `--bg` still passes.
- **Hero.** Replace `<figure id="hero-visual">` with an inline SVG or a small canvas drawn from the subject: a simulated trace, a route map, a floor plan, a pipeline. Make it deterministic, with no network. Color it with tokens (`var(--panel-accent)` in SVG, `getComputedStyle` in canvas) so it follows light and dark, and redraw on theme change. Keep `aria-hidden="true"`, or give it a `figcaption` if it says something true. Label anything simulated as illustrative. Remove `data-placeholder`.
- **Panel tokens.** `--panel-bg`, `--panel-fg`, `--panel-muted`, `--panel-accent`, `--panel-alt` and `--panel-grid` color the hero frame and the facilitator notes drawer. Dark suits an instrument readout; a ledger or blueprint concept can go light, as long as contrast holds.
- **Details.** `--r` (corner radius: 0 for blueprint, 6 px for instruments, 12 px for consumer), the eyebrow marker, rule weights. Small touches can target engine classes from the THEME block (`.sheet`, `.lane`, `.eyebrow::before`). Don't change engine layout.
- **Sketches.** A section's `baseline.html` or a variant's `html` can hold a small inline SVG or markup that shows the step: a folder tree, a form, a flow of nodes. Use one where a picture explains the difference faster than a sentence, and style it with tokens.

## Worked directions

| Subject | Concept | Palette | Type | Ground and hero |
|---|---|---|---|---|
| Neuroscience signal tool | Instrument panel | Cool gray paper; signal blue and isosbestic violet | Archivo (wide), IBM Plex Sans, IBM Plex Mono | Graph paper; simulated dF/F trace on a dark scope |
| Freight and routing app | Dispatch board | Kraft and asphalt; route amber and depot teal | Roboto Slab, Inter, JetBrains Mono | Faint road grid; route lines between depots |
| Hospital scheduling | Clinical chart | White and calm green; shift blue and ward coral | Source Serif 4, Source Sans 3, Source Code Pro | Ruled chart paper; a week of shift bars |
| Museum collections | Archive drawer | Linen and ink; catalog oxblood and accession slate | Fraunces, Work Sans, IBM Plex Mono | Paper grain; index cards fanned out |
| Data platform migration | Blueprint | Navy and white; warehouse cyan and lake yellow | Space Grotesk, Inter, Space Mono | Fine blue grid; a pipeline diagram of the current stack |

These are starting points. Make each deck from its own subject.

## Constraints

- Contrast: body text 4.5:1 on its surface in light and dark, `--accent` and `--alt` 3:1 on the surface, each `-ink` 4.5:1 on its color, and each semantic color 4.5:1 on its `-soft`. The checker computes these from hex tokens, so keep them as hex.
- Dark mode is required. Define it twice, as the template does: under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and under `:root[data-theme="dark"]`. Re-derive the dark palette, don't just invert it.
- Motion: the engine respects `prefers-reduced-motion`. A hero that animates must stop under it.
- Phone: the hero scales to 360 px wide. Use a `viewBox` without fixed pixel sizes.
- No external images unless the user supplies them. Draw it.

## Review checklist

Look at the screenshots and answer honestly. Fix anything that fails before delivering.
1. Would someone from the audience recognize their field in the start slide within five seconds?
2. Does the concept line describe what you see, or did the build drift back to the template?
3. Do `--accent` and `--alt` read as a pair with meaning, used the same way on cards, lanes, the matrix and tags?
4. Is a question slide easy to answer from across a room: the question large, the Answered toggle obvious, the thread readable?
5. Is the dark mode designed, not inverted? Check the hero especially.
6. At phone width, does the hero still read and does nothing overflow?
