# Screenshots of the running app

When `pr.json` has `uiChanged: true`, the report shows the changed screens as they render from the PR's code. A reviewer reading a 600-line `.tsx` diff cannot see a clipped column or a missing empty state. A picture can.

This step runs code from the PR on the user's machine. For a PR from a fork (`fromFork: true`) or from an author outside the user's team, ask before installing or running anything.

## 1. Check out the PR in a worktree

Never switch the branch in the user's checkout. They may have work in progress there.

```bash
git -C <repoDir> worktree add --detach <scratchpad>/pr-<n> <headSha>
```

## 2. Find the cheapest way to run the UI

Look in this order and stop at the first that works:

1. A project skill for launching the app (`run`, `start-dev`, or one named in the repo's `CLAUDE.md`).
2. A mock or demo mode: a `mock`, `demo` or `storybook` script in `package.json`. This is the best option when it exists. It needs no backend, no login, and shows no real data.
3. The normal dev script (`dev`, `start`) plus whatever backend it needs, from the README or the contributing guide.

Install with the lockfile's package manager (`pnpm install --frozen-lockfile`, `npm ci`, `bun install --frozen-lockfile`). Start the server in the background, note the port from its output, and wait until it answers.

Give this a fair try, not an afternoon. If the app is not up after about ten minutes of real effort, stop, clean up, and write `screenshotsNote` with what you tried and where it failed. A report that says "could not start the app: the dev server needs a Keycloak realm that is not in the repo" is more useful than a late one.

## 3. Decide what to shoot

Map the changed UI files to the screens they render (the router file usually tells you). Aim for the changed screens in the states the PR touches, usually three to eight images:

- Each new or changed page, at desktop width.
- A shared shell the PR adds to (a nav bar, a tab strip, a sidebar), at desktop width. One more item can be the one that no longer fits.
- `--mobile` when layout or responsive styles changed.
- `--dark` when colors, tokens or theme styles changed.
- An empty, error or loading state when the PR adds one and you can reach it.

For a screen that existed before the PR, a before and after pair is worth the extra run when the same command starts the app from the base commit. Make a second worktree at `baseSha`, shoot the same route with `--state before`, and give both images the same `pair` in `review.json`. Skip it for new screens and when the base needs different setup.

## 4. Capture

Set up once (it reuses the browser other skills already downloaded):

```bash
[ -d <skill-dir>/node_modules/playwright ] || npm ci --prefix <skill-dir> --no-audit --no-fund
(cd <skill-dir> && npx playwright install chromium)
```

```bash
node <skill-dir>/scripts/screenshot.mjs --out <outDir> --base-url http://localhost:5173 \
  --route /settings/connectors --route /settings/connections --mobile
node <skill-dir>/scripts/screenshot.mjs --out <outDir> --base-url http://localhost:5173 \
  --route /settings/connectors --dark
```

It writes JPEGs to `<outDir>/shots/` and lists them in `<outDir>/shots.json`. A line starting `CHECK` means the page returned an error status, has a password field, or threw a script error. A password field is only a hint: a secrets form has one too.

Useful flags: `--wait-for "<selector>"` for content that loads late, `--storage-state <file>` for a saved login, `--viewport-only` for just the first screen of a long page.

For a state that needs clicks (an open dialog, a filled form, a second step), write a short Playwright script in the scratchpad that imports `playwright` from the skill's `node_modules`, drives the page, and saves into `<outDir>/shots/`. Add those files to `review.json` by hand.

## 5. Look at every image before it goes in

Open each one with the Read tool. A blank page, a framework error overlay, a login wall or a spinner is not evidence of anything and does not belong in the report. Fix the capture or drop the image and say so in `screenshotsNote`.

A full-page shot of an app with a fixed or full-height sidebar often shows the sidebar ending at the first screen height, with bare background below it. That is how full-page capture works, not a layout bug. Use `--viewport-only` for a clean first screen, or keep the full page and say so in `screenshotsNote`.

Looking is also review. Clipped text, an unlabeled icon button, a broken dark theme, or a layout that overflows on mobile is a finding. Verify it in the code like any other and cite the file and line.

If the app ran against real data, check the images for names, emails and tokens before they are embedded. Prefer mock data so the question does not come up.

## 6. Clean up

Stop the dev server and anything else you started, then:

```bash
git -C <repoDir> worktree remove --force <scratchpad>/pr-<n>
```

## Adding them to the report

Copy the entries you are keeping from `shots.json` into `screenshots` in `review.json` and add a `caption` to each. Captions say what the reader is looking at and what changed: "Connectors page with the new catalogue list. Slack is connected, the rest are not." not "Screenshot of connectors".
