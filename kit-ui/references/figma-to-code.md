# From a node spec to code

How to turn what `scripts/figma/node.js` returns into React and Tailwind.
Follow the tables. The same spec must give the same code in any session.

## Reading the spec

A component set returns `base` (the default variant, in full) and `variants`
(for every other variant, a map from a layer path to only the properties
that differ; `null` means the property or layer is gone). A frame returns one
`tree`. Node keys:

| Key | Meaning |
|---|---|
| `t` | `box`, `text`, `inst` (an instance, a leaf) or `shape` |
| `n` | layer name |
| `w`, `h` | a pixel number, `hug` or `fill` |
| `dir`, `gap`, `pad`, `justify`, `align`, `wrap` | auto-layout |
| `fill`, `color` | a token name, with `/NN` for paint opacity |
| `stroke` | `{ c, w, at, dash }`. `w` is a number or `[top, right, bottom, left]`. `at` is absent for inside |
| `ring` | a zero-blur spread shadow: `{ w, c }` |
| `effect` | an effect style name |
| `radius`, `op` | corner radius (`full` for a pill), opacity in percent |
| `style` | a text style name |
| `prop` | bound component properties: `text`, `show`, `swap` |
| `of`, `variant`, `props` | for an instance: its component, variant, and non-default properties |
| `abs` | absolutely positioned: `{ x, y, pin }` |
| `hidden` | not visible by default |

## Layout

| Spec | Classes |
|---|---|
| `dir: row` | `flex` (with `inline-flex` for a hugging root such as a button) |
| `dir: col` | `flex flex-col` |
| `gap: 8` | `gap-2` (pixels divided by 4; `gap-1.5` for 6) |
| `gap: -6` | `-space-x-1.5` (row) or `-space-y-1.5` (col) |
| `pad: 8` | `p-2` |
| `pad: [8, 12]` | `py-2 px-3` |
| `pad: [t, r, b, l]` | `pt- pr- pb- pl-`, dropping zeros |
| `justify: center / max / space_between` | `justify-center / justify-end / justify-between` |
| `align: center / max / baseline` | `items-center / items-end / items-baseline` (none means `items-start` in a row, default stretch is **not** assumed) |
| `wrap` | `flex-wrap` |
| `w: fill` on the main axis | `flex-1 min-w-0` |
| `w: fill` on the cross axis | `w-full` (or `self-stretch` in a row for height) |
| `w: hug` | nothing, or `w-fit` when the parent would stretch it |
| `w: 240` | `w-60`. Use the scale when the value divides by 4 (or by 2 for half steps); otherwise `w-[241px]` and expect a warning from the literal check |
| `h: 32` | `h-8` |
| `minW`, `minH` | `min-w-`, `min-h-` |
| `abs` | `absolute` with `top/left/right/bottom` from `x`, `y` and `pin` (`MAX` pins to the far edge); the parent gets `relative` |
| a `box` named `spacer` with `w: fill` | drop it and put `ml-auto` on the next sibling, or `justify-between` on the parent |

A text node with `w: fill` and `truncate` gets `min-w-0 flex-1 truncate`
(or `line-clamp-N`).

## Paint

