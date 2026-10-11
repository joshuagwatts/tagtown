#!/usr/bin/env python3
"""Bump ?v= cache-busters in index.html to a new build number (see AGENTS.md: LIMBO lesson)."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
idx = root / "index.html"
if len(sys.argv) < 2:
    print("usage: bump_build.py <N>"); sys.exit(1)
n = sys.argv[1]
s = idx.read_text()
s2 = re.sub(r'(\.(js|css))\?v=\d+', rf'\1?v={n}', s)
idx.write_text(s2)
print(f"bumped to v={n}")
