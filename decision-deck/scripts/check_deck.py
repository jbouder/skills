#!/usr/bin/env python3
"""Check a decision deck: design done, data valid, scoring sane, page rules followed.

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
RESERVED_SLIDES = {"start", "result", "details", "fit"}

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
         ("--panel-fg", "--panel-bg", 4.5), ("--panel-muted", "--panel-bg", 4.5),
         ("--good", "--good-soft", 4.5), ("--bad", "--bad-soft", 4.5), ("--warn", "--warn-soft", 4.5)]


def check_design(s, ndec):
    theme = re.search(r'<style id="theme">(.*?)</style>', s, re.S)
    if not theme:
        err('no <style id="theme"> block; the theme layer must stay separate from the engine')
        return
    t = theme.group(1)
    if "THEME: default" in t:
        err("theme is still the template default; design a theme for this project (references/design.md)")
    if re.search(r"Concept:\s*one line", t):
        err("theme has no concept line; say where the look comes from in the theme comment")
    if "data-placeholder" in s:
        err("hero visual is still the placeholder; draw one from the project's subject (references/design.md)")
    if "prefers-color-scheme: dark" not in t:
        err("theme has no prefers-color-scheme dark block")
    if ':root[data-theme="dark"]' not in t:
        warn('theme has no :root[data-theme="dark"] block; hosts that set the theme explicitly will show light colors')
    for i in range(1, ndec + 1):
        for suffix in ("", "-ink", "-soft"):
            if f"--d{i}{suffix}:" not in t.replace(" ", ""):
                err(f"theme defines no --d{i}{suffix} token for decision {i}")
        if f"--panel-d{i}:" not in t.replace(" ", ""):
            err(f"theme defines no --panel-d{i} token for decision {i}")
    if ndec > 3:
        warn("more than three decisions: add [data-d=\"4\"] rules to the engine CSS and tokens to the theme")

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
        for i in range(1, ndec + 1):
            for fg, bg, need in [(f"--d{i}-ink", f"--d{i}", 4.5), (f"--d{i}", "--surface", 3.0),
                                 (f"--panel-d{i}", "--panel-bg", 3.0)]:
                if fg in tk and bg in tk and contrast(tk[fg], tk[bg]) < need:
                    err(f"{mode}: {fg} on {bg} contrast is {contrast(tk[fg], tk[bg]):.2f}:1, needs {need}:1")


# ---------- Data ----------

def check_data(d):
    for k in ("id", "title"):
        if not d.get(k):
            err(f"data: missing {k}")
    if d.get("id") == "example":
        err('data: id is still "example"; use a short slug for this deck (it names exports and storage)')
    if d.get("id") and not re.fullmatch(r"[a-z0-9][a-z0-9-]*", d["id"]):
        err("data: id should be a lowercase slug")

    decs = d.get("decisions", [])
    dopts = {}
    for dec in decs:
        if dec.get("id") in dopts:
            err(f"data: duplicate decision id {dec.get('id')}")
        ids = [o.get("id") for o in dec.get("options", [])]
        if len(ids) < 2:
            err(f"data: decision {dec.get('id')} needs at least two options")
        if len(set(ids)) != len(ids):
            err(f"data: decision {dec.get('id')} has duplicate option ids")
        for o in dec.get("options", []):
            if not o.get("name"):
                err(f"data: option {dec.get('id')}.{o.get('id')} has no name")
            if not o.get("pros") or not o.get("cons"):
                warn(f"data: option {dec.get('id')}.{o.get('id')} should list both pros and cons")
        dopts[dec.get("id")] = set(ids)
        if not dec.get("label"):
            err(f"data: decision {dec.get('id')} has no label")

    fit = d.get("fit")
    if fit:
        r, c = fit.get("rows"), fit.get("cols")
        if r not in dopts or c not in dopts or r == c:
            err("data: fit.rows and fit.cols must name two different decisions")
        else:
            if [x["id"] for x in decs].index(c) > [x["id"] for x in decs].index(r):
                pass  # order doesn't matter for scoring; cols is ranked first
            for ro in dopts[r]:
                for co in dopts[c]:
                    cell = fit.get("cells", {}).get(ro, {}).get(co)
                    if not cell or cell[0] not in ("s", "a", "w") or len(cell) < 2:
                        err(f"data: fit cell {ro} x {co} is missing or not [\"s|a|w\", \"note\"]")

    areas = d.get("areas", [])
    slide_ids, qids, qmap = set(RESERVED_SLIDES) | {"ref-" + x for x in dopts}, set(), {}
    total_min, nq = 0, 0
    for a in areas:
        aid = a.get("id")
        if not aid or aid in slide_ids:
            err(f"data: area id {aid!r} is missing or clashes with another slide id")
        slide_ids.add(aid)
        for k in ("title", "heading"):
            if not a.get(k):
                err(f"data: area {aid} has no {k}")
        if not a.get("notes"):
            warn(f"data: area {aid} has no facilitator notes")
        total_min += a.get("minutes", 0) or 0
        if len(a.get("qs", [])) > 8:
            warn(f"data: area {aid} has {len(a['qs'])} questions; more than 8 rarely fits one discussion slot")
        for q in a.get("qs", []):
            nq += 1
            qid = q.get("id")
            if qid in qids:
                err(f"data: duplicate question id {qid}")
            qids.add(qid)
            qmap[qid] = q
            if not q.get("text", "").rstrip().endswith("?"):
                warn(f"data: question {qid} text should be a question ending in '?'")
            if q.get("multi") not in (None, "any", "mix"):
                err(f"data: question {qid} multi must be \"any\" or \"mix\"")
            vs = [o.get("v") for o in q.get("opts", [])]
            if len(vs) < 2 or len(set(vs)) != len(vs):
                err(f"data: question {qid} needs at least two options with unique v values")
            for o in q.get("opts", []):
                if o.get("x") and not q.get("multi"):
                    warn(f"data: {qid}.{o.get('v')} is exclusive (x) but the question is single-select")
                pts = o.get("pts", {})
                nonzero = False
                for did, m in pts.items():
                    if did not in dopts:
                        err(f"data: {qid}.{o.get('v')} scores unknown decision {did}")
                        continue
                    for oid, v in m.items():
                        if oid not in dopts[did]:
                            err(f"data: {qid}.{o.get('v')} scores unknown option {did}.{oid}")
                        if not isinstance(v, (int, float)):
                            err(f"data: {qid}.{o.get('v')} score for {did}.{oid} is not a number")
                        elif v > 0:
                            nonzero = True
                if nonzero and not o.get("why"):
                    warn(f"data: {qid}.{o.get('v')} adds points but has no why; the result can't explain it")
                if o.get("why") and not pts:
                    warn(f"data: {qid}.{o.get('v')} has a why but no points; it will never be shown")
    if nq == 0:
        err("data: no questions")
    if total_min:
        print(f"running order: {len(areas)} areas, {total_min} min of discussion")

    for f in d.get("flags", []):
        if not f.get("title") or not f.get("text") or not f.get("when"):
            err(f"data: flag {f.get('title')!r} needs title, text and when")
            continue
        for c in f["when"]:
            if "q" in c:
                q = qmap.get(c["q"])
                if not q:
                    err(f"data: flag {f['title']!r} tests unknown question {c['q']}")
                    continue
                vs = {o["v"] for o in q["opts"]}
                for key in ("is", "not"):
                    if key in c and c[key] not in vs:
                        err(f"data: flag {f['title']!r} tests {c['q']} for unknown value {c[key]}")
                for v in c.get("in", []):
                    if v not in vs:
                        err(f"data: flag {f['title']!r} tests {c['q']} for unknown value {v}")
            elif "top" in c:
                if c["top"] not in dopts:
                    err(f"data: flag {f['title']!r} tests unknown decision {c['top']}")
                    continue
                for key in ("is", "not"):
                    if key in c and c[key] not in dopts[c["top"]]:
                        err(f"data: flag {f['title']!r} tests {c['top']} for unknown option {c[key]}")
                for v in c.get("in", []):
                    if v not in dopts[c["top"]]:
                        err(f"data: flag {f['title']!r} tests {c['top']} for unknown option {v}")
            else:
                err(f"data: flag {f['title']!r} has a condition with neither q nor top")
        for ref in re.findall(r"\{top:([\w-]+)\}", f["text"]):
            if ref not in dopts:
                err(f"data: flag {f['title']!r} text refers to unknown decision {{top:{ref}}}")

    check_reach(d, decs, [q for a in areas for q in a.get("qs", [])])


def score(d, decs, picks):
    S = {x["id"]: {o["id"]: 0.0 for o in x["options"]} for x in decs}
    for q, o in picks:
        for did, m in o.get("pts", {}).items():
            for oid, v in m.items():
                if did in S and oid in S[did]:
                    S[did][oid] += v
    top = {did: max(S[did], key=lambda k: S[did][k]) for did in S}
    fit = d.get("fit")
    if fit and fit.get("rows") in S and fit.get("cols") in S:
        tc = top[fit["cols"]]
        for k in S[fit["rows"]]:
            cell = fit.get("cells", {}).get(k, {}).get(tc)
            if cell:
                S[fit["rows"]][k] += fit.get("bonus", {}).get(cell[0], 0)
        top[fit["rows"]] = max(S[fit["rows"]], key=lambda k: S[fit["rows"]][k])
    return S, top


def check_reach(d, decs, qs):
    """Each option should win when every answer leans its way. If it can't, the scoring buries it."""
    fit = d.get("fit") or {}
    byid = {x["id"]: x for x in decs}

    def margin(o, did, oid):
        m = o.get("pts", {}).get(did, {})
        others = [m.get(x["id"], 0) for x in byid[did]["options"] if x["id"] != oid]
        return m.get(oid, 0) - (max(others) if others else 0)

    for dec in decs:
        did = dec["id"]
        # A fit-bonus decision also depends on which option of the other decision leads, so try each.
        seconds = [(None, None)]
        if did == fit.get("rows") and fit.get("cols") in byid:
            seconds = [(fit["cols"], o["id"]) for o in byid[fit["cols"]]["options"]]
        for opt in dec["options"]:
            oid = opt["id"]
            for sd, so in seconds:
                picks = []
                for q in qs:
                    best = max(q.get("opts", [{}]), key=lambda o: (margin(o, did, oid), margin(o, sd, so) if sd else 0))
                    picks.append((q, best))
                S, top = score(d, decs, picks)
                if top.get(did) == oid:
                    break
            if top.get(did) != oid:
                warn(f"scoring: {dec.get('label', did)} option {opt.get('name', oid)!r} never comes out on top, "
                     f"even when every answer favors it (best case {S[did][oid]:+g} vs {S[did][top[did]]:+g} for {top[did]})")


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
        if title and title.group(1).strip() != data.get("title"):
            warn(f"<title> ({title.group(1).strip()!r}) differs from data title ({data.get('title')!r}); the page sets it at runtime, but the host reads the tag")
        check_design(s, len(data.get("decisions", [])))
        check_text(" ".join(strings(data)))

    for tag in re.findall(r"<a\b[^>]*>", s):
        href = re.search(r'href="([^"]*)"', tag)
        if href and re.match(r"https?://", href.group(1)) and ('target="_blank"' not in tag or "noopener" not in tag):
            err(f"external link should open in a new tab with rel=noopener: {href.group(1)}")
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
