#!/usr/bin/env python3
"""Check a question deck: design done, data valid, page rules followed.

Usage: python3 check_deck.py <deck.html> [--fragment]

--fragment  The file is a claude.ai artifact fragment (no doctype/html/head/body), so skip
            the full-document checks.

Exits 1 if any ERROR is found. WARN lines are worth reading but don't fail the check.
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile

BRITISH = {
    "behaviour": "behavior", "colour": "color", "favourite": "favorite", "honour": "honor",
    "labour": "labor", "neighbour": "neighbor", "centre": "center", "licence": "license",
    "defence": "defense", "catalogue": "catalog", "programme": "program", "grey": "gray",
    "whilst": "while", "amongst": "among", "towards": "toward", "learnt": "learned",
    "travelling": "traveling", "cancelled": "canceled", "modelling": "modeling",
    "labelled": "labeled", "artefact": "artifact", "judgement": "judgment", "fortnight": "two weeks",
}
ISE = re.compile(r"\b([a-z]+)(isation|isations|ise|ised|ises|ising)\b", re.I)
ISE_OK = ("promise", "precise", "noise", "raise", "rise", "arise", "wise", "otherwise", "likewise",
          "advise", "revise", "devise", "comprise", "surprise", "exercise", "expertise", "concise",
          "premise", "enterprise", "compromise", "supervise", "advertise", "disguise", "franchise",
          "merchandise", "improvise", "praise", "poise", "cruise", "bruise", "guise", "paradise",
          "despise", "demise", "reprise", "treatise")
ALLOWED_HOSTS = ("fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net/npm/")
RESERVED = {"start", "overview", "summary"}
FITS = {"same", "changes", "gap", "unknown"}
SLUG = re.compile(r"[a-z0-9][a-z0-9-]*")

errors, warns = [], []
def err(m): errors.append(m)
def warn(m): warns.append(m)


# ---------- Design ----------

def tokens(block):
    return {k: v.lower() for k, v in re.findall(r"(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b", block)}


def lum(hexv):
    h = hexv.lstrip("#")
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h[:3])
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


PAIRS = [("--ink", "--bg", 4.5), ("--ink", "--surface", 4.5), ("--muted", "--surface", 4.5),
         ("--muted", "--bg", 4.5), ("--accent", "--surface", 3.0), ("--accent-ink", "--accent", 4.5),
         ("--accent", "--accent-soft", 4.5), ("--alt", "--surface", 3.0), ("--alt-ink", "--alt", 4.5),
         ("--alt", "--alt-soft", 4.5), ("--panel-fg", "--panel-bg", 4.5), ("--panel-muted", "--panel-bg", 4.5),
         ("--good", "--good-soft", 4.5), ("--bad", "--bad-soft", 4.5), ("--warn", "--warn-soft", 4.5),
         ("--unk", "--unk-soft", 4.5)]
REQUIRED = ["--bg", "--surface", "--surface-2", "--ink", "--muted", "--rule", "--accent", "--accent-ink",
            "--accent-soft", "--alt", "--alt-ink", "--alt-soft", "--good", "--good-soft", "--bad", "--bad-soft",
            "--warn", "--warn-soft", "--unk", "--unk-soft", "--panel-bg", "--panel-fg", "--panel-muted"]


def check_design(s):
    theme = re.search(r'<style id="theme">(.*?)</style>', s, re.S)
    if not theme:
        err('no <style id="theme"> block; the theme layer must stay separate from the engine')
        return
    t = theme.group(1)
    if "THEME: default" in t:
        err("theme is still the template default; design a theme for this deck (references/design.md)")
    if not re.search(r"Concept:\s*\S", t) or re.search(r"Concept:\s*one line", t):
        err("theme has no concept line; say where the look comes from in the theme comment")
    if "data-placeholder" in s:
        err("hero visual is still the placeholder; draw one from the subject (references/design.md)")
    if "prefers-color-scheme: dark" not in t:
        err("theme has no prefers-color-scheme dark block")
    if ':root[data-theme="dark"]' not in t:
        warn('theme has no :root[data-theme="dark"] block; hosts that set the theme explicitly will show light colors')
    compact = t.replace(" ", "")
    for k in REQUIRED:
        if k + ":" not in compact:
            err(f"theme defines no {k} token")

    light_end = t.find("@media")
    light = tokens(t[:light_end if light_end > 0 else len(t)])
    dark_m = re.search(r':root\[data-theme="dark"\]\s*\{(.*?)\}', t, re.S)
    modes = [("light", light)]
    if dark_m:
        modes.append(("dark", {**light, **tokens(dark_m.group(1))}))
    for mode, tk in modes:
        for fg, bg, need in PAIRS:
            if fg in tk and bg in tk:
                c = contrast(tk[fg], tk[bg])
                if c < need:
                    err(f"{mode}: {fg} on {bg} contrast is {c:.2f}:1, needs {need}:1")


# ---------- Data ----------

def check_questions(qs, where, seen):
    if not isinstance(qs, list):
        err(f"data: {where}.questions must be a list")
        return
    for q in qs:
        qid = q.get("id")
        if not qid or not SLUG.fullmatch(qid):
            err(f"data: question in {where} needs a lowercase slug id (got {qid!r})")
        elif qid in seen:
            err(f"data: duplicate question id {qid} (in {where} and {seen[qid]}); ids are storage keys and must be unique across the deck")
        else:
            seen[qid] = where
        text = q.get("text", "")
        if not text:
            err(f"data: question {qid} has no text")
        elif not re.sub(r"<[^>]+>", "", text).rstrip().endswith("?"):
            warn(f"data: question {qid} doesn't end with a question mark")


def check_data(d):
    for k in ("id", "title"):
        if not d.get(k):
            err(f"data: missing {k}")
    if d.get("id") == "example":
        err('data: id is still "example"; use a short slug for this deck (it names exports and local storage)')
    if d.get("id") and not SLUG.fullmatch(d["id"]):
        err("data: id should be a lowercase slug")
    if not d.get("audience"):
        warn('data: no "audience"; questions will be titled "Questions for the room"')

    cmp = d.get("compare")
    vids = []
    if cmp:
        if not (cmp.get("baseline") or {}).get("name"):
            err("data: compare.baseline needs a name")
        vids = [v.get("id") for v in cmp.get("variants", [])]
        if not vids:
            err("data: compare has no variants")
        if len(set(vids)) != len(vids):
            err("data: compare has duplicate variant ids")
        for v in cmp.get("variants", []):
            if not v.get("id") or not SLUG.fullmatch(v["id"]):
                err(f"data: variant id {v.get('id')!r} should be a lowercase slug")
            if not v.get("name"):
                err(f"data: variant {v.get('id')} has no name")

    secs = d.get("sections", [])
    if not secs:
        err("data: no sections")
    sids, seen = set(), {}
    groups = {g.get("id") for g in d.get("groups", [])}
    for s in secs:
        sid = s.get("id")
        if not sid or not SLUG.fullmatch(sid) or "/" in sid:
            err(f"data: section id {sid!r} should be a lowercase slug")
        if sid in RESERVED:
            err(f"data: section id {sid!r} is reserved")
        if sid in sids:
            err(f"data: duplicate section id {sid}")
        sids.add(sid)
        if not s.get("title"):
            err(f"data: section {sid} has no title")
        if d.get("groups") and s.get("group") not in groups:
            err(f"data: section {sid} has group {s.get('group')!r}, which isn't in groups")
        layout = s.get("layout")
        variants = s.get("variants") or {}
        if layout and layout not in ("lanes", "cards", "plain"):
            err(f"data: section {sid} has unknown layout {layout!r}")
        if (layout in ("lanes", "cards") or variants) and not cmp:
            err(f"data: section {sid} compares variants but the deck has no compare block")
        for vk, vd in variants.items():
            if vk not in vids:
                err(f"data: section {sid} has variant {vk!r}, which isn't in compare.variants")
            if vd.get("fit") and vd["fit"] not in FITS:
                err(f"data: section {sid}.{vk} fit {vd['fit']!r} must be one of {sorted(FITS)}")
            check_questions(vd.get("questions", []), f"{sid}.{vk}", seen)
        if cmp and (layout or "lanes") == "lanes" and variants:
            missing = [v for v in vids if v not in variants]
            if missing:
                warn(f"data: section {sid} has no entry for {', '.join(missing)}; that lane will be empty")
        check_questions(s.get("questions", []), sid, seen)
        n = len(s.get("questions", [])) + sum(len(v.get("questions", [])) for v in variants.values())
        if n == 0 and not s.get("allowEmpty"):
            warn(f"data: section {sid} has no questions; fine for context, but say so or merge it")
        if n > 12:
            warn(f"data: section {sid} has {n} questions; split it so one slide stays answerable")

    ov = d.get("overview")
    if ov:
        for c in ov.get("cards", []):
            if c.get("variant") and c["variant"] not in vids:
                err(f"data: overview card {c.get('name')!r} points at unknown variant {c['variant']!r}")
        if ov.get("matrix") and not cmp:
            err("data: overview.matrix needs a compare block")
    if not seen:
        warn("data: the deck has no questions at all")


# ---------- Page rules ----------

def strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, list):
        for x in o:
            yield from strings(x)
    elif isinstance(o, dict):
        for x in o.values():
            yield from strings(x)


def check_text(text):
    found = set()
    for brit, us in BRITISH.items():
        for m in re.finditer(r"\b(" + brit + r")(s|ed|ing)?\b", text, re.I):
            found.add(f"{m.group(0)} -> {us}")
    for m in ISE.finditer(text):
        w = m.group(0).lower()
        if not w.startswith(ISE_OK) and len(m.group(1)) > 2:
            found.add(f"{m.group(0)} -> American -ize spelling?")
    for f in sorted(found):
        warn(f"spelling: {f}")
    if "—" in text:
        warn("text contains em dashes; use a period, a comma, or a new sentence")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    path, fragment = sys.argv[1], "--fragment" in sys.argv
    s = open(path, encoding="utf-8").read()

    if not fragment:
        for needle, label in [("<!doctype html>", "doctype"), ('<html lang="en">', '<html lang="en">'),
                              ('<meta charset="utf-8">', "charset meta"), ('name="viewport"', "viewport meta")]:
            if needle.lower() not in s.lower():
                err(f"missing {label}")
    elif "<!doctype" in s.lower() or "<body" in s.lower():
        err("fragment still has a doctype or body tag; regenerate it with make_fragment.py")
    if "<title>" not in s:
        err("missing <title>")

    m = re.search(r'<script type="application/json" id="deck-data">(.*?)</script>', s, re.S)
    data = None
    if not m:
        err('no <script type="application/json" id="deck-data"> block')
    else:
        try:
            data = json.loads(m.group(1))
        except json.JSONDecodeError as e:
            err(f"deck-data is not valid JSON: {e}")
    if data is not None:
        check_data(data)
        title = re.search(r"<title>(.*?)</title>", s, re.S)
        if title and title.group(1).strip().replace("&amp;", "&") != data.get("title"):
            warn(f"<title> ({title.group(1).strip()!r}) differs from data title ({data.get('title')!r}); the host reads the tag")
        check_text(" ".join(strings(data)))
    check_design(s)

    for tag in re.findall(r"<a\b[^>]*>", s):
        href = re.search(r'href="([^"]*)"', tag)
        if href and re.match(r"https?://", href.group(1)) and ('target="_blank"' not in tag or "noopener" not in tag):
            err(f"external link should open in a new tab with rel=noopener: {href.group(1)}")
    if data is not None:
        for txt in strings(data):
            for tag in re.findall(r"<a\b[^>]*>", txt):
                href = re.search(r'href="([^"]*)"', tag)
                if href and re.match(r"https?://", href.group(1)) and ('target="_blank"' not in tag or "noopener" not in tag):
                    err(f"external link in data should open in a new tab with rel=noopener: {href.group(1)}")
            if re.search(r"<script|\bon\w+\s*=", txt, re.I):
                err("data strings contain a script tag or inline event handler; keep data to markup only")
    for url in re.findall(r'(?:src|href)="(https?://[^"]+)"', s):
        if re.search(r"<a\b[^>]*" + re.escape(url), s):
            continue
        if not any(h in url for h in ALLOWED_HOSTS):
            err(f"external resource from a host that isn't allowed: {url}")
    for url in re.findall(r'["\'](https://cdn\.jsdelivr\.net/npm/[^"\']+|https://cdnjs\.cloudflare\.com/[^"\']+)["\']', s):
        if not re.search(r"@\d+\.\d+\.\d+|/\d+\.\d+\.\d+/", url):
            err(f"CDN script isn't pinned to an exact version: {url}")

    node = shutil.which("node")
    scripts = re.findall(r"<script>(.*?)</script>", s, re.S)
    if scripts and node:
        for i, js in enumerate(scripts):
            with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as fh:
                fh.write(js)
            r = subprocess.run([node, "--check", fh.name], capture_output=True, text=True)
            if r.returncode != 0:
                err(f"script #{i + 1} has a syntax error:\n{r.stderr.strip()[:600]}")
    elif scripts:
        warn("node not found; skipped the JavaScript syntax check")

    print(path)
    for w in warns:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    print("OK" if not errors else f"{len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
