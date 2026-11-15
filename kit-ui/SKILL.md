---
name: kit-ui
description: Build UI code from a Figma UI kit on top of stock shadcn components, with no design-system registry in between. Reads the kit's variables, styles and components through the Figma MCP, writes the theme CSS, installs each shadcn component (Base UI) on demand and restyles it from the kit's spec, builds a screen from a Figma frame, then checks the result against the frame (a look at full size, token-only styling, accessibility). Use when an app names a Figma kit as its design source, or when asked to "build this Figma frame", "sync the tokens from the kit", "add the kit's <component>", "check for drift against the kit", "audit this Figma kit", or /kit-ui. Works with a kit made for it and, through an adapter in kit.json, with a design file a team already owns. Not for apps that install their components from a design-system registry such as @nebari: use that registry's own skill.
user-invocable: true
argument-hint: "init <figma kit url> | audit | sync | add <component>... | build <figma frame url>... | check | drift"
---

# Kit UI

The Figma kit is the design system's look. Stock shadcn is its base. There
is no design-system registry: this skill installs each shadcn component with
the shadcn CLI, then restyles it from the kit. shadcn supplies the
**structure and behavior** (parts, props, state, keyboard and ARIA, on Base
UI), the kit supplies the **look** (every color, border, radius, size,
spacing, text style and shadow), and the rules here join the two the same way
every time.

What ends up in the app:

- `kit.json`: which kit, the shadcn style, and where things go. Written once by `init`.
- `components.json`: shadcn's config, written by `shadcn init`.
- `kit.lock.json`: what was generated from which Figma node and which shadcn
  component, with a hash of each.
- A generated theme file (tokens). Never edited by hand.
- One component file per kit page, installed from shadcn and restyled on
  first use, then **kept**. A component already in the lock is reused, not
  regenerated.

## Before anything else

1. The Figma MCP server must be connected. If its tools are deferred, load
   them in one search. Load the server's `figma-use` guidance before the first
   `use_figma` call, and open a session for the kit file if the server offers
   `create_session`.
2. Every script in `scripts/figma/` is **read-only** and runs through
   `use_figma`. Read the file, drop its leading comment block, put a
   `const ARGS = {...};` line above the rest when it takes arguments, and pass
   that as `code`. Do not change the script body, and do not write your own
   read script when one of these fits.
3. **Reads are the expensive part.** Each one resends its script. Plan them:
   one `kit.js`, one `tokens.js`, one `node.js` for every frame, one `node.js`
   for every component set you need. Never one call per state or per component.
4. Results can come back HTML-escaped (`&quot;`, `&lt;`, `&amp;`). Unescape
   before using or storing any string.
5. Never write to the kit file. If the kit is wrong, report it (see
   `references/kit-contract.md`); the kit's owner fixes the kit.
6. If `kit.json` has an `adapter` block, pass its keys to every script
   through `ARGS`, as the table in `references/adapter.md` says. Leaving
   them out changes the token names and the hashes.

## Commands

### `init <figma kit url>`

1. Take the file key from the URL. Run `scripts/figma/kit.js`.
2. If `findings` is not empty, stop and show them grouped by rule, with the
   fix from `references/kit-contract.md`. A kit that breaks the contract
   produces code that drifts, so do not build on it without the user's say-so.
   When the user does not own the file and the findings are ones an adapter
   can meet (`code-syntax`, `behavior`, `description`, `state-axis`, icons
   counted as components), offer to write an `adapter` by
   `references/adapter.md`, run `kit.js` again with it, and show what is
   left. Those are for the kit's owner.
3. Detect the app: Tailwind version, the global CSS file, the components
   folder, the import alias and the icon package. The root `tsconfig.json`
   needs the `@/*` path (`compilerOptions.paths`) for the shadcn CLI, as well
   as `tsconfig.app.json`.
