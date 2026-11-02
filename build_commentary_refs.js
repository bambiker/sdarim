// The references to the Tanakh in the commentaries, written by seder: run after build_commentary.py
// (which runs it itself when node is installed), or alone:
//
//     node build_commentary_refs.js
//
// Rewrites commentary/<book>/<seder>.json in place. Only a reference that is the whole of a parenthesis is
// converted, the way Sefaria's editions write them: "(משלי ח')", "(דברים י"ח, ד')", "(שם כ"ז)", "(שם)".
// A parenthesis that holds anything else ("(סנהדרין לח:)", "(שמות רבה א)", an explanation) is left as it
// is, so the text of a commentary is never changed by mistake. Each converted reference is a link to the
// seder on the site.
//     a verse or verses          (דברים י"ח, ד')  -> (דברים סדר י"ד פסוק ד')
//     a whole chapter            (משלי ח')        -> (משלי סדר ב') ; in two sedarim: (ירמיהו סדרים א'-ב')
//     "שם", the reference before it in the same comment, in a parenthesis or by the rules of refs.js:
//         (שם)       the same place
//         (שם כ"ז)   after a chapter: chapter כ"ז of the same book; after a verse: verse כ"ז of the same chapter
//         (שם ג, ח)  chapter ג verse ח of the same book
// Running it again changes nothing: a converted parenthesis holds a link, and parentheses with tags are skipped.

const fs = require('fs');
const path = require('path');
const refs = require('./refs.js');

const ROOT = __dirname;
const index = refs.buildIndex(JSON.parse(fs.readFileSync(path.join(ROOT, 'API', 'map.json'), 'utf8')));

const NIKUD = /[\u0591-\u05BD\u05BF-\u05C7]/g;
const slug = s => s.replace(/ /g, '_');
const href = (...parts) => '/' + parts.map(p => encodeURIComponent(p)).join('/');

function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
}

