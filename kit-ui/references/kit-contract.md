# The kit contract

What a Figma file must provide before `kit-ui` can build from it. Each rule
exists because code has to be derived from the kit with no human filling the
gaps. `scripts/figma/kit.js` checks the ones marked **checked** and reports
them by the rule name in brackets.

A file that someone else owns and that was not made for this skill can meet
some rules through the `adapter` block in `kit.json` instead. Those rules are
marked **adapter**. See `references/adapter.md`.

## Variables

- **Every color lives in a variable, and the color collection has a Light and
  a Dark mode.** [`variables`, `modes`] **checked**. The theme is generated
  from the modes. A color that only exists as a paint cannot become a token.
  A collection with one mode is read as primitives and needs no Dark mode,
  as long as some color collection has one.
- **Every variable has WEB code syntax of the form `var(--name)`.**
  [`code-syntax`] **checked**, **adapter** (`names`). That name becomes the
  CSS custom property and, for colors, the Tailwind color (`--primary` gives
  `bg-primary`). Two variables must not share a name, unless one is only an
  alias of the other.
- **Spacing variables may use `calc(...)` syntax instead.** They are not
  emitted: lengths map to the Tailwind scale by value (4px per step).
- **Scopes are set.** [`scopes`] **checked**. `ALL_SCOPES` is the sign of a
  variable nobody decided the use of.
- **A value a theme computes is its own variable.** If dark mode uses
  `input` at 30% where light mode uses nothing, make a variable with those
  two mode values. Code cannot express "this fill, but only in dark" from a
  static frame, and a variable can. Note the source in the description.
- **Opacity on a bound paint is fine** (`primary` at 80% reads as
  `bg-primary/80`). A variable whose own value is translucent keeps that
  alpha in the token.

## Styles

- **Text styles cover every text node in a component.** [`text-styles`]
  **checked** (presence only). The sync maps each style to a utility-class
  string. A text node with no style comes through as a raw size.
- **Shadows are effect styles named `shadow/<step>`.** They become
  `--shadow-<step>`.

## Components

- **One page per component family.** The page name is the code file name
  (`Dropdown Menu` gives `dropdown-menu.tsx`). Every set on the page goes in
  that file. **adapter** (`files`, `skipPages`). An emoji or symbol in front
  of a page name is dropped. Pages whose name starts with `-`, `_` or `=`
  are ignored, and so are components whose name starts with `_` or `.`.
- **Unique names across the file.** [`names`] **checked**.
- **Variant axes are the code props.** `Variant`, `Size` and the like, with
  the option names the code should use (`default`, `outline`, `sm`).
- **Interaction states are an axis named `State`.** [`state-axis`]
  **checked**, **adapter** (`stateAxes`). Options map to
  selectors: `Default`, `Hover`, `Focus`, `Disabled`, `Invalid`,
  `Placeholder`, and the selection states `On`, `Active`, `Selected`,
  `Highlighted`, `Open`. A boolean state can be its own axis (`Checked`).
  A state that is not drawn does not exist in code.
- **Every fill and stroke inside a component is bound to a variable.**
  [`raw-paint`] **checked**.
- **Editable text is a TEXT property, optional parts are BOOLEAN
  properties, icons are INSTANCE_SWAP properties.** Layer names are the
  slot names (`label`, `icon-start`).
- **Every component has a description with a `Behavior:` line.**
  [`description`, `behavior`] **checked**, **adapter** (`behavior`). The line names the package that
  supplies keyboard handling, focus management and ARIA, or `none` with the
  native element to use:

  ```
  Modal window. Code: <Dialog> with <DialogContent>, <DialogTitle>, …
  Behavior: @base-ui/react/dialog
  ```

  ```
  Compact label for a status. Code: <Badge variant>.
  Behavior: none (a span)
  ```

  A line starting `Code:` that sketches the intended JSX is optional. When
  present it wins over the default mapping: a set described as
  `size="icon"` on Button becomes options on Button, not its own export.
- **A `Focus` variant changes color, not size.** If focus adds a stroke the
  resting state lacks, the code draws it inset so nothing moves.

## Icons

- **Icons are components named `Icon/<Name>`**, where `<Name>` is the export
  name in the app's icon package, minus its suffix (`Icon/CaretDown` is
  `CaretDownIcon` from `@phosphor-icons/react`). A weight goes on the end of
  the name (`Icon/CheckBold` is `CheckIcon` with `weight="bold"`). The
  vector's fill or stroke is bound to a variable so instances can recolor it.
  **adapter** (`iconPage`): a file that keeps an icon library on one page
  under the library's own names (`chevron-down` from Lucide) names that page
  instead, and `kit.json`'s `icons.case` says how the names are written.

## Screens built from the kit

- **Auto-layout everywhere.** A frame with absolute children comes through
  as coordinates, and the code will be coordinates.
- **Kit components are used as instances, not detached copies.**
- **Text holds 4.5:1 as drawn.** Opacity on a container counts: a card at
  60% that holds text fails, and the code will not follow it.
- **Layer names mean something** (`header`, `timeline`, `dock`). They become
  the structure and the component names of the screen.

## What a kit cannot say

Call these out to the user. Do not guess silently.

- Motion: durations and easings can be variables, but what animates is not drawn.
- Responsive behavior between the frames that were drawn.
- Focus order, keyboard shortcuts, and what a screen reader announces.
- Loading, empty and error behavior, unless each has a frame.
- Truncation and overflow rules beyond what the text node sets.
