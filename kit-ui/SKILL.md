---
name: kit-ui
description: Build UI code straight from a Figma UI kit, with no component registry or design-system package in between. Reads the kit's variables, styles and components through the Figma MCP, writes the theme CSS and each component on demand, builds a screen from a Figma frame, then checks the result against the frame (pixel diff, token-only styling, accessibility). Use when an app names a Figma kit as its design source, or when asked to "build this Figma frame", "sync the tokens from the kit", "add the kit's <component>", "check for drift against the kit", "audit this Figma kit", or /kit-ui. Not for apps that install components from a registry (Beskar, Nebari, shadcn): use that system's own skill.
user-invocable: true
argument-hint: "init <figma kit url> | audit | sync | add <component>... | build <figma frame url> | check [<frame url> <page url>] | drift"
---

# Kit UI

The Figma kit is the design system. There is no registry and no component
package: this skill reads the kit and writes the code. The kit supplies the
**look**, a headless library supplies the **behavior**, and the rules here
turn one into the other the same way every time.

What ends up in the app:

- `kit.json`: which kit, and where things go. Written once by `init`.
- `kit.lock.json`: what was generated from which Figma node, with a hash of each.
- A generated theme file (tokens). Never edited by hand.
- One component file per kit page, written on first use and then **kept**.
  A component already in the lock is reused, not regenerated.

## Before anything else

1. The Figma MCP server must be connected. If its tools are deferred, load
   them in one search. Load the server's `figma-use` guidance before the first
   `use_figma` call, and open a session for the kit file if the server offers
   `create_session`.
2. Every script in `scripts/figma/` is **read-only** and runs through
   `use_figma`. Read the file, put a `const ARGS = {...};` line above it when
   it takes arguments, and pass the whole thing as `code`. Do not edit the
   script body and do not write your own read script when one of these fits.
3. Never write to the kit file. If the kit is wrong, report it (see
   `references/kit-contract.md`); the kit's owner fixes the kit.

## Commands

### `init <figma kit url>`

1. Take the file key from the URL. Run `scripts/figma/kit.js`.
2. If `findings` is not empty, stop and show them grouped by rule, with the
   fix from `references/kit-contract.md`. A kit that breaks the contract
   produces code that drifts, so do not build on it without the user's say-so.
3. Detect the app: Tailwind version, where global CSS lives, the components
   folder, the import alias, the `cn()` helper, the icon package.
4. Write `kit.json`:

   ```json
   {
     "kit": { "name": "Beskar UI Kit", "fileKey": "…", "url": "…" },
     "theme": "src/kit.css",
     "components": "src/components/ui",
     "alias": "@/components/ui",
     "icons": { "package": "@phosphor-icons/react", "suffix": "Icon" },
     "behavior": ["@base-ui/react"],
     "darkSelector": ".dark"
   }
   ```

   `behavior` lists the headless libraries the app allows. A kit component
   whose hint names a package outside this list needs the user's approval
   before it is installed.
5. Write `kit.lock.json` with the kit index: `{ "kit": {…}, "index": [components from kit.js], "icons": […], "tokens": null, "components": {} }`.
6. Run `sync`.

### `audit`

Run `scripts/figma/kit.js` and report the findings. Nothing is written.

### `sync`

1. Run `scripts/figma/tokens.js` with `ARGS = { kit: <name>, darkSelector }`.
2. Write the returned `css` to the theme path **exactly as returned**.
   Import it once from the app's global CSS, after `@import "tailwindcss"`.
3. Put `hash`, `text` and `effects` in the lock under `tokens`.
4. If `skipped` is not empty, those variables have no usable CSS name. Report them.
5. Fonts: the theme names the kit's font families. Make sure the app loads
   them (a font package or `@font-face`). If the installed font's family name
   differs (a variable font, say), alias it in the app's own CSS, not in the
   generated file.

### `add <component>...`

For each name, in dependency order (a component that contains instances of
another needs that one first):

1. Find the kit page for it in the lock's `index`. **One file per kit page**:
   every component set on the page goes in the same file (`Select Trigger`,
   `Select Item` and `Select Content` are all `select.tsx`).
2. If the page's file is already in the lock, stop: it exists. Regenerate
   only when `drift` says the kit changed, or the user asks.
3. Run `scripts/figma/node.js` with the page's component ids. For a big set,
   read the default state first (`where: { State: 'Default' }`), then the
   other states.
4. Write the file by the rules in `references/figma-to-code.md`. Take the
   behavior from the component's `Behavior:` hint, read with
   `references/behavior-map.md`.
5. Record it in the lock: `components["<page>"] = { "file": "…", "nodes": { "<id>": "<hash>" } }`.

### `build <figma frame url>`

1. Run `scripts/figma/node.js` on the frame id (from the URL's `node-id`,
   with `-` turned into `:`).
2. List every kit component the tree uses (`t: "inst"`, by `of`). `add` the
   ones not in the lock yet.
3. Write the screen. Instances become the generated components with the
   props from the spec. Boxes become layout by `references/figma-to-code.md`.
   Repeated app-specific structures become one local component, used many
   times, not copies.
4. Run `check`.

### `check [<frame url> <page url>]`

All three must pass before the work is called done.

1. **Tokens only.** `node scripts/check-literals.mjs <src> --lock kit.lock.json`.
2. **Looks like the frame.** Export the frame with the Figma MCP's screenshot
   tool at 1x. Screenshot the built page at the frame's width and height,
   device scale factor 1, with the fonts loaded. Then
   `node scripts/visual-diff.mjs built.png figma.png --out diff.png`. Do it
   in light and in dark (set the frame's Color mode in Figma, or export the
   kit's dark preview). On a fail, open `diff.png`, fix the worst cell
   first, and run it again. Do not raise `--max` to get a pass.
3. **Accessible.** Run axe on the built page (Playwright with
   `@axe-core/playwright` if the app has it) and tab through it once: every
   control reachable, focus visible, overlays trap and return focus.

Report the three results with their numbers.

### `drift`

Run `scripts/figma/node.js` with every id in the lock and `hashOnly: true`,
and `scripts/figma/tokens.js`. Compare hashes with the lock. Report what
changed in the kit since the code was generated. Regenerate only what the
user approves, then run `check` on every screen that uses it.

## Rules

- **The kit decides the look.** Do not add a variant, size, color, or state
  the kit does not have. If the design needs one, say so and ask whether the
  kit should grow or the screen should change.
- **Tokens, never values.** Every color is a token class. A hex value in a
  node spec means the kit has an unbound paint: report it, do not copy it.
- **No registry fallback.** Do not install a component from shadcn or any
  other registry to fill a gap, and do not paste one from memory. The point
  is that the kit is enough. If it is not, that is the finding.
- **Generated once, then owned.** The lock is how two sessions produce the
  same Button. Read it first, every time.
- **Behavior is not invented.** Use the hinted primitive. For a hint of
  `none`, use the native element the hint names.
- **Say what the kit could not tell you.** Motion, focus order, responsive
  breakpoints, loading and error behavior are not in a static frame. List
  the calls you made for the user at the end.

## Cost to expect

Each `use_figma` read resends its script (about 4 to 10 KB) and returns a
spec (about 6 KB for a filtered Button, about 18 KB for a full desktop
screen). Read once and work from the result; do not re-read to double-check.
