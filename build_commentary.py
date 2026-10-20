#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build the commentaries shown when clicking a verse number, from Sefaria's public export
(https://github.com/Sefaria/Sefaria-Export), keeping only versions whose license allows reuse.

    python3 build_commentary.py [--cache DIR]

Needs network access to raw.githubusercontent.com and storage.googleapis.com. Run it again only to
pick up new texts from Sefaria; build_api.py does not need it. Writes:
    commentary/<book>/<seder>.json   commentaries of every verse of a seder, keyed by the seder's verse
    commentary/sources.json          the edition and license used for each commentator and book
"""
import hashlib
import html
import json
import os
import re
import shutil
import ssl
import sys
import tempfile
import urllib.request
from collections import OrderedDict
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'commentary')
BOOKS_JSON = 'https://raw.githubusercontent.com/Sefaria/Sefaria-Export/master/books.json'

# only versions with one of these licenses are used ("unknown", missing and non-commercial are not)
ALLOWED_LICENSES = {'Public Domain', 'CC0', 'CC-BY', 'CC-BY-SA'}
LICENSE_URLS = {'CC-BY': 'https://creativecommons.org/licenses/by/3.0/',
                'CC-BY-SA': 'https://creativecommons.org/licenses/by-sa/3.0/',
                'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/'}
LICENSE_HE = {'Public Domain': 'נחלת הכלל', 'CC0': 'CC0', 'CC-BY': 'CC-BY', 'CC-BY-SA': 'CC-BY-SA'}

# shown in this order
COMMENTATORS = [('Rashi', 'רש"י'), ('Ibn Ezra', 'אבן עזרא'), ('Radak', 'רד"ק'), ('Sforno', 'ספורנו'),
                ('Or HaChaim', 'אור החיים'), ('Ralbag', 'רלב"ג'), ('Malbim', 'מלבי"ם'),
                ('Metzudat David', 'מצודת דוד'), ('Metzudat Zion', 'מצודת ציון')]

# book names in sdarim.json (chapter division) -> Sefaria
BOOKS = OrderedDict(zip(
    ['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים', 'יהושע', 'שופטים', 'שמואל א', 'שמואל ב', 'מלכים א', 'מלכים ב',
     'ישעיהו', 'ירמיהו', 'יחזקאל', 'הושע', 'יואל', 'עמוס', 'עובדיה', 'יונה', 'מיכה', 'נחום', 'חבקוק', 'צפניה',
     'חגי', 'זכריה', 'מלאכי', 'תהילים', 'משלי', 'איוב', 'שיר השירים', 'רות', 'איכה', 'קהלת', 'אסתר', 'דניאל',
     'עזרא', 'נחמיה', 'דברי הימים א', 'דברי הימים ב'],
    ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel',
     'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
     'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job',
     'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah',
     'I Chronicles', 'II Chronicles']))

GEMATRIA = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
            'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
            'ק': 100, 'ר': 200}

SSL = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE') or None)


def number(hebrew):
    return sum(GEMATRIA[c] for c in hebrew)


def fetch(url, cache):
    path = os.path.join(cache, hashlib.md5(url.encode()).hexdigest() + '.json')
    if not os.path.exists(path):
        with urllib.request.urlopen(url, context=SSL, timeout=300) as r, open(path + '.tmp', 'wb') as f:
            shutil.copyfileobj(r, f)
        os.replace(path + '.tmp', path)
    with open(path, encoding='utf-8') as f:
        return json.load(f)


class Clean(HTMLParser):
    """Keep only simple formatting tags; drop footnotes, scripts and everything else (keeping its text)."""
    KEEP = {'b', 'strong', 'i', 'em', 'br', 'small', 'big', 'sup', 'sub'}
    DROP = {'script', 'style'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.stack, self.skip = [], [], 0

    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get('class') or ''
        dropping = tag in self.DROP or 'footnote' in cls
        self.stack.append((tag, dropping))
        if dropping or self.skip:
            self.skip += dropping
            return
        if tag in self.KEEP:
            self.out.append('<br>' if tag == 'br' else f'<{tag}>')

    def handle_startendtag(self, tag, attrs):
        if tag == 'br' and not self.skip:
            self.out.append('<br>')

    def handle_endtag(self, tag):
        while self.stack:
            t, dropping = self.stack.pop()
            if dropping:
                self.skip -= 1
            elif not self.skip and t in self.KEEP and t != 'br':
                self.out.append(f'</{t}>')
            if t == tag:
                break

    def handle_data(self, data):
        if not self.skip:
            self.out.append(html.escape(data, quote=False))


def clean(text):
    p = Clean()
    p.feed(text)
    p.close()
    return re.sub(r'\s+', ' ', ''.join(p.out)).strip()


def comment_count(text):
    if isinstance(text, list):
        return sum(comment_count(t) for t in text)
    return 1 if isinstance(text, str) and text.strip() else 0


def is_chapter_verse_comment(text):
    # chapter -> verse -> comment (string); the few versions shaped otherwise are skipped
    return (isinstance(text, list) and any(isinstance(c, list) and any(isinstance(v, list) and any(
        isinstance(x, str) and x.strip() for x in v) for v in c) for c in text))


def choose_versions(cache):
    books = fetch(BOOKS_JSON, cache)['books']
    candidates = {}
    for b in books:
        m = re.match(r'^(.*) on (.*)$', b['title'])
        if (b['language'] != 'Hebrew' or 'Tanakh' not in b['categories'] or not m
                or b['versionTitle'] in ('merged', 'test')):
            continue
        who, book = m.groups()
        if who in dict(COMMENTATORS) and book in BOOKS.values():
            candidates.setdefault((who, book), []).append(b['json_url'])
    chosen = {}
    for (who, book), urls in sorted(candidates.items()):
        best = None
        for u in urls:
            v = fetch(u, cache)
            if v.get('license') not in ALLOWED_LICENSES or not is_chapter_verse_comment(v.get('text')):
                continue
            n = comment_count(v['text'])
            if not best or n > best[0]:
                best = (n, u, v)
        if best:
            chosen[(who, book)] = best[2]
            print(f'{who} on {book}: {best[2]["versionTitle"]} ({best[2]["license"]})')
    return chosen


def main():
    cache = (sys.argv[sys.argv.index('--cache') + 1] if '--cache' in sys.argv
             else os.path.join(tempfile.gettempdir(), 'sefaria-cache'))
    os.makedirs(cache, exist_ok=True)
    with open(os.path.join(ROOT, 'sdarim.json'), encoding='utf-8-sig') as f:
        verses = json.load(f)['seder']
    chosen = choose_versions(cache)

    sources = OrderedDict()
    for who, he in COMMENTATORS:
        for book in BOOKS.values():
            v = chosen.get((who, book))
            if v:
                sources[f'{who}|{book}'] = {
                    'commentator': he, 'book': book, 'edition': v.get('versionTitle', ''),
                    'source': v.get('versionSource', ''), 'license': v['license'],
                    'license_he': LICENSE_HE[v['license']], 'license_url': LICENSE_URLS.get(v['license'], ''),
                    'via': 'Sefaria (ספריא), https://www.sefaria.org'}

    files = OrderedDict()
    used = 0
    for v in verses:
        en = BOOKS[v['bookchapter']]
        ch, vs = number(v['chapter']) - 1, number(v['versechapter']) - 1
        entries = []
        for who, he in COMMENTATORS:
            ver = chosen.get((who, en))
            if not ver:
                continue
            text = ver['text']
            comments = text[ch][vs] if ch < len(text) and isinstance(text[ch], list) and vs < len(text[ch]) else []
            comments = [clean(c) for c in (comments if isinstance(comments, list) else [comments])
                        if isinstance(c, str) and c.strip()]
            comments = [c for c in comments if c]
            if comments:
                entries.append({'source': f'{who}|{en}', 'comments': comments})
                used += len(comments)
        page = files.setdefault((v['bookseder'], v['seder']), OrderedDict())
        if entries:
            page[v['verseseder']] = entries

    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    for (book, seder), page in files.items():
        path = os.path.join(OUT, book.replace(' ', '_'), seder + '.json')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(page, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(OUT, 'sources.json'), 'w', encoding='utf-8') as f:
        json.dump(sources, f, ensure_ascii=False, indent=1)
    print(f'{len(files)} sedarim, {used} comments, {len(sources)} commentator/book editions')


if __name__ == '__main__':
    main()
