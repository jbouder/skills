# Accessibility

{{PROJECT_NAME}} aims to conform to **WCAG 2.2 Level AA**, in light and dark
mode, from phone width up.

**Status:** not yet audited. Update this line after the first audit, with
its date and the level reached (for example "partially conforms, audited
2026-01-15").

## How it is built and checked

- UI components come from the Nebari design system, built on Base UI, which
  handles focus management, keyboard interaction and ARIA roles for menus,
  dialogs, selects and the like. Extend them; don't replace them with
  hand-rolled widgets.
- Colors are the theme's semantic tokens, not raw values, so text contrast
  holds in both modes.
- Component tests query by role and accessible name (Testing Library), so a
  control without a usable name fails its test.
- An audit of the running app: the `a11y-audit` Claude Code skill
  (`/a11y-audit <url>`) scans every page with axe-core at desktop and mobile
  widths and checks keyboard focus and reflow.

## Known exceptions

None recorded yet. When a gap is found and not fixed right away, list it here
with what it affects, the workaround if there is one, and its issue.

## Reporting a problem

Open an issue describing what you were doing, what you expected, and the
assistive technology, browser and operating system you used, if any. A
barrier that stops someone using a feature is a bug, not an enhancement.
