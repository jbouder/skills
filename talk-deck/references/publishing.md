# Publishing

A deck can go to two places, and many decks go to both: a static site (such as the OpenTeams artifacts site on GitHub Pages) and a claude.ai artifact. Ask which the user wants if it isn't clear.

## Static site (OpenTeams artifacts site)

If the working directory is the `openteams-ai/artifacts` repo, its `AGENTS.md` is the authority: slug, folder layout, the README row, the public-content check, the README check, commit conventions and confirming the page is live. Follow it rather than this summary. If you're elsewhere and the user wants it on that site, the `publish-artifact` skill handles it without a clone.

Key points that matter for decks:
- `<slug>/index.html`, a complete document (the template already is), relative paths for assets.
- The site is public. Read the whole deck before pushing: no customer names, internal hostnames, private links, unannounced plans. Speaker notes are published too; keep team-specific asides out of them.
- Pages must work in light and dark mode and at phone width (the template's phone layout stacks all slides).
- `localStorage` keys get the slug as a prefix.
- After pushing, wait for the Pages build and confirm a 200 and that the new content is in the served HTML.

## claude.ai artifact

The artifact host wraps the page itself, so publish a fragment: everything from `<title>` through the closing `</script>`, without the doctype, `<html>`, `<head>`, `<body>`, and without the site's reset style line. Keep a fragment copy in the scratchpad next to the site page and apply every edit to both. Diffing the two between `<title>` and `</script>` should show only the reset style line and the `</head>`/`<body>` tags.

When updating an artifact from an earlier conversation, read it first (the host requires that), build on what comes back, and strip the host's wrapper line before republishing.

Things that behave differently in the artifact:
- The host may block network downloads (model weights, large assets). A demo that downloads should show a clear "could not load" message; tell the user to present from the site version.
- Light/dark follows the system the same way, since the template uses `prefers-color-scheme`.

## Undoing a published change

If the user asks to undo something already pushed, revert the commit (don't rewrite pushed history) and republish the artifact from the matching earlier version. Double-check git commands before running them; a typo'd flag followed by `--amend` can rewrite the wrong commit.
