# Writing enrichment.json

The scanner finds problems. Enrichment is where you explain them for this specific site, so a developer can read one issue and know exactly what is wrong, where to change it, and what to change it to. The generic rule files in `references/rules/` are the fallback the report shows when you have not written anything. Your job is to beat them by using the evidence in the digest.

Write `<out>/enrichment.json`, then run `build-report.mjs`. Every field is optional; unknown issue ids are reported by the builder.

## Shape

```json
{
  "title": "Accessibility audit: example.com",
  "summary": "Markdown. 2 to 4 sentences: the overall state, the one or two root causes behind most failures, and what to do first.",
  "plan": [
    {
      "title": "Give the icon buttons in the site header accessible names",
      "issues": ["V-e283385d67"],
      "why": "Markdown. One or two sentences: why this is first (impact x reach), and that it is one shared component."
    }
  ],
  "issues": {
    "V-e283385d67": {
      "title": "Icon-only button in the header has no name",
      "explanation": "Markdown. What is wrong with THESE elements, in plain words, quoting the real markup or values.",
      "where": "Markdown. Where the fix most likely lives: the shared component, the CSS token, the template. Say it is an inference.",
      "fix": "Markdown with ```<lang> before / ```<lang> after fences built from the real element.",
      "verify": "Markdown. How to confirm the fix for this site, one or two steps.",
      "effort": "small | medium | large",
      "verdict": "likely-issue | likely-fine | unsure  (review items only)"
    }
  },
  "pages": {
    "p1": "One sentence about this page's state, e.g. 'Clean apart from the shared header issues.'"
  }
}
```

## Quality bar

- **Name the actual element and values.** Not "buttons must have discernible text" but "the 16 by 16 px `<button class=\"icon-btn\">` at the right end of the header has no text, `aria-label` or `title`, so screen readers announce only 'button'."
- **Before/after from the real markup.** Take the `html` from the digest as the before block, and write the corrected version as the after block. Use the stack the markup suggests (React class names, Tailwind utilities, Angular attributes). When the source framework is unknown, give HTML and say how it maps.
- **Infer the source, carefully.** An issue on every page with the same shape is almost always one shared component or a CSS token. Say "likely" and why ("same markup on all 6 pages, inside `<header>`").
- **Group root causes in the plan.** If three issues come from the same header component, make that one plan step listing all three ids. Order steps by impact times pages affected, then effort. Five to seven steps at most.
- **Contrast:** the report already shows the measured colors and a suggested passing color. In the fix, show the token or CSS rule change. Say whether the same color is used elsewhere.
- **Review items:** look at the evidence and give a `verdict`. For example, a contrast "could not determine background" on a nav link over a plain white header is `likely-fine`. Say what a person should check.
- **Heuristic checks** (focus-visible, focus-not-obscured, keyboard-trap, reflow): name the CSS that probably causes it (`outline: none`, a fixed-position banner, a fixed width) and the fix.
- **Do not invent facts.** If you cannot tell what an image shows, write the fix with a placeholder alt text and say the team must write the real one. Never claim a fix was tested.
- **Plain language.** Short sentences, American spelling, no jargon without a gloss. Expand acronyms the first time.

## Scale

For large scans, enrich every violation group, all critical and serious first. For review groups, enrich at least the ones with the most instances. If there are more than about 40 groups, write the top 40 by leverage in full and give the rest a `title` and short `explanation` only.
