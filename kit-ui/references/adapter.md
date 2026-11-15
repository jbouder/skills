# The adapter

A kit made for this skill meets `references/kit-contract.md` on its own. A
file a design team already owns usually does not: no code syntax on its
variables, no `Behavior:` lines, emoji in its page names. The skill never
writes to a kit, so the `adapter` block in `kit.json` supplies what the file
leaves out. Each contract rule can be met by the file or by the adapter.

Use it only for what the file lacks. What the adapter says lives in the app
repo, not in the kit, so every entry is one more thing the kit does not own.
When the kit's owner fixes the file, delete the entry.

```json
"adapter": {
  "skipPages": ["Cover", "Colors", "Playground"],
  "iconPage": "Icons",
  "names": { "derive": true, "ignoreSyntax": ["Brand Colors"], "map": { "color/background/default": "background" } },
  "stateAxes": ["interaction states"],
  "files": { "Buttons": "button", "Sidebar Nav": "sidebar" },
  "behavior": { "Button": "@base-ui/react/button", "Select*": "@base-ui/react/select", "Card": "none (a div)" }
}
```

`examples/nebari.kit.json` is a full one, written for a designer-owned file.

## Keys

| Key | Fills the gap in | What it does |
|---|---|---|
| `skipPages` | pages | Pages to leave out: covers, swatches, playgrounds. Names are compared without their emoji prefix. |
| `iconPage` | icons | Every component on this page is an icon, whatever it is named. Without it, icons are the components named `Icon/<Name>`. In a file that only uses the kit as a library, a component has no page, so there an icon is a loose library component (not in a set) drawn with shapes only. |
| `names.derive` | `code-syntax` | `true`: a variable with no WEB code syntax gets a CSS name from its own name. |
| `names.ignoreSyntax` | `code-syntax` | Collections whose code syntax is wrong (left over from a template, or shared by several variables). Their names are derived. |
| `names.map` | `code-syntax` | Variable name to CSS name, for the few you want to name by hand. Wins over everything. |
| `stateAxes` | states | Axis names to read as the `State` axis. |
| `files` | pages | Page name to code file name, where the default (the page name in kebab-case) is wrong. |
| `behavior` | `behavior` | Component name to behavior hint, in the same form as a `Behavior:` line. A key ending in `*` matches every name that starts with it. A `Behavior:` line in the file wins. |

## Passing it to the scripts

The scripts take the adapter through `ARGS`. Pass only the keys each one reads:

| Script | `ARGS` keys from the adapter |
|---|---|
| `kit.js` | `skipPages`, `iconPage`, `names`, `stateAxes`, `behavior` |
| `tokens.js` | `names` |
| `node.js` | `names`, `iconPage` |

`files` is not passed: it is read when a component file is named.

## Derived names

The rule is fixed, so every session gets the same token for the same variable:

1. Lowercase the variable name.
2. Drop a leading `color/`.
3. Turn every run of characters that is not a letter or digit into `-`.

| Variable | CSS name | Classes |
|---|---|---|
| `color/background/default` | `--background-default` | `bg-background-default` |
| `color/foreground/muted` | `--foreground-muted` | `text-foreground-muted` |
| `color/border/input` | `--border-input` | `border-border-input` |
| `Primary Magenta/500` | `--primary-magenta-500` | `bg-primary-magenta-500` |
| `radius/md` | `--radius-md` | `rounded-md` |

- A length with a derived name is not emitted, except `radius/*`: lengths map
  to the Tailwind scale by value.
- A string variable (a font family) is not emitted. Fonts come from the text styles.
- Two variables may derive the same name when one is only an alias of the
  other (a semantic `radius/md` over a primitive one). The first is emitted.
  Any other clash is a `code-syntax` finding.

The derived names will not match an existing codebase's tokens
(`--background-default` is not `--background`). That is expected: with this
skill the kit names the tokens. Use `names.map` only when the app must keep a
name.

## Writing the behavior map

Do not fill it from the component's name alone. For each entry:

1. If the team has a coded version of the component, read which primitive it
   imports and use that.
2. Otherwise pick from the libraries in `kit.json`'s `behavior` list, and
   check the package exports that path.
3. For a component with no keyboard or ARIA mechanics of its own, write
   `none (<the native element>)`, or `none (composes X, Y)`.

Show the finished map to the user before the first build. It is the one part
of the build the kit did not decide.

## What the adapter cannot fix

These stay findings for the kit's owner:

- Unbound paints (`raw-paint`) and text with no text style.
- Two components with one name (`names`).
- A state that is not drawn, and a variant set that is not finished.
- Loose components that should be one variant set.
