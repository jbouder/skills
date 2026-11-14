"""Turn a freshly written --vibe scaffold into its --beskar variant.

The vibe templates install stock shadcn components. With --beskar the same
project takes its components from the Beskar registry
(https://github.com/jbouder/beskar) instead. The templates stay as they are;
this script makes the few changes the swap needs, in two steps around the
`shadcn add` call (SKILL.md Step V3):

  python3 -I scripts/vibe_beskar.py prepare <dir>   # before `shadcn add`
  python3 -I scripts/vibe_beskar.py finish <dir>    # after `shadcn add`

`prepare` adds the @beskar registry to components.json and points the docs
at Beskar. `finish` tidies what `shadcn add @beskar/theme` merged into
src/index.css: the scaffold already defines the motion tokens and the
reduced-motion rule, so the copies the theme adds are removed.

Every edit must match. If the templates drift so that one does not, the
script stops and says which, so a broken variant is never scaffolded quietly.
"""

import argparse
import json
import re
import sys
from pathlib import Path

REGISTRY = "https://beskar.vibeproject.workers.dev/r/{name}.json"

# (file, stock text, Beskar text). Each stock text appears exactly once.
DOC_EDITS = [
    (
        "AGENTS.md",
        "`ui/` is stock shadcn, CLI-managed)",
        "`ui/` is Beskar, CLI-managed)",
    ),
    (
        "AGENTS.md",
        "· stock shadcn `base-lyra` on Base UI (`src/components/ui`, CLI-managed, do",
        "· Beskar, a shadcn `base-lyra` registry on Base UI (`src/components/ui`, CLI-managed, do",
    ),
    (
        "AGENTS.md",
        "`bunx shadcn@latest add <name>`); they are CLI-managed",
        "`bunx shadcn@latest add @beskar/<name>`, and see the `beskar-ui` skill in\n"
        "  `.claude/skills`); they are CLI-managed",
    ),
    (
        "README.md",
        "stock shadcn (base-lyra on\nBase UI)",
        "[Beskar](https://github.com/jbouder/beskar) (a shadcn base-lyra registry on\nBase UI)",
    ),
    (
        "docs/design.md",
        "square corners, stock shadcn\n`base-lyra` components on Base UI",
        "square corners, [Beskar](https://github.com/jbouder/beskar)\n"
        "`base-lyra` components on Base UI",
    ),
]

MOTION_TOKEN = re.compile(r"^\s*--(?:duration|ease)-[\w-]+\s*:")


def fail(message):
    sys.exit(f"vibe_beskar: {message}")


def prepare(root):
    path = root / "components.json"
    config = json.loads(path.read_text())
    config.setdefault("registries", {})["@beskar"] = REGISTRY
    path.write_text(json.dumps(config, indent=2) + "\n")

    for name, stock, beskar in DOC_EDITS:
        doc = root / name
        text = doc.read_text()
        if text.count(stock) != 1:
            fail(f"{name}: expected exactly one {stock!r}, found {text.count(stock)}")
        doc.write_text(text.replace(stock, beskar))
    print(f"prepared {root} for Beskar")


def block_end(text, open_brace):
    """Index just past the brace that closes the one at `open_brace`."""
    depth = 0
    for index in range(open_brace, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return index + 1
    fail("unbalanced braces in src/index.css")


def root_blocks(text):
    """(start, end) of the body of every top-level `:root { … }`."""
    spans = []
    for match in re.finditer(r"^:root \{", text, re.M):
        end = block_end(text, match.end() - 1)
        spans.append((match.end(), end - 1))
    return spans


def drop_duplicate_motion_tokens(text):
    """Remove motion tokens from the first :root when a later one has them.

    The scaffold keeps them in their own :root (test/themes.test.ts requires
    every token in the first :root to exist in .dark too).
    """
    spans = root_blocks(text)
    if len(spans) < 2:
        fail("src/index.css: expected the color :root and the motion :root")
    later = "".join(text[start:end] for start, end in spans[1:])
    start, end = spans[0]
    kept, removed = [], 0
    for line in text[start:end].split("\n"):
        name = line.strip().split(":")[0]
        if MOTION_TOKEN.match(line) and re.search(
            rf"^\s*{re.escape(name)}\s*:", later, re.M
        ):
            removed += 1
            continue
        kept.append(line)
    return text[:start] + "\n".join(kept) + text[end:], removed


def drop_duplicate_rules(text):
    """Inside each reduced-motion block, keep the first copy of each rule."""
    removed = 0
    position = 0
    marker = "@media (prefers-reduced-motion: reduce) {"
    while True:
        at = text.find(marker, position)
        if at == -1:
            return text, removed
        body_start = at + len(marker)
        body_end = block_end(text, body_start - 1) - 1
        body = text[body_start:body_end]

        rules, seen, cursor = [], set(), 0
        while True:
            brace = body.find("{", cursor)
            if brace == -1:
                rules.append(body[cursor:])
                break
            end = block_end(body, brace)
            rule = body[cursor:end]
            key = " ".join(rule.split())
            if key in seen:
                removed += 1
            else:
                seen.add(key)
                rules.append(rule)
            cursor = end
        text = text[:body_start] + "".join(rules) + text[body_end:]
        position = body_start


def finish(root):
    path = root / "src" / "index.css"
    text = path.read_text()
    if "--tone-violet" not in text:
        fail("src/index.css has no Beskar tokens: run `shadcn add @beskar/…` first")
    text, tokens = drop_duplicate_motion_tokens(text)
    text, rules = drop_duplicate_rules(text)
    path.write_text(text)
    print(f"removed {tokens} duplicate motion tokens and {rules} duplicate rules")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("step", choices=["prepare", "finish"])
    parser.add_argument("dir", type=Path)
    args = parser.parse_args()
    if not (args.dir / "components.json").is_file():
        fail(f"{args.dir} is not a vibe scaffold (no components.json)")
    {"prepare": prepare, "finish": finish}[args.step](args.dir)


if __name__ == "__main__":
    main()
