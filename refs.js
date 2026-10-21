// Finding references to the Tanakh by chapter and verse in free Hebrew text, and writing them by seder.
// Used by convert.html; written so it can also run in Node (for converting the commentaries later):
//
//     const refs = require('./refs.js');
//     const index = refs.buildIndex(require('./API/map.json'));
//     refs.convertText('כמו שכתוב בבראשית ג\' ח\'', index).text   // 'כמו שכתוב בבראשית סדר ב׳ פסוק ט׳'
//
// A reference is converted only when the book, chapter and verse exist, so "דברים רבים" or "שמות א'"
// with no verse are left alone. Recognised forms (with or without geresh / gershayim, Hebrew or digits):
//     בראשית ג' ח'  ·  בראשית ג, ח  ·  בראשית ג:ח  ·  בראשית פרק ג' פסוק ח'  ·  בראשית פ"ג פ"ח
//     (בר' ג ח)  ·  שמ"א ב, ג  ·  מלכים א' ג' ד'  ·  תהלים כ"ג  א-ג  ·  ישעיה מ, א-ב  ·  בראשית פרק ג
//     ובבראשית ג ח (a prefix letter stays)  ·  ranges: ג' ח'-י'  ·  ג' ח' - ד' ב'

(function (root) {
    'use strict';

    // ~~~ books: [canonical name as in sdarim.json, ...ways of writing it] ~~~
    const BOOKS = [
        ['בראשית', 'בראשית', "בר'", "ברא'", "בראש'"],
        ['שמות', 'שמות', "שמ'"],
        ['ויקרא', 'ויקרא', "ויק'", "ויקר'"],
        ['במדבר', 'במדבר', "במ'", "במד'", "במדב'"],
        ['דברים', 'דברים', "דב'", "דבר'"],
        ['יהושע', 'יהושע', "יהו'", "יהוש'"],
        ['שופטים', 'שופטים', "שופ'", "שופט'"],
        ['ישעיהו', 'ישעיהו', 'ישעיה', "ישע'", "יש'"],
        ['ירמיהו', 'ירמיהו', 'ירמיה', "ירמ'"],
        ['יחזקאל', 'יחזקאל', "יחז'", "יחזק'"],
        ['הושע', 'הושע', "הוש'"],
        ['יואל', 'יואל'],
        ['עמוס', 'עמוס'],
        ['עובדיה', 'עובדיה', 'עבדיה'],
        ['יונה', 'יונה'],
        ['מיכה', 'מיכה'],
        ['נחום', 'נחום'],
        ['חבקוק', 'חבקוק'],
        ['צפניה', 'צפניה'],
        ['חגי', 'חגי'],
        ['זכריה', 'זכריה', "זכר'"],
        ['מלאכי', 'מלאכי', "מלא'"],
        ['תהילים', 'תהילים', 'תהלים', "תה'", "תהל'", "תהי'"],
        ['משלי', 'משלי', "מש'", "משל'"],
        ['איוב', 'איוב'],
        ['שיר השירים', 'שיר השירים', 'שה"ש', 'שיה"ש', 'שיר-השירים'],
        ['רות', 'רות'],
        ['איכה', 'איכה'],
        ['קהלת', 'קהלת', "קה'", "קהל'"],
        ['אסתר', 'אסתר', "אס'", "אסת'"],
        ['דניאל', 'דניאל', "דנ'", "דני'"],
        ['עזרא', 'עזרא'],
        ['נחמיה', 'נחמיה', "נחמ'"],
        ['שמואל א', 'שמ"א', 'ש"א', 'שמו"א'],
        ['שמואל ב', 'שמ"ב', 'ש"ב', 'שמו"ב'],
        ['מלכים א', 'מל"א', 'מ"א'],
        ['מלכים ב', 'מל"ב', 'מ"ב'],
        ['דברי הימים א', 'דה"א', 'דבה"א', 'דברי הימים א', 'דבהי"א'],
        ['דברי הימים ב', 'דה"ב', 'דבה"ב', 'דברי הימים ב', 'דבהי"ב'],
    ];
    // books in two parts written out: שמואל א' / שמואל-ב / מלכים ראשון / דברי הימים ב'
    const TWO_PARTS = [['שמואל', 'שמואל'], ['מלכים', 'מלכים'], ['דברי הימים', 'דברי[- ]הימים'], ['דברי הימים', 'דבה"י']];

    const Q1 = "['׳`]";            // geresh, as typed or as the Hebrew sign
    const Q2 = '["״”]';            // gershayim

    function escapeRe(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, Q1).replace(/"/g, Q2);
    }

    const bookAlternatives = [];
    BOOKS.forEach(([name, ...forms]) => forms.forEach(form => bookAlternatives.push([escapeRe(form), name])));
    TWO_PARTS.forEach(([name, base]) => {
        bookAlternatives.push([base + '\\s*-?\\s*(?:א' + Q1 + '?|ראשון)(?![א-ת])', name + ' א']);
        bookAlternatives.push([base + '\\s*-?\\s*(?:ב' + Q1 + '?|שני)(?![א-ת])', name + ' ב']);
    });
    // longest first, so "דברי הימים א" wins over "דברים" and "שמואל א" over "שמ'"
    bookAlternatives.sort((a, b) => b[0].length - a[0].length);

    // ~~~ Hebrew numerals ~~~
    const VALUES = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ך': 20,
        'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200};

    // 'כ"א' / 'כא' / "ח'" / '21' -> 21; null if it is not a proper numeral (letters must go from large to small)
    function numberValue(text) {
        const t = text.replace(/['׳`"״”]/g, '');
        if (/^\d+$/.test(t)) return Number(t);
        let total = 0, last = Infinity;
        for (const c of t) {
            const v = VALUES[c];
            if (!v || v > last) {
                // טו and טז are the only allowed rises
                if (!(v && (t == 'טו' || t == 'טז'))) return null;
            }
            total += v;
            last = v;
        }
        if (/יה|יו/.test(t) && (total == 15 || total == 16)) return null;   // 15 and 16 are written טו, טז
        return total || null;
    }

    function hebrewNumber(n) {
        if (n == 15) return 'טו';
        if (n == 16) return 'טז';
        const units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
        const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
        let s = n >= 100 ? 'ק' : '';
        n %= 100;
        if (n == 15 || n == 16) return s + (n == 15 ? 'טו' : 'טז');
        return s + tens[Math.floor(n / 10)] + units[n % 10];
    }

    // ~~~ the pattern ~~~
    // a number: digits, or Hebrew letters with an optional geresh / gershayim
    const NUM = "(?:\\d{1,3}(?!\\d)|[א-ת]{1,3}" + Q2 + "[א-ת](?![א-ת])|[א-ת]{1,4}(?:" + Q1 + "|(?![א-ת])))";
    // פרק ג / פ' ג / פ"ג, and פסוק ח / פס' ח / פ"ח
    const CH_WORD = "(?:פרק|פ" + Q1 + "|פ" + Q2 + "(?=[א-ת]))";
    const V_WORD = "(?:פסוקים|פסוק|פס" + Q1 + "|פ" + Q2 + "(?=[א-ת]))";
    // between chapter and verse: a comma, colon or full stop, spaces, or nothing after a geresh (ג'ח')
    const SEP = "(?:\\s*[,:.]\\s*|\\s+|(?<=" + Q1 + "))";
    const DASH = "\\s*[-–—]\\s*";
    const BOOK = '(?:' + bookAlternatives.map(a => '(' + a[0] + ')').join('|') + ')';
    // groups: prefix, book alternatives..., then chapter, verse, end-chapter, end-verse / chapter-only
    const PATTERN = new RegExp(
        '(?<![א-ת])([ובכלמהש]{0,2}?)' + BOOK + '(?:\\s*,)?\\s*' +
        '(?:(?:' + CH_WORD + '\\s*)(' + NUM + ')(?:' + SEP + V_WORD + '?\\s*(' + NUM + '))?' +
        '|(' + NUM + ')' + SEP + '(?:' + V_WORD + '\\s*)?(' + NUM + '))' +
        '(?:' + DASH + '(?:(' + NUM + ')' + SEP + ')?(' + NUM + '))?' +
        '(?![א-ת\\d])', 'gd');
    const BOOK_GROUPS = bookAlternatives.length;

    // whole chapters: "שמות פרקים ג-ה", "שמות פרקים ג, ד", "פרקים ג וד", "שמות פרק ג-ה" (a single chapter,
    // "שמות פרק ג", is read by PATTERN). Groups: prefix, book alternatives..., the word, the list
    const CHAPTER_LIST = new RegExp(
        '(?<![א-ת])([ובכלמהש]{0,2}?)' + BOOK + '(?:\\s*,)?\\s*(פרקים|פרק)\\s*' +
        '(' + NUM + '(?:(?:(?:\\s+ו)?' + DASH + '|\\s*,\\s*ו?|\\s+ו(?=[א-ת]))' + NUM + ')*)' +
        '(?![א-ת\\d])', 'g');

    // the chapters in a list like "ג-ה, ז וט" -> [[3, 5], [7, 7], [9, 9]], consecutive ones joined;
    // stops at the first number that is not a chapter of the book. {ranges, length} (length: of the text read)
    function chapterRanges(list, book, index) {
        const ranges = [];
        const re = new RegExp('^((?:\\s+ו)?' + DASH + '|\\s*,\\s*ו?|\\s+ו)?(' + NUM + ')');
        let pos = 0, length = 0, first = true, lastStart = 0;
        while (pos < list.length) {
            const m = re.exec(list.slice(pos));
            if (!m || (first && m[1])) break;
            const n = numberValue(m[2]);
            const dash = m[1] && /[-–—]/.test(m[1]);
            const last = ranges[ranges.length - 1];
            if (!n || !index.chapters.has(book + '|' + n) || (dash && n <= last[1])) {
                // "ג-נא" with no chapter נא: the range is wrong, so its first chapter is dropped too
                if (dash && last && last[0] == last[1]) {
                    ranges.pop();
                    length = lastStart;
                }
                break;
            }
            if (dash && last) {
                last[1] = n;
            } else if (last && n == last[1] + 1) {
                last[1] = n;
            } else {
                ranges.push([n, n]);
                lastStart = pos;
            }
            pos += m[0].length;
            length = pos;
            first = false;
        }
        return {ranges, length};
    }

    // "בספר שמואל א'" (a book in two parts, named after the word ספר and with no chapter or verse after it)
    // is one book of sedarim: "בספר שמואל". Groups: the word with its prefix, the book, the part
    const BOOK_NAME = new RegExp('(?<![א-ת])([ובכלמהש]{0,3}?ספר\\s+)(שמואל|מלכים|דברי[- ]הימים)\\s*-?\\s*(?:(א|ראשון)|ב|שני)' +
        Q1 + '?(?![א-ת])', 'g');

    // "בספר עזרא" / "בספר נחמיה" are one book of sedarim, "עזרא ונחמיה"; "בספר עמוס" is in "תרי עשר"
    const TREI_ASAR = ['הושע', 'יואל', 'עמוס', 'עובדיה', 'יונה', 'מיכה', 'נחום', 'חבקוק', 'צפניה', 'חגי', 'זכריה', 'מלאכי'];
    const BOOK_IN_SEDER_BOOK = new RegExp('(?<![א-ת])([ובכלמהש]{0,3}?ספר\\s+)(עזרא|נחמיה|' + TREI_ASAR.join('|') +
        ')(?![א-ת])(?!\\s+ונחמיה)', 'g');

    function findBookNames(text) {
        const found = [];
        BOOK_IN_SEDER_BOOK.lastIndex = 0;
        let n;
        while ((n = BOOK_IN_SEDER_BOOK.exec(text))) {
            const name = n[2];
            const book = TREI_ASAR.includes(name) ? 'תרי עשר' : 'עזרא ונחמיה';
            const written = book == 'תרי עשר' ? book + ' (' + name + ')' : book;
            found.push({start: n.index, end: n.index + n[0].length, prefix: n[1], book: written, kind: 'book',
                        chapterBook: name, url: 'https://www.masdirim.org/book/' + book.replace(/ /g, '_') + '.html', text: n[0]});
        }
        BOOK_NAME.lastIndex = 0;
        let m;
        while ((m = BOOK_NAME.exec(text))) {
            const book = m[2].replace('-', ' ');
            // chapterBook: for "שם, ג, ד" after it
            found.push({start: m.index, end: m.index + m[0].length, prefix: m[1], book, kind: 'book',
                        chapterBook: book + (m[3] ? ' א' : ' ב'),
                        url: 'https://www.masdirim.org/book/' + book.replace(/ /g, '_') + '.html', text: m[0]});
        }
        return found;
    }

    function findChapterLists(text, index) {
        const lists = [];
        CHAPTER_LIST.lastIndex = 0;
        let m;
        while ((m = CHAPTER_LIST.exec(text))) {
            let book = null;
            for (let i = 0; i < BOOK_GROUPS; i++) if (m[2 + i] !== undefined) { book = bookAlternatives[i][1]; break; }
            const word = m[2 + BOOK_GROUPS], list = m[3 + BOOK_GROUPS];
            const {ranges, length} = chapterRanges(list, book, index);
            const read = list.slice(0, length);
            // "פרק" is a list only with a dash and no comma: "פרק ג" alone is PATTERN's, and "פרק ג, ח" is a verse
            if (!ranges.length || (word == 'פרק' && (!/[-–—]/.test(read) || /,/.test(read)))) {
                CHAPTER_LIST.lastIndex = m.index + 1;
                continue;
            }
            const end = m.index + m[0].length - list.length + length;
            CHAPTER_LIST.lastIndex = end;
            const parts = ranges.map(([a, b]) => ({from: index.chapters.get(book + '|' + a).first,
                                                   to: index.chapters.get(book + '|' + b).last}));
            lists.push({start: m.index, end, prefix: m[1] || '', book, chapter: ranges[0][0], verse: null,
                        lastChapter: ranges[ranges.length - 1][1],
                        from: parts[0].from, to: parts[parts.length - 1].to, parts, text: text.slice(m.index, end)});
        }
        return lists;
    }

    // ~~~ the index: chapter location -> seder location, from API/map.json ~~~
    function buildIndex(map) {
        const fields = map.fields;
        const at = name => fields.indexOf(name);
        const [b, c, v, sb, s, sv] = ['bookchapter', 'chapter', 'versechapter', 'bookseder', 'seder', 'verseseder'].map(at);
        const verses = new Map(), chapters = new Map();
        map.verses.forEach(row => {
            const ch = numberValue(row[c]), vs = numberValue(row[v]);
            const loc = {book: row[sb], seder: row[s], verse: row[sv], chapterBook: row[b], chapter: ch, chapterVerse: vs};
            verses.set(row[b] + '|' + ch + '|' + vs, loc);
            const key = row[b] + '|' + ch;
            if (!chapters.has(key)) chapters.set(key, {first: loc, last: loc});
            chapters.get(key).last = loc;
        });
        return {verses, chapters};
    }

    // ~~~ finding ~~~
    // [{start, end, prefix, book, chapter, verse, toChapter, toVerse, from, to}] (from/to are seder locations)
    function findReferences(text, index) {
        const lists = findChapterLists(text, index);
        const inList = pos => lists.some(r => pos >= r.start && pos < r.end);
        const found = [];
        const G = 2 + BOOK_GROUPS;   // the first group after the book: see PATTERN
        PATTERN.lastIndex = 0;
        let m;
        while ((m = PATTERN.exec(text))) {
            const start = m.index;
            const prefix = m[1] || '';
            let book = null;
            for (let i = 0; i < BOOK_GROUPS; i++) if (m[2 + i] !== undefined) { book = bookAlternatives[i][1]; break; }
            // the groups after the book: chapter and verse after the word פרק, or chapter and verse,
            // then the end of a range (its chapter and verse)
            const afterPerek = m[G] !== undefined;
            const chapterAt = afterPerek ? G : G + 2, verseAt = afterPerek ? G + 1 : G + 3;
            const chapter = numberValue(m[chapterAt]);
            let verse = m[verseAt] !== undefined ? numberValue(m[verseAt]) : null;
            let end = m.indices[0][1];
            // a number that is not a verse (a word that only looks like one): stop before it
            const stopBefore = group => { end = m.indices[group][0]; while (/[\s,:.\-–—]/.test(text[end - 1])) end--; };
            if (!book || !chapter) { PATTERN.lastIndex = start + 1; continue; }
            if (m[verseAt] !== undefined && !verse) {
                if (!afterPerek) { PATTERN.lastIndex = start + 1; continue; }
                stopBefore(verseAt);   // בראשית פרק ג כתוב: the whole chapter
            }
            let toChapter = m[G + 4] !== undefined ? numberValue(m[G + 4]) : null;
            let toVerse = m[G + 5] !== undefined && verse ? numberValue(m[G + 5]) : null;
            if (m[G + 4] !== undefined && !toChapter) {
                // "הושע יד י - יואל א ב": a range into another book is not read; the reference ends before the dash
                toVerse = null;
                stopBefore(G + 4);
            }
            // "ג ח-ט, י" is verses ח-ט and then י, not a range to chapter ט: a range to another chapter has
            // to be written like its start ("ג' ח' - ד' ב'", "א, א - ב, ג") and go forward
            const sepKind = (from, to) => { const t = text.slice(m.indices[from][1], m.indices[to][0]); return /,/.test(t) ? ',' : /:/.test(t) ? ':' : /\./.test(t) ? '.' : ' '; };
            if (m[G + 4] !== undefined && m[G + 5] !== undefined && toChapter && toVerse && verse &&
                (sepKind(chapterAt, verseAt) != sepKind(G + 4, G + 5) || toChapter <= chapter)) toVerse = null;
            if (m[G + 4] !== undefined && m[G + 5] !== undefined && !toVerse && toChapter) {
                // "א-ג נאמר": the range ends at its first number
                toVerse = toChapter;
                toChapter = null;
                end = m.indices[G + 4][1];
            } else if (m[G + 5] !== undefined && !toVerse && verse) {
                stopBefore(m[G + 4] !== undefined ? G + 4 : G + 5);   // no range after all
            }
            PATTERN.lastIndex = end;
            const ref = {start, end, prefix, book, chapter, verse, text: text.slice(start, end)};
            if (!verse) {
                // a whole chapter (only after the word פרק)
                const ch = index.chapters.get(book + '|' + chapter);
                if (!ch) { PATTERN.lastIndex = start + 1; continue; }
                found.push(Object.assign(ref, {from: ch.first, to: ch.last}));
                continue;
            }
            const from = index.verses.get(book + '|' + chapter + '|' + verse);
            if (!from) { PATTERN.lastIndex = start + 1; continue; }
            let to = null;
            if (toVerse) {
                to = index.verses.get(book + '|' + (toChapter || chapter) + '|' + toVerse);
                // a range has to go forward
                if (to && (to.chapter < from.chapter || (to.chapter == from.chapter && to.chapterVerse < from.chapterVerse))) to = null;
                if (!to) {
                    // the dash did not start a range: keep the reference without it
                    stopBefore(m[G + 4] !== undefined ? G + 4 : G + 5);
                    ref.end = end;
                    ref.text = text.slice(start, end);
                    PATTERN.lastIndex = end;
                }
            }
            found.push(Object.assign(ref, {toChapter, toVerse, from, to}));
        }
        // a chapter list wins over a reference PATTERN read inside it ("שמות פרק ג-ה")
        const refs = found.filter(r => !inList(r.start) && !lists.some(l => l.start >= r.start && l.start < r.end)).concat(lists);
        // a book name only where it does not begin a reference ("בספר שמואל א' ג' ד'" is a reference)
        const overlaps = b => refs.some(r => r.start < b.end && b.start < r.end);
        const all = refs.concat(findBookNames(text).filter(b => !overlaps(b)));
        return resolveSham(text, all.sort((a, b) => a.start - b.start), index);
    }

    // ~~~ "שם": the same book (and chapter) as the reference before it ~~~
    // "שם, שם, כ" (same book and chapter, verse כ) · "שם, כ" / "שם פסוק כ" (same chapter) ·
    // "שם, ד, ה" / "שם פרק ד פסוק ה" (same book) · "שם פרק ד" (a whole chapter) · with a range: "שם, כ-כב".
    // "שם" without a comma or the words פרק / פסוק after it is left alone ("שם ה'" is not a reference).
    // Groups: prefix; verse after שם, שם; chapter / verse after פרק; chapter, verse; verse; end of range
    const AFTER_SHAM = "(?:\\s*,\\s*)";
    const SHAM = new RegExp('(?<![א-ת])([ובכלמה]{0,2}?)שם(?:' +
        '(?:\\s*,\\s*|\\s+)שם' + AFTER_SHAM + '(?:' + V_WORD + '\\s*)?(' + NUM + ')' +
        '|(?:' + AFTER_SHAM + '|\\s+)' + CH_WORD + '\\s*(' + NUM + ')(?:' + SEP + V_WORD + '?\\s*(' + NUM + '))?' +
        '|' + AFTER_SHAM + '(' + NUM + ')' + SEP + '(?:' + V_WORD + '\\s*)?(' + NUM + ')' +
        '|(?:' + AFTER_SHAM + '(?:' + V_WORD + '\\s*)?|\\s+' + V_WORD + '\\s*)(' + NUM + ')' +
        ')(?:' + DASH + '(' + NUM + '))?(?![א-ת\\d])', 'gd');

    function resolveSham(text, refs, index) {
        const candidates = [];
        SHAM.lastIndex = 0;
        let m;
        while ((m = SHAM.exec(text))) {
            if (!refs.some(r => r.start < SHAM.lastIndex && m.index < r.end)) candidates.push(m);
            SHAM.lastIndex = m.index + 1;
        }
        const out = [];
        let context = null;   // {book (as in the chapter numbering), chapter}
        let i = 0;
        const take = r => {
            out.push(r);
            if (r.kind == 'book') context = {book: r.chapterBook, chapter: null};
            else context = {book: r.book, chapter: r.lastChapter || r.toChapter || r.chapter};
        };
        refs.forEach(r => {
            for (; i < candidates.length && candidates[i].index < r.start; i++) {
                const s = shamRef(text, candidates[i], context, index);
                if (s && (!out.length || s.start >= out[out.length - 1].end)) take(s);
            }
            take(r);
        });
        for (; i < candidates.length; i++) {
            const s = shamRef(text, candidates[i], context, index);
            if (s && (!out.length || s.start >= out[out.length - 1].end)) take(s);
        }
        return out;
    }

    function shamRef(text, m, context, index) {
        if (!context) return null;
        const at = g => m[g] !== undefined;
        let chapter = null, verse = null, end = m.indices[0][1], cut = null;
        if (at(2)) { chapter = context.chapter; verse = numberValue(m[2]); cut = 2; }
        else if (at(3)) {
            chapter = numberValue(m[3]);
            verse = at(4) ? numberValue(m[4]) : null;
            if (at(4) && !verse) { end = m.indices[3][1]; }   // "שם פרק ד ויאמר": the chapter
            cut = at(4) && verse ? 4 : 3;
        }
        else if (at(5)) {
            chapter = numberValue(m[5]);
            verse = numberValue(m[6]);
            if (!verse) { chapter = context.chapter; verse = numberValue(m[5]); end = m.indices[5][1]; cut = 5; }
            else cut = 6;
        }
        else if (at(7)) { chapter = context.chapter; verse = numberValue(m[7]); cut = 7; }
        if (!chapter || (cut != 3 && !verse)) return null;
        const book = context.book;
        const prefix = m[1] || '';
        const ref = {start: m.index, prefix, book, chapter, verse, sham: true};
        let toVerse = at(8) && end == m.indices[0][1] ? numberValue(m[8]) : null;
        if (at(8) && end == m.indices[0][1] && !toVerse) end = m.indices[cut][1];
        if (!verse) {
            const ch = index.chapters.get(book + '|' + chapter);
            if (!ch) return null;
            Object.assign(ref, {from: ch.first, to: ch.last});
        } else {
            const from = index.verses.get(book + '|' + chapter + '|' + verse);
            if (!from) return null;
            let to = toVerse ? index.verses.get(book + '|' + chapter + '|' + toVerse) : null;
            if (to && to.chapterVerse < from.chapterVerse) to = null;
            if (toVerse && !to) end = m.indices[cut][1];
            Object.assign(ref, {from, to});
        }
        ref.end = end;
        ref.text = text.slice(ref.start, end);
        return ref;
    }

    // ~~~ writing ~~~
    // style: {quotes: true} writes ב׳ / כ״א; the default follows the reference being replaced
    function numeral(n, quotes) {
        const h = hebrewNumber(n);
        if (!quotes) return h;
        return h.length == 1 ? h + '׳' : h.slice(0, -1) + '״' + h.slice(-1);
    }

    function sederRef(ref, options) {
        if (ref.kind == 'book') return ref.book;
        // a list of chapters that are not one after the other: each range in turn
        if (ref.parts && ref.parts.length > 1)
            return ref.parts.map((part, i) => {
                const one = sederRef(Object.assign({}, ref, part, {parts: null}), options);
                return i == 0 ? one : one.replace(/^.*? סדר /, 'סדר ');
            }).join(', ');
        const quotes = options && options.quotes != null ? options.quotes : /['׳"״”]/.test(ref.text);
        const n = s => numeral(numberValue(s), quotes);
        const a = ref.from, b = ref.to;
        // the twelve prophets are one book of sedarim: name the prophet too, "תרי עשר (עמוס) סדר ז"
        const book = loc => loc.book == 'תרי עשר' ? loc.book + ' (' + loc.chapterBook + ')' : loc.book;
        let out = book(a) + ' סדר ' + n(a.seder);
        if (!b || (b.book == a.book && b.seder == a.seder && b.verse == a.verse)) return out + ' פסוק ' + n(a.verse);
        if (b.book == a.book && b.seder == a.seder) return out + ' פסוקים ' + n(a.verse) + '-' + n(b.verse);
        out += ' פסוק ' + n(a.verse) + ' עד ';
        if (b.book != a.book || b.chapterBook != a.chapterBook) out += book(b) + ' ';
        return out + 'סדר ' + n(b.seder) + ' פסוק ' + n(b.verse);
    }

    // the address of a reference on the site: the seder with the first verse marked
    function sederUrl(ref) {
        if (ref.url) return ref.url;
        return 'https://www.masdirim.org/?book=' + ref.from.book.replace(/ /g, '_') +
            '&seder=' + ref.from.seder + '&verse=' + ref.from.verse;
    }

    // {text, refs}: the text with every reference written by seder, and the references found
    function convertText(text, index, options) {
        const refs = findReferences(text, index);
        let out = '', last = 0;
        refs.forEach(r => {
            r.converted = r.prefix + sederRef(r, options);
            out += text.slice(last, r.start) + r.converted;
            last = r.end;
        });
        return {text: out + text.slice(last), refs};
    }

    const api = {buildIndex, findReferences, convertText, sederRef, sederUrl, numberValue, hebrewNumber};
    if (typeof module == 'object' && module.exports) module.exports = api;
    else root.masdirimRefs = api;
})(typeof window != 'undefined' ? window : this);
