#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Write API/letters.json: the big, small and raised letters of the Tanakh (אותיות גדולות, קטנות ותלויות),
so the site shows them in their size. They are taken from "Miqra according to the Masorah" (Sefaria's
public export, CC-BY-SA), which marks them; sdarim.json has the letters without their size.

    python3 build_letters.py [--cache DIR]

Needs network access to raw.githubusercontent.com and storage.googleapis.com. Run it again only if the
words of sdarim.json change; build_api.py does not need it. The file:
    {"<book>|<chapter>|<verse>": [[word, letter, "big" | "small" | "raised"], ...], ...}
by the chapter numbering; word: the place of the word in versenikud split on spaces (from 0); letter:
the place of the letter among the letters of the word, without nikud (from 0).
"""
import json
import os
import re
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_commentary import fetch  # noqa: E402

ROOT = os.path.dirname(os.path.abspath(__file__))
EXPORT = 'https://storage.googleapis.com/sefaria-export/json/Tanakh/{}/{}/Hebrew/Miqra%20according%20to%20the%20Masorah.json'
BOOKS = [('Torah', 'Genesis', 'בראשית'), ('Torah', 'Exodus', 'שמות'), ('Torah', 'Leviticus', 'ויקרא'),
         ('Torah', 'Numbers', 'במדבר'), ('Torah', 'Deuteronomy', 'דברים'), ('Prophets', 'Joshua', 'יהושע'),
         ('Prophets', 'Judges', 'שופטים'), ('Prophets', 'I Samuel', 'שמואל א'), ('Prophets', 'II Samuel', 'שמואל ב'),
         ('Prophets', 'I Kings', 'מלכים א'), ('Prophets', 'II Kings', 'מלכים ב'), ('Prophets', 'Isaiah', 'ישעיהו'),
         ('Prophets', 'Jeremiah', 'ירמיהו'), ('Prophets', 'Ezekiel', 'יחזקאל'), ('Prophets', 'Hosea', 'הושע'),
         ('Prophets', 'Joel', 'יואל'), ('Prophets', 'Amos', 'עמוס'), ('Prophets', 'Obadiah', 'עובדיה'),
         ('Prophets', 'Jonah', 'יונה'), ('Prophets', 'Micah', 'מיכה'), ('Prophets', 'Nahum', 'נחום'),
         ('Prophets', 'Habakkuk', 'חבקוק'), ('Prophets', 'Zephaniah', 'צפניה'), ('Prophets', 'Haggai', 'חגי'),
         ('Prophets', 'Zechariah', 'זכריה'), ('Prophets', 'Malachi', 'מלאכי'), ('Writings', 'Psalms', 'תהילים'),
         ('Writings', 'Proverbs', 'משלי'), ('Writings', 'Job', 'איוב'), ('Writings', 'Song of Songs', 'שיר השירים'),
         ('Writings', 'Ruth', 'רות'), ('Writings', 'Lamentations', 'איכה'), ('Writings', 'Ecclesiastes', 'קהלת'),
         ('Writings', 'Esther', 'אסתר'), ('Writings', 'Daniel', 'דניאל'), ('Writings', 'Ezra', 'עזרא'),
         ('Writings', 'Nehemiah', 'נחמיה'), ('Writings', 'I Chronicles', 'דברי הימים א'),
         ('Writings', 'II Chronicles', 'דברי הימים ב')]
KINDS = {'big': 'big', 'small': 'small', 'sup': 'raised'}


def hebrew_number(n):
    units, tens = ' אבגדהוזחט', ' יכלמנסעפצ'
    out = 'ק' if n >= 100 else ''
    n %= 100
    if n in (15, 16):
        return out + ('טו' if n == 15 else 'טז')
    return (out + tens[n // 10] + units[n % 10]).replace(' ', '')


def letters(text):
    return re.sub('[^א-ת]', '', text)


def marked_words(text):
    """[(the word's letters, [(letter place, kind)])] for each word of a verse with a marked letter."""
    text = re.sub(r'<i class="footnote">.*?</i>|<sup class="footnote-marker">.*?</sup>', '', text)
    text = re.sub(r'<span class="mam-spi[^"]*">.*?</span>|&[a-z]+;', ' ', text)
    out = []
    for word in re.split(r'[\s־]+', text):
        marks, count = [], 0
        for part in re.split(r'(<(?:big|small|sup)>.*?</(?:big|small|sup)>|<[^>]+>)', word):
            m = re.match(r'<(big|small|sup)>(.*?)</\1>', part)
            if m and letters(m.group(2)):
                marks.append((count, KINDS[m.group(1)]))
            if not part.startswith('<') or m:
                count += len(letters(re.sub('<[^>]+>', '', part)))
        if marks:
            out.append((letters(re.sub('<[^>]+>', '', word)), marks))
    return out


def main():
    cache = (sys.argv[sys.argv.index('--cache') + 1] if '--cache' in sys.argv
             else os.path.join(tempfile.gettempdir(), 'sefaria-cache'))
    os.makedirs(cache, exist_ok=True)
    with open(os.path.join(ROOT, 'sdarim.json'), encoding='utf-8-sig') as f:
        verses = {(v['bookchapter'], v['chapter'], v['versechapter']): v for v in json.load(f)['seder']}
    found, missing = {}, []
    for part, english, book in BOOKS:
        text = fetch(EXPORT.format(part, english.replace(' ', '%20')), cache)['text']
        for c, chapter in enumerate(text, 1):
            for n, verse in enumerate(chapter, 1):
                words = marked_words(verse)
                if not words:
                    continue
                key = (book, hebrew_number(c), hebrew_number(n))
                tokens = verses[key]['versenikud'].split(' ')
                used = set()
                for word, marks in words:
                    # the word in sdarim.json: the same letters (the first one not used yet)
                    at = next((i for i, t in enumerate(tokens) if i not in used and letters(t) == word), None)
                    if at is None:
                        missing.append((key, word))
                        continue
                    used.add(at)
                    found.setdefault('|'.join(key), []).extend([at, letter, kind] for letter, kind in marks)
    with open(os.path.join(ROOT, 'API', 'letters.json'), 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False)
                                   for k, v in found.items()) + '\n}\n')
    print(sum(len(v) for v in found.values()), 'letters in', len(found), 'verses')
    for key, word in missing:
        print('not found in sdarim.json:', ' '.join(key), word)


if __name__ == '__main__':
    main()
