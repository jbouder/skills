# The HTML report

`scripts/build-report.mjs <outDir>` turns three files into one standalone `report.html`:

- `pr.json` and `pr.diff`, written by `scripts/pr-data.mjs`.
- `review.json`, written by you.

The builder adds what should never be typed by hand: the size charts, GitHub permalinks, the diff excerpt for each cited range, and the inlined screenshots. You supply the judgment.

## review.json

```json
{
  "mode": "panel",
  "summary": "What the PR does, in two to four sentences, for someone who has not opened it.",
  "verdict": "request-changes",
  "verdictReason": "One sentence.",

  "flowTitle": "How a connector call travels",
  "flow": [
    { "title": "An AI client calls a connector tool", "text": "Tools are offered on `/mcp`." },
    { "branch": [
      { "tag": "read tool", "title": "Forwarded to the vendor", "text": "..." },
      { "tag": "write tool", "title": "Becomes a plan", "text": "..." }
    ] },
    { "title": "Every call is audited", "text": "..." }
  ],

  "keyChanges": [
    { "title": "Group-gated connector use", "text": "Why this change matters.",
      "refs": [{ "path": "internal/authz/authz.go", "line": 239, "endLine": 242 }] }
  ],

  "findings": [
    {
      "id": "F1",
      "severity": "blocking",
      "title": "One line: what goes wrong, for whom",
      "what": "The failure in plain language. Inline links work: [[internal/mcp/server.go:65]].",
      "refs": [
        { "path": "internal/mcp/server.go", "line": 59, "endLine": 65 },
        { "path": "internal/audit/auditor.go", "line": 91, "note": "same comparison, not touched by this PR" }
      ],
      "evidence": "What was run or traced, and what came out.",
      "whyCiGreen": "Why the tests do not catch it.",
      "fix": "The specific change.",
      "suggestion": { "path": "internal/mcp/server.go", "line": 65, "replacement": "\t\thandler = middleware(handler)" },
      "raisedBy": ["security", "correctness"],
      "tags": ["latent"]
    }
  ],

  "worthKnowing": [
    { "title": "Migration number collides with PR 21", "text": "...", "refs": [] }
  ],

  "reviewers": [
    { "id": "correctness", "lens": "Correctness and behavior",
      "summary": "Two or three sentences.", "reported": 4, "kept": 2 },
    { "id": "security", "lens": "Security and data", "summary": "...", "reported": 3, "kept": 1 },
    { "id": "tests", "lens": "Tests and contracts", "summary": "...", "reported": 2, "kept": 1 }
  ],

  "recommendation": {
    "text": "What must change and why, then what the author should know.",
    "mustChange": ["F1"],
    "overruled": "Where you changed a reviewer's severity or dropped a finding, and why."
  },

  "screenshots": [
    { "file": "shots/before-settings-connectors-desktop-light.jpg", "state": "before", "pair": "connectors",
      "route": "/settings/connectors", "viewport": "1440x900", "caption": "Connectors page on main." },
    { "file": "shots/after-settings-connectors-desktop-light.jpg", "state": "after", "pair": "connectors",
      "route": "/settings/connectors", "viewport": "1440x900", "caption": "Connectors page with the new catalogue list." }
  ],
  "screenshotsNote": "Only when UI changed and something could not be captured: say what and why.",

  "readingOrder": [
    { "refs": [{ "path": "docs/plans/connectors.md" }], "text": "for the intended design." }
  ],

  "notDone": ["The OAuth flow was not exercised against a real vendor."]
}
```

### Required

`mode` (`panel` or `quick`), `summary`, `verdict` (`approve` or `request-changes`), `recommendation.text`. Three `reviewers` when the mode is `panel`. Every finding needs `title`, `severity` (`blocking` or `should-fix`) and at least one ref. When `pr.json` says the UI changed, either `screenshots` or `screenshotsNote`.

Reviewers carry no approve or request-changes vote. Each reads through one lens, so the report shows per reviewer how many of its findings were kept and whether any of them block, worked out from each finding's `raisedBy`. Use the reviewer `id` values there.

Everything else is optional. Leave a section out when it has nothing true to say. `flow` and `readingOrder` earn their place on a large PR and are usually noise on a small one. `keyChanges` is for the two or three changes a reader should see even though nothing is wrong with them. On a clean PR it is most of the report.

### Refs: how code gets linked and quoted

A ref is `{ "path", "line", "endLine", "note" }`. Paths are repo-relative. Line numbers are from the file **at the PR head**. A ref with no line links the file. A path to a folder links the folder.

For each ref the report shows:

- A permalink to those lines at the head commit. It keeps pointing at what was reviewed after the author pushes again.
- A second link to the same line in the PR's Files tab, when the file is part of the diff.
- The diff excerpt around the range, cut from `pr.diff`. The cited lines get a marker in the gutter. If the range is in code the PR did not touch, the report shows those source lines instead, labeled as unchanged.

So cite the lines where the defect is. Do not paste code into `what` or `evidence`, the excerpt is already there and it is the real code.

Inside any text field, `[[path:line]]`, `[[path:10-20]]` and `[[path]]` become the same permalinks inline. Backticks make code. `**bold**` works. Blank lines split paragraphs. Nothing else is interpreted.

### Suggestions

`suggestion` is `{ "path", "line", "endLine", "replacement" }`. The report renders it as a diff: the real lines at the head in red, your replacement in green. Use it when the fix is a few lines on a known range. Match the file's indentation exactly, tabs included. For a fix that spans files or needs a design choice, describe it in `fix` and skip the suggestion.

### Screenshots

Paths are relative to the out dir. Give every image a caption that says what the reader is looking at and what changed. Two images with the same `pair` value sit side by side, before first.

## What the builder checks

It exits 1 and writes nothing when:

- A cited path does not exist at the PR head, or a line is past the end of the file.
- A finding has no title, severity or ref.
- The verdict is `approve` but a finding is `blocking`.
- The mode is `panel` and there are not three reviewers.
- A finding's `raisedBy` names a reviewer id that is not in `reviewers`.
- The UI changed and there are no screenshots and no note.
- A screenshot file is missing or has no caption.

Fix every error. They are almost always a real mistake in the review: a line number taken from the wrong branch, or a file that a reviewer described from memory.

## Writing it

The reader may not have opened the PR. Lead each finding with what goes wrong for the user or the system, then the cause. Keep each field to a few sentences. The rules in SKILL.md step 7 apply to every field here.
