# Pushing a review with inline comments

`gh pr review` cannot create inline comments. Use the REST API with a JSON payload file.

## The call

```bash
gh api repos/<owner>/<repo>/pulls/<n>/reviews \
  --method POST \
  --input <scratchpad>/review.json \
  -q '{id: .id, state: .state, url: .html_url}'
```

Write the payload to a file in the scratchpad. Never build it inline in the shell — the bodies contain backticks, quotes, and newlines, and the quoting will fail in a way that's slow to debug.

## Payload

```json
{
  "commit_id": "<PR head SHA>",
  "event": "REQUEST_CHANGES",
  "body": "One to three sentences framing the review.",
  "comments": [
    {
      "path": "backend/internal/mcp/server.go",
      "line": 59,
      "side": "RIGHT",
      "body": "Markdown. Backticks and fenced code blocks work."
    },
    {
      "path": "backend/internal/store/sqlite/migrations/005_x.sql",
      "start_line": 11,
      "line": 13,
      "side": "RIGHT",
      "body": "A multi-line range: start_line..line, both must be anchorable."
    }
  ]
}
```

- `event` — `REQUEST_CHANGES` | `COMMENT` | `APPROVE`. Note you cannot `APPROVE` or `REQUEST_CHANGES` your own PR; use `COMMENT` there.
- `commit_id` — the PR head SHA, from `gh pr view <n> --json headRefOid -q .headRefOid`. Omitting it anchors to whatever GitHub last saw, which drifts.
- `line` / `start_line` — line numbers **in the file at the head commit**, not diff offsets.
- `side: "RIGHT"` — the post-change file. Use `LEFT` only to comment on a deleted line.

## Gotcha 1 — `"Line could not be resolved"` (422)

The most common failure. An inline comment can only anchor to a line that **appears inside a diff hunk** — that is, an added/removed line *or* one of the few context lines the hunk carries around it. A line in a changed file that falls outside every hunk is not anchorable, even though the file is in the diff.

Diagnose by reading the hunk header. `@@ -39,7 +52,11 @@` means the new-side hunk covers lines 52–62. Anything at 63+ is out of range:

```
52  	rs := &resourceServer{...}              context   ✓ anchorable
53  	mcpHandler := gomcp.New...              context   ✓
54                                            context   ✓
55  +	// Bound what a request can buffer...   added     ✓
59  +	handler := maxBodyBytes(...)            added     ✓
60  	if !c.cfg.DevMode {                     context   ✓
62  		middleware := mcpauth.Require...     context   ✓  ← last line of hunk
65  		handler = middleware(mcpHandler)     OUTSIDE   ✗  422
```

**Fix:** anchor on the nearest anchorable line in the same hunk, then name the real line number in the comment body so the reader can find it:

> This wrapper is discarded in every non-dev deployment. Line 65 below re-wraps `mcpHandler` rather than `handler`: …

To get the hunk ranges, dump the diff to a file and read the relevant section:

```bash
gh pr diff <n> > <scratchpad>/pr.diff
grep -n "^diff --git" <scratchpad>/pr.diff     # find the file's offset
# then Read that section of the file to see the @@ headers
```

## Gotcha 2 — suggestion blocks must land on the exact lines they replace

A ```suggestion fence replaces the anchored line range verbatim. Two consequences:

- **If you had to anchor elsewhere (Gotcha 1), drop the suggestion block** and describe the fix in prose. A suggestion applied to the wrong line silently corrupts the file when the author clicks Commit.
- **Indentation must match byte-for-byte.** Check it rather than guessing tabs vs spaces:

```bash
git show <head-sha>:<path> | sed -n '<n>p' | od -c
```

(`cat -A` is not available on macOS/BSD — `od -c` is.)

## Gotcha 3 — cite lines from the PR head, not your working tree

You are usually checked out on a different branch. Every line number in the report and the payload must come from the PR head:

```bash
git fetch origin <head-branch> -q
git show <head-sha>:<path> | grep -n "<pattern>"
```

## Gotcha 4 — a rejected payload is all-or-nothing

A 422 on one comment discards the whole review; nothing is posted. So a retry after fixing one anchor is safe — you won't double-post. But verify every anchor before the first attempt, because each round trip is a slow loop.

## Verifying it landed

The `-q` filter above prints the review id, state, and URL. `CHANGES_REQUESTED` in the response confirms the event took effect. To re-read what you posted:

```bash
gh api repos/<owner>/<repo>/pulls/<n>/reviews/<review-id>/comments \
  -q '.[] | {path, line, body: (.body[0:80])}'
```