// "(משלי ח')" -> "משלי סדר ב'"; a chapter in two sedarim (or more): "ירמיהו סדרים א'-ב'"
function chapterText(ref) {
    const a = ref.from, b = ref.to;
    const quotes = /['׳"״”]/.test(ref.text);
    const n = s => refs.numeral(refs.numberValue(s), quotes);
    const book = loc => loc.book == 'תרי עשר' ? loc.book + ' (' + loc.chapterBook + ')' : loc.book;
    if (a.book == b.book && a.seder == b.seder) return book(a) + ' סדר ' + n(a.seder);
    if (a.book == b.book) return book(a) + ' סדרים ' + n(a.seder) + '-' + n(b.seder);
    return book(a) + ' סדר ' + n(a.seder) + ' ו' + book(b) + ' סדר ' + n(b.seder);
}

// the place on the site: the chapter page shows the whole sedarim with the chapter marked in them;
// a verse is shown in its seder's page
function link(ref) {
    if (ref.kind == 'book') return ref.url.replace('https://www.masdirim.org', '');
    if (ref.verse == null) return href('perek', slug(ref.chapterBook || ref.book), refs.hebrewNumber(ref.chapter) + '.html');
    return href('seder', slug(ref.from.book), ref.from.seder + '.html') + '#' + encodeURIComponent(ref.from.verse);
}

function written(ref) {
    return ref.kind != 'book' && ref.verse == null ? chapterText(ref) : refs.sederRef(ref);
}

// a reference to a chapter, or to a verse, by book (as numbered in chapters), chapter and verse
function placeRef(book, chapter, verse, text) {
    if (verse == null) {
        const ch = index.chapters.get(book + '|' + chapter);
        return ch && {book, chapterBook: book, chapter, verse: null, from: ch.first, to: ch.last, text, prefix: ''};
    }
    const loc = index.verses.get(book + '|' + chapter + '|' + verse);
    return loc && {book, chapter, verse, from: loc, to: null, text, prefix: ''};
}

// a number: כ"ז / כז / ח' / 27 (gershayim only before the last letter)
const NUM = "((?:[א-ת]{1,3}[\"״”][א-ת]|[א-ת]{1,4}['׳]?|\\d{1,3})(?![א-ת\\d]))";
const SHAM_ALONE = /^\s*שם\s*$/;
const SHAM_ONE = new RegExp('^\\s*שם\\s*,?\\s*' + NUM + '\\s*$');
const SHAM_TWO = new RegExp('^\\s*שם\\s*,?\\s*' + NUM + '(?:\\s*[,:]\\s*|\\s+)' + NUM + '\\s*$');

// the content of one parenthesis -> [{start, end, ref}] covering all of it, or null; context:
// {book, chapter, verse, ref} of the last reference, for "שם"
function parse(content, state) {
    const c = state.context;
    let m;
    if (SHAM_ALONE.test(content)) return c && c.ref ? [{ref: Object.assign({}, c.ref, {text: content}), start: 0, end: content.length}] : null;
    if ((m = SHAM_TWO.exec(content))) {
        const ref = c && placeRef(c.book, refs.numberValue(m[1]), refs.numberValue(m[2]), content);
        return ref ? [{ref, start: 0, end: content.length}] : null;
    }
    if ((m = SHAM_ONE.exec(content))) {
        if (!c) return null;
        const n = refs.numberValue(m[1]);
        // after a chapter (or a book), the number is a chapter; after a verse, a verse of its chapter
        const ref = c.verse == null ? placeRef(c.book, n, null, content) : placeRef(c.book, c.chapter, n, content);
        return ref ? [{ref, start: 0, end: content.length}] : null;
    }
    const chapter = refs.chapterAlone(content, index);
    if (chapter) return [{ref: chapter, start: chapter.start, end: chapter.end}];
    const options = {context: c && {book: c.book, chapter: c.chapter}};
    const found = refs.findReferences(content, index, options);
    if (!found.length) return null;
    // everything outside the references: only separators
    let rest = '', last = 0;
    found.forEach(r => { rest += content.slice(last, r.start); last = r.end; });
    rest += content.slice(last);
    if (!/^[\s,;.:\-–—]*$/.test(rest)) return null;
    return found.map(ref => ({ref, start: ref.start, end: ref.end}));
}

function remember(ref, state) {
    if (ref.kind == 'book') state.context = {book: ref.chapterBook, chapter: null, verse: null, ref: null};
    else state.context = {book: ref.chapterBook || ref.book, chapter: ref.lastChapter || ref.toChapter || ref.chapter,
                          verse: ref.lastChapter ? null : ref.verse, ref};
}

// one comment (HTML: only b, i, br, small, and the links made here)
function convertComment(html, state) {
    return html.replace(/\(([^()<>]{1,80})\)/g, (whole, raw) => {
        const content = raw.replace(NIKUD, '');
        const parts = parse(content, state);
        if (!parts) {
            // another kind of reference (Talmud, Midrash) or not one at all: "שם" after it is not ours
            if (/[א-ת]/.test(content)) state.context = null;
            return whole;
        }
        let out = '', last = 0;
        parts.forEach(({ref, start, end}) => {
            out += escapeHtml(content.slice(last, start)) + escapeHtml(ref.prefix || '') +
                '<a class="ref" href="' + escapeHtml(link(ref)) + '">' + escapeHtml(written(ref)) + '</a>';
            last = end;
            remember(ref, state);
        });
        return '(' + out + escapeHtml(content.slice(last)) + ')';
    });
}

function main() {
    const dir = path.join(ROOT, 'commentary');
    let files = 0, changed = 0, links = 0;
    for (const book of fs.readdirSync(dir)) {
        const bookDir = path.join(dir, book);
        if (!fs.statSync(bookDir).isDirectory()) continue;
        for (const name of fs.readdirSync(bookDir)) {
            if (!name.endsWith('.json')) continue;
            const file = path.join(bookDir, name);
            const text = fs.readFileSync(file, 'utf8');
            const data = JSON.parse(text);
            for (const entries of Object.values(data))
                for (const entry of entries) {
                    // "שם" goes on through the comments of one commentator on one verse
                    const state = {context: null};
                    entry.comments = entry.comments.map(c => convertComment(c, state));
                }
            const out = serialize(text, data);
            files++;
            if (out != text) {
                links += (out.match(/class=\\?"ref/g) || []).length - (text.match(/class=\\?"ref/g) || []).length;
                fs.writeFileSync(file, out);
                changed++;
            }
        }
    }
    console.log(files, 'files,', changed, 'changed,', links, 'references converted');
}

// the same layout as the file was written in (build_commentary.py writes one verse to a line)
function serialize(original, data) {
    if (/^\{\n/.test(original))
        return '{\n' + Object.entries(data).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n') + '\n}\n';
    return JSON.stringify(data);
}

if (require.main === module) main();
module.exports = {convertComment};
