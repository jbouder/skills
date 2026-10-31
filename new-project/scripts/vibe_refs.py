"""Maintain the --vibe templates: references <-> a real scaffold.

The vibe references (references/vibe-{config,app,tests,ci,docs}.md and
assets/agents-vibe.md) are generated from a working project, never edited by
hand. To change them:

  1. Scaffold a project from the current references (or start from one):
       python3 -I scripts/vibe_refs.py scaffold /tmp/vibe/skiff
  2. Make the change there, install (bun install, the shadcn add, the CSP
     hash: SKILL.md Step V3) and run every check in SKILL.md Step V4.
  3. Regenerate the references from it:
       python3 -I scripts/vibe_refs.py extract /tmp/vibe/skiff
  4. Prove the round trip: scaffold a second project under another name,
     install it, and run Step V4 there too.

`scaffold` and `extract` use the same sample values (SAMPLE below, or
--name/--title/... to override), so a project scaffolded with the defaults
extracts back to placeholders exactly. Every file the project has must land
in a reference (or be one the CLI makes); `extract` fails otherwise.
"""

import argparse
import base64
import hashlib
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent

SAMPLE = {
    "PROJECT_NAME": "skiff",
    "PROJECT_TITLE": "Skiff",
    "DESCRIPTION": "A quick little app that runs on Cloudflare.",
    "GITHUB_OWNER": "jbouder",
    "AUTHOR": "Johnny Bouder",
    "YEAR": "2026",
    "BUN_VERSION": "1.3.14",
}

GROUPS = {
    "vibe-config.md": (
        "Root configuration and static files",
        [
            ".gitignore", "package.json", "biome.json", "components.json",
            "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json",
            "tsconfig.worker.json", "vite.config.ts", "vitest.config.ts",
            "playwright.config.ts", "knip.jsonc", "wrangler.jsonc",
            "build-info.ts", "index.html", "public/_headers",
            "public/favicon.svg", "public/site.webmanifest",
        ],
    ),
    "vibe-app.md": (
        "Shared code, the Worker and the app",
        [
            "shared/api.ts", "shared/version.ts",
            "worker/index.ts", "worker/log.ts",
            "src/main.tsx", "src/App.tsx", "src/index.css",
            "src/lib/utils.ts", "src/lib/themes.ts", "src/lib/motion-tokens.ts",
            "src/lib/motion.ts", "src/lib/router.ts", "src/lib/api.ts",
            "src/providers/MotionProvider.tsx", "src/providers/ThemeProvider.tsx",
            "src/hooks/usePageTitle.ts",
            "src/components/AppShell.tsx", "src/components/AppHeader.tsx",
            "src/components/Mark.tsx", "src/components/ButtonLink.tsx",
            "src/components/PreferencesMenu.tsx",
            "src/pages/HomePage.tsx", "src/pages/HelpPage.tsx",
            "src/pages/NotFoundPage.tsx",
        ],
    ),
    "vibe-tests.md": (
        "Unit tests (Vitest in workerd) and browser tests (Playwright + axe)",
        [
            "test/tsconfig.json", "test/raw.d.ts", "test/api.test.ts",
            "test/headers.test.ts", "test/themes.test.ts",
            "test/motion-tokens.test.ts", "test/workflows.test.ts",
            "e2e/tsconfig.json", "e2e/fixtures.ts", "e2e/app.spec.ts",
            "e2e/a11y.spec.ts", "e2e/reflow.spec.ts", "e2e/motion.spec.ts",
        ],
    ),
    "vibe-ci.md": (
        "GitHub workflows and repository scripts",
        [
            ".github/workflows/ci.yml", ".github/workflows/codeql.yml",
            ".github/workflows/deploy.yml", ".github/workflows/preview.yml",
            ".github/workflows/release.yml", ".github/scripts/preview-comment.sh",
            ".github/dependabot.yml", ".github/pull_request_template.md",
            "scripts/budget.ts", "scripts/licenses.ts",
        ],
    ),
    "vibe-docs.md": (
        "README, contributor and policy files, and docs/",
        [
            "README.md", "CONTRIBUTING.md", "CHANGELOG.md", "SECURITY.md",
            "ACCESSIBILITY.md", "LICENSE", "CLAUDE.md",
            "docs/architecture.md", "docs/design.md", "docs/security.md",
            "docs/self-hosting.md",
        ],
    ),
}
AGENTS = ("AGENTS.md", "assets/agents-vibe.md")

# Made by tools, not the references: shadcn's CLI, bun, wrangler, builds.
GENERATED = re.compile(
    r"^(src/components/ui/|bun\.lock$|worker-configuration\.d\.ts$|\.DS_Store$)"
)
SKIP_DIRS = {"node_modules", "dist", ".git", ".wrangler", "test-results",
             "playwright-report", "coverage"}

