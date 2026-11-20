---
name: question-deck
description: Build an interactive question deck (a Q&A deck): a standalone HTML page that walks a room or a team through questions section by section and keeps their answers. Each section has context (prose, or a baseline compared side by side with alternatives, with fit grades), then a sheet of questions with threaded answers and notes, an Answered toggle per question, and section notes. It has a start slide with live open counts, an optional overview with option cards and a fit matrix, an optional step rail for sequential flows, facilitator notes, an "Answers so far" summary with Markdown and JSON export, answers shared with names through a claude.ai artifact, and a PDF export of the deck with its answers. Every deck gets its own visual design drawn from the audience and the subject. Use when the user wants a Q&A deck, discovery, kickoff, scoping or handoff questionnaire, a walkthrough of a flow with open questions per step, a comparison of today's system with alternatives that collects answers, or "questions for the customer" in a shareable page, or asks to add sections, questions or comparisons to a deck built this way. Also use /question-deck.
user-invocable: true
argument-hint: "<project> [what to ask about] [--compare baseline vs options] [--minutes N] [audience notes]"
---

# Question deck

Builds a deck of questions for one project as a single self-contained HTML page. The room works through sections. Each section shows what they need to know, then asks what only they can answer. Answers and notes save as people type them, with their names, so the deck becomes the record of the conversation and stays useful after it.

It is the sibling of `talk-deck`: same keyboard navigation, notes drawer and publishing, but the slides collect answers instead of presenting them. The reference implementation is the ChronoXIV ELN Flow walkthrough, which compared LabArchives with three other destinations step by step and listed the questions for each.

Two things make a deck good, and both get equal weight:
1. **It looks like it was made for this audience and this subject.** Someone from that audience should recognize their world in the first five seconds. The template's theme is deliberately plain, and the checker fails a deck that still uses it.
2. **The questions are ones the room can answer, and each sits next to the context that makes it answerable.** Ask about facts, constraints and owners, not preferences.

## Step 1: Brief

Get these from the conversation, or ask one short question for anything that changes the deck:
- **Project and audience.** Who the deck is for, what the project does, who will answer (name it in `audience`).
- **Shape.** Plain sections of questions (discovery, kickoff, handoff), or a comparison: a baseline (today's system) against two to four alternatives, walked section by section. A flow with ordered steps gets the rail.
- **The room.** Facilitated live, or a link people fill in on their own.
- **Length.** Minutes for a live session, which caps the number of sections and questions.
- **Sources.** Repo, docs, meeting notes, earlier artifacts, the SOW. Read them. The deck's credibility comes from specifics.
- **Where it goes.** A claude.ai artifact (the default, since it shares answers with names), a local file, or the artifacts site. See `references/publishing.md`.

## Step 2: Research

Read the sources and pull out what the context panels and questions will cite: how things work today, what each alternative changes, numbers, limits, owners, deadlines. Verify facts about tools and services (versions, support, limits) in primary sources, and date them in the overview footnote. Mark anything assumed as assumed. Also collect what the design needs: the audience's field, its instruments, materials and vocabulary.

## Step 3: Design direction

Read `references/design.md` before writing sections. Write a one-line concept that says where the look comes from, then derive palette, type, ground and hero from it. When the deck compares, `--accent` is the baseline and `--alt` the variant: make the pair mean something in the subject. Share the concept in two or three lines with the outline.

## Step 4: Outline

Read `references/content.md`. Draft:
- The sections, each with a title, a `where` or lede, and its layout (`plain`, `lanes` or `cards`).
- For a comparison: the baseline, the variants with any stated assumptions, and per section a fit grade, a one-line note, and what happens on each side.
- The questions, with stable ids, placed on the section or on the variant they are about.
- Groups and the rail, if the order matters.

Share the outline as a short list (sections, question counts, comparison, design concept) and proceed unless the user wants changes.

## Step 5: Build

Copy `assets/deck-template.html` and replace its three per-deck layers, in this order:
1. **THEME**: the Google Fonts link and `<style id="theme">`. Tokens, type, ground, hero styles, and the concept line in its comment.
2. **HERO**: `<figure id="hero-visual">`. An inline SVG or canvas drawn from the subject. Remove `data-placeholder`.
3. **DATA**: the `deck-data` JSON block. Every word, section, comparison, question and facilitator note. Set `<title>` to the data title.

Leave the engine (`<style id="engine">` and the main script) alone. If a deck needs something the engine can't do, change the template in this skill so every later deck gets it, and say so.

House rules: American spelling, no em dashes in deck text, plain words. External links open in a new tab with `rel="noopener"`. Only Google Fonts and pinned scripts from cdnjs or jsDelivr. No logos or anything that makes the page look like an official publication of the audience.

## Step 6: Check

Run the checker on every build and after every edit:

```bash
python3 <skill-dir>/scripts/check_deck.py <deck.html>
```

It fails a deck that still has the default theme, the placeholder hero or the example id. It checks token contrast in light and dark, validates the data (unique slugs, question ids unique across the deck, variants that exist, fit values, layouts that need a compare block), and covers links, external hosts, spelling, markup in data and JavaScript syntax. Fix every ERROR and read every WARN.

Then look at it with the screenshot script in `references/publishing.md`: the start slide, the overview, one section of each layout and the summary, in light and dark at 1440×900, plus one section at 390 px. On the local file, add an answer, mark it answered, and confirm the counts and the summary update. Review the screenshots against the concept with the checklist in `references/design.md`. Tell the user plainly what you verified and what you didn't.

## Step 7: Deliver

Follow `references/publishing.md`. For a claude.ai artifact, load the `artifact-capabilities` skill first, make the fragment with `scripts/make_fragment.py`, check it with `--fragment`, and publish with `db`, `user` (profile scope) and `downloads`. Give the user the link and say who can add answers (Contributors and up) and who can only read.

## After the session

Answers live in the artifact's `notes` collection and Answered marks in `qstatus`. When the user asks for a summary or a record, list both with `ArtifactData` and write it from the room's own words, question by question, with what is still open. For the names on answers, use the deck's **Export Markdown** from the summary slide, which resolves them in the viewer.

To export the deck with its answers as a PDF, use `scripts/export_pdf.py`, which screenshots the real deck with the saved answers loaded. Don't rebuild the content as a Word or PowerPoint document; those lose the design.

## Editing an existing deck

- Change the DATA block for content and the THEME block for look. Regenerate the fragment from the full page after every edit rather than editing both.
- Renaming or removing a question id or section id orphans saved answers for it, so say so before doing it. Adding sections, variants and questions is safe.
- Run the checker, check the changed slides in a browser, and republish to the same artifact.

## Reference files

- `references/design.md`: deriving a deck's look from the audience and subject, with a review checklist. Read before building.
- `references/content.md`: the data schema, the three layouts, comparisons, and how to write questions. Read before outlining.
- `references/publishing.md`: claude.ai artifacts with shared answers, reading answers back, the PDF export, local files, the artifacts site, and the screenshot script.
- `assets/deck-template.html`: the template, with a theme, hero and data layer plus the shared engine.
- `scripts/check_deck.py`: the checker.
- `scripts/make_fragment.py`: makes the claude.ai fragment from the full page.
- `scripts/export_pdf.py`: exports the deck with saved answers as a PDF of slide screenshots.