4. Set up shadcn on Base UI, unless `components.json` is already there:

   ```
   bunx shadcn@latest init --base base --preset vega --yes --no-monorepo </dev/null
   ```

   Run it with no other `.css` file in the app root: the CLI picks the first
   CSS file it finds. Check that `components.json` names the global CSS file
   and `"style": "base-vega"`. `init` writes `src/lib/utils.ts`, which
   exports `cn` from the `cn` package (a single replacement for `clsx` and
   `tailwind-merge`). Use it as the `cn()` helper.
5. Install what is still missing, and nothing else: the icon package, the
   kit's font packages, and the behavior libraries in `kit.json` that shadcn
   did not bring. Remove the font package `init` added
   (`@fontsource-variable/inter`).
6. Write `kit.json`. The kit name is the name in the URL (the path segment
   after the file key), else ask. Do not read it from the file: through the
   MCP it comes back as "Document". The name is never written into generated
   files.

   ```json
   {
     "kit": { "name": "Beskar UI Kit", "fileKey": "…", "url": "…" },
     "base": { "shadcn": "base-vega" },
     "theme": "src/kit.css",
     "css": "src/index.css",
     "components": "src/components/ui",
     "alias": "@/components/ui",
     "cn": "@/lib/utils",
     "icons": { "package": "@phosphor-icons/react", "suffix": "Icon" },
     "behavior": ["@base-ui/react"],
     "darkSelector": ".dark"
   }
   ```

   An `adapter` block goes here too when the file needs one. For Lucide,
   `icons` is `{ "package": "lucide-react", "suffix": "", "case": "kebab" }`.

   `base.shadcn` is the shadcn style every component is installed in.
   `behavior` lists the headless libraries the app allows, for the pages
   shadcn has no component for. A kit component whose hint names a package
   outside this list needs the user's approval before it is installed.
7. Write `kit.lock.json`. Paths in the lock are relative to the app root.

   ```json
   {
     "kit": { "name": "…", "fileKey": "…" },
     "base": { "shadcn": "base-vega", "cli": "4.23.0" },
     "index": [{ "name": "Button", "id": "4:583", "page": "Button", "behavior": "@base-ui/react/button" }],
     "icons": ["Check", "X"],
     "tokens": { "hash": "…", "file": "src/kit.css", "text": {}, "effects": {} },
     "components": { "Button": { "file": "src/components/ui/button.tsx", "shadcn": "button", "nodes": { "4:583": "<hash>" } } },
     "screens": { "17:349": { "file": "src/screens/today.tsx", "hash": "<hash>" } }
   }
   ```

   `index` and `icons` are `kit.js`'s `components` and `icons`, as returned.
   With an icon page, `icons` is `{ page, count }`, not a list of names.
   `base.cli` is what `bunx shadcn@latest --version` prints. A component's
   `shadcn` is the name it was installed as, or `null` when shadcn has none
   and the file was written from its behavior hint.
8. Run `sync`.

### `audit`

Run `scripts/figma/kit.js` and report the findings. Nothing is written.
Group them by rule, and say for each rule whether the kit's owner or an
adapter can meet it.

### `sync`

1. Run `scripts/figma/tokens.js` with `ARGS = { darkSelector }`, plus
   `names` from the adapter.
2. Write the returned `css` to the theme path **exactly as returned**, then
   run `node scripts/hash.mjs <theme file>`. It must print the returned
   `hash`. If it does not, the file was mistyped: write it again.
3. Put `hash`, `text` and `effects` in the lock under `tokens`.
4. If `skipped` is not empty, those variables have no usable CSS name. Report them.
5. Replace the theme `shadcn init` wrote into the global CSS with the kit's,
   by "Global CSS" in `references/restyle.md`: keep the Tailwind,
   `tw-animate-css` and `shadcn/tailwind.css` imports, import the kit theme,
   and drop shadcn's `:root`, `.dark` and `@theme inline` blocks. Nothing
   else kit-related goes in it. Use the `darkSelector` from `kit.json` in the
   variant. `antialiased` matches how Figma draws text.