LANG = {
    ".ts": "ts", ".tsx": "tsx", ".json": "json", ".jsonc": "jsonc",
    ".css": "css", ".html": "html", ".svg": "svg", ".yml": "yaml",
    ".sh": "bash", ".md": "markdown", ".webmanifest": "json",
}

HEADER = """# Vibe Project: {title}

Use these exact file contents when scaffolding a `--vibe` project. Paths are
relative to `$TARGET_DIR`. Replace every placeholder (the table is in
SKILL.md's Pre-flight) before writing; `{{{{THEME_SCRIPT_HASH}}}}` is filled in
after `index.html` is written (SKILL.md, Step V3). These files were generated
from a scaffold that passed every check in CI (`scripts/vibe_refs.py`); do not
"improve" them while scaffolding.

---

"""

SECTION = re.compile(r"^## `([^`]+)`\n\n(`{3,4})[a-z]*\n(.*?)\n\2\n", re.S | re.M)


def theme_hash(html: str) -> str:
    script = re.search(r"<script>([\s\S]*?)</script>", html).group(1)
    return base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()


def to_placeholders(text: str, values: dict[str, str], csp_hash: str) -> str:
    subs = [
        (f"Copyright (c) {values['YEAR']} {values['AUTHOR']}",
         "Copyright (c) {{YEAR}} {{AUTHOR}}"),
        (f"{values['GITHUB_OWNER']}/{values['PROJECT_NAME']}",
         "{{GITHUB_OWNER}}/{{PROJECT_NAME}}"),
        (values["DESCRIPTION"], "{{DESCRIPTION}}"),
        (f'"packageManager": "bun@{values["BUN_VERSION"]}"',
         '"packageManager": "bun@{{BUN_VERSION}}"'),
        (csp_hash, "{{THEME_SCRIPT_HASH}}"),
        (values["PROJECT_TITLE"], "{{PROJECT_TITLE}}"),
        (values["PROJECT_NAME"], "{{PROJECT_NAME}}"),
    ]
    for old, new in subs:
        text = text.replace(old, new)
    return text


def extract(project: Path, values: dict[str, str]) -> None:
    csp_hash = theme_hash((project / "index.html").read_text())
    written = set()

    def render(path: str) -> str:
        text = to_placeholders((project / path).read_text(), values, csp_hash)
        for word in (values["PROJECT_NAME"], values["PROJECT_TITLE"]):
            if re.search(re.escape(word), text, re.I):
                sys.exit(f"{path}: '{word}' left after substitution; "
                         "pick sample values that appear nowhere else")
        written.add(path)
        return text

    for name, (title, paths) in GROUPS.items():
        sections = []
        for path in paths:
            text = render(path)
            lang = LANG.get(Path(path).suffix, "")
            fence = "````" if "```" in text else "```"
            sections.append(f"## `{path}`\n\n{fence}{lang}\n{text.rstrip()}\n{fence}\n")
        (SKILL / "references" / name).write_text(
            HEADER.format(title=title) + "\n---\n\n".join(sections))
        print(f"references/{name}: {len(paths)} files")
    (SKILL / AGENTS[1]).write_text(render(AGENTS[0]))
    print(AGENTS[1])

    missing = []
    for f in sorted(project.rglob("*")):
        rel = f.relative_to(project)
        if f.is_dir() or set(rel.parts) & SKIP_DIRS:
            continue
        path = rel.as_posix()
        if not GENERATED.match(path) and path not in written:
            missing.append(path)
    if missing:
        sys.exit("in no reference (add each to GROUPS, or delete it): "
                 + ", ".join(missing))


def scaffold(target: Path, values: dict[str, str]) -> None:
    def fill(text: str) -> str:
        for key, value in values.items():
            text = text.replace("{{" + key + "}}", value)
        return text

    count = 0
    for name in GROUPS:
        for path, _fence, body in SECTION.findall((SKILL / "references" / name).read_text()):
            out = target / path
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(fill(body) + "\n")
            count += 1
    (target / AGENTS[0]).write_text(fill((SKILL / AGENTS[1]).read_text()))
    print(f"wrote {count + 1} files to {target}; next: SKILL.md Steps V3 and V4")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["extract", "scaffold"])
    parser.add_argument("project", type=Path)
    for key, value in SAMPLE.items():
        parser.add_argument(f"--{key.lower().replace('_', '-')}", default=value)
    args = parser.parse_args()
    values = {key: getattr(args, key.lower()) for key in SAMPLE}
    if args.command == "extract":
        extract(args.project, values)
    else:
        args.project.mkdir(parents=True, exist_ok=True)
        scaffold(args.project, values)


if __name__ == "__main__":
    main()
