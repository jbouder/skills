#!/usr/bin/env python3
"""Check a talk-deck HTML file for the mistakes that are easy to make and tedious to spot.

Usage: python3 check_deck.py <deck.html> [--fragment]

--fragment  The file is a claude.ai artifact fragment (no doctype/html/head/body), so skip
            the full-document checks.

Exits 1 if any ERROR is found. WARN lines are worth reading but don't fail the check.
"""
import re
import shutil
import subprocess
import sys
import tempfile

BRITISH = {
    "behaviour": "behavior", "colour": "color", "favourite": "favorite", "flavour": "flavor",
    "honour": "honor", "labour": "labor", "neighbour": "neighbor", "centre": "center",
    "metre": "meter", "licence": "license", "defence": "defense", "catalogue": "catalog",
    "programme": "program", "grey": "gray", "whilst": "while", "amongst": "among",
    "travelling": "traveling", "cancelled": "canceled", "modelling": "modeling",
    "labelled": "labeled", "artefact": "artifact", "judgement": "judgment",
}
ISE = re.compile(r"\b([a-z]+)(isation|isations|ise|ised|ises|ising)\b", re.I)
ISE_OK = {"promise", "precise", "noise", "raise", "rise", "arise", "wise", "otherwise", "likewise",
          "clockwise", "advise", "revise", "devise", "comprise", "surprise", "exercise", "expertise",
          "concise", "premise", "enterprise", "compromise", "supervise", "advertise", "televise",
          "disguise", "franchise", "merchandise", "improvise", "excise", "incise", "praise", "poise",
          "cruise", "bruise", "guise", "paradise", "chastise", "despise", "demise", "anise",
          "reprise", "treatise", "mortise", "concise"}
ALLOWED_HOSTS = ("fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net/npm/")

errors, warns = [], []
def err(m): errors.append(m)
def warn(m): warns.append(m)


def visible_text(html):
    """Slide text the audience sees: drop scripts, styles, speaker notes and tags."""
    t = re.sub(r"<(script|style|aside)\b.*?</\1>", " ", html, flags=re.S | re.I)
    t = re.sub(r"<!--.*?-->", " ", t, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return t


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    path, fragment = sys.argv[1], "--fragment" in sys.argv
    s = open(path, encoding="utf-8").read()

    # Document shell (site pages must be complete documents).
    if not fragment:
        for needle, label in [("<!doctype html>", "doctype"), ('<html lang="en">', '<html lang="en">'),
                              ('<meta charset="utf-8">', "charset meta"), ('name="viewport"', "viewport meta"),
                              ("<title>", "<title>")]:
            if needle.lower() not in s.lower():
                err(f"missing {label}")
    if "prefers-color-scheme: dark" not in s and "prefers-color-scheme:dark" not in s:
        warn("no prefers-color-scheme dark block; pages should define light and dark tokens")

    # Slides: sequential ids, notes on each.
    slides = re.findall(r'<section class="slide[^"]*" id="s(\d+)"(.*?)</section>', s, re.S)
    ids = [int(i) for i, _ in slides]
    n = len(ids)
    if n == 0:
        err('no slides found (expected <section class="slide" id="s1">…)')
    elif ids != list(range(1, n + 1)):
        err(f"slide ids are not sequential s1..s{n}: {ids}")
    for i, body in slides:
        if "<aside" not in body:
            warn(f"slide s{i} has no <aside> speaker notes")
        if not re.search(r"<h[12][^>]*>", body):
            warn(f"slide s{i} has no h1/h2 heading")

    # Page counter and running order.
    m = re.search(r'id="pn">\s*1\s*/\s*(\d+)\s*<', s)
    if m and int(m.group(1)) != n:
        err(f'page counter says 1 / {m.group(1)} but there are {n} slides')
    for target in re.findall(r'data-goto="s(\d+)"', s):
        if not 1 <= int(target) <= n:
            err(f"running-order button points at s{target}, which doesn't exist")
    times = [int(x) for x in re.findall(r'data-goto="s\d+".*?<em>(\d+) min</em>', s)]
    if times:
        print(f"running order: {len(times)} parts, {sum(times)} min total")

    # "slide N" references in visible text and notes must point at real slides.
    for ref in re.findall(r"\bslide[ -](\d+)\b", re.sub(r"<script\b.*?</script>", " ", s, flags=re.S)):
        if not 1 <= int(ref) <= n:
            err(f'text refers to "slide {ref}" but there are only {n} slides')

    # Takeaways: exactly three lines people can repeat.
    take = re.search(r'<ol class="take">(.*?)</ol>', s, re.S)
    if take and take.group(1).count("<li") != 3:
        warn(f"takeaways list has {take.group(1).count('<li')} items; three is the target")

    # Links.
    for tag in re.findall(r"<a\b[^>]*>", s):
        href = re.search(r'href="([^"]*)"', tag)
        if href and re.match(r"https?://", href.group(1)):
            if 'target="_blank"' not in tag or "noopener" not in tag:
                err(f"external link should open in a new tab with rel=noopener: {href.group(1)}")

    # External resources.
    for url in re.findall(r'(?:src|href)="(https?://[^"]+)"', s):
        if re.search(r"<a\b[^>]*" + re.escape(url), s):
            continue  # ordinary links are fine
        if not any(h in url for h in ALLOWED_HOSTS):
            err(f"external resource from a host that isn't allowed: {url}")
    for url in re.findall(r'["\'](https://cdn\.jsdelivr\.net/npm/[^"\']+|https://cdnjs\.cloudflare\.com/[^"\']+)["\']', s):
        if not re.search(r"@\d+\.\d+\.\d+|/\d+\.\d+\.\d+/", url):
            err(f"CDN script isn't pinned to an exact version: {url}")

    # Spelling (American).
    text = visible_text(s) + " " + " ".join(re.findall(r"<aside>(.*?)</aside>", s, re.S))
    found = set()
    for brit, us in BRITISH.items():
        for m in re.finditer(r"\b(" + brit + r")(s|ed|ing|ful|ly)?\b", text, re.I):
            found.add(f"{m.group(0)} → {us}{(m.group(2) or '').lower()}")
    for m in ISE.finditer(text):
        word = m.group(0).lower()
        if word not in ISE_OK and not any(word.startswith(ok) for ok in ISE_OK) and len(m.group(1)) > 2:
            found.add(f"{m.group(0)} → American -ize/-ization spelling?")
    for f in sorted(found):
        warn(f"British spelling: {f}")

    # Presenter-facing instructions leaking onto slides.
    for phrase in ["say this", "tell the room", "dwell on", "pause here"]:
        if phrase in visible_text(s).lower():
            warn(f'visible slide text contains "{phrase}"; presenter guidance belongs in <aside>')

    # JavaScript syntax.
    scripts = re.findall(r"<script>(.*?)</script>", s, re.S)
    node = shutil.which("node")
    if scripts and node:
        for i, js in enumerate(scripts):
            with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as fh2:
                fh2.write(js)
            r = subprocess.run([node, "--check", fh2.name], capture_output=True, text=True)
            if r.returncode != 0:
                # --check rejects top-level return/await patterns that are fine inside our IIFE; retry wrapped.
                with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as fh3:
                    fh3.write("(async function(){\n" + js + "\n})();")
                r = subprocess.run([node, "--check", fh3.name], capture_output=True, text=True)
                if r.returncode != 0:
                    err(f"script #{i + 1} has a syntax error:\n{r.stderr.strip()[:600]}")
    elif scripts:
        warn("node not found; skipped the JavaScript syntax check")

    print(f"{path}: {n} slides")
    for w in warns:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    print("OK" if not errors else f"{len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
