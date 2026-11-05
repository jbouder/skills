# Publishing

A deck works in three places. Only the claude.ai artifact shares answers between people.

| Where | Answers | Export |
|---|---|---|
| claude.ai artifact (default) | Shared with everyone who has access, live | Through the host's save prompt |
| Local file | Saved in that browser only | Browser download |
| Artifacts site | Saved in that browser only | Browser download |

## claude.ai artifact

1. Load the `artifact-capabilities` skill and confirm the `db`, `downloads` and `user` calls the engine makes still match it: `window.claude.use("db")`, `db.doc("deck/answers")` with `onSnapshot` and `set`, `user.can("data.write")`, and `downloads.save({ filename, data })`. If the API has changed, fix the template in this skill, not just this deck.
2. Make the fragment from the full page and check it:
   ```bash
   python3 <skill-dir>/scripts/make_fragment.py <deck.html> <scratchpad>/<slug>-fragment.html
   python3 <skill-dir>/scripts/check_deck.py <scratchpad>/<slug>-fragment.html --fragment
   ```
3. Publish the fragment with `capabilities: {"db": {}, "downloads": {}, "user": {}}`, a description of one sentence, and an icon such as `compass` or `checklist`.
4. Tell the user who can do what. People with edit access change the shared answers. Viewers see them, and their own clicks stay on their screen, which the page tells them. To collect answers from the customer, the user shares the artifact with edit access.

To update, regenerate the fragment from the edited full page and publish the same fragment path again. For an artifact from an earlier conversation, read it first (the host requires it) and build on what comes back.

Reading answers back: `ArtifactData` with the artifact URL, collection `deck`, document `answers`. The fields are `answers` (question id to value, or a list for multi questions), `comments` (question id to text), `notes`, and `at`. Map values to labels through the deck's data block.

## Local file

Save the full page wherever the user wants it. It opens from disk with no server. Answers persist in that browser through `localStorage`, under the key `<id>:answers`.

## Artifacts site

Use the `publish-artifact` skill, or the repo's `AGENTS.md` if you're in `openteams-ai/artifacts`. The site is public, so read the whole deck first. Check that there are no customer names unless the user confirms that's fine, and no internal hostnames, private links, unannounced plans or candid facilitator notes. Answers don't sync there. Say so if the user expects a shared record.

## Screenshot script

Playwright ships with the `a11y-audit` skill. Install it once with `npm ci --prefix <skills-dir>/a11y-audit && npx --prefix <skills-dir>/a11y-audit playwright install chromium` if it's missing. Keep this script in the scratchpad, not in the deck's folder.

```js
// node shots.cjs <deck.html> <outdir>
const { chromium } = require("<skills-dir>/a11y-audit/node_modules/playwright");
(async () => {
  const [file, out] = process.argv.slice(2), b = await chromium.launch(), errs = [];
  for (const [tag, vp, scheme] of [["light", { width: 1440, height: 900 }, "light"], ["dark", { width: 1440, height: 900 }, "dark"], ["phone", { width: 390, height: 844 }, "light"]]) {
    const p = await (await b.newContext({ viewport: vp, colorScheme: scheme })).newPage();
    p.on("pageerror", e => errs.push(tag + ": " + e.message));
    p.on("console", m => m.type() === "error" && errs.push(tag + ": " + m.text()));
    for (const id of ["start", "<first-area-id>", "result"]) {
      await p.goto("file://" + file + "#" + id); await p.waitForTimeout(300);
      await p.screenshot({ path: `${out}/${tag}-${id}.png`, fullPage: id === "result" });
    }
    console.log(tag, "overflow:", await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  }
  console.log("errors:", errs.length ? errs : "none"); await b.close();
})();
```

To exercise answers, go to an area slide and click the label, for example `p.click("label:has(#install-no)")`. The inputs themselves are visually hidden.
