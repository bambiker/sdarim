#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Write API/songs.json: the layout of the songs written in a special form (שירות): the Song of the Sea,
Ha'azinu, the kings in Joshua 12, the Song of Deborah, David's song (II Samuel 22), "a time to be born"
(Ecclesiastes 3), Haman's sons (Esther 9) and the song in I Chronicles 16. It is taken from MAM-parsed
(Miqra according to the Masorah, https://github.com/bdenckla/MAM-basics, CC-BY-SA), which marks the gaps
between the parts of a line (מ:ששש) and, where the source has them, the line breaks (ר3, ר4).

    python3 build_songs.py [--cache DIR]

Needs network access to raw.githubusercontent.com. Run it again only if the words of sdarim.json change;
build_api.py does not need it. The file:
    {"<book>|<chapter>|<verse>": [[word, "gap" | "line"], ...], ...}
by the chapter numbering; word: the place, in versenikud split on spaces (from 0), of the word the gap or
the new line comes before (0: before the verse).
"""
import json
import os
import re
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_commentary import fetch  # noqa: E402
from build_letters import hebrew_number  # noqa: E402

ROOT = os.path.dirname(os.path.abspath(__file__))
MAM = 'https://raw.githubusercontent.com/bdenckla/MAM-basics/main/MAM-parsed/plus/{}.json'
# (MAM file, part of the book in it, book in sdarim.json, chapter, first and last verse)
SONGS = [('A2-Exodus', None, 'שמות', 15, 1, 19), ('A5-Deuter', None, 'דברים', 32, 1, 43),
         ('B1-Joshua', None, 'יהושע', 12, 9, 24), ('B2-Judges', None, 'שופטים', 5, 1, 31),
         ('BA-Samuel', 'שמ"ב', 'שמואל ב', 22, 1, 51), ('E4-Ecclesiastes', None, 'קהלת', 3, 2, 8),
         ('E5-Esther', None, 'אסתר', 9, 7, 10), ('FC-Chronicles', 'דה"א', 'דברי הימים א', 16, 8, 36)]
MARKS = {'מ:ששש': 'gap', 'ר3': 'line', 'ר4': 'line'}
# the Song of the Sea: MAM has its gaps but not its lines. Its 30 lines, as in a Torah scroll, by the words they
# begin with (Tractate Soferim 12:11, Vilna 1883, public domain); the first line is written as usual, then a
# line in three parts (two gaps) and a line in two parts (one gap), by turns (Rambam, Sefer Torah 8:4)
SEA = ('אז לאמר ורכבו לישועה אבי שמו שלשיו אבן יהוה קמיך אפיך נוזלים אויב נפשי ברוחך אדירים '
       'כמוכה פלא בחסדך קדשיך אחז אדום כל ופחד יעבור קנית לשבתך ידיך בא מי').split()

# Haman's sons, as in a megillah: not a half brick over a whole one but a brick over a brick (Tractate Soferim
# 13:3), in two columns: "איש" at the top and each son's name at the right, "ואת" at the left, and "עשרת" at
# the bottom (13:6, the same as Shulchan Aruch, Orach Chaim 691:3)
HAMAN = ('איש', 'פרשנדתא', 'דלפון', 'אספתא', 'פורתא', 'אדליא', 'ארידתא', 'פרמשתא', 'אריסי', 'ארדי', 'ויזתא')


def skeleton(word):
    """a word's letters without ו and י, so full and defective spelling match (כמוכה, כָמֹכָה)"""
    return re.sub('[וי]', '', letters(word))


def haman_columns(songs, verses, problems):
    """the marks of Haman's sons (in place of MAM's gaps there): a line for each, and a gap before its ואת"""
    words = []
    for n in range(6, 11):
        key = ('אסתר', 'ט', hebrew_number(n))
        songs.pop('|'.join(key), None)
        for i, w in enumerate(verses[key]['versenikud'].split(' ')):
            if NIKUD.search(w):
                words.append(('|'.join(key), i, letters(w)))
    at = 0
    for head in HAMAN:
        at = next((j for j in range(at, len(words)) if skeleton(words[j][2]) == skeleton(head)), None)
        if at is None or at + 1 >= len(words) or words[at + 1][2] not in ('ואת', 'עשרת'):
            problems.append(('haman', head))
            return
        for (key, place, _), kind in ((words[at], 'line'), (words[at + 1], 'gap')):
            songs.setdefault(key, []).append([place, kind])
        at += 1
    # after "עשרת", the rest of the verse on a line of its own
    key, place, _ = words[at + 1]
    songs.setdefault(key, []).append([place, 'line'])
    for n in range(6, 11):
        songs.get('|'.join(('אסתר', 'ט', hebrew_number(n))), []).sort()


def sea_lines(songs, verses, problems):
    """add to songs the new lines of the Song of the Sea, checked against its gaps"""
    words = []   # (verse key, place in versenikud, word) of every counted word, in order
    for n in range(1, 20):
        key = ('שמות', 'טו', hebrew_number(n))
        for i, w in enumerate(verses[key]['versenikud'].split(' ')):
            if NIKUD.search(w):
                words.append(('|'.join(key), i, w))
    gaps = {(k, w) for k, marks in songs.items() for w, kind in marks if kind == 'gap'}
    at = 0   # line 1 begins at the first word of the song (after a section: no new line)
    for line, head in enumerate(SEA[1:], 2):
        # the head of the line, after the previous one, with the gaps of the line before it (line 1: none;
        # then three parts and two by turns)
        want = 0 if line == 2 else (2 if line % 2 else 1)
        for j in range(at + 1, len(words)):
            if skeleton(words[j][2]) != skeleton(head):
                continue
            inside = sum((k, w) in gaps for k, w, _ in words[at + 1:j])
            if inside == want and (words[j][0], words[j][1]) not in gaps:
                break
        else:
            problems.append(('sea line', line, head))
            continue
        at = j
        key, place, _ = words[j]
        songs.setdefault(key, []).append([place, 'line'])
    # the last line, "מי הים | ובני ישראל הלכו ביבשה בתוך הים", is in two parts
    last = sum((k, w) in gaps for k, w, _ in words[at + 1:])
    if last != 1:
        problems.append(('sea last line gaps', last))
    for marks in songs.values():
        marks.sort()
NIKUD = re.compile('[ְ-ׇּׁׂ]')


def letters(text):
    return re.sub('[^א-ת]', '', text)


# templates that add no words of the verse (paseq, notes, verse numbers, section marks)
NO_TEXT = {'מ:פסק', 'מ:פסוק', 'ש', 'מ:עלייה', 'מ:קישור בהערה', 'מ:קישור פנימי בהערה', 'פפ', 'סס',
           'פפפ', 'ססס', 'ר0', 'ר1', 'ר2', 'מ:לגרמיה-2', 'מ:ספר חדש', 'מ:אין פרשה בתחילת פרק'}


def flatten(node, out):
    """the text of a MAM verse as [str | 'gap' | 'line'], with the qere of a ketiv and qere"""
    if isinstance(node, str):
        out.append(node)
    elif isinstance(node, list):
        for item in node:
            flatten(item, out)
    elif isinstance(node, dict):
        name, params = node.get('tmpl_name'), node.get('tmpl_params', {})
        if name in MARKS:
            out.append(MARKS[name])
        elif name in NO_TEXT:
            pass
        elif name in ('קו״כ', 'כו״ק', 'מ:קו״כ-אם-2', 'מ:כו״ק מיוחד'):
            # the form read (with nikud): the verse's words are counted by it
            forms = [p for p in params.values() if isinstance(p, str)]
            flatten(next((f for f in forms if NIKUD.search(f)), forms[-1] if forms else ''), out)
        elif name == 'מ:אות-מיוחדת-במילה':
            flatten(params.get('2', params.get('1', '')), out)
        elif name == 'מ:קמץ':
            flatten(params.get('ס', params.get('ד', '')), out)   # the same word, with one sign or another
        else:
            # נוסח, הערה, דחי and the like: their first parameter is the text of the verse
            flatten(params.get('1', ''), out)


def word_count(text):
    return len([w for w in re.split(r'[\s\u05BE]+', text) if letters(w)])


def main():
    cache = (sys.argv[sys.argv.index('--cache') + 1] if '--cache' in sys.argv
             else os.path.join(tempfile.gettempdir(), 'sefaria-cache'))
    os.makedirs(cache, exist_ok=True)
    with open(os.path.join(ROOT, 'sdarim.json'), encoding='utf-8-sig') as f:
        verses = {(v['bookchapter'], v['chapter'], v['versechapter']): v for v in json.load(f)['seder']}
    songs, problems = {}, []
    for file, part, book, chapter, first, last in SONGS:
        data = fetch(MAM.format(file), cache)
        book39 = next(b for b in data['book39s'] if part is None or b['sub_book_name'] == part)
        for n in range(first, last + 1):
            key = (book, hebrew_number(chapter), hebrew_number(n))
            mam = book39['chapters'][str(chapter)][str(n)]
            before, text = [], []
            flatten(mam[0], before)
            flatten(mam[2], text)
            marks = [[0, m] for m in before if m in ('gap', 'line')][-1:]   # how the verse begins
            # the words before each mark in the verse (counted by words, so full and defective spelling do not matter)
            count, at, piece = 0, [], ''
            for item in text:
                if item in ('gap', 'line'):
                    count += word_count(piece)
                    piece = ''
                    at.append((count, item))
                else:
                    piece += item
            # our words, counted the same way: a ketiv (written without nikud) and a paseq are not counted
            words = verses[key]['versenikud'].split(' ')
            counted = [i for i, w in enumerate(words) if NIKUD.search(w)]
            for count, kind in at:
                if count >= len(counted):
                    problems.append((key, count, kind))
                    continue
                place = counted[count]
                while place > 0 and words[place - 1] and not NIKUD.search(words[place - 1]) and letters(words[place - 1]):
                    place -= 1   # before a ketiv that goes with the word
                marks.append([place, kind])
            # the same number of words in both: a check that the marks are in their places
            if word_count(' '.join(t for t in text if t not in ('gap', 'line'))) != len(counted):
                problems.append((key, 'words', word_count(' '.join(t for t in text if t not in ('gap', 'line'))), len(counted)))
            if marks:
                songs['|'.join(key)] = marks
    sea_lines(songs, verses, problems)
    haman_columns(songs, verses, problems)
    with open(os.path.join(ROOT, 'API', 'songs.json'), 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False)
                                   for k, v in songs.items()) + '\n}\n')
    print(len(songs), 'verses,', sum(len(v) for v in songs.values()), 'marks')
    for p in problems:
        print('not placed:', p)


if __name__ == '__main__':
    main()
