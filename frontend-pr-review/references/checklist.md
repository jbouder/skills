# Frontend PR Review Checklist

The working substance of the review. Walk every section against the diff. Each item is a question — a "no" (or "unclear") is a candidate finding to verify in Step 4 before reporting.

## 1. General code review

- **Correctness** — Does the change do what the PR says? Off-by-one, inverted conditions, wrong dependency arrays, stale closures, unhandled promise rejections, `await` missing.
- **States** — Are loading, error, and empty states handled for every async surface? No spinner-forever, no crash on `undefined.map`.
- **Types** — No `any` (use real types or `unknown` + narrowing). No `as` casts papering over a real mismatch. Props typed; no implicit `any` params. Return types where they aid clarity.
- **Nullability** — Optional chaining / guards where data can be absent; no `data.user.name` on a query result that starts `undefined`.
- **Dead code shipped as feature** — New code paths that are unreachable, unused exports, unused props, unused imports.
- **Duplication** — Did this reimplement a util/hook/component that already exists? Check `src/lib`, `src/hooks`, `src/components/ui`.
- **Security** — No secrets/API keys/tokens in source. `dangerouslySetInnerHTML` only with sanitized input. No building URLs/queries from unescaped user input. `target="_blank"` has `rel="noopener noreferrer"`.
- **Error handling** — Errors surfaced to the user (toast/inline), not swallowed. `catch {}` blocks that silently drop errors are a finding.

## 2. Frontend craft (see `frontend-dev`)

- **Structure** — New component/page in its own PascalCase dir with a barrel `index.ts` and a co-located `*.test.tsx`? Imports from the folder, not the inner file?
- **Naming** — Components PascalCase, non-components camelCase, hooks `use…`.
- **State ownership** — Server/API data lives in **TanStack Query**, never copied into a Jotai atom. Client-only UI state → Jotai (in `src/store/`), not scattered.
- **Data fetching** — No fetching in a component with `useEffect`; use a `use-*` hook wrapping `useQuery`/`useMutation`. Query keys sensible and invalidated on mutation.
- **Hook rules** — No conditional hooks; dependency arrays complete and honest.
- **shadcn discipline** — `src/components/ui/` files are generated; **not hand-edited**. Customization is via wrapping / `className` / variants, or `npx shadcn add`.
- **Tests** — New behavior has a test. Tests assert user-visible behavior (Testing Library), not implementation detail. Router/Query wrappers used where needed.
- **Quality gate** — Would `npm run build && npm run test -- --run && npm run check` pass? Flag obvious Biome/type breakers.

## 3. Accessibility

- **Semantic HTML** — Real `<button>`/`<a>`/`<nav>`/`<main>`/headings, not `<div onClick>`. A clickable `div` without `role`/`tabIndex`/key handler is a finding.
- **Names** — Every interactive element has an accessible name: visible text, `aria-label`, `aria-labelledby`, or an associated `<label htmlFor>`. Icon-only buttons **must** have `aria-label`.
- **Images** — `<img>` has `alt` (empty `alt=""` for decorative). Decorative SVGs `aria-hidden`.
- **Keyboard & focus** — Interactive elements reachable and operable by keyboard; focus not trapped; visible focus ring not removed (`outline-none` without a replacement is a finding). Modals/dialogs manage focus (Base UI/shadcn handle this — don't override it).
- **Forms** — Inputs have labels; errors linked via `aria-describedby`; `aria-invalid` on invalid fields.
- **Roles/ARIA** — ARIA used only when semantics need it, and correctly (no redundant `role="button"` on a `<button>`). Live regions for async status where relevant.
- **Contrast** — Text/background combinations meet contrast — mostly guaranteed by using the theme tokens; custom color pairings need a check.
- **Motion** — Every animation gated on `motion-safe:` (WCAG 2.3.3); see `nebari-ui` motion rules.

## 4. Nebari design system (see `nebari-ui`)

- **Reuse over rebuild** — Is there a Nebari/shadcn component + variant that already does this? Prefer it over a hand-rolled primitive.
- **Composition** — Element swaps use the Base UI `render` prop (`<Button render={<a />}>`), not rewrapping or editing the component.
- **`cn()` for classes** — Class merging via `cn()`; be alert to the tailwind-merge dedup gotcha on `transition-*` (re-enumerate properties).
- **Managed source** — Installed `ui/*` and `lib/*` are upstream-managed. Edits there are a finding — changes belong at the call site (`className`, `render`, a wrapper) or upstream in `nebari-design`.
- **Tokens & data-attrs** — Custom styling uses semantic tokens; targeting `data-slot`/`data-variant` is fine, restyling with raw values is not.
- **Motion tokens** — Durations/easings come from the theme tokens (`--duration-base`, `--ease-standard`) or the `animate-*` utilities, never hardcoded `0.2s`.

## 5. No hard-coded colors or styling

Cross-check every color against the tokens defined in the app's `index.css`/`globals.css` (gathered in Step 2). Findings:

- Raw hex (`#fff`, `#1a1a1a`), `rgb(...)`, `hsl(...)`, `rgba(...)` in JSX/className/inline styles — **unless** it's the token *definition* in the theme file itself.
- Named Tailwind palette colors: `bg-white`, `bg-black`, `text-gray-900`, `border-slate-200`, `text-red-500`, etc. → semantic token (`bg-background`, `text-foreground`, `border-border`, `text-destructive`).
- Inline `style={{ color, background, border }}` for anything a class/token could express.
- `dark:` variants added by hand to patch a color — the tokens already flip; a `dark:` override usually signals a hardcode upstream.
- Magic spacing/size numbers where a scale/utility exists (lower severity, but note egregious ones).

The test: **would this render correctly in dark mode without change?** If not, it's hardcoded.

## 6. Console logs & debug leftovers

- `console.log` / `console.debug` / `console.info` left in shipped code → remove (🟢, or 🟡 if it logs user/PII data).
- `console.error` / `console.warn` in genuine error/warn paths → usually fine; note if it's really debug noise.
- Logs behind `import.meta.env.DEV` or a logger util → acceptable; don't flag.
- `debugger` statements, `alert()` → always flag.

## 7. Commented-out code & TODOs

- **Commented-out code blocks** — dead code left behind "just in case". Flag for removal (git history preserves it).
- **`TODO` / `FIXME` / `XXX` / `HACK`** — flag each. Downgrade to informational if it references a tracked issue (`TODO(#123)`); flag as should-fix if it marks something incomplete in the very code being merged.
- **Placeholder content** — `lorem ipsum`, `TODO: real copy`, stubbed handlers (`onClick={() => {}}`), `throw new Error("not implemented")` on a shipped path.

## Scope rule

Flag only what the diff **introduces or touches**. Note pre-existing issues only when the change worsens them, and tag such notes `[pre-existing]`. Don't pad the report with unrelated cleanup.
