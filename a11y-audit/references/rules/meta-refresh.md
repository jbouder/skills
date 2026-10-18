---
id: meta-refresh
title: The page refreshes or redirects itself after a timed delay
wcag: [2.2.1]
level: A
impact: critical
---

## The problem

The page has a `<meta http-equiv="refresh">` tag with a delay, such as `content="30"` or `content="5; url=/new-page"`. After that many seconds the browser reloads the page or navigates away, and the user has no way to turn off, extend or adjust the time limit. axe fails any delay greater than 0 and up to 72,000 seconds (20 hours). An instant redirect with a delay of `0` passes, because there is no time limit for the user to beat.

Typical causes are "you will be redirected in 5 seconds" pages, dashboards that reload to fetch fresh data, and session pages that refresh to keep content current.

## Who it affects

- Screen reader users, who may lose their place mid-sentence when the page reloads and focus jumps back to the top.
- People who read slowly, use magnification or have cognitive disabilities, who may not finish reading before the page changes.
- People with motor disabilities filling in a form, who can lose their input.

## How to fix

For a redirect, make it instant on the server with an HTTP 301 or 302. If you must use a meta tag, use a delay of `0`.

```html
<!-- Before: redirects after 5 seconds -->
<meta http-equiv="refresh" content="5; url=/new-page">

<!-- After: instant redirect (prefer an HTTP 301 on the server) -->
<meta http-equiv="refresh" content="0; url=/new-page">
```

For periodically updated data, remove the meta refresh and fetch new data in the background without reloading the page. Give users a way to pause updates if they change content they may be reading.

```tsx
// Before: <meta http-equiv="refresh" content="60"> in the document head
// After: poll in the background, no page reload
const { data } = useQuery({
  queryKey: ["stats"],
  queryFn: fetchStats,
  refetchInterval: paused ? false : 60_000,
});
```

## Common false positives

- **Instant redirects** with a delay of `0` do not fail this rule.
- **Real-time exceptions** in WCAG, such as an auction, are not something axe can recognize. In practice, meta refresh is almost never the right tool even then.

## How to verify

View the page source and search for `http-equiv="refresh"`. Load the page, wait past the delay, and confirm nothing reloads or navigates on its own. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)
- [axe rule: meta-refresh](https://dequeuniversity.com/rules/axe/4.13/meta-refresh)
