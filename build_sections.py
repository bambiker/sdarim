#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Write API/sections.json: the open and closed sections of the Tanakh (פרשיות פתוחות וסתומות), for the
statistics page (stats.html). They are taken from "Miqra according to the Masorah" (Sefaria's public
export, CC-BY-SA), which marks the end of each section with {פ} or {ס}; sdarim.json has only a few of them.

    python3 build_sections.py [--cache DIR]

Needs network access to raw.githubusercontent.com and storage.googleapis.com. Run it again only if the
verses of sdarim.json change; build_api.py does not need it. The file:
    {"<book>|<chapter>|<verse>": "פ" | "ס", ...}
the verses, by the chapter numbering, that end a section; the next verse begins an open (פ) or a
closed (ס) section.
"""
import json
import os
import re
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_commentary import fetch  # noqa: E402
from build_letters import BOOKS, EXPORT, hebrew_number  # noqa: E402

ROOT = os.path.dirname(os.path.abspath(__file__))


def main():
    cache = (sys.argv[sys.argv.index('--cache') + 1] if '--cache' in sys.argv
             else os.path.join(tempfile.gettempdir(), 'sefaria-cache'))
    os.makedirs(cache, exist_ok=True)
    with open(os.path.join(ROOT, 'sdarim.json'), encoding='utf-8-sig') as f:
        known = {(v['bookchapter'], v['chapter'], v['versechapter']) for v in json.load(f)['seder']}
    sections, missing = {}, 0
    for part, english, book in BOOKS:
        text = fetch(EXPORT.format(part, english.replace(' ', '%20')), cache)['text']
        for c, chapter in enumerate(text, 1):
            for n, verse in enumerate(chapter, 1):
                # the mark at the end of the verse: the section that ends here (a mark in the middle of a
                # verse, פסקא באמצע פסוק, does not end the verse's section)
                m = re.search(r'<span class="mam-spi-(pe|samekh)">[^<]*</span>(?:\s|<br>|&[a-z]+;)*$', verse)
                if not m:
                    continue
                key = (book, hebrew_number(c), hebrew_number(n))
                if key not in known:
                    missing += 1
                    continue
                sections['|'.join(key)] = 'פ' if m.group(1) == 'pe' else 'ס'
    with open(os.path.join(ROOT, 'API', 'sections.json'), 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False)
                                   for k, v in sections.items()) + '\n}\n')
    print(len(sections), 'sections ending,', sum(v == 'פ' for v in sections.values()), 'open,',
          sum(v == 'ס' for v in sections.values()), 'closed;', missing, 'verses not in sdarim.json')


if __name__ == '__main__':
    main()
