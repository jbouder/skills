# Content: decisions, questions, scoring

Everything the deck says and scores lives in the `deck-data` JSON block. The engine builds the slides from it in this order: start, one reference slide per decision, fit matrix, one slide per area, additional details, result.

## Contents
- Schema
- Decisions and options
- Areas and questions
- Scoring
- Watch-out flags
- Fit matrix
- Facilitator notes
- Discussion-only decks

## Schema

```json
{
  "id": "acme-stack",                     // lowercase slug: export file names and local storage key
  "title": "Acme Stack Planner",          // also the <title>
  "brand": "Acme", "brandSub": "Stack Planner",
  "eyebrow": "Acme · Hosting and frontend",
  "lede": "What the deck helps decide, in two sentences.",
  "resultTitle": "Where it should run, and what it should be built with",
  "resultLede": "A weighted score from the answers. It starts the discussion, it does not settle it.",
  "notes": { "start": "...", "result": "...", "details": "..." },   // facilitator notes for fixed slides
  "confidence": [2, 5],                   // optional: score gaps for "Moderate lead" and "Clear lead"
  "decisions": [
    { "id": "hosting", "label": "Hosting", "refTitle": "Where it could run", "refLede": "...", "notes": "...",
      "options": [ { "id": "local", "name": "Local install", "what": "...", "pros": ["..."], "cons": ["..."], "fit": "..." } ] }
  ],
  "fit": { "rows": "frontend", "cols": "hosting", "title": "...", "lede": "...", "notes": "...",
           "bonus": { "s": 3, "a": 0, "w": -3 },
           "cells": { "<row option id>": { "<col option id>": ["s", "Works today."] } } },
  "areas": [
    { "id": "users", "title": "Users and devices", "heading": "Who uses it, and on what computers?",
      "lede": "...", "minutes": 8, "notes": "...",
      "qs": [
        { "id": "install", "text": "Can users install and update tools themselves?", "hint": "...",
          "multi": "any",                 // optional: "any" or "mix" makes it a checkbox question
          "opts": [
            { "v": "no", "label": "No, machines are managed", "x": true,          // x: exclusive in a multi question
              "pts": { "hosting": { "local": -4, "hub": 3 } },
              "why": "Managed machines rule out local installs." } ] } ] }
  ],
  "flags": [
    { "title": "No owner", "text": "The answers point to {top:hosting}, but nobody can run servers.",
      "when": [ { "top": "hosting", "in": ["hub", "service"] }, { "q": "ops", "is": "nobody" } ] }
  ],
  "details": { "title": "Anything the questions did not cover?", "hint": "..." },   // or false to drop the slide
  "footnote": "Sources and dates for the facts on the fit slide."
}
```

Comments above are for this document only. JSON has no comments.

## Decisions and options

- One to three decisions. The engine colors up to three (`--d1` to `--d3`).
- Two to four options each, and include the status quo when there is one. "Keep what we have" is often the honest favorite.
- `what` is one sentence a newcomer understands. Pros and cons are parallel, specific and checkable: "Reads recordings straight from network drives" beats "Flexible". Include the cons of the option you expect to win.
- `fit` ("Best for") names the situation the option suits, not a verdict.
- Facts with numbers or dates get a source in `footnote`, dated Month Day, Year.

## Areas and questions

- An area is one discussion slot: three to eight areas, two to eight questions each. Order them from what the room knows best (users, data) to what needs debate (operations, team).
- The area `heading` is a question the slot answers. The `lede` gives the one or two facts that frame it, ideally from the project's sources.
- `minutes` budgets should add up to the meeting length. The running order shows them.
- **Ask about facts and constraints, not preferences.** "Where do recordings live?" is answerable and moves the score. "Should we use React?" skips the reasoning the deck exists to surface.
- `text` ends with a question mark. `hint` adds the number or context that makes it answerable, such as "One hour at 1 kHz is about 3.6 million samples per channel."
- Answer options are mutually exclusive and cover the range in plain words. Add "Not sure yet" with no points when the room really might not know. An unknown is a finding.
- Use `multi: "any"` when one viable choice is enough (who could run servers: take the best). Use `multi: "mix"` when the answer is split (data lives in several places: average them). Mark "None" options `x: true` so they clear the others.
- Question ids are storage keys. Keep them stable once a deck is shared.

## Scoring

- Points run from -4 to +4 per option per answer. Use ±3 to ±4 for answers that nearly decide it (managed machines rule out local installs). Use ±1 to ±2 for nudges. Put a hard blocker at -4, not at -99. Blockers belong in flags too.
- An answer can score several decisions at once.
- Every answer that adds points needs a `why`. Write it as cause then consequence, in one sentence the customer would agree with: "Recordings sit on personal computers, so hosting would mean uploading them." The result shows the top four reasons for each leading option.
- Points with no `why` can't be explained, and a `why` with no points never shows. The checker flags both.
- Balance: the checker warns when an option can't win even when every answer favors it. Either that option is a straw man (remove it, or say so in its card) or its points are too thin.
- Confidence labels come from the gap between first and second place: below 2 is a close call, 2 to 4 is a moderate lead, 5 or more is a clear lead. Override with `confidence` for decks with very many or very few questions.

## Watch-out flags

Flags are risks that hold whatever the score: a skills gap, no owner, data that can't move, a review that hasn't started. They often matter more than the scores. Aim for six to twenty.

Each flag has `title`, `text` and `when`, a list of conditions that must all hold:
- `{ "q": "id", "is": "v" }`: the answer includes v. `"not": "v"`: it doesn't, which also holds when unanswered. `"in": ["a", "b"]`: any of them. `"answered": true`: any answer at all.
- `{ "top": "decision", "is": "opt" }`: that option is leading. Also `"not"` and `"in"`.

Use `{top:decision}` in the text to name the leading option. Write the text as the risk followed by the next step: "Hosting is suggested, but nobody is available to run servers. Find an owner before committing."

## Fit matrix

Use it when two decisions constrain each other (frontend and hosting, database and deployment). `rows` is the decision that gets the bonus, and `cols` is the decision whose leading option sets it. Grade every cell `s` (strong), `a` (adequate) or `w` (weak) with a one-line note. `bonus` defaults to the planner's values: +3 strong, 0 adequate, -3 weak. The result says "includes fit with ..." so the bonus is visible.

## Facilitator notes

`notes` on decisions, areas, the fit slide and the fixed slides appear in the `N` drawer. They aren't shown on the slide. Write what the facilitator should do: which question tends to start an argument, what number to get, where to cut if the meeting runs long, and who in the room knows the answer. Keep anything you wouldn't want the customer to read out of them if the deck will be shared with the customer.

## Discussion-only decks

Set `"decisions": []` and leave out `fit` and any `pts`. The deck keeps areas, comments, details and export, and the result slide becomes a summary of what was heard. Flags still work on `q` conditions. Use this for kickoff, discovery and handoff questionnaires.