6. Fonts: import the kit's font packages once, from the app entry. If an
   installed family name differs from the kit's (a variable font registers
   as "Oxanium Variable"), add this after the imports, with the kit's own
   name kept as the second choice:

   ```css
   @theme inline {
     --font-sans: "Oxanium Variable", "Oxanium", ui-sans-serif, system-ui, sans-serif;
   }
   ```

### `add <component>...`

1. Find each name's kit page in the lock's `index`. **One file per kit
   page**: every component set on the page goes in the same file
   (`Select Trigger`, `Select Item` and `Select Content` are all
   `select.tsx`). The file name is the page name in kebab-case with slashes
   dropped (`Datapad / Parts` is `datapad-parts.tsx`), or the adapter's
   `files` entry.
2. Skip any page whose file is already in the lock: it exists. Regenerate
   only when `drift` says the kit changed, or the user asks.
3. Pick the shadcn component for each page by `references/restyle.md`, and
   install them all in one `bunx shadcn@latest add <names> --yes </dev/null`.
   A page shadcn has no component for is written from its behavior hint, by
   `references/figma-to-code.md`.
4. Run `scripts/figma/node.js` **once**, with the ids of every set on every
   page you are adding. Do not filter by state: the result is factored by
   axis and is small (about 4 KB for a 96-variant Button).
5. Restyle each installed file by `references/restyle.md`, taking the
   classes from the spec by `references/figma-to-code.md`. Keep shadcn's
   parts, props and behavior. Restyle the shadcn dependencies the CLI
   brought too. Go in dependency order (a component that contains instances
   of another needs that one first). Check that the primitive shadcn uses
   matches the component's `Behavior:` hint, read with
   `references/behavior-map.md`. Where they differ, keep shadcn's and list it.
6. Run `bunx tsc -b` and fix what the restyle broke (usually a removed
   variant option, by `references/restyle.md`).
7. Record each in the lock under `components`, keyed by page name.

### `build <figma frame url>...`

Several frames can be one screen at different widths. Pass them together.

1. Run `scripts/figma/node.js` **once** with every frame id (the URL's
   `node-id`, with `-` turned into `:`).
