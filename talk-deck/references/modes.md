# Modes: deep dive and UI/UX focus

The standard flow suits a mixed audience in about 30 minutes. Two optional modes reshape it. They combine: a deep dive with a UI/UX focus is a long talk for designers and frontend engineers.

## Choosing

Ask, or infer from the brief:
- **Deep dive** when the audience will build with the thing soon, the talk is 45 minutes or more, or the user says "technical", "for engineers", "under the hood".
- **UI/UX focus** when the audience is designers, a UI/UX community of practice, product folks, or frontend engineers who care about the user's experience more than the internals.
- **Neither** for an introduction or overview.

## Deep dive

Goal: the room could start building on Monday.

Add or expand:
- **A walkthrough of the API in order**, one slide per stage of the stepper from the standard flow, each with a short code sample (≤ 12 lines) and the reason the stage exists.
- **Internals that explain behavior.** Only the internals that make the observable behavior make sense (why validation happens once, why errors arrive asynchronously). Skip trivia.
- **Gotchas and limits**: the five or six things that bite in the first week, each with the symptom and the fix.
- **Performance model**: what's expensive, what's cheap, and a measured example. Honest about where the naive alternative is fine.
- **Debugging and testing**: what tools exist, how to test it in CI, what's still weak.
- **More runnable code**: every demo gets the Show code toggle; consider a slide that steps through the demo's code.

Budget: roughly 45–60 minutes, about 22–28 slides. All of the above won't fit at full size, so combine:
- Fold the performance model into a measured demo or a code slide rather than giving it its own section.
- Split gotchas into two slides of three, each gotcha as symptom → fix.
- Keep the standard flow's intro to three or four slides; the audience chose a deep dive.
- A typical 45-minute split: intro 6, API walkthrough 12, internals and gotchas 9, where it fits 4, debugging and testing 3, demos 9, wrap-up 2.

## UI/UX focus

Goal: the room knows when to reach for it and how to design around it.

Add a part called something like "Designing for it" before the demos, with these slides as they apply to the topic:
- **Accessibility.** What assistive tech can and can't see, the DOM-twin pattern (a real table or summary behind a visual), keyboard parity, reduced motion, contrast. Rule of thumb for the notes: if the visual disappeared, could someone still do the task?
- **How it sits in a normal page.** What the new thing is good at versus what HTML/CSS/the design system already does well, and the seam between them (events, alignment, resizing).
- **The user's cost.** Battery, heat, first-load time, downloads, memory: the costs the person using it pays, distinct from the developer's setup cost.
- **Design the states.** Loading, unsupported, error or lost, and slow. The happy path is usually the only one in the mockups.
- **Design tokens and motion**, when relevant: how colors, type and motion tokens carry over.

Also:
- Frame use cases in product terms ("a design-tool canvas", "data viz with 100k points") rather than API terms.
- Lighter on internals: keep the "how it works" part to its high-level stepper and the mental model.
- The takeaways should include one design takeaway, such as "design for accessibility, loading and power from the start".

## Code examples in either mode

See `demos-and-code.md`. Short version: include code where the audience would otherwise have to imagine it, keep snippets short, and prefer showing the code that actually runs in a demo over writing separate illustrative code.
