# Content: sections, comparisons, questions

Everything the deck says lives in the `deck-data` JSON block. The engine builds the slides from it in this order: start, overview (optional), one slide per section, and the summary ("Answers so far", on by default).

## Contents
- Schema
- Three section layouts
- Comparisons
- Writing questions
- Groups and the rail
- Facilitator notes
- Storage and ids
- Markup in strings

## Schema

```json
{
  "id": "acme-onboarding",                 // lowercase slug: export file names and local storage key
  "title": "Acme Onboarding Q&A",          // also the <title>
  "brand": "Acme", "brandSub": "Onboarding Q&A",
  "eyebrow": "Acme · Onboarding",
  "lede": ["What the deck walks through.", "Answers are saved here and shared with everyone who can open this page."],
  "audience": "DSST",                      // "Questions for DSST", placeholder "What did DSST say?"
  "questionsTitle": "Questions for DSST",  // optional override of the sheet heading
  "notes": { "start": "...", "overview": "...", "summary": "..." },   // facilitator notes for fixed slides
  "rail": true,                            // optional: numbered step rail across sections (a sequential flow)
  "groups": [ { "id": "setup", "title": "Setup", "sub": "Before first use" } ],   // optional
  "compare": {                             // optional: a baseline compared with variants
    "label": "Compare LabArchives with",
    "baseline": { "name": "LabArchives", "sub": "today, through labapi", "badge": "Today" },
    "variants": [ { "id": "elabftw", "name": "eLabFTW", "sub": "through MetaRelay", "assume": ["Stated assumption."] } ]
  },
  "fitLabels": { "same": "Works the same" },   // optional relabels of same, changes, gap, unknown
  "prosLabel": "Strengths", "consLabel": "Watch out",   // optional overview card headings
  "overview": {                            // optional slide
    "eyebrow": "Overview", "title": "...", "lede": "...",
    "cards": [ { "name": "eLabFTW", "variant": "elabftw", "badges": ["MetaRelay"], "what": "...", "pros": ["..."], "cons": ["..."], "fit": "..." },
               { "name": "LabArchives", "base": true, "badges": ["Today"], "what": "..." } ],
    "matrix": { "title": "How each step fits, compared with LabArchives" },   // compare decks only
    "footnote": "Sources, dated Month Day, Year."
  },
  "sections": [
    { "id": "sign-in", "short": "Sign in", "title": "Sign in", "where": "Project Creation page",
      "group": "setup", "eyebrow": "optional override", "lede": "optional", "notes": "facilitator notes",
      "layout": "lanes",                   // lanes | cards | plain (see below)
      "body": ["Paragraphs."], "points": ["Bullets."], "html": "<optional markup>",
      "baseline": { "sum": "How it works today.", "pts": ["Detail."], "html": "<optional sketch>" },
      "variants": {
        "elabftw": { "fit": "changes", "sum": "...", "pts": ["..."], "note": "One-line verdict.", "html": "<optional sketch>",
                     "questions": [ { "id": "signin-elab-keys", "text": "Is pasting an API key acceptable?" } ] }
      },
      "questions": [ { "id": "signin-sso", "text": "Is single sign-on required?", "hint": "Context that makes it answerable.", "tag": "Optional label" } ] }
  ],
  "summary": true                          // false drops the Answers so far slide
}
```

Comments are for this document only. JSON has no comments.

## Three section layouts

- **`plain`**: prose (`body`, `points`, `html`) and questions. The default when the deck has no `compare` block. Use it for discovery, kickoff and handoff questionnaires.
- **`lanes`**: the baseline and one variant side by side, with a switcher for the variant, a callout with the fit chip and `note`, and any `assume` text for that variant. Questions are the section's own plus the selected variant's. The default for a section with `variants` in a compare deck. Use it to walk a flow step by step.
- **`cards`**: the baseline and every variant as cards in one row, each with its fit chip and note. Questions are the section's own plus every variant's, tagged with the variant name. Use it for a cross-cutting topic where the room should see all options at once, like hosting.

A deck can mix layouts. A compare deck usually has one or two `cards` sections, a run of `lanes` steps, and a `plain` wrap-up.

## Comparisons

- The baseline is what exists now, or the reference point. Variants are the alternatives. Two to four variants.
- `fit` grades a variant against the baseline for that section: `same`, `changes`, `gap`, or `unknown` (an open question). The matrix on the overview shows every section that has a fit, and its cells open that section on that variant.
- `note` is the one-line verdict a reader takes away. `sum` is what happens, in plain words. `pts` are the specifics: calls, limits, files.
- Put stated assumptions on the variant (`assume`), not repeated in every section.
- Facts with numbers, versions or dates get a source in the overview `footnote`, dated Month Day, Year.

## Writing questions

- Ask about facts, constraints and owners the room can answer: "Who would host eLabFTW for NIH labs, and is an instance running today?" beats "Do you like eLabFTW?"
- One question per decision. Two clauses are fine when they are one decision.
- `text` ends with a question mark. `hint` adds the number or context that makes it answerable.
- Put a question on the variant it is about. A question that holds for every variant goes on the section.
- Two to eight questions a section. A section with none is fine for context; say so in the brief.
- If you know who should answer, put it in `audience` or in a `tag`.

## Groups and the rail

- `groups` gather sections for the start slide's running order. Each group card opens its first section and shows its open count. Without groups, every section gets its own card.
- `rail: true` adds a numbered rail across the top of every section slide, with an open-question badge per step and, in compare decks, a fit pip for the selected variant. Use it for a sequential flow. Leave it off for unordered topics; the eyebrow then reads "Section n of m" or the group title.

## Facilitator notes

`notes` on a section, or `notes.start`, `notes.overview`, `notes.summary`, show in a drawer toggled with `N` or the bar button. Write what the facilitator should say or ask, not what the slide already shows. If no slide has notes, the button stays hidden. The notes are in the page source, so anyone with access can read them.

## Storage and ids

- The page stores two collections. `notes` holds every answer and note: `{ section, q, variant, kind: "answer" | "note", text, by, at }`. `q` is empty for a section note. `qstatus/<question id>` holds `{ resolved, by, at }`.
- Question ids are storage keys and must be unique across the whole deck, including variant questions. Keep them stable once the deck is shared. Renaming or removing one orphans its answers.
- Section ids appear in the URL (`#sign-in/elabftw`) and in stored notes. Don't rename them after sharing either.
- Adding sections, variants and questions is safe.

## Markup in strings

Data strings are inserted as HTML, so `<code>`, `<b>`, `<a>` and inline SVG work. Escape a literal `<` or `&` as `&lt;` and `&amp;`. External links need `target="_blank" rel="noopener"`. No scripts or inline event handlers; the checker fails them. Anything people type into the deck is shown as plain text, never as HTML.
