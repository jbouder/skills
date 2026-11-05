#!/usr/bin/env python3
"""Make the claude.ai artifact fragment from a full decision-deck page.

Usage: python3 make_fragment.py <deck.html> <fragment.html>

The artifact host wraps the page in its own document, so the fragment keeps everything from
<title> through the last </script> and drops the doctype, html/head/body tags and the reset style.
Regenerate the fragment after every edit to the full page rather than editing it by hand.
"""
import re
import sys

if len(sys.argv) != 3:
    print(__doc__)
    sys.exit(2)
s = open(sys.argv[1], encoding="utf-8").read()
start, end = s.find("<title>"), s.rfind("</script>")
if start < 0 or end < 0:
    sys.exit("no <title> or </script> found")
frag = s[start:end + len("</script>")]
frag = re.sub(r"<style>body\{margin:0\}[^<]*</style>\n?", "", frag)
frag = re.sub(r"</head>\s*<body>\n?", "", frag)
frag = re.sub(r'<meta (charset|name="viewport")[^>]*>\n?', "", frag)
open(sys.argv[2], "w", encoding="utf-8").write(frag + "\n")
print(f"wrote {sys.argv[2]} ({len(frag):,} bytes)")
