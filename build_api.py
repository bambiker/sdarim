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
"""
import json
import os
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__))
API = os.path.join(ROOT, 'API')
KEEP = {'book_names.json'}


def name(*parts):
    return '_'.join(parts).replace(' ', '_') + '.json'


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
    return files


def main():
    check_only = '--check' in sys.argv
    with open(os.path.join(ROOT, 'sdarim.json'), encoding='utf-8-sig') as f:
        verses = json.load(f)['seder']

    files = expected_files(verses)
    written = 0
    for fname, content in files.items():
        path = os.path.join(API, fname)
        text = json.dumps(content, indent=4, ensure_ascii=False)
        if os.path.exists(path):
            with open(path, encoding='utf-8') as f:
                if f.read() == text:
                    continue
        written += 1
        if check_only:
            print('wrong or missing:', fname)
        else:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(text)

    stale = sorted(set(os.listdir(API)) - set(files) - KEEP)
    for fname in stale:
        if check_only:
            print('not in sdarim.json:', fname)
        else:
            os.remove(os.path.join(API, fname))

    verb = 'to fix' if check_only else 'fixed'
    print(f'{len(files)} files expected, {written} {verb}, {len(stale)} stale')
    if check_only and (written or stale):
        sys.exit(1)


if __name__ == '__main__':
    main()
