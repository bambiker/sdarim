// progress.html: the sedarim and verses the reader marked as learned (account.js keeps them), by book.
// A seder marked as learned counts all its verses; a verse marked by itself counts in its seder.
// And the reader's own commentary: how many verses they wrote on, in each book.

const box = document.getElementById('progress');
const sederIndex = fetch('/API/sedarim.json').then(r => r.json());

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}
const sederHref = s => '/seder/' + encodeURIComponent(s.book.replace(/ /g, '_')) + '/' + encodeURIComponent(s.seder) + '.html';
const percent = (a, b) => (b ? Math.floor(a * 1000 / b) / 10 : 0);
const bar = p => '<div class="progress-bar" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100">' +
    '<span style="width:' + p + '%"></span></div>';

async function render(state) {
    if (!state.ready) return;
    if (!state.user) {
        box.innerHTML = '<p>כדי לסמן סדרים ופסוקים שלמדתם ולראות את ההתקדמות שלכם, התחברו עם חשבון גוגל.</p>' +
            '<button type="button" class="btn btn-gold" id="sign-in">התחברות עם גוגל</button>';
        document.getElementById('sign-in').addEventListener('click', () => window.masdirimAccount.signIn());
        return;
    }
    let sedarim;
    try { sedarim = await sederIndex; } catch (e) {
        box.innerHTML = '<p>לא ניתן לטעון את רשימת הסדרים כרגע. נסו שוב מאוחר יותר.</p>';
        return;
    }
    // verses learned in each seder: all of it, or the verses marked in it
    const versesIn = {};
    state.verses.forEach(key => {
        const seder = key.split('|').slice(0, 2).join('|');
        versesIn[seder] = (versesIn[seder] || 0) + 1;
    });
    const learnedVerses = s => {
        const key = s.book + '|' + s.seder;
        return state.sedarim.has(key) ? s.verses : Math.min(versesIn[key] || 0, s.verses);
    };
    const books = [];
    sedarim.forEach(s => {
        let b = books[books.length - 1];
        if (!b || b.name != s.book) books.push(b = {name: s.book, sedarim: []});
        b.sedarim.push(s);
    });
    const total = {sedarim: sedarim.length, verses: 0, doneSedarim: 0, doneVerses: 0};
    sedarim.forEach(s => {
        total.verses += s.verses;
        total.doneVerses += learnedVerses(s);
        if (state.sedarim.has(s.book + '|' + s.seder)) total.doneSedarim++;
    });

    // the next seder to learn: the first one not learned after the last one marked
    const dated = Object.entries(state.dates).filter(([, d]) => d && d.toMillis).sort((a, b) => b[1].toMillis() - a[1].toMillis());
    let next = null;
    if (dated.length) {
        const at = sedarim.findIndex(s => s.book + '|' + s.seder == dated[0][0]);
        next = sedarim.slice(at + 1).find(s => !state.sedarim.has(s.book + '|' + s.seder)) || null;
    } else {
        next = sedarim.find(s => !state.sedarim.has(s.book + '|' + s.seder)) || null;
    }

    const name = state.user.displayName || state.user.email || '';
    let html = '<div class="progress-head"><p>שלום ' + escapeHtml(name) + '.</p>' +
        '<button type="button" class="btn btn-outline" id="sign-out">התנתקות</button></div>' +
        '<p class="parparaot-summary">למדתם ' + total.doneSedarim + ' מתוך ' + total.sedarim + ' סדרים, ו־' +
        total.doneVerses.toLocaleString('he') + ' מתוך ' + total.verses.toLocaleString('he') + ' פסוקים (' +
        percent(total.doneVerses, total.verses) + '%).</p>' + bar(percent(total.doneVerses, total.verses));
    if (next) html += '<p class="progress-next">הסדר הבא: <a href="' + sederHref(next) + '">' + escapeHtml(next.book) + ' סדר ' +
        escapeHtml(next.seder) + '</a></p>';
    if (dated.length) {
        html += '<h2>נלמדו לאחרונה</h2><ul class="progress-recent">' + dated.slice(0, 5).map(([key, d]) => {
            const [book, seder] = key.split('|');
            return '<li><a href="' + sederHref({book, seder}) + '">' + escapeHtml(book) + ' סדר ' + escapeHtml(seder) + '</a> <small>' +
                d.toDate().toLocaleDateString('he-IL') + '</small></li>';
        }).join('') + '</ul>';
    }
    // the reader's commentary: verses written on, in all and in each book
    const notes = [...state.notes.values()];
    html += '<h2>הפרשנות שלי</h2>';
    if (!notes.length) {
        html += '<p>עוד לא כתבתם פרשנות. לחצו על פסוק, ובתיבה "הפרשנות שלי" שמתחת לפירושים כתבו את הפירוש שלכם.</p>';
    } else {
        const noteSedarim = new Set(notes.map(n => n.book + '|' + n.seder)).size;
        const letters = notes.reduce((n, x) => n + (x.text || '').length, 0);
        html += '<p>כתבתם פרשנות ל־' + (notes.length == 1 ? 'פסוק אחד' : notes.length.toLocaleString('he') + ' פסוקים') + ' ב־' +
            (noteSedarim == 1 ? 'סדר אחד' : noteSedarim + ' סדרים') + ' (' + letters.toLocaleString('he') + ' אותיות). ' +
            '<a href="/my-commentary.html">לספר הפרשנות שלי, להדפסה</a></p><ul class="progress-notes">' +
            books.map(b => {
                const n = notes.filter(x => x.book == b.name).length;
                if (!n) return '';
                const verses = b.sedarim.reduce((t, x) => t + x.verses, 0);
                return '<li><b>' + escapeHtml(b.name) + ':</b> ' + n + ' מתוך ' + verses + ' פסוקים (' + percent(n, verses) + '%)' +
                    bar(percent(n, verses)) + '</li>';
            }).join('') + '</ul>';
    }
    html += '<h2>לפי ספרים</h2>';
    books.forEach(b => {
        const verses = b.sedarim.reduce((n, s) => n + s.verses, 0);
        const done = b.sedarim.reduce((n, s) => n + learnedVerses(s), 0);
        const doneSedarim = b.sedarim.filter(s => state.sedarim.has(s.book + '|' + s.seder)).length;
        // each seder: a square, full when learned, partly when some of its verses are
        const squares = b.sedarim.map(s => {
            const key = s.book + '|' + s.seder;
            const cls = state.sedarim.has(key) ? ' done' : learnedVerses(s) ? ' partly' : '';
            return '<a class="progress-seder' + cls + '" href="' + sederHref(s) + '" title="' + escapeHtml(s.book) + ' סדר ' +
                escapeHtml(s.seder) + (cls == ' partly' ? ': ' + learnedVerses(s) + ' מתוך ' + s.verses + ' פסוקים' : '') + '">' +
                escapeHtml(s.seder) + '</a>';
        }).join('');
        html += '<details class="progress-book"' + (done ? ' open' : '') + '><summary><span class="progress-name">' + escapeHtml(b.name) +
            '</span> <span class="converter-count">' + doneSedarim + ' / ' + b.sedarim.length + ' סדרים · ' + percent(done, verses) +
            '%</span>' + bar(percent(done, verses)) + '</summary><div class="progress-sedarim">' + squares + '</div></details>';
    });
    box.innerHTML = html;
    document.getElementById('sign-out').addEventListener('click', () => window.masdirimAccount.signOut());
}

document.addEventListener('masdirim:account', event => render(event.detail));
if (window.masdirimAccount) render(window.masdirimAccount.getState());
