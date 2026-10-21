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
        return found;
    }

    // ~~~ writing ~~~
    // style: {quotes: true} writes ב׳ / כ״א; the default follows the reference being replaced
    function numeral(n, quotes) {
        const h = hebrewNumber(n);
        if (!quotes) return h;
        return h.length == 1 ? h + '׳' : h.slice(0, -1) + '״' + h.slice(-1);
    }

    function sederRef(ref, options) {
        const quotes = options && options.quotes != null ? options.quotes : /['׳"״”]/.test(ref.text);
        const n = s => numeral(numberValue(s), quotes);
        const a = ref.from, b = ref.to;
        let out = a.book + ' סדר ' + n(a.seder);
        if (!b || (b.book == a.book && b.seder == a.seder && b.verse == a.verse)) return out + ' פסוק ' + n(a.verse);
        if (b.book == a.book && b.seder == a.seder) return out + ' פסוקים ' + n(a.verse) + '-' + n(b.verse);
        out += ' פסוק ' + n(a.verse) + ' עד ';
        if (b.book != a.book) out += b.book + ' ';
        return out + 'סדר ' + n(b.seder) + ' פסוק ' + n(b.verse);
    }

    // the address of a reference on the site: the seder with the first verse marked
    function sederUrl(ref) {
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
