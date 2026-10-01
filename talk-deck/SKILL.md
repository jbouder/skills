---
name: talk-deck
description: Build an interactive HTML slide deck for a talk — a standalone page with keyboard navigation, speaker notes, a clickable running order with timings, live demos with Show code toggles, takeaways and resources — and save it as a file or publish it to the OpenTeams artifacts site and/or a claude.ai artifact. Supports a standard intro flow, a deep-dive mode (API walkthrough, internals, gotchas, more code) and a UI/UX-focus mode (accessibility, design states, user cost). Use whenever the user wants a presentation, talk, deck, slides, lightning talk, brown bag, CoP or community-of-practice session, tech talk or workshop deck, even if they don't say "HTML", or asks to add slides, demos or code examples to an existing deck built this way. Also use /talk-deck.
user-invocable: true
argument-hint: "<topic> [--minutes N] [--deep-dive] [--ux] [audience notes]"
---

# Talk deck

Builds a talk as a single self-contained HTML page: one slide per screen on desktop, all slides stacked on a phone, arrow-key navigation, an `N` key for a speaker-notes drawer, and live demos that run on the viewer's machine. The reference implementation is the WebGPU talk on the OpenTeams artifacts site; `assets/deck-template.html` is its shell, generalized.

The aim is a deck a presenter can give without rewriting: every slide has a point, the notes tell the presenter what to do, the demos prove something, and nothing on the page misleads.

## Step 1: Brief

Get these from the user's message or the conversation; ask one short question for anything missing that changes the outline:
- **Topic** and the one thing the room should understand by the end.
- **Audience** and venue (e.g. "UI/UX community of practice", "backend engineers"). This decides the mode.
- **Length** (default 30 minutes).
- **Mode**: standard, deep dive, UI/UX focus, or both. Infer from audience and length, then confirm in one line. See `references/modes.md`.
- **Where it's published**: the artifacts site, a claude.ai artifact, both, or just a local file. See `references/publishing.md`.

Don't interrogate. If the brief is "a 30-minute talk on X for the UI/UX CoP", that's enough: standard flow plus UI/UX focus, 30 minutes, ask only about publishing if it's unclear.

## Step 2: Research and verify

Facts in a talk get repeated, so check them. Look up version numbers, ship dates, support status and API names in primary sources (official docs, release notes, the package's own source) rather than writing from memory. For browser support, MDN's browser-compat-data (the `@mdn/browser-compat-data` package or its raw JSON on GitHub) is the most precise source; caniuse is a good cross-check. When a demo uses a library, fetch the exact pinned version and confirm the calls exist in it. When you list links, request each one and read its title so the description matches the page. If a fact can't be verified, leave it out or say it's approximate.

## Step 3: Outline

Write the running order as a short list of parts with minute budgets that add up to the length, and each slide's title as a statement of its point. Follow the standard flow in `references/slides.md`, adapted to the topic, plus the mode's extra part from `references/modes.md`. Share the outline in a few lines and proceed unless the user wants changes; for a small deck you can go straight to building.

## Step 4: Build

Copy `assets/deck-template.html` and fill it in. Keep its structure (classes, `<aside>` notes, `data-goto`, `onLeave`, the `CODE` registry) so the checker and future edits work.

What makes a good deck, and why (details in `references/slides.md`):
- **Titles state the point.** Someone reading only titles should get the talk.
- **Visible text is for the audience, `<aside>` is for the presenter.** Instructions like "click the two that apply" belong in notes; on the slide they confuse a room that can't click.
- **Interactivity has to reveal something.** A stepper, a live measurement, a demo; not a highlight the presenter could just say out loud.
- **The honest counterweight.** A "where it doesn't belong" slide, and caveats in the notes, buy credibility for everything else.
- **Demos prove a claim and compare fairly.** Same output and same work on both sides, measured on the presenter's machine, sized so the gap actually shows. Read `references/demos-and-code.md` before building any demo.
- **Code where it helps.** Short real snippets for syntax and key calls; a `</>` toggle on each demo that shows the code that actually runs.
- **Wrap up** with exactly three takeaways, then optional after-talk demo links, then "Where to start" with "Questions?" last.

House rules: American spelling. External links open in a new tab (`target="_blank" rel="noopener"`). Colors as CSS variables with a dark-mode block. Only Google Fonts and pinned scripts from cdnjs or jsDelivr. No server calls beyond explicit, user-approved downloads.

## Step 5: Check

Run the checker on every build and after every edit:

```bash
python3 <skill-dir>/scripts/check_deck.py <deck.html>          # site page
python3 <skill-dir>/scripts/check_deck.py <fragment.html> --fragment   # claude.ai artifact copy
```

It catches the mistakes that are easy to make when slides move around: non-sequential slide ids, a page counter that doesn't match, running-order buttons pointing at missing slides, "slide N" references to slides that don't exist, missing speaker notes, links that don't open in a new tab, unpinned or disallowed external resources, British spellings, and JavaScript syntax errors. Fix every ERROR; read every WARN.

Then test the demos. With a browser, open the deck locally, look at each new or changed slide, check that no slide is taller than a laptop screen, exercise every demo control and read the console. Without one, run a jsdom smoke test with stubbed APIs. Both are described in `references/demos-and-code.md` (note that background tabs don't animate). Tell the user plainly what you verified and what you couldn't.

## Step 6: Deliver

If the user only wants a file, save the complete page (the site version) and stop; skip the fragment copy unless they mention claude.ai. Otherwise follow `references/publishing.md`. For the artifacts site, the repo's `AGENTS.md` governs. For a claude.ai artifact, publish the fragment version. Confirm the site page is live and the new content is served, and give the user the page URL.

## Editing an existing deck

Most work on a deck is iterative: add a slide, cut one, reorder, change a demo. For each change:
- Apply it to every copy (site page and artifact fragment) with the same scripted edit, so they can't drift.
- Renumber slide ids and comments sequentially, update the page counter, running-order targets and minute budgets, `onLeave` keys, and any "slide N" text.
- Run the checker, then check the changed slides in a browser.
- If the user asks a "why" or "what is the point of" question about a slide, answer it and give a recommendation before changing anything.
- If the user reverses a change that's already pushed, revert the commit rather than rewriting history, and republish the artifact from the earlier version.

## Reference files

- `references/slides.md`: the standard flow, slide patterns, writing rules, timing. Read before outlining.
- `references/modes.md`: deep dive and UI/UX focus. Read when either mode applies.
- `references/demos-and-code.md`: choosing, building, measuring and testing demos; code toggles and snippets. Read before building any demo or code slide.
- `references/publishing.md`: the artifacts site and claude.ai artifacts. Read before publishing.
- `assets/deck-template.html`: the deck shell with every slide pattern.
- `scripts/check_deck.py`: the checker.
