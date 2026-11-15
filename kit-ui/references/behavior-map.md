# Behavior

A kit draws what a component looks like. It does not say how a dialog traps
focus or how a menu moves with the arrow keys. That comes from a headless
library, named by the `Behavior:` line in each kit component's description.

## Reading the hint

| Hint | What to do |
|---|---|
| `@base-ui/react/<name>` | Import the primitive from that path. Build the parts the kit's `Code:` line names, one styled wrapper per primitive part. |
| another package (`cmdk`, `sonner`, `react-day-picker`) | Same, if the package is in `kit.json`'s `behavior` list. If not, ask before installing it. |
| `none (a span)`, `none (a native table)`, … | No library. Use the native element in the parentheses and its built-in semantics. |
| `none (composes X, Y)` | No library of its own. Build it from the generated components it names, adding those first. |
| missing | The kit breaks the contract. Do not pick a primitive by guessing from the name: report it. |

**Check the installed package, not memory.** Before using a primitive, read
its exports and prop types in `node_modules` (or its docs). Part names and
data attributes change between versions, and a wrong attribute fails
silently: the class is there and never applies.

## State attributes

The kit's selection states map to attributes the primitive sets. These are
the usual ones for Base UI; confirm each against the installed version.

| Kit state | Typical selector prefix | Seen on |
|---|---|---|
| `Checked=true` / `false` | `data-checked:` / `data-unchecked:` | Checkbox, Switch, Radio, menu checkbox items |
| `On` | `data-pressed:` or `aria-pressed:` | Toggle, toggle group items |
| `Active` | `data-active:` | Tabs |
| `Highlighted` | `data-highlighted:` | Select, Menu and Combobox items |
| `Selected` | `data-selected:` | Select and Combobox items, calendar days |
| `Open` | `data-popup-open:` on the trigger, `data-open:` on the popup | Menu, Select, Popover, Dialog triggers |
| `Disabled` | `data-disabled:` | every primitive |
| `Invalid` | `aria-invalid:` or `data-invalid:` | inputs, Field |
| entering / leaving | `data-starting-style:` / `data-ending-style:` | popups and overlays |

For a library outside Base UI, find its equivalents the same way (`cmdk`
marks the active row with `data-selected`, for example).

## What every generated component still owes

The primitive covers keyboard and ARIA mechanics. The wrapper covers the rest:

- **A name.** A part with one fixed meaning (a dialog's close button, a
  spinner) ships with a default `aria-label` the caller can override. A
  generic icon-only control has no honest default: the caller must pass
  `aria-label`, and the file's header comment says so.
- **A visible focus state.** Use the kit's `Focus` variant. If a focusable
  component has none, that is a kit gap: report it, and until it is fixed use
  the kit's focus ring token so the control is never without one.
- **A hit area.** If the drawn control is under 24 by 24 pixels, extend the
  hit area with a pseudo-element; do not change the drawn size.
- **Popups render in a portal** and take the kit's popover surface tokens.
- **Overlays** (dialog, sheet) get the kit's overlay token on the backdrop.
- **Reduced motion.** Non-essential transitions sit behind `motion-safe:`.

## Notes per primitive

- **Button:** a link that should look like a button is an anchor with the
  variants function's classes. Use `render` (with `nativeButton={false}`)
  only when the element must stay a Base UI button.
- **Tabs:** the panel is a tab stop, so it needs the kit's focus ring too.
- **Checkbox, Switch:** the primitive sets `data-disabled` and the native
  `disabled`; style with `data-disabled:` so both cases are covered.

## Composition

Follow the composition model of the hinted library. For Base UI that is the
`render` prop (`<DialogTrigger render={<Button />} />`), not `asChild`.
A link that looks like a button puts the button's variant classes on an
anchor; it does not put an anchor inside a button.