2. List every kit component the trees use (`t: "inst"`, by `of`). `add` the
   ones not in the lock, in one go.
   - The frames may be in another file that uses the kit as a library. Run
     `node.js` in the frames' file, with the same adapter keys. Token and text
     style names come back the same as in the kit file.
   - An instance whose `of` is not in the lock's `components` is a component
     local to the frames' file. It is not a kit component: run `node.js` on
     its id (in the frames' file) and write it as an app component.
3. Write the screens by `references/figma-to-code.md`. Instances become the
   generated components. Boxes become layout. A structure that repeats
   becomes one local component, used many times.
4. Record each frame in the lock under `screens`.
5. Run `check`.

### `check`

All four must pass before the work is called done.

1. **Tokens only.** `node scripts/check-literals.mjs <src> --lock kit.lock.json`
   must report 0 errors. A `base-token` error is a stock shadcn color class
   the restyle missed: it renders with no color.
2. **Not broken.** Export each frame with the Figma MCP's screenshot tool at
   1x (set its max dimension to the frame's longer side). Screenshot the
   built page at the frame's width and height, device scale factor 1, after
   `document.fonts.ready`. Then, in light and in dark:

   ```
   node scripts/visual-diff.mjs built.png figma.png --scale 3 --max-content 25 --out diff.png --tiles tiles
   ```

   This number is a smoke test. A page that is broken, empty or laid out
   wrong scores far above 25. It does **not** say the build looks like the
   frame: a table one pixel low scores 15 and looks identical, and a wrong
   fill on an avatar barely moves it. Do not tune a build to lower it, and
   never stop because it is low.
3. **Looks like the frame.** This is a look, not a number. `--tiles` wrote
   the screen as tiles at full size, the frame on the left and the build on
   the right. Read **every** tile (a whole screen shown at once is scaled
   down and hides these). For each one, list what a person comparing the two
   halves would notice:

   - an element missing, extra, or different (wrong icon, wrong text)
   - a wrong fill or color: outlined where the frame is filled, black where
     it is muted
   - a wrong alignment: centered where the frame is left-aligned
   - a wrong shape or size: a square where the frame has a circle, or off by
     more than about 2 pixels
   - spacing or position off by more than about 4 pixels
   - a wrong font weight or size
   - a missing or wrong border, radius or shadow
   - content cut off or overlapping

   Ignore shifts of 1 to 2 pixels and the way text edges are drawn. Check
   small things on purpose: icon colors, avatar fills, button shapes and
   shadows are what this step exists to catch.

   Rate each finding `obvious` (seen at a glance), `noticeable` (seen side by
   side) or `subtle` (real, likely missed). Fix every `obvious` and
   `noticeable` one at its source: the spec says what the fill, alignment or
   radius is, so read it again before guessing. Then screenshot and look
   again. Stop when none are left, or after two rounds with no gain, and
   report what remains. Where the frame does not say what should happen
   (long text, an empty state), do not guess silently: list it.
4. **Accessible.** Run axe on the built page (Playwright with
   `@axe-core/playwright` if the app has it) and tab through it once: every
   control reachable, focus visible, overlays trap and return focus.

Report all four: the literal count, the smoke-test number, the list of
visible differences that remain with their severity, and the axe result.

### `drift`

Run `scripts/figma/node.js` once with every id in the lock (components and
screens) and `hashOnly: true`, and `scripts/figma/tokens.js`. Compare hashes
with the lock. Report what changed in the kit since the code was generated.
Regenerate only what the user approves: reinstall the stock file
(`bunx shadcn@latest add <name> --overwrite --yes </dev/null`), restyle it
from the new spec, then run `check` on every screen that uses it.

## Rules

- **The kit decides the look.** Do not add a variant, size, color, or state
  the kit does not have. If the design needs one, say so and ask whether the
  kit should grow or the screen should change.
- **Accessibility outranks the frame.** If building the frame as drawn fails
  contrast or another accessibility check, build the accessible version,
  keep it as close as the tokens allow, and report the frame as a design
  defect. The usual case is opacity on a container that holds text: dim the
  decoration, and give the text a muted token instead.
- **Tokens, never values.** Every color is a token class. A hex value in a
  node spec means the kit has an unbound paint: report it, do not copy it.
- **Stock shadcn is the only base.** Install from the shadcn CLI in the
  style `kit.json` names, and from nothing else: no design-system registry
  (`@nebari` or any other), and no component pasted from memory. The kit
  decides the look. shadcn decides the structure and behavior.
- **Restyle, do not rewrite.** Keep every part, prop, hook and ARIA
  attribute the shadcn file has. Replace only its look, by
  `references/restyle.md`. A part the kit does not draw stays, styled with
  kit tokens.
- **Generated once, then owned.** The lock is how two sessions produce the
  same Button. Read it first, every time.
- **When the rules do not say, do not improvise a style.** Take the plainest
  reading of the spec, and list the gap in your report so the rules can grow.
- **Behavior is not invented.** It comes from the shadcn file. Only for a
  page shadcn has no component for, use the hinted primitive, and for a hint
  of `none`, the native element the hint names.
- **Say what the kit could not tell you.** Motion, focus order, responsive
  breakpoints, loading and error behavior, and tabs or panels with no frame
  are not in a static design. List the calls you made for the user at the end.

## Cost to expect

A full build is four reads: `kit.js`, `tokens.js`, one `node.js` for the
frames and one for the components. Each resends 4 to 12 KB of script. Specs
come back at about 4 KB for a large component set and about 18 KB for a full
desktop screen. Read once and work from the result.
