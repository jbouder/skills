# Restyling a shadcn component from the kit

Every kit component starts as the stock shadcn component, installed by the
CLI in the app's style (`base-vega`, built on Base UI). The kit then decides
how it looks. shadcn supplies everything a static design cannot: parts,
props, state, keyboard and ARIA behavior, and composition. The kit supplies
every color, border, radius, size, spacing, text style and shadow.

The split is fixed, so two sessions restyle the same file the same way.

## Which shadcn component

1. The adapter's `shadcn` entry for the kit page, when there is one.
2. Else the file name for the page (`references/figma-to-code.md`, File shape).
3. Confirm the name exists before installing it:
   `bunx shadcn@latest view <name>` prints its files. A name the CLI does not
   know means shadcn has no such component. Write that page from its
   behavior hint instead, by `references/figma-to-code.md`, and say so in the
   report.

Install with `bunx shadcn@latest add <names> --yes </dev/null`. Install every
page you are adding in one command. The CLI also installs the shadcn
components each one depends on (`sidebar` brings `button`, `sheet`,
`separator`, `skeleton`, `input`, `tooltip` and a `use-mobile` hook).
Restyle those too: a dependency that is a kit page gets the kit's spec, and
one that is not gets the rules under "Parts the kit does not draw."

Never install from another registry, and never paste a component from memory.
The file on disk, from the CLI, is the base.

## Keep from shadcn

Do not change these. They are the reason the base is there.

- The file name, every export, and every part (`CheckboxGroup`,
  `SidebarProvider`, `SelectScrollUpButton`), whether the kit draws it or not.
- Props and their types, including ones the kit has no axis for
  (`loading`, `asChild`, `render`, `side`, `align`, `inset`).
- The primitive imports, hooks, context, state, event handlers and refs.
- ARIA attributes, roles, `sr-only` text and default `aria-label`s.
- `data-slot`, `data-variant`, `data-size` and every other data attribute
  the component sets.
- Classes that are about structure and mechanics, not looks:
  - layout that makes the part work: `relative`, `absolute`, `fixed`,
    `inset-*`, `z-*`, `overflow-*`, `isolate`, `contents`, `hidden`, `sr-only`
  - sizing to a primitive's variables: `w-(--anchor-width)`,
    `max-h-(--available-height)`, `origin-(--transform-origin)`
  - state plumbing: `peer`, `group/*`, `group-data-*:`, `peer-data-*:`,
    `has-*:` selectors and the `data-[collapsible=icon]` style variants, kept
    as selectors; only the look inside them is replaced
  - `pointer-events-none`, `select-none`, `touch-none`, `cursor-*` already there
  - enter and exit animation (`data-open:animate-in`, `fade-in-0`,
    `zoom-in-95`, `slide-in-from-*`), behind `motion-safe:` if it is not already
  - icon plumbing: `[&_svg]:pointer-events-none`, `[&_svg]:shrink-0`

## Replace with the kit

On every part the kit draws, remove the stock classes in these groups and
write the kit's from the node spec, by the tables in
`references/figma-to-code.md`:

| Group | Stock examples |
|---|---|
| color | `bg-*`, `text-<color>`, `border-<color>`, `ring-<color>`, `fill-*`, `stroke-*`, `outline-<color>`, `placeholder:text-*` |
| border and ring width | `border`, `border-b`, `ring-1`, `ring-3`, `inset-ring-*` |
| radius | `rounded-*` |
| size and spacing | `h-*`, `w-*`, `size-*`, `p*-`, `m*-`, `gap-*`, `space-*`, `min-*`, `max-*` (except the primitive-variable sizes above) |
| text | `text-<size>`, `font-*`, `leading-*`, `tracking-*` |
| shadow and opacity | `shadow-*`, `opacity-*` |
| effects the kit does not draw | `transition-all`, `active:translate-y-px`, `hover:` and `dark:` tweaks with no kit state behind them |

`dark:` classes go away entirely: the kit's tokens change with the theme, so
the classes do not.

The `State` axis and the selection states map to the same selectors as
before (`hover:`, `focus-visible:`, `data-checked:`, `data-disabled:`,
`aria-invalid:`). Write them on the element the stock file already styles for
that state, so the state plumbing is reused.

## Variants

- The kit's axes and options become the `cva` variants, by
  `references/figma-to-code.md`. They replace shadcn's.
- A shadcn option the kit does not draw is removed, then the type check
  (`bunx tsc -b`) shows who used it. Inside the shadcn files, point each use
  at the option the kit's `Code:` line or the adapter names, else the
  default. List every removed option in the report.
- An option the kit draws that shadcn does not have is added.
- Keep shadcn's prop names where the kit's axis means the same thing
  (`variant`, `size`). The kit's option names are the values.

## Parts the kit does not draw

A part from shadcn that no kit component draws (a group wrapper, a field
description, a sidebar rail, a sheet used for the mobile sidebar) keeps its
structure. Its look still comes only from the kit's tokens:

- Replace each stock color class with the kit token whose role matches: the
  surface the part sits on, the kit's muted text, the kit's default border,
  the kit's focus ring. Name the token you chose in the report.
- Keep its spacing and sizes as shadcn has them, unless the kit draws a
  neighbor that sets them.
- Do not invent a look the kit has no token for. Leave the class off and
  list it.

## Global CSS

`shadcn init` writes its own theme into the global CSS. The kit's theme
replaces it. After `init`, the global CSS keeps exactly this, with the
kit's font imports in the app entry, as `sync` says:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "./kit.css";

@custom-variant dark (&:is(.dark *));

@layer base {
  * {
    @apply border-<kit default border token> outline-<kit focus ring token>;
  }
  body {
    @apply bg-<kit page background token> font-sans text-<kit default text token> antialiased;
  }
}
```

Remove shadcn's `:root` and `.dark` blocks, its `@theme inline` block, and
its default font import and package (`@fontsource-variable/inter`). If a
later `add` writes CSS variables back, remove them again. The kit's theme is
the only source of color.

## Check

Run `node scripts/check-literals.mjs <src> --lock kit.lock.json`. Its
`base-token` errors are stock shadcn color classes the kit's theme does not
define (`bg-primary`, `text-muted-foreground`). Each one renders with no
color. Replace it by the rules above. There must be none left.

## The header line

The first line names the shadcn base and the kit nodes:

```
// kit-ui: Button (4:583), Icon Button (4:1449) on shadcn button (base-vega). Regenerate with /kit-ui, do not restyle by hand.
```

A file the CLI installed that is not a kit page says so:

```
// kit-ui: shadcn sheet (base-vega), not in the kit; restyled with kit tokens.
```
