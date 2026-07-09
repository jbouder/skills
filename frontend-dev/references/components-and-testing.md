# Components & Testing

## The component folder pattern

Every component and page is a PascalCase directory with three files. No exceptions, no flat files.

```
src/components/UserCard/
├── UserCard.tsx        # the component
├── UserCard.test.tsx   # co-located test
└── index.ts            # barrel: export { default } from "./UserCard";
```

`UserCard.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface UserCardProps {
  name: string;
  email: string;
  className?: string;
}

function UserCard({ name, email, className }: UserCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <p className="font-medium text-card-foreground">{name}</p>
      <p className="text-sm text-muted-foreground">{email}</p>
    </div>
  );
}

export default UserCard;
```

`index.ts`:

```ts
export { default } from "./UserCard";
```

Then import from the folder: `import UserCard from "@/components/UserCard";`

Component conventions:
- **Props interface** named `<Component>Props`, defined above the component. Always accept `className?: string` and merge it with `cn()` so callers can extend styling.
- One component per file. Function declaration + `export default`.
- Keep markup in semantic tokens (see `styling.md`).
- A component that fetches should call a `use-*` hook, not `fetch` (see `state-and-data.md`).

## Pages

Same pattern under `src/pages/`. A page is registered with a `<Route>` in `src/App.tsx`:

```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/products/:id" element={<ProductDetail />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

Adding a page: create `src/pages/PageName/` with the three files, then add its `<Route>`.

## Testing — Vitest + Testing Library

Tests sit next to the code (`Foo.test.tsx`). Setup file imports jest-dom; Vitest runs with `globals: true` and `environment: "jsdom"` (configured in `vite.config.ts`).

```ts
// src/test/setup.ts
import "@testing-library/jest-dom";
```

Query by **role / label / text**, never by class or test id unless there's no alternative. Test behavior, not implementation.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserCard from "./UserCard";

describe("UserCard", () => {
  it("renders the user's name and email", () => {
    render(<UserCard name="Ada" email="ada@example.com" />);
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });
});
```

### Wrap context-dependent components

A component that uses Router or Query needs its provider in the test.

```tsx
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
```

Use `MemoryRouter` alone for routing-only components; add the Query provider only when the component (or its hooks) actually queries.

### User interaction

```tsx
it("calls onSelect when clicked", async () => {
  const onSelect = vi.fn();
  render(<ProductRow product={product} onSelect={onSelect} />);
  await userEvent.click(screen.getByRole("button", { name: /select/i }));
  expect(onSelect).toHaveBeenCalledWith(product.id);
});
```

### What to test

- Rendered output for given props; loading / error / empty states.
- User interactions (click, type, submit) and their effects.
- Conditional rendering branches.
- **Don't** test shadcn `ui/` primitives — they're upstream. Don't assert on internal class names.

Run: `npm run test` (watch) or `npm run test -- --run` (once) or `npm run test:coverage`.
