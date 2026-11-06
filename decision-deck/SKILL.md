---
name: decision-deck
description: Build an interactive decision deck for a project discussion. It is a standalone HTML page that walks a room through the open decisions (hosting, stack, scope, build or buy, phasing, anything with options). It has reference cards with pros and cons, a fit matrix, question slides grouped by discussion area, a live weighted recommendation with reasons and "watch out" risks, per-question comments, facilitator notes, answers shared through a claude.ai artifact, Markdown, CSV and JSON export, and a PDF export of the deck with the room's answers. Every deck gets its own visual design drawn from the customer and the subject, never a stock look. Use when the user wants a planner, decision deck, options deck, discovery or scoping questionnaire, stack planner, "help the client choose", or an interactive deck to drive a discussion about a particular project, or asks to add questions, options or areas to an existing deck built this way. Also use /decision-deck.
user-invocable: true
argument-hint: "<project> [decisions to frame] [--minutes N] [audience notes]"
---

# Decision deck

Builds a discussion deck for one project as a single self-contained HTML page. The room answers questions area by area. A weighted score points at an option for each decision, explains why, and flags the risks that hold whatever the score. Answers save as people go, so the deck becomes the record of the meeting.

It is the sibling of `talk-deck`. It has the same keyboard navigation, notes drawer and publishing. The difference is that the slides ask questions instead of presenting answers. The reference implementation was a hosting and frontend planner for a research software project.

Two things make a deck good, and both get equal weight:
1. **It looks like it was made for this customer and this subject.** Someone from the customer should recognize their world in the first five seconds. The template's theme is deliberately plain, and the checker fails a deck that still uses it.
2. **The questions are ones the room can answer, and the scoring is honest.** Ask about facts and constraints, not "which option do you like". Every point a question adds has a reason a stakeholder can read.

## Step 1: Brief

Get these from the conversation, or ask one short question for anything that changes the deck:
- **Project and customer.** Who the deck is for, what the project does, and the customer's domain.
- **Decisions to frame.** One to three, each with two to four options (for example hosting and frontend). Zero is allowed. A discussion-only deck collects answers and comments without scoring.
- **The room.** Who answers (technical staff, leadership, end users), and whether someone facilitates live or people fill it in on their own.
- **Length.** Minutes for the discussion, split across areas.
- **Sources.** Repo, docs, meeting notes, earlier artifacts, the SOW. Read them. The deck's credibility comes from specifics.
- **Where it goes.** A claude.ai artifact (the default, since it shares answers across viewers), a local file, or the artifacts site. See `references/publishing.md`.

## Step 2: Research

Read the project's sources and pull out the numbers and constraints the questions will cite: data sizes, user counts, team makeup, platforms, deadlines, compliance needs. Verify facts about the options (versions, support, licensing, pricing) in primary sources, and date them in a footnote. Also collect what the design needs: the customer's field, its instruments, materials and vocabulary, and anything the user says about tone. If a fact can't be verified, leave it out or say it's approximate.

## Step 3: Design direction

Read `references/design.md` and do this before writing questions. It's the step that is easiest to skip and most visible when skipped.

Write a one-line concept that says where the look comes from, then derive the palette, type, ground texture, hero visual and result-panel framing from it. Decision colors should mean something in the subject when possible. Share the concept in two or three lines with the outline in Step 4. For a high-stakes customer deck, offer two directions in one line each and recommend one.

## Step 4: Outline the content

Read `references/content.md`. Draft:
- The decisions and their options, with honest pros, cons and "best for".
- Three to eight discussion areas, each with a heading that is a question, two to eight questions, and a minute budget that adds up to the length.
- The scoring for each answer and its "why" sentence.
- The watch-out flags: risks that hold whatever the score.
- The fit matrix, if two decisions constrain each other.

Share the outline as a short list (areas, question counts, decisions, flags) with the design concept, and proceed unless the user wants changes.

