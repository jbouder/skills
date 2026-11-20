# Publishing

A deck works in three places. Only the claude.ai artifact shares answers between people.

| Where | Answers | Export |
|---|---|---|
| claude.ai artifact (default) | Shared with everyone who has access, live, with names | Markdown or JSON from the summary slide, or a PDF with `scripts/export_pdf.py` |
| Local file | Saved in that browser only | Browser download |
| Artifacts site | Saved in that browser only | Browser download |

## claude.ai artifact

1. Load the `artifact-capabilities` skill and confirm the calls the engine makes still match it: `window.claude.use("db" | "user" | "downloads")`, `db.collection("notes").add` and `onSnapshot`, `db.doc("qstatus/<id>").set`, `db.doc("notes/<id>").delete`, `user.id()`, `user.can("data.write")`, `user.canEdit()`, `user.profiles(ids)`, and `downloads.save({ filename, data })`. If the API has changed, fix the template in this skill, not just this deck.
2. Make the fragment from the full page and check it:
   ```bash
   python3 <skill-dir>/scripts/make_fragment.py <deck.html> <scratchpad>/<slug>-fragment.html
   python3 <skill-dir>/scripts/check_deck.py <scratchpad>/<slug>-fragment.html --fragment
   ```
3. Publish the fragment with `capabilities: {"db": {}, "user": {"scopes": ["profile"]}, "downloads": true}`, a one-sentence description, and an icon such as `checklist` or `question`. The `profile` scope is what shows names and avatars on answers.
4. Run one `ArtifactData` `list` on the `notes` collection to confirm the page's store is reachable (an empty list is fine for a new deck).
5. Tell the user who can do what. People with Contributor access or above add answers, notes and Answered marks. Viewers read them. Anyone can delete their own entries; Editors can delete anyone's. To collect answers from a customer, share the artifact with them at Contributor access or above.

To update, edit the full page, regenerate the fragment and publish the same fragment path again. For an artifact from an earlier conversation, read it first (the host requires it) and build on what comes back.

## Reading answers back

Use `ArtifactData` with the artifact URL: `list` the `notes` collection and the `qstatus` collection. Map `section` and `q` back to titles and question text through the deck's data block. Stored notes carry person ids, not names, so for a written summary either ask the user to use the deck's **Export Markdown** (which resolves names in the viewer) or refer to people by role.

When the user asks for a summary or a decision record, write it from the room's own answers and notes, question by question, and list what is still open.

## Exporting results as a PDF

The PDF is screenshots of the deck itself, so it keeps the design. Its text is not selectable.

1. Read the artifact with `Artifact` `action: "read"`. The result names the saved HTML file.
2. Save both collections with `ArtifactData` `action: "list"` and `out_dir` set to the scratchpad: `notes` and `qstatus`.
3. Optionally write `names.json`, mapping person ids to names, if the user gives you them. Without it, threads show "Someone".
4. Run the export:
   ```bash
   uv run --no-project --with playwright --with img2pdf \
     python3 <skill-dir>/scripts/export_pdf.py <saved deck.html> <notes.json> <qstatus.json> <scratchpad>/<slug>.pdf \
       --shots <scratchpad>/shots [--names names.json] [--dark] [--first-variant-only]
   ```
   It uses the installed Chrome and falls back to Playwright's Chromium (`uv run --no-project --with playwright python -m playwright install chromium` once if neither is there).
5. Check the output: the page list, the loaded counts, and the open count the deck reports. Look at the start slide, one section and the summary in `--shots`.
6. Copy the PDF where the user wants it, by default `~/Downloads/<slug>-<date>.pdf`.

Compare sections are captured once per variant, because each variant has its own questions. Pass `--first-variant-only` for a shorter PDF.

## Local file

Save the full page wherever the user wants it. It opens from disk with no server. Answers persist in that browser through `localStorage`, under `<id>:notes` and `<id>:qstatus`, and the page says so.

## Artifacts site

Use the `publish-artifact` skill. The site is public, so read the whole deck first. Check that there are no customer names unless the user confirms that's fine, and no internal hostnames, private links, unannounced plans or candid facilitator notes. Answers don't sync there. Say so if the user expects a shared record.

## Screenshot script

Playwright ships with the `a11y-audit` skill. Install it once with `npm ci --prefix <skills-dir>/a11y-audit && npx --prefix <skills-dir>/a11y-audit playwright install chromium` if it's missing. Keep this script in the scratchpad.

```js
// node shots.cjs <deck.html> <outdir> <slide ids...>   e.g. start overview sign-in/elabftw summary
const { chromium } = require("<skills-dir>/a11y-audit/node_modules/playwright");
(async () => {
  const [file, out, ...ids] = process.argv.slice(2), b = await chromium.launch(), errs = [];
  for (const [tag, vp, scheme] of [["light", { width: 1440, height: 900 }, "light"], ["dark", { width: 1440, height: 900 }, "dark"], ["phone", { width: 390, height: 844 }, "light"]]) {
    const p = await (await b.newContext({ viewport: vp, colorScheme: scheme })).newPage();
    p.on("pageerror", e => errs.push(tag + ": " + e.message));
    p.on("console", m => m.type() === "error" && errs.push(tag + ": " + m.text()));
    await p.goto("file://" + file); await p.waitForTimeout(400);
    for (const id of ids) {
      await p.evaluate(h => (location.hash = h), id); await p.waitForTimeout(450);
      await p.screenshot({ path: `${out}/${tag}-${id.replace("/", "_")}.png`, fullPage: true });
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${tag} ${id}: horizontal overflow`);
    }
  }
  console.log("errors:", errs.length ? errs : "none"); await b.close();
})();
```

To exercise answers on a local file, go to a section, fill the first `textarea`, click `button[data-kind=answer]`, then click the first `.toggle`. The bar's count should drop by one.
