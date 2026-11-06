#!/usr/bin/env python3
"""Export a decision deck, with the room's saved answers, as a PDF of slide screenshots.

Usage:
  uv run --no-project --with playwright --with img2pdf \\
    python3 export_pdf.py <deck.html> <answers.json> <out.pdf> [--shots <dir>] [--dark]

<deck.html> is the full page or the claude.ai fragment (the file `Artifact` read saves).
<answers.json> is the saved document from `ArtifactData` get with `out_dir`
(fields `answers`, `comments`, `notes`, `at`).

The script loads the deck in Chrome with a stub `window.claude` that serves those answers, hides
the controls that mean nothing on paper (top bar pinning, progress bar, slide navigation, comment
and edit links, the clear and export actions), screenshots every slide full height at 2x in the
deck's own order, and joins them into one PDF, one slide per page at 11 in wide. The pages are
the deck itself, so the PDF matches its design; the text is image, not selectable.
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
.progress, .slidenav, .panel-actions, .howto, .qc .linkbtn, .sum-head .linkbtn { display: none !important; }
body::before { display: none !important; }
.slide { min-height: 0 !important; }
.slide.active { animation: none !important; }
"""


def stub(saved: dict) -> str:
    # Any db.doc(...) path gets the saved document, so this works whatever collection the deck uses.
    return (
        "<script>window.__SAVED = " + json.dumps(saved) + ";"
        "window.claude = { use: async function (k) {"
        " if (k !== 'db') return null;"
        " return { doc: function () { return {"
        "  onSnapshot: function (cb) { cb({ exists: true, data: function () { return window.__SAVED; },"
        "   metadata: { fromCache: false, hasPendingWrites: false } }); return function () {}; },"
        "  set: async function () {} }; } }; } };</script>"
        "<style>" + PRINT_CSS + "</style>\n"
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("deck")
    ap.add_argument("answers")
    ap.add_argument("out")
    ap.add_argument("--shots", help="keep the PNGs in this directory")
    ap.add_argument("--dark", action="store_true", help="capture the dark theme")
    a = ap.parse_args()

    saved = json.loads(Path(a.answers).read_text(encoding="utf-8"))
    html = Path(a.deck).read_text(encoding="utf-8")
    shots = Path(a.shots or tempfile.mkdtemp(prefix="deck-shots-"))
    shots.mkdir(parents=True, exist_ok=True)
    # The stub must exist before the engine script runs, so it goes first in the document.
    page_file = shots / "page.html"
    page_file.write_text(stub(saved) + html, encoding="utf-8")
    expected = len(saved.get("answers") or {})

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
        try:
            page.wait_for_function(
                f"(document.getElementById('answer-count') || {{}}).textContent?.trim().startsWith('{expected} ')",
                timeout=10000,
            )
        except Exception:
            count = page.evaluate("(document.getElementById('answer-count') || {}).textContent")
            print(f"warning: answer count reads {count!r}, expected {expected} answers", file=sys.stderr)
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(1000)
        ids = page.eval_on_selector_all(".slide", "els => els.map(e => e.id)")
        files = []
        for i, sid in enumerate(ids, 1):
            page.evaluate(f"location.hash = {json.dumps(sid)}")
            page.wait_for_timeout(400)
            f = shots / f"{i:02d}-{sid}.png"
            page.screenshot(path=str(f), full_page=True)
            files.append(str(f))
        browser.close()

    layout = img2pdf.get_layout_fun((img2pdf.in_to_pt(11), None))
    Path(a.out).write_bytes(img2pdf.convert(files, layout_fun=layout))
    print(f"wrote {a.out}: {len(files)} slides ({', '.join(ids)})")
    if errors:
        print("page errors:", *errors, sep="\n  ", file=sys.stderr)


if __name__ == "__main__":
    main()
