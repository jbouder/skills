# The reviewer panel

Three sub-agents review the PR at the same time, each through one lens. Three narrow readers find more than one broad reader, and where two of them land on the same line without talking to each other, that agreement is real signal.

## Launch

Send all three `Agent` calls in **one message** so they run in parallel. Use the `general-purpose` agent type. Each reviewer starts with no context, so the brief is everything it knows.

Keep your own impressions out of the brief. A reviewer handed a hypothesis tends to return it confirmed, and then the panel is one opinion counted three times. Give facts (paths, SHAs, what the PR says it does) and the lens. Nothing about what you suspect.

## The three lenses

| id | Lens | Looks for |
| --- | --- | --- |
| `correctness` | Correctness and behavior | Logic errors, inverted or missing conditions, edge cases (empty, nil, zero, duplicate, very large), error paths that swallow or mislabel failures, state that goes stale, concurrency and ordering, a change in one place that breaks a caller elsewhere. Does the code do what the PR description says? |
| `security` | Security and data | Access checks that are missing or applied to the wrong handler, input that reaches a query, shell, URL or template unchecked, secrets in logs or responses, unsafe defaults, migrations that lose data or cannot run twice, anything that leaves stored data inconsistent after a failure halfway. |
| `tests` | Tests and contracts | What the tests prove and what they only appear to prove, changed behavior with no test, tests that pass for the wrong reason, API or schema changes that break existing clients, config and upgrade paths, docs and comments that now state something false. |

When the frontend lens is on, add this line to the `correctness` brief: "For `.tsx`/`.jsx`/`.css` files, also check loading, error and empty states, and keyboard and screen-reader access." The frontend checklist itself stays with you (SKILL.md step 4), because it needs the project's token list and conventions you already gathered.

## The brief

Fill in the angle brackets. Send the same brief to all three, changing only the lens block.

```
You are one of three independent reviewers of a GitHub pull request. Your lens is
<LENS NAME>. The other two cover the other lenses, so stay in yours and go deep.

The PR
- <owner>/<repo> #<n>: "<title>"
- Local clone: <repoDir>. The PR head commit <headSha> is fetched. Base commit: <baseSha>.
- Facts about the PR: <outDir>/pr.json (files with a "kind" of product, tests,
  generated or docs, and line counts per area).
- The full diff: <outDir>/pr.diff
- What the author says it does:
  <the PR description, pasted, or "no description">

Your lens: <LENS NAME>
<the "Looks for" text for this lens>

How to work
- Read the diff for your lens, then read the full file around anything suspicious:
  `git -C <repoDir> show <headSha>:<path>`. A hunk hides the code that makes a
  line safe or unsafe. In zsh, write the SHA out or use "${H}:<path>": `$H:ui/x`
  breaks, because `:u` is a zsh modifier.
- Skip files whose kind is "generated". <for a large PR: "This PR is large. Start
  with the product code in these areas: <areas from pr.json>.">
- Do not change the checkout in <repoDir>. If you need to run something, make a
  scratch worktree: `git -C <repoDir> worktree add --detach <scratchpad>/<lens>-wt <headSha>`
  and remove it when you finish.
- Do not post anything to GitHub.
- Confirm every finding against the code before you report it. Reproduce it when
  you can (a throwaway test in the scratch worktree is ideal). If you could not
  confirm something, leave it out.
- Report only what changes behavior, correctness, security, data, accessibility,
  or what a future reader will believe about an invariant. No naming, style,
  formatting, or "could be cleaner".
- Line numbers must be from the file at <headSha>, not from the diff offsets.
- At most 8 findings. Rank them.

Return exactly this, as JSON in a fenced block, and nothing after it:

{
  "lens": "<id>",
  "summary": "Two or three plain sentences: what you checked and what you concluded.",
  "findings": [
    {
      "severity": "blocking" | "should-fix",
      "title": "One line: what goes wrong, for whom",
      "path": "path/to/file.go",
      "line": 59,
      "endLine": 65,
      "what": "The failure in plain language: inputs and state, then the wrong outcome.",
      "evidence": "What you ran or traced, and what came out.",
      "whyChecksPass": "Why the existing tests do not catch it, if they do not.",
      "fix": "The specific change.",
      "confirmed": "reproduced" | "traced" 
    }
  ]
}

Blocking means wrong behavior in a reachable path, a security or access check that
does not apply where it claims to, data loss, or a migration or startup path that can
break a deployment. Everything else that is real is should-fix.
```

## When they report back

Each result is input, not output. Run SKILL.md step 6 on every finding before it goes anywhere.

Then consolidate:

1. **Merge duplicates.** Two reviewers describing the same defect become one finding. Record every lens that raised it in `raisedBy`.
2. **Settle disagreements by reading the code.** If one reviewer calls a path safe and another calls it broken, one of them is wrong. Find out which, and say so in `recommendation.overruled`.
3. **Count each reviewer.** `reported` is how many findings it returned. `kept` is how many survived your verification.
4. **Set severity yourself.** A reviewer's severity is its opinion from inside one lens. You have all three reports and the code, so you decide what blocks. Raise or lower a finding when the evidence calls for it, and say so in `recommendation.overruled`.
5. **Decide the verdict from the verified findings.**
   - Any verified blocking finding: request changes.
   - No blocking finding: approve, with the should-fix findings listed.
   - Do not count votes. The reviewers do not ask each other anything and do not read the same code with the same question, so "2 of 3 approved" would say only which lens the blocker fell in. The reviewers are not asked for a recommendation for this reason.
   - A finding raised by one reviewer is as real as one raised by three once you have verified it. Two lenses landing on the same line raises your prior. It does not replace the check.
6. **Write the consolidated recommendation** (`recommendation` in `review.json`):
   - `text`: two to four sentences. What must change and why, in plain language, then anything the author should know that is not a defect.
   - `mustChange`: the ids of the findings that block merge.
   - `overruled`: where you changed a reviewer's severity or dropped a finding, and why. Leave it out if you did not.

   The report works out the line "Blocking findings in N of 3 lenses" by itself from each blocking finding's `raisedBy`, so fill `raisedBy` in accurately.

If a reviewer fails or returns nothing usable, do not quietly review with two. Rerun that one lens. If it fails again, cover the lens yourself and say so in `notDone`.
