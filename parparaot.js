// parparaot.html: the places in the Tanakh where a run of words spells a word in their first letters
// (ראשי תיבות) or their last letters (סופי תיבות), from the first word to the last or from the last to
// the first. A final letter counts as the plain letter (ם as מ), and spaces in the word are ignored.
// The run may go on from verse to verse, but not from one book to the next.
// Also: the words two parashot have in common, and how many times each appears in each of them.

(function () {
    const form = document.getElementById('search-form');
    const input = document.getElementById('word');
    const results = document.getElementById('results');
    const SHOWN = 100;   // places shown in each group before "show all"
    const FINALS = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'};
    const plain = s => s.replace(/[ךםןףץ]/g, c => FINALS[c]);

    function track(name, params) {
        try { if (typeof gtag == 'function') gtag('event', name, params || {}); } catch (e) { }
    }
    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
    }

    // the text of every verse without nikud (API/text.json) and where it is (API/map.json), in the same order.
    // first / last: the first and last letter of every word, one character per word, with "|" between books
    // so a run does not go from one book to the next; at: [verse, word] of each character
    let data = null, texts = null;
    const loadTexts = () => {
        if (!texts) {
            texts = fetch('/API/text.json').then(r => r.json());
            texts.catch(() => { texts = null; });
        }
        return texts;
    };
    function load() {
        if (!data) {
            data = Promise.all([loadTexts(), fetch('/API/map.json').then(r => r.json())])
                .then(([texts, map]) => {
                    const f = name => map.fields.indexOf(name);
                    const verses = map.verses.map((row, i) => ({
                        book: row[f('bookseder')], seder: row[f('seder')], verse: row[f('verseseder')],
                        chapterBook: row[f('bookchapter')], words: texts[i].split(' ').filter(Boolean)}));
                    let first = '', last = '';
                    const at = [];
                    verses.forEach((v, i) => {
                        if (i > 0 && v.chapterBook != verses[i - 1].chapterBook) { first += '|'; last += '|'; at.push(null); }
                        v.words.forEach((w, j) => {
                            first += plain(w[0]);
                            last += plain(w[w.length - 1]);
                            at.push([i, j]);
                        });
                    });
                    return {verses, first, last, at};
                });
            data.catch(() => { data = null; });
        }
        return data;
    }

    function find(letters, pattern) {
        const found = [];
        for (let i = letters.indexOf(pattern); i >= 0; i = letters.indexOf(pattern, i + 1)) found.push(i);
        return found;
    }

    // the twelve prophets are one book of sedarim: name the prophet too
    const bookName = v => v.book == 'תרי עשר' ? v.book + ' (' + v.chapterBook + ')' : v.book;
    const href = v => '/seder/' + encodeURIComponent(v.book.replace(/ /g, '_')) + '/' + encodeURIComponent(v.seder) + '.html#' +
        encodeURIComponent(v.verse);

    // one place: where it is, and its verses with the words of the run marked and their letter in bold
    function placeHtml(d, start, length, ends) {
        const from = d.at[start], to = d.at[start + length - 1];
        const a = d.verses[from[0]], b = d.verses[to[0]];
        let where = bookName(a) + ' סדר ' + a.seder + ' פסוק ' + a.verse;
        if (to[0] != from[0]) where += a.seder == b.seder ? '-' + b.verse : ' עד סדר ' + b.seder + ' פסוק ' + b.verse;
        let text = '';
        for (let i = from[0]; i <= to[0]; i++) {
            const v = d.verses[i];
            if (i > from[0]) text += ' <span class="verse-sep">(' + escapeHtml(v.verse) + ')</span> ';
            text += v.words.map((w, j) => {
                const inRun = (i > from[0] || j >= from[1]) && (i < to[0] || j <= to[1]);
                if (!inRun) return escapeHtml(w);
                const marked = ends ? escapeHtml(w.slice(0, -1)) + '<b>' + escapeHtml(w.slice(-1)) + '</b>'
                                    : '<b>' + escapeHtml(w[0]) + '</b>' + escapeHtml(w.slice(1));
                return '<mark>' + marked + '</mark>';
            }).join(' ');
        }
        return '<li><a href="' + href(a) + '">' + escapeHtml(where) + '</a><div class="parparaot-text">' + text + '</div></li>';
    }

    async function search(word) {
        const target = plain(word.replace(/[^א-ת]/g, ''));
        if (target.length < 2) {
            results.innerHTML = '<p>יש להקליד לפחות שתי אותיות.</p>';
            return;
        }
        results.innerHTML = '<p>טוען את טקסט התנ"ך ומחפש...</p>';
        let d;
        try { d = await load(); } catch (e) {
            results.innerHTML = '<p>לא ניתן לטעון את טקסט התנ"ך כרגע. נסו שוב מאוחר יותר.</p>';
            return;
        }
        const reverse = [...target].reverse().join('');
        const groups = [
            {title: 'ראשי תיבות', letters: d.first, pattern: target, ends: false},
            {title: 'ראשי תיבות מהסוף להתחלה', letters: d.first, pattern: reverse, ends: false, back: true},
            {title: 'סופי תיבות', letters: d.last, pattern: target, ends: true},
            {title: 'סופי תיבות מהסוף להתחלה', letters: d.last, pattern: reverse, ends: true, back: true},
        ].filter(g => !g.back || reverse != target);   // a word that reads the same both ways: once
        let total = 0;
        let html = '';
        groups.forEach((g, n) => {
            const found = find(g.letters, g.pattern);
            total += found.length;
            html += '<section class="parparaot-group"><h2>' + escapeHtml(g.title) + ' <span class="converter-count">' +
                (found.length == 0 ? 'לא נמצא' : found.length == 1 ? 'מקום אחד' : found.length + ' מקומות') + '</span></h2>';
            if (found.length) {
                html += '<ol>' + found.slice(0, SHOWN).map(i => placeHtml(d, i, target.length, g.ends)).join('') + '</ol>';
                if (found.length > SHOWN)
                    html += '<button type="button" class="btn btn-outline" data-more="' + n + '">הצגת כל ' + found.length + ' המקומות</button>';
            }
            html += '</section>';
            g.found = found;
        });
        const shown = escapeHtml(word.replace(/[^א-ת ]/g, '').replace(/\s+/g, ' ').trim());
        results.innerHTML = '<p class="parparaot-summary">' + (total == 0 ? 'לא נמצאו מקומות' : total == 1 ? 'נמצא מקום אחד' :
            'נמצאו ' + total + ' מקומות') + ' שבהם "' + shown + '" כתוב בראשי התיבות או בסופי התיבות.</p>' + html;
        results.querySelectorAll('[data-more]').forEach(button => button.addEventListener('click', () => {
            const g = groups[Number(button.dataset.more)];
            button.previousElementSibling.innerHTML = g.found.map(i => placeHtml(d, i, target.length, g.ends)).join('');
            button.remove();
        }));
        track('parparaot_search', {search_term: target, results: total});
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        const word = input.value.trim();
        // the address keeps the search, so it can be shared
        const params = new URLSearchParams(location.search);
        if (word) params.set('q', word); else params.delete('q');
        try { history.replaceState(null, '', params.toString() ? '?' + params.toString() : location.pathname); } catch (e) { }
        search(word);
    });

    // ~~~ the words two parashot have in common ~~~
    const commonForm = document.getElementById('common-form');
    const selectA = document.getElementById('parasha-a');
    const selectB = document.getElementById('parasha-b');
    const common = document.getElementById('common');

    // a word is counted without the ו of "and" before it: "ואת" is "את" (but "ו" alone, or "וו", stays)
    const base = w => (w.length > 2 && w[0] == 'ו' ? w.slice(1) : w);

    // how many times each word appears in a parasha (a double one, ויקהל-פקודי, is both),
    // from API/parashot.json: the verses of each parasha, as places in API/text.json
    let ranges = null;
    async function countWords(parasha) {
        if (!ranges) ranges = fetch('/API/parashot.json').then(r => r.json());
        const [all, places] = await Promise.all([loadTexts(), ranges]);
        const counts = new Map();
        parasha.split('-').forEach(name => {
            const [first, last] = places[name];
            for (let i = first; i <= last; i++)
                all[i].split(' ').filter(Boolean).map(base).forEach(w => counts.set(w, (counts.get(w) || 0) + 1));
        });
        return counts;
    }

    async function compare(a, b) {
        if (!a || !b) {
            common.innerHTML = '<p>יש לבחור שתי פרשות.</p>';
            return;
        }
        if (a == b) {
            common.innerHTML = '<p>יש לבחור שתי פרשות שונות.</p>';
            return;
        }
        common.innerHTML = '<p>טוען את הפרשות ומשווה...</p>';
        let ca, cb;
        try { [ca, cb] = await Promise.all([countWords(a), countWords(b)]); } catch (e) {
            ranges = null;
            common.innerHTML = '<p>לא ניתן לטעון את הפרשות כרגע. נסו שוב מאוחר יותר.</p>';
            return;
        }
        // the common words, the most frequent (in both parashot together) first
        const words = [...ca.keys()].filter(w => cb.has(w))
            .sort((x, y) => (cb.get(y) + ca.get(y)) - (cb.get(x) + ca.get(x)) || x.localeCompare(y, 'he'));
        common.innerHTML = '<p class="parparaot-summary">' + (words.length == 1 ? 'מילה אחת משותפת' : words.length + ' מילים משותפות') +
            ' לפרשת ' + escapeHtml(a) + ' (' + ca.size + ' מילים שונות) ולפרשת ' + escapeHtml(b) + ' (' + cb.size + ' מילים שונות).</p>' +
            (words.length ? '<table class="parparaot-common"><thead><tr><th>מילה</th><th>פרשת ' + escapeHtml(a) + '</th><th>פרשת ' +
                escapeHtml(b) + '</th></tr></thead><tbody>' +
                words.map(w => '<tr><td>' + escapeHtml(w) + '</td><td>' + ca.get(w) + '</td><td>' + cb.get(w) + '</td></tr>').join('') +
                '</tbody></table>' : '');
        track('parparaot_common', {parasha_a: a, parasha_b: b, words: words.length});
    }

    commonForm.addEventListener('submit', event => {
        event.preventDefault();
        const params = new URLSearchParams(location.search);
        params.set('a', selectA.value);
        params.set('b', selectB.value);
        try { history.replaceState(null, '', '?' + params.toString()); } catch (e) { }
        compare(selectA.value, selectB.value);
    });

    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (query) {
        input.value = query;
        search(query);
    }
    if (params.get('a') && params.get('b')) {
        selectA.value = params.get('a');
        selectB.value = params.get('b');
        compare(selectA.value, selectB.value);
    }
})();
