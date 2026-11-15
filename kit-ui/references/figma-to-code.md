# From a node spec to code

How to turn what `scripts/figma/node.js` returns into React and Tailwind.
Follow the tables. The same spec must give the same code in any session, so
where a rule exists, use it, and do not add a class no rule asks for.

## Reading the spec

A **component set** returns:

- `axes`: each variant axis and its options.
- `props`: the TEXT, BOOLEAN and INSTANCE_SWAP properties with their defaults.
- `tree`: the base variant in full. `base` names it.
- `changes`: for each axis and option, what differs from the base when only
  that axis changes. This maps straight onto `cva` variants.
- `exceptions`: what a combination changes beyond what its axes predict. An
  axis missing from the name means "for every option of that axis"
  (`Variant=outline, State=Hover` holds at every size).

A change is a map from a layer path (`/` is the root, `/label` a child) to
the properties that differ. `null` means the property or layer is gone.

A **frame** returns one `tree`. Node keys:

| Key | Meaning |
|---|---|
| `t` | `box`, `text`, `inst` (an instance, a leaf) or `shape` |
| `n` | layer name |
| `w`, `h` | a pixel number, `hug` or `fill` |
| `dir`, `gap`, `pad`, `justify`, `align`, `wrap` | auto-layout |
| `fill`, `color` | a token name, with `/NN` for paint opacity |
| `stroke` | `{ c, w, at, dash, layout }`. `w` is a number or `[top, right, bottom, left]`. `at` is absent for inside. `layout: true` means the stroke takes layout space |
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
| `dir: row` | `flex` (`inline-flex` for a hugging root such as a button) |
| `dir: col` | `flex flex-col` |
| `gap: 8` | `gap-2` (pixels divided by 4; `gap-1.5` for 6) |
| `gap: -6` | `-space-x-1.5` (row) or `-space-y-1.5` (col) |
| `pad: 8` | `p-2` |
| `pad: [8, 12]` | `py-2 px-3` |
| `pad: [t, r, b, l]` | `pt- pr- pb- pl-`, dropping zeros |
| `justify: center / max / space_between` | `justify-center / justify-end / justify-between` |
| `align: center / max / baseline` | `items-center / items-end / items-baseline`. No `align` means `items-start` |
| `wrap` | `flex-wrap` |
| `w: fill` on the main axis | `flex-1 min-w-0` |
| `w: fill` on the cross axis | `w-full` in a column; `self-stretch` for height in a row |
| `w: hug` | nothing, or `w-fit` when the parent would stretch it |
| `w: 240` | `w-60`. Use the scale when the value divides by 4 (or by 2 for half steps); otherwise `w-[241px]` and expect a warning from the literal check |
| `h: 32` | `h-8` |
| a fixed-size child in a flex parent | add `shrink-0` |
| `minW`, `minH` | `min-w-`, `min-h-` |
| `abs` | `absolute` with `top/left/right/bottom` from `x`, `y` and `pin` (`MAX` pins to the far edge); the parent gets `relative` |
| a `box` named `spacer` with `w: fill` | drop it and put `ml-auto` on the next sibling, or `justify-between` on the parent |

A text node with `w: fill` and `truncate` gets `min-w-0 flex-1 truncate`
(or `line-clamp-N`). A single-line text node with `w: hug` inside a control
gets `whitespace-nowrap` on the control.

## Paint

| Spec | Classes |
|---|---|
| `fill: primary` | `bg-primary` |
| `fill: primary/80` | `bg-primary/80` |
| `color: muted-foreground` (text) | `text-muted-foreground` |
| an icon instance | `text-…` from its `color`. With no `color` (a hidden slot), the icon follows the label's color |
| `stroke: { c: border, w: 1, layout: true }` | `border border-border`. A border takes space in CSS exactly as it does in the kit |
| `stroke` without `layout`, inside | `inset-ring-1 inset-ring-border`. It takes no space in the kit, so it must take none in CSS |
| `stroke.w: [0, 0, 1, 0]` | `border-b border-border` |
| `stroke.at: outside` | `ring-1 ring-foreground/10` (takes no layout space) |
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

1. **Each axis in `changes` is a `cva` variant**, except `State`. Keys are
   the kit's option names. The base variant's own option gets the base
   values for that axis. Classes every option shares go in the base string.
2. **`defaultVariants`**: the option named `default` when the axis has one,
   even if the Figma file's default variant is another option. Otherwise the
   base variant's option.
3. **The `State` axis is not a prop.** Each state becomes a selector prefix
   on what `changes.State` says differs:

   | State | Prefix |
   |---|---|
   | `Hover` | `hover:` |
   | `Focus` | `focus-visible:` (on a wrapper: `has-[:focus-visible]:`) |
   | `Disabled` | `data-disabled:` for a primitive, `disabled:` for a native control; add `pointer-events-none` under the same prefix |
   | `Invalid`, `Error` | `aria-invalid:` |
   | `Pressed` | `active:` |
   | `Focused` | the same as `Focus` |
   | `Placeholder` | `placeholder:` for the text color; for a select, the primitive's placeholder attribute |
   | `On`, `Active`, `Selected`, `Highlighted`, `Open`, `Checked=true` | the primitive's data attribute, from `references/behavior-map.md` |

   An axis listed in the adapter's `stateAxes` is read as `State`. An option
   that names two states (`Focus / Pressed`) goes under both prefixes. An
   option that shows content, not interaction, is not a selector: `Filled`
   is the value's text color where `Default` shows the placeholder, and
   `Loading`, `Empty` and the like are listed in the report as states the
   caller renders.

   State classes that hold for every variant go in the base string. An
   `exceptions` entry goes in the string of the variant it names
   (`Variant=outline, State=Hover` puts `hover:bg-outline-bg-hover` in
   `outline`); `tailwind-merge` in `cn()` settles the overlap.
