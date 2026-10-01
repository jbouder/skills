# Slide catalog and the standard flow

The template (`assets/deck-template.html`) has working markup for every pattern below. Copy from it rather than inventing new classes, so decks stay consistent and the checker understands them.

## Contents
- The standard flow
- Slide patterns
- Writing a slide
- Timing

## The standard flow

This is the shape that worked for a 30-minute technical talk to a mixed audience. Treat it as the default and adapt it to the topic; a talk about a process or a tool won't have a "how it works" API section, for example.

| # | Part | Slides | Purpose |
|---|---|---|---|
| 1 | Title | 1 | Name the topic, one sentence of promise, the keyboard hint |
| 2 | Running order | 1 | Clickable parts with minute budgets that add up to the talk length |
| 3 | What it is | 3–6 | Definition; history and why now; what it replaces; the ecosystem or implementations; where it's supported |
| 4 | How it works | 2–4 | The high-level model (a stepper of 3 steps beats 7 objects), the mental model, the one gotcha people hit first |
| 5 | What it means for X | 1–2 | The environment the audience cares about: hardware, browsers, teams, cost |
| 6 | Where it fits | 2–3 | Where it earns its place, where it doesn't belong (the honest counterweight), uses beyond the obvious |
| 7 | Optional mode parts | 3–5 | Deep dive or UI/UX focus; see `modes.md` |
| 8 | Demos | 1–3 | Live, measured, honest; see `demos-and-code.md` |
| 9 | Takeaways | 1 | Exactly three lines people can repeat |
| 10 | More demos to try | 0–1 | Links for afterwards, marked as not part of the talk, left out of the running order |
| 11 | Where to start + Questions | 1 | The best 4–6 links, "Questions?" at the bottom |

Each part gets an eyebrow ("Part one", "Part two · How it works") so the room always knows where it is. Number the parts in the same order as the running order buttons; the CSS counter numbers those buttons by position.

## Slide patterns

- **Statement + cards** (`.cards` of `.card`): 3–4 parallel ideas, one or two sentences each. The workhorse.
- **Compare** (`.cmp` with two `.card`s, optionally `.win`): before/after, old/new, GPU/CPU, canvas/DOM. Keep the lists parallel line for line.
- **Big number** (`.big` + `.lede`): one striking fact ("8 years").
- **Stepper** (`.stepper`): a process the presenter clicks through. Group into 3–4 steps; more than that is a deep-dive slide.
- **Table** (`.tbl`): support matrices, version tables. Mark partial rows visually.
- **Code** (`pre` with `.k`/`.s`/`.a`/`.c` spans): ≤ 12 lines. See `demos-and-code.md`.
- **Live panel** (`.log`): something the page detects about this machine, such as feature support or hardware limits. Cheap and memorable.
- **Side by side** (`.pair` of `figure`s): two canvases or outputs compared, each with a caption and its measured number.
- **Demo card** (`.demo`): canvas or output, status text and a `</>` code toggle in the header row, controls in the bottom row.
- **Takeaways** (`ol.take`): three numbered lines.
- **Link cards** (`.res`, `.res.three` for a 3×3 grid): resources and after-talk demos, each with a category tag, a name and one line.

## Writing a slide

- **The title states the point.** "Three steps, seven objects" or "A canvas is invisible to assistive tech", not "Overview" or "Compute: the same shape, minus the rendering". If someone only reads titles, they should get the talk.
- **Visible text is for the audience; `<aside>` is for the presenter.** Anything that tells the presenter what to do ("click the two closest to what this room builds", "pause here") belongs in the notes. Presenter text on a slide confuses the room, because they can't click anything.
- **One idea per slide.** If a slide needs two callouts, it's two slides.
- **Every slide fits one laptop screen** (about 1440×800) without scrolling. Demo slides are the usual offenders: a full-width 16:9 canvas plus controls overflows. The template caps canvas height; keep controls to one row and move long explanations into the notes.
- **Interactivity has to earn its place.** A click that only highlights a card adds nothing the presenter couldn't say. Good interactivity reveals something: a stepper's next step, a demo's measured result, a live detection.
- **Every slide gets speaker notes**: what to say, what to skip, where to cut if behind. Notes are also where honest caveats go ("for a sum of a million floats the CPU is genuinely fine").
- **Avoid "see slide N" references when you can.** If you use them, the checker verifies the numbers, but they still break silently when slides move; refer to slides by title in prose where possible.
- **Plain, concrete language.** The audience includes people new to the topic. Define a term the first time, cut jargon that isn't needed.

## Timing

Budget minutes per part in the running order and make them add up to the talk length. A rough guide: one to two minutes per content slide, five or six minutes for live demos, one minute for the wrap-up (takeaways and links; the after-talk demo slide isn't budgeted). When the user adds slides, rebalance the budgets rather than letting the total drift, and say which part you took time from. Slides beyond the time budget are fine if the user plans to skip some; say so in the summary.
