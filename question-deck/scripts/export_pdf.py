#!/usr/bin/env python3
"""Export a question deck, with its saved answers and notes, as a PDF of slide screenshots.

Usage:
  uv run --no-project --with playwright --with img2pdf \\
    python3 export_pdf.py <deck.html> <notes.json> <qstatus.json> <out.pdf> \\
      [--names names.json] [--shots <dir>] [--dark] [--first-variant-only]

<deck.html>    the full page or the claude.ai fragment (the file `Artifact` read saves).
<notes.json>   the `notes` collection, from `ArtifactData` list with `out_dir`.
<qstatus.json> the `qstatus` collection, saved the same way. Pass an empty file or `[]` if none.
--names        optional JSON object mapping a person id (the `by` field) to a display name.
               Without it, threads show "Someone", because names resolve only in a viewer.

The script loads the deck in Chrome with a stub `window.claude` that serves those documents,
hides the controls that mean nothing on paper (top bar pinning, composers, navigation, export
buttons), screenshots every slide full height at 2x in the deck's order, and joins them into one
PDF at 11 in wide. Sections that compare variants are captured once per variant, since each
variant has its own questions, unless --first-variant-only is passed.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

import img2pdf
from playwright.sync_api import sync_playwright

PRINT_CSS = """
.bar { position: static !important; }
.progress, .slidenav, .composer, .howto, .sum-tools, .msg .del, .fnotes, .toast, #db-status { display: none !important; }
.slide.active, .card, .order button, .msg { animation: none !important; }
"""


def docs(path: str) -> list[dict]:
    """Accept the shapes a saved collection listing can take and return [{id, ...fields}]."""
    p = Path(path)
    if not p.exists() or not p.read_text(encoding="utf-8").strip():
        return []
    raw = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        for key in ("docs", "documents", "items", "results"):
            if isinstance(raw.get(key), list):
                raw = raw[key]
                break
        else:
            raw = [{"id": k, **v} for k, v in raw.items() if isinstance(v, dict)]
    out = []
    for d in raw:
        if not isinstance(d, dict):
            continue
        did = d.get("id") or d.get("doc_id") or d.get("docId") or str(d.get("path", "")).split("/")[-1]
        fields = d.get("data") if isinstance(d.get("data"), dict) else {k: v for k, v in d.items() if k not in ("id", "doc_id", "docId", "path")}
        out.append({"id": did, **fields})
    return out


def stub(notes: list, qstatus: list, names: dict) -> str:
    return (
        "<script>(function(){var C={notes:" + json.dumps(notes) + ",qstatus:" + json.dumps(qstatus) + "};"
        "var N=" + json.dumps(names) + ";"
        "function snap(n){return{docs:C[n].map(function(d){var x=Object.assign({},d);delete x.id;"
        "return{id:d.id,data:function(){return x;}};}),metadata:{fromCache:false}};}"
        "var db={collection:function(n){return{onSnapshot:function(cb){setTimeout(function(){cb(snap(n));});return function(){};},"
        "add:async function(){return{id:'x'};}};},doc:function(){return{set:async function(){},delete:async function(){}};}};"
        "var user={id:async function(){return 'export';},can:async function(){return false;},canEdit:async function(){return false;},"
        "profiles:async function(ids){var o={};ids.forEach(function(i){o[i]={name:N[i]||''};});return o;}};"
        "window.claude={use:async function(k){return k==='db'?db:k==='user'?user:null;}};})();</script>"
        "<style>" + PRINT_CSS + "</style>\n"
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("deck")
    ap.add_argument("notes")
    ap.add_argument("qstatus")
    ap.add_argument("out")
    ap.add_argument("--names")
    ap.add_argument("--shots", help="keep the PNGs in this directory")
    ap.add_argument("--dark", action="store_true", help="capture the dark theme")
    ap.add_argument("--first-variant-only", action="store_true")
    a = ap.parse_args()

    notes, qstatus = docs(a.notes), docs(a.qstatus)
    names = json.loads(Path(a.names).read_text(encoding="utf-8")) if a.names else {}
    html = Path(a.deck).read_text(encoding="utf-8")
    shots = Path(a.shots or tempfile.mkdtemp(prefix="question-deck-shots-"))
    shots.mkdir(parents=True, exist_ok=True)
    page_file = shots / "page.html"
    page_file.write_text(stub(notes, qstatus, names) + html, encoding="utf-8")

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome")
        except Exception:
            browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=2,
                                color_scheme="dark" if a.dark else "light")
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(page_file.as_uri())
        page.wait_for_function("window.__deck", timeout=10000)
        page.wait_for_timeout(800)
        page.evaluate("document.fonts.ready")
        deck = page.evaluate("({slides: __deck.slides, variants: __deck.variants, lanes: __deck.lanes})")
        files, labels = [], []
        for sid in deck["slides"]:
            vs = deck["variants"] if sid in deck["lanes"] else [None]
            if a.first_variant_only:
                vs = vs[:1]
            for v in vs:
                if v:
                    page.evaluate(f"__deck.setVariant({json.dumps(v)})")
                page.evaluate(f"__deck.go({json.dumps(sid)})")
                page.wait_for_timeout(500)
                label = sid + (f"-{v}" if v else "")
                f = shots / f"{len(files) + 1:02d}-{label}.png"
                page.screenshot(path=str(f), full_page=True)
                files.append(str(f))
                labels.append(label)
        counted = page.evaluate("document.getElementById('qcount').textContent")
        browser.close()

    layout = img2pdf.get_layout_fun((img2pdf.in_to_pt(11), None))
    Path(a.out).write_bytes(img2pdf.convert(files, layout_fun=layout))
    print(f"wrote {a.out}: {len(files)} pages ({', '.join(labels)})")
    print(f"loaded {len(notes)} notes and {len(qstatus)} status docs; the deck reads: {counted}")
    if notes and not names:
        print("note: no --names map, so threads show 'Someone'", file=sys.stderr)
    if errors:
        print("page errors:", *errors, sep="\n  ", file=sys.stderr)


if __name__ == "__main__":
    main()
