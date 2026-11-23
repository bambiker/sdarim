#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Static HTML pages generated from sdarim.json, so that search engines, AI tools and
link previews (WhatsApp, Facebook) see the text of every seder without running JavaScript.

Run through build_api.py, which writes and checks these files together with API/:
    seder/<book>/<seder>.html     one seder (447 pages)
    perek/<book>/<chapter>.html   one chapter: the whole seder(s) it falls in, the chapter marked (929 pages)
    parasha/<parasha>.html        one parasha (54 pages)
    book/<book>.html              a whole book by sedarim, for reading and printing (24 pages)
    seder/index.html              list of all of the above
    faq.html                      questions and answers about the sedarim
    robots.txt, llms.txt, llms-full.txt   (sitemap.xml is written by build_api.py)
Spaces in names become underscores.
"""
import html
import json
import os
import re
import statistics
from collections import OrderedDict
from urllib.parse import quote

SITE = 'https://www.masdirim.org'
GENERATED_DIRS = ('seder', 'perek', 'parasha', 'book')

# the books in the chapter division, in order
KETER_BOOKS = ['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים', 'יהושע', 'שופטים', 'שמואל א', 'שמואל ב',
               'מלכים א', 'מלכים ב', 'ישעיהו', 'ירמיהו', 'יחזקאל', 'הושע', 'יואל', 'עמוס', 'עובדיה', 'יונה',
               'מיכה', 'נחום', 'חבקוק', 'צפניה', 'חגי', 'זכריה', 'מלאכי', 'תהילים', 'משלי', 'איוב',
               'שיר השירים', 'רות', 'איכה', 'קהלת', 'אסתר', 'דניאל', 'עזרא', 'נחמיה', 'דברי הימים א',
               'דברי הימים ב']

GEMATRIA = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
            'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
            'ק': 100, 'ר': 200}

KETIV = re.compile(r'(^|\s)([א-ת]{2,}(?:\s+[א-ת]{2,})*)(?=[\s־]|$)')


def number(hebrew):
    return sum(GEMATRIA[c] for c in hebrew)


def slug(name):
    return name.replace(' ', '_')


def seder_path(book, seder):
    return f'seder/{slug(book)}/{seder}.html'


def perek_path(book, chapter):
    return f'perek/{slug(book)}/{chapter}.html'


def parasha_path(parasha):
    return f'parasha/{slug(parasha)}.html'


def book_path(book):
    return f'book/{slug(book)}.html'


def url(path):
    return SITE + '/' + quote(path)


def href(path):
    return '/' + quote(path)


def esc(text):
    return html.escape(text, quote=True)


# the big, small and raised letters (API/letters.json, made by build_letters.py): the letter and its nikud are
# marked in the text before it is escaped, and the marks become spans (as in withLetters() in sdarim.js)
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'API', 'letters.json'), encoding='utf-8') as _f:
    LETTERS = json.load(_f)
LETTER_START = {'big': '\ue000', 'small': '\ue001', 'raised': '\ue002'}
LETTER_END = '\ue003'
LETTER_SPANS = re.compile('([\ue000-\ue002])(.*?)\ue003')
POINTS = re.compile('[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]')


# the songs written in a special form (API/songs.json, made by build_songs.py): a gap between the parts of a
# line, and a new line where the source has it, as in a Torah scroll (as songMarks() in sdarim.js)
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'API', 'songs.json'), encoding='utf-8') as _f:
    SONGS = json.load(_f)
SONG_MARK = {'gap': '\ue004', 'line': '\ue005'}
SONG_HTML = {'\ue004': '<span class="song-gap" aria-hidden="true"></span>', '\ue005': '<br class="song-line">'}


def song_before(v):
    """the gap or new line before the verse"""
    marks = SONGS.get(f"{v['bookchapter']}|{v['chapter']}|{v['versechapter']}", [])
    return ''.join(SONG_HTML[SONG_MARK[kind]] for w, kind in marks if w == 0)


def song_spans(text):
    return re.sub('([\ue004\ue005]) ?', lambda m: SONG_HTML[m.group(1)], text)


def with_letters(v):
    text = v.get('versenikud', '')
    key = f"{v['bookchapter']}|{v['chapter']}|{v['versechapter']}"
    marks, songs = LETTERS.get(key), [m for m in SONGS.get(key, []) if m[0] > 0]
    if not marks and not songs:
        return text
    words = text.split(' ')
    if not marks:
        marks = []
    for w, n, kind in sorted(marks, key=lambda m: -m[1]):
        word = words[w]
        at = [i for i, c in enumerate(word) if 'א' <= c <= 'ת'][n]
        end = at + 1
        while end < len(word) and POINTS.match(word[end]):
            end += 1
        words[w] = word[:at] + LETTER_START[kind] + word[at:end] + LETTER_END + word[end:]
    for w, kind in songs:
        if w < len(words):
            words[w] = SONG_MARK[kind] + ' ' + words[w]
    return ' '.join(words)


# the open and closed sections (API/sections.json, made by build_sections.py): after the last verse of a
# section, a new line (פתוחה) or a space of nine letters (סתומה), as in a Torah scroll (as sectionAfter() in sdarim.js)
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'API', 'sections.json'), encoding='utf-8') as _f:
    SECTIONS = json.load(_f)
SECTION_MARK = re.compile(r'\s*\{[פס]\}\s*$')   # the few marks in sdarim.json at the end of a verse: sections.json has them


def section_after(v):
    kind = SECTIONS.get(f"{v['bookchapter']}|{v['chapter']}|{v['versechapter']}")
    return {'פ': '<br class="petucha">', 'ס': '<span class="setuma" aria-hidden="true"></span>'}.get(kind, '')


def letter_spans(text):
    kinds = {mark: kind for kind, mark in LETTER_START.items()}
    return LETTER_SPANS.sub(lambda m: f'<span class="letter-{kinds[m.group(1)]}">{m.group(2)}</span>', text)


def verse_text(v):
    """The verse as shown on the site (same as cleanverse() in sdarim.js)."""
    # the data has a few <br> tags and entities such as &emsp; that the site displays as HTML
    t = esc(with_letters(v)).replace('&lt;br&gt;', '<br>')
    t = re.sub(r'&amp;(#?\w+);', r'&\1;', t)
    t = KETIV.sub(r'\1<span class="ketiv" title="כתיב">(\2)</span>', t)
    t = SECTION_MARK.sub(' ', t)
    return song_spans(letter_spans(t.replace('{פ}', '<br>').replace('{ש}', '<br>').replace('{ס}', '&emsp;&emsp;&emsp;&emsp;')))


def plain(v):
    return re.sub(r'\s+', ' ', v.get('versenonikud', '')).strip()


def snippet(verses, words=25):
    text = ' '.join(plain(v) for v in verses[:3]).split()
    return ' '.join(text[:words]) + ('...' if len(text) > words else '')


def breadcrumbs(crumbs):
    """schema.org BreadcrumbList, so search results show מסדירים › … instead of the long URL."""
    items = [{'@type': 'ListItem', 'position': i + 1, 'name': name, 'item': url(path)}
             for i, (name, path) in enumerate([('מסדירים', ''), ('כל הסדרים', 'seder/')] + crumbs)]
    data = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': items}
    return '    <script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>\n'


def page(path, title, description, body, crumbs=None, head=''):
    canonical = url(path)
    return f'''<!DOCTYPE html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>{esc(title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="{esc(description)}">
    <link rel="canonical" href="{canonical}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="מסדירים">
    <meta property="og:locale" content="he_IL">
    <meta property="og:title" content="{esc(title)}">
    <meta property="og:description" content="{esc(description)}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:image" content="{SITE}/og-image.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="מסדירים - חוזרים לחלוקת התנ&quot;ך היהודית">
    <meta name="twitter:card" content="summary_large_image">
{breadcrumbs(crumbs) if crumbs is not None else ''}{head}    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <meta name="theme-color" content="#11235A">
    <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/sdarim.css">
    <script src="/commentary.js" defer></script>
    <script src="/app.js" defer></script>
    <script src="/sdarim.js" defer></script>
    <script src="/layout.js" defer></script>
    <script type="module" src="/account.js"></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-JETFHY33T0"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){{dataLayer.push(arguments);}}
      gtag('js', new Date());
      gtag('config', 'G-JETFHY33T0');
    </script>
  </head>
  <body dir="rtl" class="static-page">
    <header class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">ס</span>מסדירים</a>
        <nav class="topnav" aria-label="ניווט ראשי">
          <a href="/#tools">קריאה</a>
          <a href="/#about">אודות</a>
          <a class="wide-only" href="/#agree">הסכמות</a>
          <a class="wide-only" href="/#contact">יצירת קשר</a>
        </nav>
        <button type="button" class="install" data-install hidden>התקנה<span class="wide-only"> כאפליקציה</span></button>
      </div>
    </header>
    <main>
      <!-- the search and the tools, and below the text the rest of the home page: added by layout.js -->
      <div id="site-top"></div>
      <article class="reader page-text" id="page-text">
{body}
      </article>
      <div id="site-bottom"></div>
    </main>
    <footer class="site-footer">
      <a href="/">לדף הבית</a> ·
      <a href="/seder/">כל הסדרים, הפרקים והפרשות</a> ·
      <a href="/faq.html">שאלות ותשובות</a> ·
      <a href="/api.html">API ונתונים</a> ·
      <a href="/convert.html">המרת מראי מקום</a> ·
      <a href="/parparaot.html">פרפראות התורה</a> ·
      <a href="/stats.html">סטטיסטיקות</a> ·
      <a href="https://github.com/bambiker/sdarim" target="_blank" rel="noopener">קוד פתוח</a>
    </footer>
  </body>
</html>
'''


def nav(prev, nxt):
    """prev / next links; each is (path, text) or None. Previous is on the right, as in a Hebrew book."""
    p = f'<a class="prev" rel="prev" href="{href(prev[0])}">→ {esc(prev[1])}</a>' if prev else '<span></span>'
    n = f'<a class="next" rel="next" href="{href(nxt[0])}">{esc(nxt[1])} ←</a>' if nxt else '<span></span>'
    return f'    <nav class="seder-nav no-print">{p}{n}</nav>\n'


def print_button():
    return '<button class="print-button no-print" onclick="window.print()">הדפסה / שמירה כ-PDF</button>'


def verses_html(verses, number_by='seder', anchors=False):
    # anchors (id = verse letter) only where verse letters are unique on the page: seder and chapter pages
    out = []
    for i, v in enumerate(verses):
        n = v['verseseder'] if number_by == 'seder' else v['versechapter']
        # pages by sedarim don't mention chapters; chapter pages show the seder of each verse
        tooltip = (f' title="{esc(v["bookseder"])} סדר {esc(v["seder"])} פסוק {esc(v["verseseder"])}"'
                   if number_by == 'chapter' else '')
        anchor = f' id="{esc(n)}"' if anchors else ''
        # clicking the number opens the commentaries of the verse (commentary.js)
        data = (f' data-book="{esc(v["bookseder"])}" data-seder="{esc(v["seder"])}" data-verse="{esc(v["verseseder"])}"'
                f' data-chapter="{esc(v["bookchapter"])} {esc(v["chapter"])}, {esc(v["versechapter"])}"')
        tooltip = tooltip or ' title="פירושים"'
        # a song's gap or new line between verses, not at the top of the page
        song = ' song' if f"{v['bookchapter']}|{v['chapter']}|{v['versechapter']}" in SONGS else ''
        out.append(f'{song_before(v) if i else ""}<span class="verse{song}"{anchor}><span class="vnum" role="button" tabindex="0"{data}{tooltip}>'
                   f'<sup>({esc(n)})</sup></span> {verse_text(v)}</span>{section_after(v)}')
    return '    <div class="verses">\n' + '\n'.join(out) + '\n    </div>\n'


def seder_with_chapter(verses, chapter_verses):
    """A whole seder on a chapter page: the verses are numbered by the seder, the chapter's verses have their
    chapter letter as id (perek/…#ה links), and a line shows where the chapter starts and where it ends (a chapter
    in two sedarim starts in the first and ends in the second)."""
    inside = [v in chapter_verses for v in verses]
    first, last = chapter_verses[0], chapter_verses[-1]
    chapter = first['chapter']
    out = []
    for i, v in enumerate(verses):
        data = (f' data-book="{esc(v["bookseder"])}" data-seder="{esc(v["seder"])}" data-verse="{esc(v["verseseder"])}"'
                f' data-chapter="{esc(v["bookchapter"])} {esc(v["chapter"])}, {esc(v["versechapter"])}"')
        if v is first:
            out.append(f'<span class="chapter-mark" id="chapter-start">תחילת פרק {esc(chapter)}</span>')
        anchor = f' id="{esc(v["versechapter"])}"' if inside[i] else ''
        song = ' song' if f"{v['bookchapter']}|{v['chapter']}|{v['versechapter']}" in SONGS else ''
        out.append(f'{song_before(v) if i else ""}<span class="verse{song}{"" if inside[i] else " outside-chapter"}"{anchor}><span class="vnum" role="button" tabindex="0"'
                   f'{data} title="פירושים"><sup>({esc(v["verseseder"])})</sup></span> {verse_text(v)}</span>{section_after(v)}')
        if v is last:
            out.append(f'<span class="chapter-mark">סוף פרק {esc(chapter)}</span>')
    return '    <div class="verses">\n' + '\n'.join(out) + '\n    </div>\n'


def build_pages(verses, sedarim):
    """Return {path: html text} for every generated file."""
    pages = OrderedDict()
    by_seder = OrderedDict()
    for v in verses:
        by_seder.setdefault((v['bookseder'], v['seder']), []).append(v)
    by_chapter = OrderedDict()
    for v in verses:
        by_chapter.setdefault((v['bookchapter'], v['chapter']), []).append(v)
    by_parasha = OrderedDict()
    for v in verses:
        if v.get('parasha'):
            by_parasha.setdefault(v['parasha'], []).append(v)
    books = list(OrderedDict.fromkeys(s['book'] for s in sedarim))

    # ~~~ seder pages ~~~
    for i, s in enumerate(sedarim):
        vs = by_seder[(s['book'], s['seder'])]
        name = f'{s["book"]} סדר {s["seder"]}'
        parashot = ' · '.join(f'<a href="{href(parasha_path(p))}">פרשת {esc(p)}</a>' for p in s['parashot'])
        prev = sedarim[i - 1] if i > 0 else None
        nxt = sedarim[i + 1] if i + 1 < len(sedarim) else None
        body = (nav(prev and (seder_path(prev['book'], prev['seder']), f'הסדר הקודם: {prev["book"]} סדר {prev["seder"]}'),
                    nxt and (seder_path(nxt['book'], nxt['seder']), f'הסדר הבא: {nxt["book"]} סדר {nxt["seder"]}'))
                + f'    <h1>{esc(name)}</h1>\n'
                + (f'    <p class="seder-info">{parashot}</p>\n' if parashot else '')
                + f'    <p class="seder-tools no-print"><a href="/?book={quote(slug(s["book"]))}&amp;seder={quote(s["seder"])}&amp;verse={quote("א")}">'
                  f'פתיחה באתר</a> · <a href="{href(book_path(s["book"]))}">ספר {esc(s["book"])} כולו</a> · {print_button()} '
                  f'<button type="button" class="learn-seder" data-book="{esc(s["book"])}" data-seder="{esc(s["seder"])}" hidden></button></p>\n'
                + verses_html(vs, anchors=True)
                + nav(prev and (seder_path(prev['book'], prev['seder']), f'הסדר הקודם: {prev["book"]} סדר {prev["seder"]}'),
                      nxt and (seder_path(nxt['book'], nxt['seder']), f'הסדר הבא: {nxt["book"]} סדר {nxt["seder"]}')))
        desc = f'{name} לפי החלוקה היהודית של התנ"ך לסדרים: {snippet(vs)}'
        pages[seder_path(s['book'], s['seder'])] = page(
            seder_path(s['book'], s['seder']), f'{name} | מסדירים', desc, body,
            [(f'ספר {s["book"]}', book_path(s['book'])), (name, seder_path(s['book'], s['seder']))])

    # ~~~ chapter pages ~~~
    chapters = list(by_chapter)
    for i, (book, chapter) in enumerate(chapters):
        vs = by_chapter[(book, chapter)]
        parts = OrderedDict()
        for v in vs:
            parts.setdefault((v['bookseder'], v['seder']), []).append(v)
        where = ', '.join(f'{b} סדר {s}' for b, s in parts)
        prev = chapters[i - 1] if i > 0 else None
        nxt = chapters[i + 1] if i + 1 < len(chapters) else None
        navs = nav(prev and (perek_path(*prev), f'הפרק הקודם: {prev[0]} {prev[1]}'),
                   nxt and (perek_path(*nxt), f'הפרק הבא: {nxt[0]} {nxt[1]}'))
        body = navs + f'    <h1>{esc(book)} פרק {esc(chapter)} לפי החלוקה לסדרים</h1>\n'
        body += (f'    <p class="seder-info">פרק {esc(chapter)} בספר {esc(book)} ({len(vs)} פסוקים) נמצא ב'
                 + ' וב'.join(f'<a href="{href(seder_path(b, s))}">{esc(b)} סדר {esc(s)}</a> '
                              f'(פסוקים {esc(p[0]["verseseder"])}–{esc(p[-1]["verseseder"])})' for (b, s), p in parts.items())
                 + f'.</p>\n    <p class="seder-tools no-print">{print_button()}</p>\n')
        # the whole seder (or sedarim) the chapter is in, with the chapter marked in it
        for (b, s), p in parts.items():
            body += (f'    <h2><a href="{href(seder_path(b, s))}">{esc(b)} סדר {esc(s)}</a></h2>\n'
                     + seder_with_chapter(by_seder[(b, s)], vs))
        body += navs
        desc = f'{book} פרק {chapter} לפי החלוקה היהודית לסדרים: הפרק נמצא ב{where}. {snippet(vs, 15)}'
        pages[perek_path(book, chapter)] = page(perek_path(book, chapter),
                                                f'{book} פרק {chapter} לפי הסדרים ({where}) | מסדירים', desc, body,
                                                [(f'{book} פרק {chapter}', perek_path(book, chapter))])

    # ~~~ parasha pages ~~~
    parashot = list(by_parasha)
    for i, parasha in enumerate(parashot):
        vs = by_parasha[parasha]
        parts = OrderedDict()
        for v in vs:
            parts.setdefault((v['bookseder'], v['seder']), []).append(v)
        prev = parashot[i - 1] if i > 0 else None
        nxt = parashot[i + 1] if i + 1 < len(parashot) else None
        navs = nav(prev and (parasha_path(prev), f'הפרשה הקודמת: {prev}'), nxt and (parasha_path(nxt), f'הפרשה הבאה: {nxt}'))
        body = navs + f'    <h1>פרשת {esc(parasha)} לפי החלוקה לסדרים</h1>\n'
        body += f'    <p class="seder-tools no-print"><a href="/?parasha={quote(slug(parasha))}">פתיחה באתר</a> · {print_button()}</p>\n'
        for (b, s), p in parts.items():
            body += f'    <h2><a href="{href(seder_path(b, s))}">{esc(b)} סדר {esc(s)}</a></h2>\n' + verses_html(p)
        body += navs
        desc = f'פרשת {parasha} לפי החלוקה היהודית של התנ"ך לסדרים: {snippet(vs)}'
        pages[parasha_path(parasha)] = page(parasha_path(parasha), f'פרשת {parasha} לפי הסדרים | מסדירים', desc, body,
                                            [(f'פרשת {parasha}', parasha_path(parasha))])

    # ~~~ whole books, for reading and printing ~~~
    for i, book in enumerate(books):
        bs = [s for s in sedarim if s['book'] == book]
        prev = books[i - 1] if i > 0 else None
        nxt = books[i + 1] if i + 1 < len(books) else None
        navs = nav(prev and (book_path(prev), f'הספר הקודם: {prev}'), nxt and (book_path(nxt), f'הספר הבא: {nxt}'))
        body = navs + f'    <h1>ספר {esc(book)} לפי החלוקה לסדרים</h1>\n'
        count = 'סדר אחד' if len(bs) == 1 else f'{len(bs)} סדרים'
        body += (f'    <p class="seder-info">{count} · '
                 + ' '.join(f'<a href="#seder-{esc(s["seder"])}">{esc(s["seder"])}</a>' for s in bs)
                 + f'</p>\n    <p class="seder-tools no-print">{print_button()}</p>\n')
        for s in bs:
            vs = by_seder[(s['book'], s['seder'])]
            body += (f'    <h2 id="seder-{esc(s["seder"])}"><a href="{href(seder_path(book, s["seder"]))}">{esc(book)} סדר {esc(s["seder"])}</a></h2>\n'
                     + verses_html(vs))
        body += navs
        desc = f'ספר {book} כולו לפי החלוקה היהודית של התנ"ך לסדרים ({count}), עם ניקוד וטעמים, לקריאה ולהדפסה.'
        pages[book_path(book)] = page(book_path(book), f'ספר {book} לפי הסדרים | מסדירים', desc, body,
                                      [(f'ספר {book}', book_path(book))])

    # ~~~ list of everything ~~~
    body = '    <h1>כל הסדרים, הפרקים והפרשות</h1>\n'
    body += '    <p class="seder-info">התנ"ך לפי החלוקה היהודית לסדרים. לכל סדר, פרק ופרשה יש דף משלו.</p>\n'
    body += '    <h2>פרשות השבוע</h2>\n    <p class="index-list">' + ' · '.join(
        f'<a href="{href(parasha_path(p))}">{esc(p)}</a>' for p in parashot) + '</p>\n'
    body += '    <h2>סדרים לפי ספר</h2>\n'
    for book in books:
        body += (f'    <p class="index-list"><a href="{href(book_path(book))}"><strong>{esc(book)}</strong></a>: '
                 + ' '.join(f'<a href="{href(seder_path(book, s["seder"]))}">{esc(s["seder"])}</a>'
                            for s in sedarim if s['book'] == book) + '</p>\n')
    body += '    <h2>פרקים: באיזה סדר נמצא כל פרק</h2>\n'
    for book in OrderedDict.fromkeys(b for b, _ in chapters):
        body += (f'    <p class="index-list"><strong>{esc(book)}</strong>: '
                 + ' '.join(f'<a href="{href(perek_path(book, c))}">{esc(c)}</a>' for b, c in chapters if b == book) + '</p>\n')
    pages['seder/index.html'] = page('seder/', 'כל הסדרים, הפרקים והפרשות בתנ"ך | מסדירים',
                                     'רשימת כל 447 הסדרים בתנ"ך, כל הפרקים והסדר שבו כל אחד נמצא, וכל פרשות השבוע לפי החלוקה לסדרים.',
                                     body, [])

    pages['faq.html'] = faq_page(sedarim)
    pages['stats.html'] = stats_page(verses, by_seder, by_chapter)

    # ~~~ robots.txt, llms.txt ~~~
    pages['robots.txt'] = f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n'
    pages['llms.txt'] = LLMS_TXT
    pages['llms-full.txt'] = llms_full(sedarim, by_seder)
    return pages


def sitemap(urls_with_dates):
    """urls_with_dates: [(path, 'YYYY-MM-DD' or None)]"""
    rows = ''.join(f'<url><loc>{url(u)}</loc>' + (f'<lastmod>{d}</lastmod>' if d else '') + '</url>\n'
                   for u, d in urls_with_dates)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows + '</urlset>\n')


# pages in sitemap.xml that are not generated here
STATIC_PAGES = ['', 'api.html', 'fame.html', 'convert.html', 'parparaot.html']


# ~~~ questions and answers ~~~
# The answers repeat what the site already says (index.html "אודות המיזם" and "הסכמות");
# the numbers are computed from the data.

TORAH = ['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים']

ENDORSEMENTS = [
    ('הרב יעקב אריאל', 'בעיקר יש לברך על הרעיון ללמוד תנ"ך עפ"י פסקי המסורה ולא עפ"י חלוקת הפרקים הנכרית שחדרה, לצערנו, לספרי התנ"ך'),
    ('הרב שלמה אבינר', 'יישר כוחו על היוזמה החשובה להדפיס תנ"ך על פי חלוקה יהודית, שכידוע החלוקה הנהוגה עתה היא נוצרית, ומלאה שיבושים וכן פרשנויות נוצריות'),
    ('הרב זלמן ברוך מלמד', 'בזה הנני לברכך על היוזמה החשובה שנטלת על עצמך להוציא לתורה את כתבי הקודש תורה נביאים וכתובים בסדר חדש שלא על פי חלוקת הפרקים הקימת שנעשתה על ידי נוכרים'),
    ('הרב יעקב מדן', 'חלוקת הפרקים ונתינת מספר לפסוקים עפ"י חלוקת הפרקים השתרשה בלימודנו בשל קבלת תכתיב החלוקה הנוצרי'),
    ('הרב דוב ליאור', 'הנושא חשוב מאד שחלוקת ספרי הקודש תיהיה על בסיס קדוש וטהור ולא על השיטה הנוצרית'),
    ('הרב יואל בן נון', 'והנה אנו יוצאים מן הגלות עם תנ"ך פתוח בידינו, אבל סימון הפרקים חתום בתוכו מראשיתו עד סופו'),
]


def faq_items(sedarim):
    counts = OrderedDict()
    for s in sedarim:
        counts[s['book']] = counts.get(s['book'], 0) + 1
    torah = sum(n for b, n in counts.items() if b in TORAH)
    total = len(sedarim)
    books = ' · '.join(f'<a href="{href(book_path(b))}">{esc(b)}</a> {n}' for b, n in counts.items())
    quotes = ''.join(f'<li><strong>{esc(name)}</strong>: "...{esc(q)}..."</li>' for name, q in ENDORSEMENTS)
    return [
        ('מה הם הסדרים בתנ"ך?',
         f'הסדרים הם החלוקה היהודית הקדומה של התנ"ך, החלוקה של חז"ל, שנוצרה לפני אלפי שנים. '
         f'התנ"ך כולו מחולק ל-{total} סדרים, וכל סדר מסומן בשם הספר ובמספר הסדר באותיות, למשל '
         f'<a href="{href(seder_path("בראשית", "יג"))}">בראשית סדר יג</a>. '
         f'באתר מסדירים אפשר לקרוא כל סדר, לחפש בתנ"ך ולהמיר בין החלוקה לפרקים לחלוקה לסדרים.'),
        ('למה לא ללמוד לפי החלוקה לפרקים?',
         'החלוקה הנפוצה של התנ"ך לפרקים אינה החלוקה היהודית הקדומה אלא חלוקה נוצרית. '
         'היא השתרשה אצל היהודים כיוון שסייעה בזמנו להתמודד בפולמוסים ובוויכוחים עם הנוצרים. '
         'כל חלוקה בהכרח מייצרת פרשנות, והחלוקה הנוצרית לא תמיד מתאימה לרוח היהדות.'),
        ('מה ההבדל בין סדרים, פרשות השבוע ופרשיות פתוחות וסגורות?',
         'פרשות השבוע נוגעות רק לחמשת חומשי התורה, בלי הנביאים והכתובים. '
         'הפרשיות הפתוחות והסגורות הן חלוקה מקודשת המוטמעת בספרי התורה, אבל יש בהן פרשיות ארוכות מאוד '
         'וגם פרשיות קצרות מאוד, אפילו של פסוק אחד. לכן העדפנו את החלוקה של חז"ל לסדרים, חלוקה שנוצרה לפני אלפי שנים.'),
        ('כמה סדרים יש בכל ספר?',
         f'בתנ"ך יש {total} סדרים: {torah} בתורה ו-{total - torah} בנביאים ובכתובים. '
         f'בחלוקה לסדרים שמואל, מלכים, עזרא ונחמיה, דברי הימים ותרי עשר הם ספר אחד כל אחד. '
         f'מספר הסדרים בכל ספר: {books}.'),
        ('כמה זמן לוקח ללמוד את כל התנ"ך לפי הסדרים?',
         f'לפי החלוקה לסדרים אפשר ללמוד את כל התנ"ך בשנה אחת. את התורה קוראים בשבתות, '
         f'ואת {total - torah} הסדרים של הנביאים והכתובים לומדים סדר אחד בכל יום חול. '
         'יש גם חלוקות אחרות של לימוד הסדרים במהלך השנה, שמושפעות בעיקר מכך אם השנה מעוברת או לא, '
         'כי אז משתנה מספר השבתות.'),
        ('איך מוצאים באיזה סדר נמצא פסוק או פרק?',
         'ב<a href="/">דף הראשי של האתר</a> בוחרים ספר, פרק ופסוק, והאתר מציג את הסדר שבו הפסוק נמצא ומסמן אותו. '
         'לכל פרק יש גם דף שמראה באילו סדרים הוא נמצא, ברשימה ב<a href="/seder/">כל הסדרים, הפרקים והפרשות</a>.'),
        ('מה אמרו רבנים על החלוקה לסדרים?',
         'ההסכמות ניתנו לפרויקטים מקבילים העוסקים במלאכה. מתוכן:'
         f'<ul>{quotes}</ul>'
         'כל ההסכמות נמצאות ב<a href="/#agree">דף הראשי</a>.'),
        ('איך אפשר להשתמש בחלוקה לסדרים באתר או בתוכנה אחרת?',
         'כל הנתונים זמינים כקבצי JSON ו-API, לשימוש חופשי גם בתוכנה וגם לשימוש מסחרי. '
         'נשמח אם תציינו שאתר מסדירים הוא המקור לנתונים. הפרטים ב<a href="/api.html">דף ה-API</a>.'),
        ('למה להירשם לאתר?',
         'ההרשמה חינם, עם חשבון גוגל, ונותנת שני דברים: מעקב אחרי הלימוד, עם סימון של סדרים ופסוקים שלמדתם '
         'ו<a href="/progress.html">דף התקדמות</a> בתנ"ך כולו; והערות ופרשנות משלכם לכל פסוק, שנאספות '
         'ל<a href="/my-commentary.html">ספר פרשנות</a> אישי שאפשר להדפיס. הכול נשמר בכל מכשיר שבו מתחברים, '
         'ורק בעל החשבון רואה אותו. בלי הרשמה אפשר להשתמש בכל שאר האתר כרגיל.'),
        ('אפשר להדפיס סדר, פרשה או ספר שלם?',
         'כן. בכל סדר ופרשה יש כפתור "הדפסה / שמירה כ-PDF", שמדפיס רק את הטקסט. '
         'לכל ספר יש גם דף שמכיל את כל הסדרים שלו, למשל <a href="' + href(book_path('רות')) + '">ספר רות</a>.'),
    ]


def faq_page(sedarim):
    items = faq_items(sedarim)
    plain_text = lambda h: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()
    data = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': plain_text(a)}}
        for q, a in items]}
    head = '    <script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>\n'
    body = '    <h1>שאלות ותשובות על החלוקה לסדרים</h1>\n'
    for q, a in items:
        body += f'    <h2>{esc(q)}</h2>\n    <div class="faq-answer">{a}</div>\n'
    return page('faq.html', 'מה הם הסדרים בתנ"ך? שאלות ותשובות | מסדירים',
                'מה היא החלוקה היהודית של התנ"ך לסדרים, למה לא לפי הפרקים, כמה סדרים יש בכל ספר ואיך מוצאים באיזה סדר נמצא פסוק.',
                body, [('שאלות ותשובות', 'faq.html')], head)


# ~~~ statistics: the sedarim of the Torah, the Prophets and the Writings, and the chapters beside them ~~~
# The open and closed sections (פרשיות פתוחות וסתומות) are in API/sections.json, made by build_sections.py.

NEVIIM_SEDER_BOOKS = ['יהושע', 'שופטים', 'שמואל', 'מלכים', 'ישעיהו', 'ירמיהו', 'יחזקאל', 'תרי עשר']
NEVIIM_CHAPTER_BOOKS = ['יהושע', 'שופטים', 'שמואל א', 'שמואל ב', 'מלכים א', 'מלכים ב', 'ישעיהו', 'ירמיהו', 'יחזקאל',
                        'הושע', 'יואל', 'עמוס', 'עובדיה', 'יונה', 'מיכה', 'נחום', 'חבקוק', 'צפניה', 'חגי', 'זכריה', 'מלאכי']
PARTS = [('torah', 'תורה'), ('neviim', 'נביאים'), ('ketuvim', 'כתובים'), ('all', 'תנ"ך')]


def part_of(book, neviim):
    return 'torah' if book in TORAH else 'neviim' if book in neviim else 'ketuvim'


def stats_page(verses, by_seder, by_chapter):
    sections = SECTIONS
    index = {id(v): i for i, v in enumerate(verses)}
    seder_starts = {index[id(vs[0])] for vs in by_seder.values()}
    chapter_starts = {index[id(vs[0])] for vs in by_chapter.values()}
    words = lambda v: len(v.get('versenonikud', '').split())
    letters = lambda v: len(re.sub('[^א-ת]', '', v.get('versenonikud', '')))

    def start_kind(i):
        """how a unit that begins at verses[i] begins: a new book, an open or a closed section, at the last verse
        of an open or a closed section (one verse before the next one), or elsewhere inside a section"""
        if i == 0 or verses[i - 1]['bookchapter'] != verses[i]['bookchapter']:
            return 'book'
        key = lambda v: f"{v['bookchapter']}|{v['chapter']}|{v['versechapter']}"
        before = sections.get(key(verses[i - 1]))
        if before:
            return {'פ': 'open', 'ס': 'closed'}[before]
        return {'פ': 'last_open', 'ס': 'last_closed'}.get(sections.get(key(verses[i])), 'none')

    def units(groups, book_of, neviim, path, name):
        out = []
        for key, vs in groups.items():
            i = index[id(vs[0])]
            out.append({'part': part_of(book_of(key, vs), neviim), 'verses': len(vs), 'words': sum(map(words, vs)),
                        'letters': sum(map(letters, vs)), 'start': start_kind(i), 'i': i, 'path': path(key), 'name': name(key)})
        return out

    sedarim = units(by_seder, lambda k, vs: k[0], NEVIIM_SEDER_BOOKS, lambda k: seder_path(*k), lambda k: f'{k[0]} סדר {k[1]}')
    chapters = units(by_chapter, lambda k, vs: k[0], NEVIIM_CHAPTER_BOOKS, lambda k: perek_path(*k), lambda k: f'{k[0]} פרק {k[1]}')
    pick = lambda items, part: [u for u in items if part == 'all' or u['part'] == part]
    num = lambda x: f'{x:,.0f}' if abs(x) >= 100 else f'{x:.1f}'
    pct = lambda a, b: f'{100 * a / b:.1f}%' if b else '–'
    link = lambda u: f'<a href="{href(u["path"])}">{esc(u["name"])}</a> ({u["verses"]})'

    def table(title, rows, note=''):
        head = '<tr><th></th>' + ''.join(f'<th>{esc(n)}</th>' for _, n in PARTS) + '</tr>'
        body = ''.join(f'<tr><th>{esc(label)}</th>' + ''.join(f'<td>{cell(part)}</td>' for part, _ in PARTS) + '</tr>'
                       for label, cell in rows)
        return (f'    <h2>{esc(title)}</h2>\n' + (f'    <p class="seder-info">{note}</p>\n' if note else '') +
                f'    <div class="stats-scroll"><table class="stats-table"><thead>{head}</thead><tbody>{body}</tbody></table></div>\n')

    def measures(items):
        avg = lambda part, field: num(sum(u[field] for u in pick(items, part)) / max(1, len(pick(items, part))))
        return [
            ('מספר', lambda part: f'{len(pick(items, part)):,}'),
            ('פסוקים בממוצע', lambda part: avg(part, 'verses')),
            ('מילים בממוצע', lambda part: avg(part, 'words')),
            ('אותיות בממוצע', lambda part: avg(part, 'letters')),
            # how even the division is: the spread of the length (in words) around its average
            ('סטיית תקן (מילים)', lambda part: num(statistics.pstdev([u['words'] for u in pick(items, part)]))),
            ('הארוך ביותר (פסוקים)', lambda part: link(max(pick(items, part), key=lambda u: u['verses']))),
            ('הקצר ביותר (פסוקים)', lambda part: link(min(pick(items, part), key=lambda u: u['verses']))),
        ]

    def beginnings(items):
        share = lambda part, kind: pct(sum(u['start'] == kind for u in pick(items, part)), len(pick(items, part)))
        inside = lambda part: [u for u in pick(items, part) if u['start'] != 'book']
        return [
            ('בפרשה פתוחה (פ)', lambda part: share(part, 'open')),
            ('בפרשה סתומה (ס)', lambda part: share(part, 'closed')),
            ('בפסוק האחרון של פרשה פתוחה', lambda part: share(part, 'last_open')),
            ('בפסוק האחרון של פרשה סתומה', lambda part: share(part, 'last_closed')),
            ('בתחילת ספר', lambda part: share(part, 'book')),
            ('במקום אחר באמצע פרשה', lambda part: share(part, 'none')),
            ('בפרשה פתוחה או סתומה, לא כולל תחילת ספר',
             lambda part: pct(sum(u['start'] in ('open', 'closed') for u in inside(part)), len(inside(part)))),
            ('בפסוק האחרון של פרשה, לא כולל תחילת ספר',
             lambda part: pct(sum(u['start'] in ('last_open', 'last_closed') for u in inside(part)), len(inside(part)))),
            ('בפרשה או בפסוק שלפניה, לא כולל תחילת ספר',
             lambda part: pct(sum(u['start'] != 'none' for u in inside(part)), len(inside(part)))),
        ]

    # where the two divisions meet
    def meet(part):
        ch = pick(chapters, part)
        return pct(sum(u['i'] in seder_starts for u in ch), len(ch))

    def meet_back(part):
        sd = pick(sedarim, part)
        return pct(sum(u['i'] in chapter_starts for u in sd), len(sd))

    def per_verse(field):
        return lambda part: num(sum(u[field] for u in pick(sedarim, part)) / max(1, sum(u['verses'] for u in pick(sedarim, part))))

    total = lambda field: lambda part: f'{sum(u[field] for u in pick(sedarim, part)):,}'
    spans = lambda part: num(sum(len({verses[j]['chapter'] + verses[j]['bookchapter'] for j in range(u['i'], u['i'] + u['verses'])})
                                 for u in pick(sedarim, part)) / max(1, len(pick(sedarim, part))))

    # by book: how many sedarim, and how long
    books = OrderedDict()
    for u in sedarim:
        books.setdefault(u['name'].split(' סדר ')[0], []).append(u)
    # the first seder of a book begins with the book, so it is not counted in the last column
    inner = lambda us: [u for u in us if u['start'] != 'book']
    book_rows = ''.join(
        f'<tr><th><a href="{href(book_path(b))}">{esc(b)}</a></th><td>{len(us)}</td><td>{num(sum(u["verses"] for u in us) / len(us))}</td>'
        f'<td>{num(sum(u["words"] for u in us) / len(us))}</td>'
        f'<td>{pct(sum(u["start"] in ("open", "closed") for u in inner(us)), len(inner(us)))}</td></tr>' for b, us in books.items())

    body = (
        '    <h1>סטטיסטיקות על הסדרים</h1>\n'
        '    <p class="seder-info">הסדרים בתורה, בנביאים ובכתובים, ולצדם הפרקים להשוואה: כמה יש, כמה הם ארוכים, '
        'איפה הם מתחילים ועד כמה שתי החלוקות נפגשות. בטבלאות "הארוך ביותר" ו"הקצר ביותר" מופיע בסוגריים מספר הפסוקים.</p>\n'
        + table('הסדרים', measures(sedarim))
        + table('הפרקים, להשוואה', measures(chapters))
        + table('איפה מתחילים הסדרים', beginnings(sedarim),
                'סדר מתחיל "בפרשה פתוחה" כשהפסוק שלפניו מסיים פרשה פתוחה (פ), ו"בפרשה סתומה" כשהוא מסיים פרשה סתומה (ס). '
                'סדר מתחיל "בפסוק האחרון של פרשה" כשהפסוק הראשון שלו הוא זה שמסיים את הפרשה, פסוק אחד לפני הפרשה הבאה: '
                'כך מתחילים הרבה מהסדרים בנביאים ובכתובים, ואילו בתורה אין אף סדר כזה. '
                'הפרשיות הפתוחות והסתומות לפי המקרא על פי המסורה (ספריא, CC-BY-SA).')
        + table('איפה מתחילים הפרקים, להשוואה', beginnings(chapters))
        + table('כשהחלוקות נפגשות', [
            ('פרקים שמתחילים יחד עם סדר', meet),
            ('סדרים שמתחילים בתחילת פרק', meet_back),
            ('בכמה פרקים נוגע סדר, בממוצע', spans),
        ])
        + table('ועוד קצת', [
            ('פסוקים בסך הכול', total('verses')),
            ('מילים בסך הכול', total('words')),
            ('אותיות בסך הכול', total('letters')),
            ('מילים בפסוק, בממוצע', per_verse('words')),
            ('אותיות במילה, בממוצע', lambda part: num(sum(u['letters'] for u in pick(sedarim, part)) /
                                                      max(1, sum(u['words'] for u in pick(sedarim, part))))),
        ])
        + '    <h2>לפי ספרים</h2>\n'
        '    <div class="stats-scroll"><table class="stats-table"><thead><tr><th>ספר</th><th>סדרים</th><th>פסוקים בסדר</th>'
        '<th>מילים בסדר</th><th>מתחילים בפרשה פתוחה או סתומה (בלי הסדר הראשון)</th></tr></thead><tbody>' + book_rows + '</tbody></table></div>\n'
        '    <p class="seder-info">שמואל, מלכים, עזרא ונחמיה, דברי הימים ותרי עשר הם ספר אחד כל אחד בחלוקה לסדרים. '
        'המילים והאותיות נספרו בטקסט בלי ניקוד, ומילים שמחוברות במקף נספרו כמילים נפרדות. '
        '"–" בספר שיש בו סדר אחד בלבד: הוא מתחיל בתחילת הספר.</p>\n'
    )
    return page('stats.html', 'סטטיסטיקות על הסדרים בתנ"ך: תורה, נביאים וכתובים | מסדירים',
                'כמה סדרים יש בתורה, בנביאים ובכתובים, כמה פסוקים, מילים ואותיות יש בסדר בממוצע, כמה מהם מתחילים בפרשה פתוחה '
                'או סתומה, והשוואה לחלוקה לפרקים.', body, [('סטטיסטיקות', 'stats.html')])


# ~~~ llms-full.txt: every seder in plain text, for AI tools ~~~

SEDER_BOOKS_EN = {
    'בראשית': 'Genesis', 'שמות': 'Exodus', 'ויקרא': 'Leviticus', 'במדבר': 'Numbers', 'דברים': 'Deuteronomy',
    'יהושע': 'Joshua', 'שופטים': 'Judges', 'שמואל': 'Samuel', 'מלכים': 'Kings', 'ישעיהו': 'Isaiah',
    'ירמיהו': 'Jeremiah', 'יחזקאל': 'Ezekiel', 'תרי עשר': 'The Twelve Prophets', 'תהילים': 'Psalms',
    'משלי': 'Proverbs', 'איוב': 'Job', 'שיר השירים': 'Song of Songs', 'רות': 'Ruth', 'איכה': 'Lamentations',
    'קהלת': 'Ecclesiastes', 'אסתר': 'Esther', 'דניאל': 'Daniel', 'עזרא ונחמיה': 'Ezra-Nehemiah',
    'דברי הימים': 'Chronicles'}

CHAPTER_BOOKS_EN = dict(zip(KETER_BOOKS, [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel',
    'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
    'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job',
    'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah',
    'I Chronicles', 'II Chronicles']))


def llms_full(sedarim, by_seder):
    def where(v):
        return f'{CHAPTER_BOOKS_EN[v["bookchapter"]]} {number(v["chapter"])}:{number(v["versechapter"])}'
    lines = [
        '# מסדירים (Masdirim): all 447 sedarim of the Tanakh',
        '',
        '> The traditional Jewish division of the Hebrew Bible into sedarim, with where each seder starts and ends '
        'in the chapter:verse numbering (given only to help locate the text). Source: https://www.masdirim.org '
        '(credit: "החלוקה לסדרים: מסדירים, www.masdirim.org"). Each line links to the seder\'s page with the full text. '
        'More: https://www.masdirim.org/llms.txt',
        '']
    book = None
    for s in sedarim:
        if s['book'] != book:
            book = s['book']
            count = sum(1 for x in sedarim if x['book'] == book)
            lines += ['', f'## {SEDER_BOOKS_EN[book]} ({book}): {count} sedarim', '']
        vs = by_seder[(s['book'], s['seder'])]
        parashot = ''.join(f'; parasha {p}' for p in s['parashot'])
        lines.append(f'- {SEDER_BOOKS_EN[book]} seder {s["seder_number"]} ({book} סדר {s["seder"]}): '
                     f'{where(vs[0])} - {where(vs[-1])}, {len(vs)} verses{parashot}. '
                     f'{SITE}/{seder_path(book, s["seder"]).replace(" ", "_")}')
    return '\n'.join(lines) + '\n'


LLMS_TXT = '''# מסדירים (Masdirim)

> The Hebrew Bible (Tanakh) divided into sedarim, the traditional Jewish division (447 sedarim), instead of the chapters introduced by Christian printers. The site converts between chapter:verse and seder:verse references, and shows every seder, chapter and weekly parasha with full vocalized text (nikud and cantillation). Hebrew. Free to use with attribution: "החלוקה לסדרים: מסדירים, www.masdirim.org".

## Pages
- [Questions and answers about the sedarim](https://www.masdirim.org/faq.html) (Hebrew)
- [Every seder with its start and end, in plain text](https://www.masdirim.org/llms-full.txt)
- [All sedarim, chapters and parashot](https://www.masdirim.org/seder/): index of every page below
- One seder: https://www.masdirim.org/seder/<book>/<seder>.html, e.g. https://www.masdirim.org/seder/בראשית/יג.html (Bereshit seder 13 = Genesis 16:1-16)
- One chapter, showing which seder(s) it is in: https://www.masdirim.org/perek/<book>/<chapter>.html, e.g. https://www.masdirim.org/perek/בראשית/טז.html
- One weekly parasha by sedarim: https://www.masdirim.org/parasha/<parasha>.html, e.g. https://www.masdirim.org/parasha/לך_לך.html
- A whole book by sedarim: https://www.masdirim.org/book/<book>.html
- Book names, seder and chapter numbers are in Hebrew letters; spaces in names are underscores (e.g. שמואל_א, דברי_הימים).

## Data (JSON, CORS enabled)
- [API documentation](https://www.masdirim.org/api.html)
- [All sedarim with start/end chapter:verse](https://raw.githubusercontent.com/bambiker/sdarim/refs/heads/main/API/sedarim.json)
- [Chapter <-> seder location of every verse](https://raw.githubusercontent.com/bambiker/sdarim/refs/heads/main/API/map.json)
- [Full text of every verse](https://raw.githubusercontent.com/bambiker/sdarim/refs/heads/main/sdarim.json)
- Source code: https://github.com/bambiker/sdarim
'''
