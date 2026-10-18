---
id: meta-refresh-no-exceptions
title: The page refreshes or redirects itself after a very long delay
wcag: [2.2.4, 3.2.5]
level: AAA
impact: minor
---

## The problem

The page has a `<meta http-equiv="refresh">` tag with a delay longer than 20 hours (72,000 seconds). The Level A rule `meta-refresh` allows delays over 20 hours as an exception, but the AAA criteria allow no exception: any automatic refresh or redirect that the user did not ask for interrupts them and changes context without their request.

This rule complements `meta-refresh`. Together they flag every timed refresh with a delay greater than 0. Instant redirects with a delay of `0` pass both.

## Who it affects

- Screen reader users, who lose their reading position when the page reloads.
- People with cognitive disabilities, who can be disoriented when content changes without their action.
- Anyone who leaves a tab open, such as a kiosk or a long-running dashboard, and returns to find their state reset.

## How to fix

Remove the timed refresh. Redirect instantly on the server, or let the user decide when to reload.

```html
<!-- Before: reloads after 24 hours -->
<meta http-equiv="refresh" content="86400">

<!-- After: no meta refresh; offer a user-triggered update instead -->
<p>New data may be available. <button type="button" id="reload">Refresh data</button></p>
```

```tsx
// After, in React: tell the user, and let them choose
{hasUpdate && (
  <div role="status">
    New data is available.{" "}
    <button type="button" onClick={() => refetch()}>Load it</button>
  </div>
)}
```

## Common false positives

- **Intentional long-running displays**, such as a wall-mounted status board, may deliberately reload once a day. That is a conscious AAA trade-off, not a bug, so document it and move on.

## How to verify

View the page source and search for `http-equiv="refresh"`. Confirm no tag remains, or that the only one has a delay of `0`. Re-run the audit and confirm neither `meta-refresh` nor this rule fires.

## References

- [Understanding SC 2.2.4 Interruptions](https://www.w3.org/WAI/WCAG22/Understanding/interruptions.html)
- [Understanding SC 3.2.5 Change on Request](https://www.w3.org/WAI/WCAG22/Understanding/change-on-request.html)
- [axe rule: meta-refresh-no-exceptions](https://dequeuniversity.com/rules/axe/4.13/meta-refresh-no-exceptions)
