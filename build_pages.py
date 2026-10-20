#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Static HTML pages generated from sdarim.json, so that search engines, AI tools and
link previews (WhatsApp, Facebook) see the text of every seder without running JavaScript.

Run through build_api.py, which writes and checks these files together with API/:
    seder/<book>/<seder>.html     one seder (447 pages)
    perek/<book>/<chapter>.html   one chapter, showing the sedarim it falls in (929 pages)
    parasha/<parasha>.html        one parasha (54 pages)
    book/<book>.html              a whole book by sedarim, for reading and printing (24 pages)
    seder/index.html              list of all of the above
    sitemap.xml, robots.txt, llms.txt
Spaces in names become underscores.
"""
import html
import json
import re
from collections import OrderedDict
from urllib.parse import quote

SITE = 'https://www.masdirim.org'
GENERATED_DIRS = ('seder', 'perek', 'parasha', 'book')

# book numbers on mgketer.org (Mikraot Gedolot HaKeter), as in mgketer() in sdarim.js
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


def keter(v):
    return 'https://www.mgketer.org/tanach/%d/%02d/%02d' % (
        KETER_BOOKS.index(v['bookchapter']) + 1, number(v['chapter']), number(v['versechapter']))


def verse_text(v):
    """The verse as shown on the site (same as cleanverse() in sdarim.js)."""
    # the data has a few <br> tags and entities such as &emsp; that the site displays as HTML
    t = esc(v.get('versenikud', '')).replace('&lt;br&gt;', '<br>')
    t = re.sub(r'&amp;(#?\w+);', r'&\1;', t)
    t = KETIV.sub(r'\1<span class="ketiv" title="כתיב">(\2)</span>', t)
    return t.replace('{פ}', '<br>').replace('{ש}', '<br>').replace('{ס}', '&emsp;&emsp;&emsp;&emsp;')


def plain(v):
    return re.sub(r'\s+', ' ', v.get('versenonikud', '')).strip()


def ref(book, chapter, verse):
    return f'{book} {chapter}, {verse}'


def range_text(first, last):
    start = ref(first['bookchapter'], first['chapter'], first['versechapter'])
    if first['bookchapter'] == last['bookchapter']:
        return f'{start} – {last["chapter"]}, {last["versechapter"]}'
    return f'{start} – {ref(last["bookchapter"], last["chapter"], last["versechapter"])}'


def snippet(verses, words=25):
    text = ' '.join(plain(v) for v in verses[:3]).split()
    return ' '.join(text[:words]) + ('...' if len(text) > words else '')


def page(path, title, description, body, prev_next=''):
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
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link href="https://fonts.googleapis.com/css?family=Assistant" rel="stylesheet">
    <link rel="stylesheet" href="/sdarim.css">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-JETFHY33T0"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){{dataLayer.push(arguments);}}
      gtag('js', new Date());
      gtag('config', 'G-JETFHY33T0');
    </script>
  </head>
  <body dir="rtl" class="static-page">
    <header class="site-header no-print">
      <a href="/">מסדירים</a> · <span>חוזרים לחלוקת התנ"ך היהודית</span>
    </header>
{body}
    <footer class="no-print">
      <a href="/">לאתר מסדירים: המרה בין פרקים לסדרים וחיפוש</a> ·
      <a href="/seder/">כל הסדרים, הפרקים והפרשות</a> ·
      <a href="/api.html">API ונתונים</a>
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
    for v in verses:
        n = v['verseseder'] if number_by == 'seder' else v['versechapter']
        where = (f'{v["bookchapter"]} {v["chapter"]}, {v["versechapter"]}' if number_by == 'seder'
                 else f'{v["bookseder"]} סדר {v["seder"]} פסוק {v["verseseder"]}')
        anchor = f' id="{esc(n)}"' if anchors else ''
        out.append(f'<span class="verse"{anchor}><a class="vnum" href="{keter(v)}" target="_blank" '
                   f'title="{esc(where)}"><sup>({esc(n)})</sup></a> {verse_text(v)}</span>')
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
        rng = range_text(vs[0], vs[-1])
        parashot = ''.join(f' · <a href="{href(parasha_path(p))}">פרשת {esc(p)}</a>' for p in s['parashot'])
        prev = sedarim[i - 1] if i > 0 else None
        nxt = sedarim[i + 1] if i + 1 < len(sedarim) else None
        body = (nav(prev and (seder_path(prev['book'], prev['seder']), f'הסדר הקודם: {prev["book"]} סדר {prev["seder"]}'),
                    nxt and (seder_path(nxt['book'], nxt['seder']), f'הסדר הבא: {nxt["book"]} סדר {nxt["seder"]}'))
                + f'    <h1>{esc(name)}</h1>\n'
                + f'    <p class="seder-info">לפי החלוקה לפרקים: {esc(rng)} · {len(vs)} פסוקים{parashot}</p>\n'
                + f'    <p class="seder-tools no-print"><a href="/?book={quote(slug(s["book"]))}&amp;seder={quote(s["seder"])}&amp;verse={quote("א")}">'
                  f'פתיחה באתר</a> · <a href="{href(book_path(s["book"]))}">ספר {esc(s["book"])} כולו</a> · {print_button()}</p>\n'
                + verses_html(vs, anchors=True)
                + nav(prev and (seder_path(prev['book'], prev['seder']), f'הסדר הקודם: {prev["book"]} סדר {prev["seder"]}'),
                      nxt and (seder_path(nxt['book'], nxt['seder']), f'הסדר הבא: {nxt["book"]} סדר {nxt["seder"]}')))
        desc = f'{name} לפי החלוקה היהודית של התנ"ך לסדרים ({rng}, {len(vs)} פסוקים): {snippet(vs)}'
        pages[seder_path(s['book'], s['seder'])] = page(seder_path(s['book'], s['seder']),
                                                        f'{name} ({rng}) | מסדירים', desc, body)

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
        for (b, s), p in parts.items():
            body += f'    <h2><a href="{href(seder_path(b, s))}">{esc(b)} סדר {esc(s)}</a></h2>\n' + verses_html(p, number_by='chapter', anchors=True)
        body += navs
        desc = f'{book} פרק {chapter} לפי החלוקה היהודית לסדרים: הפרק נמצא ב{where}. {snippet(vs, 15)}'
        pages[perek_path(book, chapter)] = page(perek_path(book, chapter),
                                                f'{book} פרק {chapter} לפי הסדרים ({where}) | מסדירים', desc, body)

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
        where = ', '.join(f'{b} סדר {s}' for b, s in parts)
        body = navs + f'    <h1>פרשת {esc(parasha)} לפי החלוקה לסדרים</h1>\n'
        body += (f'    <p class="seder-info">{esc(range_text(vs[0], vs[-1]))} · {len(vs)} פסוקים · '
                 + ', '.join(f'<a href="{href(seder_path(b, s))}">{esc(b)} סדר {esc(s)}</a>' for b, s in parts)
                 + f'</p>\n    <p class="seder-tools no-print"><a href="/?parasha={quote(slug(parasha))}">פתיחה באתר</a> · {print_button()}</p>\n')
        for (b, s), p in parts.items():
            body += f'    <h2><a href="{href(seder_path(b, s))}">{esc(b)} סדר {esc(s)}</a></h2>\n' + verses_html(p)
        body += navs
        desc = f'פרשת {parasha} לפי החלוקה היהודית של התנ"ך לסדרים: {where}. {snippet(vs, 15)}'
        pages[parasha_path(parasha)] = page(parasha_path(parasha), f'פרשת {parasha} לפי הסדרים | מסדירים', desc, body)

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
            body += (f'    <h2 id="seder-{esc(s["seder"])}"><a href="{href(seder_path(book, s["seder"]))}">{esc(book)} סדר {esc(s["seder"])}</a>'
                     f' <small>({esc(range_text(vs[0], vs[-1]))})</small></h2>\n' + verses_html(vs))
        body += navs
        desc = f'ספר {book} כולו לפי החלוקה היהודית של התנ"ך לסדרים ({count}), עם ניקוד וטעמים, לקריאה ולהדפסה.'
        pages[book_path(book)] = page(book_path(book), f'ספר {book} לפי הסדרים | מסדירים', desc, body)

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
                                     body)

    # ~~~ sitemap, robots.txt, llms.txt ~~~
    urls = ['', 'seder/', 'api.html', 'fame.html'] + [p for p in pages if p != 'seder/index.html']
    pages['sitemap.xml'] = ('<?xml version="1.0" encoding="UTF-8"?>\n'
                            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                            + ''.join(f'<url><loc>{url(u)}</loc></url>\n' for u in urls) + '</urlset>\n')
    pages['robots.txt'] = f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n'
    pages['llms.txt'] = LLMS_TXT
    return pages


LLMS_TXT = '''# מסדירים (Masdirim)

> The Hebrew Bible (Tanakh) divided into sedarim, the traditional Jewish division (447 sedarim), instead of the chapters introduced by Christian printers. The site converts between chapter:verse and seder:verse references, and shows every seder, chapter and weekly parasha with full vocalized text (nikud and cantillation). Hebrew. Free to use with attribution: "החלוקה לסדרים: מסדירים, www.masdirim.org".

## Pages
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
