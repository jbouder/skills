---
id: autocomplete-valid
title: A form field's autocomplete value is not a recognized token
wcag: [1.3.5]
level: AA
impact: serious
---

## The problem

The `autocomplete` attribute tells browsers and assistive tools what kind of personal data a field collects, such as a name, email, or postal code. Only a fixed list of tokens defined in the HTML specification is recognized. axe found a value that is not on that list, or that combines tokens in an invalid order, so browsers cannot autofill the field and tools that add icons or familiar labels to fields cannot identify it.

Common mistakes:

- Made-up values such as `autocomplete="nope"` or `autocomplete="no-fill"` used to try to turn off autofill.
- Plausible-sounding names that are not tokens: `zip` (use `postal-code`), `phone` (use `tel`), `first-name` (use `given-name`), `last-name` (use `family-name`), `mail` (use `email`).
- Qualifiers on the wrong token: `work` and `home` only go with `tel`, `email`, and related fields, so `work name` is invalid.

The valid order is: optional `section-*` name, optional `shipping` or `billing`, optional `home`/`work`/`mobile`/`fax`/`pager`, then the field token, then optional `webauthn`.

## Who it affects

- People with cognitive or memory disabilities, who benefit most from autofill and from tools that add recognizable icons to fields.
- People with motor disabilities, for whom typing is slow or painful.
- Everyone filling out forms on a phone.

## How to fix

Replace the value with the correct token from the HTML specification.

```html
<!-- Before -->
<input name="zip" autocomplete="zip">
<input name="phone" autocomplete="phone">
<input name="first" autocomplete="first-name">

<!-- After -->
<input name="zip" autocomplete="postal-code">
<input name="phone" type="tel" autocomplete="tel">
<input name="first" autocomplete="given-name">
```

```tsx
<input name="email" type="email" autoComplete="email" />
<input name="shipZip" autoComplete="shipping postal-code" />
<input name="otp" inputMode="numeric" autoComplete="one-time-code" />
```

To stop autofill on a field that is not personal data, use `autocomplete="off"`. For a new-password field, use `autocomplete="new-password"`, which also stops browsers from filling the saved password.

## Common false positives

- **Values axe deliberately ignores**, such as `text`, `pronouns`, `gender`, `message`, and `content`, appear as needs review. Check whether a standard token fits; if not, the result can be dismissed.
- **Disabled and read-only fields** are not checked.

## How to verify

Inspect each flagged field and compare its value against the autofill token list in the HTML specification. Fill the form in Chrome or Safari with a saved profile and confirm the fields autofill correctly. Re-run the audit and confirm the rule no longer fires.

## References

- [Understanding SC 1.3.5 Identify Input Purpose](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html)
- [MDN: autocomplete attribute values](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)
- [axe rule: autocomplete-valid](https://dequeuniversity.com/rules/axe/4.13/autocomplete-valid)
