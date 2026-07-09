# Styling — Tailwind v4 + shadcn/ui

## Tailwind v4 is CSS-first

There is **no `tailwind.config.ts`** and **no `postcss.config.js`** in a v4 project. Configuration lives in CSS and the Vite plugin.

`vite.config.ts`:

```ts
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`src/index.css` — the entry. Import Tailwind, declare the dark variant, map tokens in `@theme inline`, define the palette in `:root` / `.dark` with **oklch** values:

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

> Migrating a v3 project? `@tailwind base/components/utilities` → `@import "tailwindcss"`; move the `tailwind.config.ts` `theme.extend.colors` into `@theme inline`; drop `postcss.config.js` and add the `@tailwindcss/vite` plugin. Don't migrate unless asked.

## Semantic tokens, always

Every color in markup is a token, so light/dark are automatic:

```tsx
// ✅
<div className="bg-background text-foreground border border-border">
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
<p className="text-muted-foreground">

// ❌ bypasses the token system — breaks dark mode
<div className="bg-white text-gray-900 border-gray-200">
```

Token roles: `background`/`foreground` (page), `card`, `popover`, `primary`, `secondary`, `muted` (subtle bg + `-foreground` for low-emphasis text), `accent` (hover/active), `destructive`, `border`, `input`, `ring` (focus).

## `cn()` — the only way to compose classes

`src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Use it for conditional and merged classes so later classes win conflicts:

```tsx
<div className={cn("rounded-md p-4", isActive && "bg-accent", className)} />
```

## Component variants — CVA

For a component with visual variants, use `class-variance-authority` (the pattern shadcn itself uses). Define `variants`, give every variant a `defaultVariants`, expose them as props, and merge with `cn()`:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

## Adding shadcn components

```bash
npx shadcn@latest add button card input dialog dropdown-menu
```

- Components land in `src/components/ui/` — **generated, don't hand-edit.**
- Need a tweak? Build a wrapper in `src/components/MyThing/` that composes the primitive, or pass `className`. Don't fork the generated file.
- Icons come from `lucide-react`: `import { Check } from "lucide-react"`.
- The `shadcn` skill (auto-activates with `components.json`) has component docs and usage.
