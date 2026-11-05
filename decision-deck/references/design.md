# Design: a deck that belongs to its customer

A decision deck sits in front of the customer for an hour while they argue about their own project. If it looks like a generic form, it reads as a template someone filled in. If it looks like their world, it reads as work done for them, and that buys attention and trust for every question in it. Treat the design as half the deliverable.

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
- **The customer.** Their field, how formal they are, the colors and type they use publicly. Take the feel and the palette family. Don't copy logos, marks or layouts, and don't make the page pass as an official customer publication. Name the customer in text, not with their branding.
- **The room.** A live facilitated session with a projector needs larger type and higher contrast than a link people fill in alone. Leadership wants the result panel to read at a glance. Engineers will forgive density.

Read the project's own UI if it has one, through screenshots, the repo's CSS, or the docs. The deck can rhyme with it without copying it.

## The concept line

Write one sentence that names a metaphor from the subject and how it shows up. Put it in the theme comment, after `Concept:`. The checker requires it.

Good: "Instrument panel: graph-paper ground, one hairline-ruled sheet per area, switch-style answers with an indicator light, and a dark scope readout for the result. Hosting in the 465 nm signal blue, frontend in the 405 nm isosbestic violet."

Weak: "Clean and modern with a blue accent." It says nothing about this customer, and any deck could claim it.

## What the concept decides

Each item below lives in the THEME block or the HERO figure. Derive every one from the concept.

- **Palette.** Pick `--bg`, `--surface`, `--ink`, `--muted`, `--rule` and `--accent` first. Then pick one color per decision (`--d1`, `--d2`, `--d3`), each with `-ink` and `-soft` variants and a `--panel-dN` for the dark result panel. Decision colors work best when they mean something in the subject: two wavelengths, two map layers, two lanes. Keep `--good`, `--bad` and `--warn` legible and conventional, because they carry pros, cons and fit grades.
- **Type.** Pair a display face, a body face and a mono face from Google Fonts. The display face carries the concept: a wide grotesque for instruments, a slab for logistics, a humanist serif for a museum or archive. The mono face labels eyebrows, counts and scores. Set `--display-weight`, `--display-stretch` and `--display-tracking` to suit. Load only the weights you use.
- **Ground.** `--ground` and `--ground-size` set the page background image. CSS gradients can make graph paper, blueprint grids, ruled ledger lines, dot grids, topographic hatching or paper grain. Keep it at low contrast so text on `--bg` still passes.
- **Hero visual.** Replace `<figure id="hero-visual">` with an inline SVG or a small canvas drawn from the subject: a simulated trace, a route map, a floor plan, a pipeline diagram, a stack of layers. Make it deterministic, with seeded noise and no network. Color it with tokens (`var(--panel-d1)` in SVG, `getComputedStyle` in canvas) so it follows light and dark, and redraw on theme change. It's decorative, so keep `aria-hidden="true"`, or give it a `figcaption` if it says something true about the project. Label anything simulated as illustrative.
- **Panel framing.** The result panel uses the `--panel-*` tokens. Pick a framing that fits the concept: an instrument readout (dark, glowing labels), a ledger summary (paper, ruled), a blueprint (blue ground, white lines), or a dashboard tile. The panel can be light if the concept calls for it, as long as contrast holds.
- **Details.** `--r` (corner radius: 0 for blueprint, 6 px for instruments, 12 px for consumer), the eyebrow marker, and rule weights. Add small touches in the THEME block by targeting engine classes, such as a tick pattern on `.slide-body` or a stamp on `.pick`. Don't change engine layout.

## Worked directions

| Subject | Concept | Palette and decisions | Type | Ground and hero |
|---|---|---|---|---|
| Neuroscience signal tool | Instrument panel | Cool gray paper; signal blue and isosbestic violet | Archivo (wide), IBM Plex Sans, IBM Plex Mono | Graph paper; simulated dF/F trace on a dark scope |
| Freight and routing app | Dispatch board | Kraft and asphalt; route amber and depot teal | Roboto Slab, Inter, JetBrains Mono | Faint road grid; route lines between depots |
| Hospital scheduling | Clinical chart | White and calm green; shift blue and ward coral | Source Serif 4, Source Sans 3, Source Code Pro | Ruled chart paper; a week of shift bars |
| Museum collections | Archive drawer | Linen and ink; catalog oxblood and accession slate | Fraunces, Work Sans, IBM Plex Mono | Paper grain; index cards fanned out |
| Data platform migration | Blueprint | Blueprint navy and white; warehouse cyan and lake yellow | Space Grotesk, Inter, Space Mono | Fine blue grid; a pipeline diagram of the current stack |

These are starting points. Make each new deck from its own subject, not from this table.

## Constraints

- Contrast: body text 4.5:1 on its surface in light and dark, decision colors 3:1 on the surface, and `-ink` 4.5:1 on its decision color. The checker computes these from the hex tokens, so keep them as hex.
- Dark mode is required. Define it twice, as the template does: under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and under `:root[data-theme="dark"]`. Re-derive the dark palette, don't just invert it.
- Motion: the engine already respects `prefers-reduced-motion`. A hero that animates must stop under it.
- Phone: the hero must scale to 360 px wide. Use a `viewBox` without fixed pixel sizes.
- No external images unless the user supplies them. Draw it.
- Keep semantic colors conventional: green for pros and strong fit, red for cons and weak fit, amber for adequate.

## Review checklist

Look at the screenshots and answer each question honestly. Fix anything that fails before delivering.
1. Would someone from the customer recognize their field in the start slide within five seconds?
2. Does the concept line describe what you see, or did the build drift back to the template?
3. Do the decision colors read as a pair with meaning, and are they the same on reference cards, the fit matrix and the result?
4. Does the result panel feel like the payoff, readable from across a room?
5. Is the dark mode designed, not inverted? Check the hero especially.
6. At phone width, does the hero still read and does nothing overflow?
7. Is there anything that only looks good at one width or in one theme?
