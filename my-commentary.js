// my-commentary.html: the reader's own commentary (account.js keeps it), as a book by the order of the
// sedarim: for each verse they wrote on, the verse (if asked for) and what they wrote. Ready to print.

const box = document.getElementById('my-commentary');
const sederIndex = fetch('/API/sedarim.json').then(r => r.json());
const sederTexts = {};   // 'book|seder' -> the verses of the seder (API/seder_<seder>_<book>.json)

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}
const VALUES = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ל': 30, 'מ': 40,
    'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400};
const number = s => [...s].reduce((n, c) => n + (VALUES[c] || 0), 0);
const verseHref = (book, seder, verse) => '/seder/' + encodeURIComponent(book.replace(/ /g, '_')) + '/' + encodeURIComponent(seder) +
    '.html#' + encodeURIComponent(verse);
// the verse with nikud, without the marks of open and closed sections
const verseText = v => (v.versenikud || '').replace(/\{[פסש]\}/g, ' ').replace(/<br>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

function loadSeder(book, seder) {
    const key = book + '|' + seder;
    if (!sederTexts[key])
        sederTexts[key] = fetch('/API/' + encodeURIComponent('seder_' + seder + '_' + book.replace(/ /g, '_') + '.json'))
            .then(r => (r.ok ? r.json() : []))
            .catch(() => []);
    return sederTexts[key];
}

let current = null;   // the state last drawn
const choice = {book: '', verses: true};

async function render(state) {
    current = state;
    if (!state.ready) return;
    if (!state.user) {
        box.innerHTML = '<p>כדי לכתוב פרשנות משלכם לפסוקים ולראות אותה כאן, התחברו עם חשבון גוגל.</p>' +
            '<button type="button" class="btn btn-gold" id="sign-in">התחברות עם גוגל</button>';
        document.getElementById('sign-in').addEventListener('click', () => window.masdirimAccount.signIn());
        return;
    }
    if (!state.notesReady) return;
    let sedarim;
    try { sedarim = await sederIndex; } catch (e) {
        box.innerHTML = '<p>לא ניתן לטעון את רשימת הסדרים כרגע. נסו שוב מאוחר יותר.</p>';
        return;
    }
    const order = new Map(sedarim.map((s, i) => [s.book + '|' + s.seder, i]));
    const notes = [...state.notes.values()]
        .filter(n => order.has(n.book + '|' + n.seder))
        .sort((a, b) => order.get(a.book + '|' + a.seder) - order.get(b.book + '|' + b.seder) || number(a.verse) - number(b.verse));
    if (!notes.length) {
        box.innerHTML = '<p>עוד לא כתבתם פרשנות לאף פסוק. לחצו על פסוק כלשהו, ובתיבה "הפרשנות שלי" שמתחת לפירושים כתבו את הפירוש שלכם.</p>';
        return;
    }
    const books = [...new Set(notes.map(n => n.book))];
    if (choice.book && !books.includes(choice.book)) choice.book = '';
    const shown = notes.filter(n => !choice.book || n.book == choice.book);
    if (choice.verses) await Promise.all([...new Set(shown.map(n => n.book + '|' + n.seder))].map(k => loadSeder(...k.split('|'))));
    if (current != state) return;   // drawn again meanwhile

    const name = state.user.displayName || '';
    let html = '<div class="my-commentary-tools no-print">' +
        '<label>ספר: <select id="mc-book"><option value="">כל הספרים</option>' +
        books.map(b => '<option value="' + escapeHtml(b) + '"' + (b == choice.book ? ' selected' : '') + '>' + escapeHtml(b) + '</option>').join('') +
        '</select></label>' +
        '<label><input type="checkbox" id="mc-verses"' + (choice.verses ? ' checked' : '') + '> עם הפסוקים</label>' +
        '<button type="button" class="btn btn-gold" id="mc-print">הדפסה / שמירה כ-PDF</button></div>';
    html += '<div class="my-commentary-book"><h2 class="my-commentary-title">ספר הפרשנות' + (name ? ' של ' + escapeHtml(name) : '') + '</h2>' +
        '<p class="my-commentary-count">' + (shown.length == 1 ? 'פסוק אחד' : shown.length + ' פסוקים') +
        (choice.book ? ' בספר ' + escapeHtml(choice.book) : '') + '</p>';
    let lastBook = '', lastSeder = '';
    for (const n of shown) {
        if (n.book != lastBook) { html += '<h2>' + escapeHtml(n.book) + '</h2>'; lastBook = n.book; lastSeder = ''; }
        if (n.seder != lastSeder) { html += '<h3>סדר ' + escapeHtml(n.seder) + '</h3>'; lastSeder = n.seder; }
        let verse = '';
        if (choice.verses) {
            const v = (await loadSeder(n.book, n.seder)).find(x => x.verseseder == n.verse);
            if (v) verse = '<p class="my-commentary-verse">' + escapeHtml(verseText(v)) + '</p>';
        }
        html += '<section class="my-commentary-item"><p class="my-commentary-ref"><b>פסוק ' + escapeHtml(n.verse) + '</b> ' +
            '<a class="no-print" href="' + verseHref(n.book, n.seder, n.verse) + '">פתיחה ועריכה</a></p>' + verse +
            '<div class="my-commentary-note">' + escapeHtml(n.text) + '</div></section>';
    }
    box.innerHTML = html + '</div>';
    document.getElementById('mc-book').addEventListener('change', e => { choice.book = e.target.value; render(current); });
    document.getElementById('mc-verses').addEventListener('change', e => { choice.verses = e.target.checked; render(current); });
    document.getElementById('mc-print').addEventListener('click', () => window.print());
}

document.addEventListener('masdirim:account', event => render(event.detail));
if (window.masdirimAccount) render(window.masdirimAccount.getState());