| Spec | Classes |
|---|---|
| `fill: primary` | `bg-primary` |
| `fill: primary/80` | `bg-primary/80` |
| `color: muted-foreground` (text) | `text-muted-foreground` |
| `color` on an icon instance | `text-…` on the icon; icons take `currentColor` |
| `stroke: { c: border, w: 1 }` | `border border-border` |
| `stroke.w: [0, 0, 1, 0]` | `border-b border-border` |
| `stroke.at: outside` | `ring-1 ring-foreground/10` (a ring does not take layout space) |
| `stroke.dash` | `border-dashed` |
| `ring: { w: 1, c: focus-ring }` | `ring-1 ring-focus-ring` |
| `radius: 4` / `full` | `rounded-sm` (match the theme's radius steps) / `rounded-full` |
| `op: 50` | `opacity-50` |
| `effect: shadow/md` | the class from the lock's `tokens.effects` (`shadow-md`) |
| `style: Body/xs medium` | the class string from the lock's `tokens.text` |
| `deco: underline / strikethrough` | `underline / line-through` |

A value that starts with `#`, or `unstyled shadow`, is a kit defect. Stop and
report it.

Dark mode needs nothing: the tokens change, the classes do not.

## Variants

1. **Find what each axis controls.** Compare variants that differ in one axis
   only. Size usually drives `h`, `pad`, `gap`, icon size and text style.
   Variant usually drives fill, stroke and text color. Put each axis in
   `cva`'s `variants`, with the kit's option names as the keys, and the
   properties common to every variant in the base string. Set
   `defaultVariants` from the option named `default`, else the kit's default
   variant.
2. **The `State` axis is not a prop.** Each state becomes a selector prefix
   on the classes that differ from `Default`:

   | State | Prefix |
   |---|---|
   | `Hover` | `hover:` |
   | `Focus` | `focus-visible:` (on a wrapper: `has-[:focus-visible]:` or `focus-within:`) |
   | `Disabled` | `disabled:` for a native control, `data-disabled:` for a primitive; add `pointer-events-none` |
   | `Invalid` | `aria-invalid:` |
   | `Placeholder` | `placeholder:` for the text color; for a select, the primitive's placeholder attribute |
   | `On`, `Active`, `Selected`, `Highlighted`, `Open`, `Checked=true` | the primitive's data attribute, from `references/behavior-map.md` |

   If a state changes something for one variant only, the prefixed class
   goes in that variant's string.
3. **A combination the kit does not draw does not get classes.** Do not
   extrapolate a hover for a variant that has none.

## Properties

| Kit property | Code |
|---|---|
| TEXT bound to the main label | `children` |
| other TEXT | a named part (`<CardTitle>`) when the kit's `Code:` line names one, else a prop |
| BOOLEAN (`show`) | the part is optional: render it when the caller passes it |
| INSTANCE_SWAP on an icon | the caller passes the icon element; mark its position with `data-icon="inline-start"` or `inline-end` if the padding differs |
| BOOLEAN axis (`Checked`) | state owned by the primitive, not a styling prop |

## File shape

- One file per kit page, kebab-case, in the `components` folder from
  `kit.json`. Named function exports, PascalCase, matching the kit's
  component names (`Select Trigger` is `SelectTrigger`). No default export,
  no `forwardRef` on React 19.
- `cva` for variants; export the variants function beside the component.
  `cn(variants({ ... }), className)` so the caller's classes win.
- `data-slot="<kebab-name>"` on every part's root, plus `data-variant` and
  `data-size` when it has them.
- The first line is a comment naming the source:
  `// kit-ui: Button, from <kit name> node 4:583. Regenerate with /kit-ui, do not restyle by hand.`
- Icons import from the package in `kit.json` (`Icon/CaretDown` with suffix
  `Icon` is `CaretDownIcon`). An icon-only control gets an `aria-label`.
- Transitions: if the kit has duration and easing variables, every
  `transition-*` uses them (`duration-(--duration-fast) ease-(--ease-standard)`).
  Wrap non-essential motion in `motion-safe:`.

## Screens

- An `inst` of a kit component becomes that component, with `variant`'s axes
  as props (never the `State` axis: a screen drawn with a hover or focus
  variant is showing a moment, not a prop) and `props` as children or parts.
- An `inst` of a component that is local to the design (not on a kit page)
  becomes a local app component, built once from its spec.
- A `box` becomes a `div`, or the landmark its name says (`header`, `nav`,
  `main`, `aside`, `footer`). A list of repeated boxes becomes `ul`/`li` or a
  mapped array, with the drawn text as sample data in one place.
- Fixed frame sizes (`w: 1440`, `h: 900`) belong to the artboard. The page
  root is `min-h-svh w-full`; fixed side columns keep their widths.
- Headings: the largest text style on the page is the `h1`. Keep one.
