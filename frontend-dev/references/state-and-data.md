# State & Data

Three kinds of state, three homes. Putting state in the wrong place is the most common mistake.

| State | Where | Example |
|-------|-------|---------|
| Component-local | `useState` in the component | form input, a toggle, hover |
| Server data | **TanStack Query** | API responses, anything fetched |
| Shared client state | **Jotai atom** in `src/store/` | sidebar open, selected id, theme-ish flags |

**Never duplicate server state in an atom.** If it came from the API, TanStack Query owns it; derive everything else from the query data.

## The API wrapper — `src/lib/api.ts`

A thin typed `fetch` wrapper. Hooks call this; components never call `fetch` directly.

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

> Some older repos use an axios instance (`src/utils/axios.ts`) instead. Match whatever the repo already has.

## TanStack Query — one hook per resource

Wrap every query/mutation in a `use*` hook under `src/hooks/` (file named to match the hook, e.g. `useProducts.ts`). Components consume the hook; they never see `queryKey` or `api` directly.

```ts
// src/hooks/useProducts.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Product { id: string; name: string; price: number; }
interface CreateProductInput { name: string; price: number; }

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<Product[]>("/products"),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductInput) => api.post<Product>("/products", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}
```

In the component:

```tsx
function Products() {
  const { data, isLoading, error } = useProducts();
  const createProduct = useCreateProduct();

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (error) return <p className="text-destructive">Failed to load.</p>;

  return (
    <>
      {data?.map((p) => <ProductCard key={p.id} product={p} />)}
      <Button
        disabled={createProduct.isPending}
        onClick={() => createProduct.mutate({ name: "New", price: 0 })}
      >
        Add
      </Button>
    </>
  );
}
```

Conventions:
- **Query keys are arrays**, hierarchical: `["products"]`, `["products", id]`. Invalidate the broadest key that should refetch.
- Handle `isLoading` / `isPending` / `error` in the UI — Skeleton for loading, a `text-destructive` message for errors.
- The single `QueryClient` is created once in `App.tsx` and provided via `QueryClientProvider`.

## Jotai — shared client state, all in `src/store/`

```ts
// src/store/appAtoms.ts
import { atom } from "jotai";

export const sidebarOpenAtom = atom(false);
export const selectedItemIdAtom = atom<string | null>(null);

// derived, read-only
export const hasSelectionAtom = atom((get) => get(selectedItemIdAtom) !== null);
```

```tsx
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { sidebarOpenAtom } from "@/store/appAtoms";

const [open, setOpen] = useAtom(sidebarOpenAtom); // read + write
const open = useAtomValue(sidebarOpenAtom);        // read only
const setOpen = useSetAtom(sidebarOpenAtom);       // write only — no re-render on change
```

Rules: all atoms live in `src/store/` (never scattered in component files); prefer `useAtomValue`/`useSetAtom` over `useAtom` when you only need one side; derive instead of syncing.
