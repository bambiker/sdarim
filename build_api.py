#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rebuild the API/ folder from sdarim.json.

Run from the repository root after every change to sdarim.json:

    python3 build_api.py           # rewrite API/ files that are wrong or missing
    python3 build_api.py --check   # only report differences, exit 1 if any

Files written (spaces in book names become underscores):
    API/chapter_<verse>_<chapter>_<book>.json   one verse, by chapter numbering
    API/chapter_<chapter>_<book>.json           all verses of a chapter
    API/seder_<verse>_<seder>_<book>.json       one verse, by seder numbering
    API/seder_<seder>_<book>.json               all verses of a seder
    API/sedarim.json                            index of all sedarim: where each starts and ends
    API/map.json                                chapter <-> seder location of every verse, no text
It also writes the static pages made by build_pages.py (seder/, perek/, parasha/, book/,
sitemap.xml, robots.txt, llms.txt).
"""
import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_pages import GENERATED_DIRS, build_pages  # noqa: E402

ROOT = os.path.dirname(os.path.abspath(__file__))
API = os.path.join(ROOT, 'API')
KEEP = {'book_names.json'}


def name(*parts):
    return '_'.join(parts).replace(' ', '_') + '.json'


GEMATRIA = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
            'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
            'ק': 100, 'ר': 200}


def number(hebrew):
    return sum(GEMATRIA[c] for c in hebrew)


def location(v):
    return {'book': v['bookchapter'], 'chapter': v['chapter'], 'verse': v['versechapter'],
            'chapter_number': number(v['chapter']), 'verse_number': number(v['versechapter'])}


def sedarim_index(verses):
    index = []
    for v in verses:
        if not index or (index[-1]['book'], index[-1]['seder']) != (v['bookseder'], v['seder']):
            index.append({'book': v['bookseder'], 'seder': v['seder'], 'seder_number': number(v['seder']),
                          'start': location(v), 'end': None, 'verses': 0, 'parashot': []})
        seder = index[-1]
        seder['end'] = location(v)
        seder['verses'] += 1
        if v.get('parasha') and v['parasha'] not in seder['parashot']:
            seder['parashot'].append(v['parasha'])
    return index


MAP_FIELDS = ['bookchapter', 'chapter', 'versechapter', 'bookseder', 'seder', 'verseseder']


def verse_map(verses):
    # one verse per line, without the text, so the file stays small (about 1.3MB)
    rows = [json.dumps([v[k] for k in MAP_FIELDS], ensure_ascii=False, separators=(',', ':')) for v in verses]
    return ('{"fields":' + json.dumps(MAP_FIELDS, separators=(',', ':')) + ',\n"verses":[\n'
            + ',\n'.join(rows) + '\n]}\n')


def expected_files(verses):
    files = {}
    chapters = defaultdict(list)
    seders = defaultdict(list)
    for v in verses:
        files[name('chapter', v['versechapter'], v['chapter'], v['bookchapter'])] = v
        files[name('seder', v['verseseder'], v['seder'], v['bookseder'])] = v
        chapters[name('chapter', v['chapter'], v['bookchapter'])].append(v)
        seders[name('seder', v['seder'], v['bookseder'])].append(v)
    files.update(chapters)
    files.update(seders)
    files['sedarim.json'] = sedarim_index(verses)
    files['map.json'] = verse_map(verses)
    return files


def sync(files, check_only):
    """Write {path relative to ROOT: content}; return how many were wrong or missing."""
    written = 0
    for fname, content in files.items():
        path = os.path.join(ROOT, fname)
        text = content if isinstance(content, str) else json.dumps(content, indent=4, ensure_ascii=False)
        if os.path.exists(path):
            with open(path, encoding='utf-8') as f:
                if f.read() == text:
                    continue
        written += 1
        if check_only:
            print('wrong or missing:', fname)
        else:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(text)
    return written


def remove_stale(stale, check_only):
    for fname in stale:
        if check_only:
            print('not in sdarim.json:', fname)
        else:
            os.remove(os.path.join(ROOT, fname))


def main():
    check_only = '--check' in sys.argv
    with open(os.path.join(ROOT, 'sdarim.json'), encoding='utf-8-sig') as f:
        verses = json.load(f)['seder']

    api_files = expected_files(verses)
    files = {'API/' + name: content for name, content in api_files.items()}
    files.update(build_pages(verses, api_files['sedarim.json']))
    written = sync(files, check_only)

    stale = ['API/' + name for name in sorted(set(os.listdir(API)) - set(api_files) - KEEP)]
    for folder in GENERATED_DIRS:
        for dirpath, _, names in os.walk(os.path.join(ROOT, folder)):
            for name in names:
                rel = os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, '/')
                if rel not in files:
                    stale.append(rel)
    remove_stale(stale, check_only)

    verb = 'to fix' if check_only else 'fixed'
    print(f'{len(files)} files expected, {written} {verb}, {len(stale)} stale')
    if check_only and (written or stale):
        sys.exit(1)


if __name__ == '__main__':
    main()
