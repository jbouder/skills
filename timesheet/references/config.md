# Timesheet config

The config lives at `~/.claude/timesheet/config.json`, outside every repo, because it names the user's clients. `TIMESHEET_CONFIG` points elsewhere for testing. Every key is optional; a missing key takes the default.

## Defaults

```json
{
  "hoursPerDay": 8,
  "increment": 0.25,
  "minMeetingHours": 0.5,
  "overtimeThreshold": 1,
  "workDays": [0, 1, 2, 3, 4],
  "reposDir": "~/repos",
  "maxRepoDepth": 3,
  "idleMinutes": 10,
  "outputDir": "~/timesheets",
  "internalProject": "Internal",
  "workTypes": ["Meetings", "Development", "Design", "Planning", "Admin"],
  "authorEmails": [],
  "rules": [],
  "ignore": []
}
```

| Key | Meaning |
| --- | --- |
| `hoursPerDay` | Hours each work day adds up to. |
| `increment` | Rounding step in hours. Use `0.5` or `1` if the timesheet tool wants coarser numbers. |
| `overtimeThreshold` | A day goes over `hoursPerDay` only when the evidence shows at least this many hours more. Below that, the day is exactly `hoursPerDay`. |
| `minMeetingHours` | The least a meeting counts for. A 15-minute meeting counts as this. Set it to the `increment` to count meetings at their scheduled length. |
| `workDays` | Weekday numbers that get hours, Monday = 0. |
| `reposDir` | Where git repos live. Falls back to the standup plugin's `reposDir`, then `~/repos`. |
| `maxRepoDepth` | How many folders deep to look for repos under `reposDir`. |
| `idleMinutes` | A gap between two messages in a Claude Code session longer than this is idle, not work. |
| `outputDir` | Where the weekly Markdown files go. |
| `internalProject` | The project for work that belongs to no client. |
| `workTypes` | The types the timesheet tool uses, in the order to show them. |
| `authorEmails` | Extra commit emails besides the global `git config user.email`. |
| `rules` | Mapping rules, below. |
| `ignore` | Regexes. A repo whose name, folder, remote or path matches one is left off the sheet. |

## Rules

Each rule maps evidence to a project, and optionally to a type.

```json
{ "on": "folder", "match": "^acme$", "project": "Acme" }
{ "on": "remote", "match": "github\\.com[:/]acme-corp/", "project": "Acme" }
{ "on": "repo", "match": "^acme-", "project": "Acme" }
{ "on": "meeting", "match": "\\bacme\\b", "project": "Acme" }
{ "on": "attendee", "match": "@acme\\.com$", "project": "Acme" }
{ "on": "datapad", "match": "^Acme", "project": "Acme" }
{ "on": "meeting", "match": "all hands|team sync", "project": "Internal" }
{ "on": "repo", "match": "^sandbox$", "project": "Acme", "type": "Planning" }
{ "on": "meeting", "match": "recruit", "project": "Admin", "type": "Recruiting" }
{ "on": "meeting", "match": "\\bx Pat\\b|1:1", "project": "Admin", "type": "People Management" }
```

- `on` is one of `repo`, `folder` (the folder a repo sits in under `reposDir`), `remote`, `path`, `any` (all four), `meeting` (calendar or Datapad meeting title), `attendee` (an attendee's email), or `datapad` (a Datapad project or org name).
- `match` is a case-insensitive regex.
- The first rule that matches wins, so put narrow rules before broad ones.
- `type` forces the work type for everything the rule matches. Leave it out to classify by evidence. A general bucket such as Admin works this way: rules send recruiting, 1:1 and benefits meetings to one project, each with its own type. Add those types to `workTypes`.
- `gather.py` applies the `repo`, `folder`, `remote`, `path` and `any` rules itself. The skill applies `meeting`, `attendee` and `datapad` rules while mapping.

Prefer rules on stable things: a folder, a remote owner, an attendee domain, a Datapad project. A rule on a meeting title word is a last resort, since titles change.