## Step 5: Build

Copy `assets/deck-template.html` and replace its three per-deck layers, in this order:
1. **THEME**: the Google Fonts link and `<style id="theme">`. Tokens, type, ground, hero styles, and the concept line in its comment.
2. **HERO**: `<figure id="hero-visual">`. An inline SVG or canvas drawn from the subject. Remove `data-placeholder`.
3. **DATA**: the `deck-data` JSON block. All words, options, questions, points, flags and facilitator notes. Set `<title>` to the data title.

Leave the engine (`<style id="engine">` and the main script) alone. If a deck needs something the engine can't do, change the template in this skill so every later deck gets it, and say so.

House rules: American spelling, no em dashes in deck text, plain words. External links open in a new tab with `rel="noopener"`. Only Google Fonts and pinned scripts from cdnjs or jsDelivr. No customer logos or anything that makes the page look like an official customer publication. See `references/design.md`.

## Step 6: Check

Run the checker on every build and after every edit:

```bash
python3 <skill-dir>/scripts/check_deck.py <deck.html>
```

It fails a deck that still has the default theme, the placeholder hero or the example id. It checks token contrast in light and dark, validates the data (ids, points that reference real options, flag conditions, fit cells), and warns when an option can't come out on top even when every answer favors it. It also covers links, external hosts, spelling and JavaScript syntax. Fix every ERROR and read every WARN.

Then look at it. Open the deck in a browser, or use Playwright headless. The `a11y-audit` skill ships it, and `references/publishing.md` has a short script. Screenshot the start slide, one area slide and the result in light and dark at 1440×900, and one area at 390 px wide. Answer a few questions and confirm the result, the Watch out list and the export. Wait about 300 ms after navigating, because slides fade in. Then review the screenshots against the concept, using the checklist in `references/design.md`. Tell the user plainly what you verified and what you didn't.

## Step 7: Deliver

Follow `references/publishing.md`. For a claude.ai artifact, load the `artifact-capabilities` skill first. Make the fragment with `scripts/make_fragment.py`, run the checker on it with `--fragment`, and publish with the `db`, `downloads` and `user` capabilities so answers are shared. Give the user the link and say who can change answers (people with edit access) and who can only view.

## After the meeting

The answers live in the artifact's database, in the `deck` collection under the document `answers`. Older decks may use another path, so check the `db.doc(...)` call in the deck. When the user asks for a summary or a decision record, read them with `ArtifactData`, or ask for the Markdown export. Write it from the room's own answers and comments.

To export the deck with its results as a PDF, use `scripts/export_pdf.py`. It screenshots each slide of the real deck with the saved answers loaded and joins them into a PDF, so the pages match the deck's design. Don't rebuild the content as a Word document, a PowerPoint deck or a printed HTML page: those lose the design and read worse. The steps are in `references/publishing.md`, under "Exporting results as a PDF".

## Editing an existing deck

- Change the DATA block for content and the THEME block for look. Regenerate the fragment from the full page after every edit rather than editing both.
- Renaming or removing a question id orphans saved answers for it, so say so before doing it. Adding questions and options is safe.
- Run the checker, check the changed slides in a browser, and republish to the same artifact.
- If the user asks "why does it recommend X", trace the points from the answers and explain before changing any weights.

## Reference files

- `references/design.md`: deriving a deck's look from the customer and subject, with examples and a review checklist. Read before building.
- `references/content.md`: the data schema, and how to write decisions, questions, scoring, flags and notes. Read before outlining.
- `references/publishing.md`: claude.ai artifacts with shared answers, local files, the artifacts site, and the screenshot script.
- `assets/deck-template.html`: the template, with a theme, hero and data layer plus the shared engine.
- `scripts/check_deck.py`: the checker.
- `scripts/make_fragment.py`: makes the claude.ai fragment from the full page.
- `scripts/export_pdf.py`: exports the deck with saved answers as a PDF of slide screenshots.