4. **A stroke that exists only in a state must not move the layout.** If the
   base has no stroke and `Focus` adds one, draw it as
   `focus-visible:inset-ring-1 focus-visible:inset-ring-<token>`, whatever
   its `layout` flag says. If the base already has a border, the state only
   changes the border color. Report a focus variant that changes size as a
   kit defect.
5. **A combination the kit does not draw gets no classes.** Do not invent a
   hover for a variant that has none.

## Always-on classes

Add these, and only these, beyond what the spec gives:

| When | Classes |
|---|---|
| a control with a drawn `Focus` variant | `outline-none` |
| any interactive component, when the kit has duration and easing variables | `motion-safe:transition-colors duration-(--duration-fast) ease-(--ease-standard)` |
| a button-like control | `select-none` |
| a root that slots icons | `[&_svg]:shrink-0`, and per size `[&_svg]:size-N` from the icon slot's `w` |

No cursor classes, no shadows, no extra hover or active effects.

## Properties

| Kit property | Code |
|---|---|
| TEXT bound to the main label | `children` |
| other TEXT | a named part (`<CardTitle>`) when the kit's `Code:` line names one, else a prop |
| BOOLEAN (`show`) | the part is optional: render it when the caller passes it |
| INSTANCE_SWAP on an icon | **children.** The caller writes `<Button><PlusIcon />Add</Button>`; order in the JSX is order on screen. No `iconStart` or `icon` props. The component sizes the icon (see Always-on classes) |
| BOOLEAN axis (`Checked`) | state owned by the primitive, not a styling prop |

**The `Code:` line in a description wins over these defaults.** If it maps a
set onto another component's prop (Icon Button as `size="icon"` on Button),
do exactly that: add the options to that component and do **not** export a
separate component for the set.

## File shape

- One file per kit page, in the `components` folder from `kit.json`. The
  name is the adapter's `files` entry for the page when there is one, else
  the page name in kebab-case with slashes dropped. Named function
  exports in PascalCase, matching the kit's component names (`Select
  Trigger` is `SelectTrigger`) unless a `Code:` line says otherwise. No
  default export, no `forwardRef` on React 19.
- Generate the parts the kit draws or a `Code:` line names **and** the
  screen uses. Do not generate parts nothing draws (a provider, a trigger
  that is never shown).
- `cva` for variants; export the variants function beside the component
  (a `react/only-export-components` lint warning there is expected).
  `cn(variants({ ... }), className)` so the caller's classes win. Type
  `className` as `string`.
- `data-slot="<kebab-name>"` on every part's root, plus `data-variant` and
  `data-size` when it has them.
- The first line names the source, one id per set:
  `// kit-ui: Button (4:583), Icon Button (4:1449). Regenerate with /kit-ui, do not restyle by hand.`
- Icons import from the package in `kit.json`: `Icon/CaretDown` with suffix
  `Icon` is `CaretDownIcon`. A weight on the end of the name is a prop:
  `Icon/CheckBold` is `<CheckIcon weight="bold" />`.
- With `icons.case: "kebab"`, turn the kit's name into PascalCase first:
  `chevron-down` with no suffix is `ChevronDown` from `lucide-react`. An
  instance marked `icon: true` in a spec is one of these. Check that the
  export exists in the installed package before using it.
- Axis and option names become props in camelCase with the kit's spelling
  otherwise kept (`Variant=Outline` is `variant="outline"`: lowercase the
  option when every option of the axis is a single capitalized word).

## Screens

- An `inst` of a kit component becomes that component, with `variant`'s axes
  as props (never the `State` axis: a screen drawn with a hover or focus
  variant is showing a moment, not a prop) and `props` as children or parts.
- An `inst` of a component that is local to the design (on a page that is
  not a kit component page) is added like any other: its page gets a file.
- A `box` becomes a `div`, or the landmark its name says (`header`, `nav`,
  `main`, `footer`). Use a labeled `section` for a named region inside
  `main`. A list of repeated boxes becomes a mapped array, with the drawn
  text as sample data in one place.
- Fixed frame sizes (`w: 1440`, `h: 900`) belong to the artboard. The page
  root is `min-h-svh w-full`; fixed side columns keep their widths.
- **Two frames of one screen at different widths:** build each as its own
  tree and switch with a media-query hook, so one tree is in the DOM. The
  breakpoint is the midpoint the user gives, else 1024px.
- Headings: the largest text style on the page is the `h1`. Keep one.
  Section titles are `h2`.
- A tab, menu or panel the frame does not draw gets a real control and an
  empty or one-line placeholder panel. List it in the report.
- A checkbox or switch in a row takes its name from the row's text
  (`aria-labelledby`), not from a wrapping label alone.
