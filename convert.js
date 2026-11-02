// convert.html: write the references in a text by seder, and add the source of quoted verses, as you type
// (the work is done by refs.js).

(function () {
    const source = document.getElementById('source');
    const quotes = document.getElementById('quotes');
    const box = document.getElementById('result-box');
    const output = document.getElementById('output');
    const list = document.getElementById('list');
    const count = document.getElementById('count');
    const copy = document.getElementById('copy');
    let index = null;
    let quoteIndex = null;
    let quotesLoading = null;
    let converted = '';
    let tracked = false;

    function track(name, params) {
        try { if (typeof gtag == 'function') gtag('event', name, params || {}); } catch (e) { }
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
    }

    // the chapter -> seder table, about 1.3MB, loaded once
    const ready = fetch('/API/map.json').then(r => r.json()).then(map => { index = masdirimRefs.buildIndex(map); });
    // the text of the verses, about 0.7MB, loaded the first time it is needed, to find quoted verses
    function loadQuotes() {
        if (!quotesLoading) {
            quotesLoading = Promise.all([ready, fetch('/API/text.json').then(r => r.json())])
                .then(([, texts]) => { quoteIndex = masdirimRefs.buildQuoteIndex(texts, index); render(); })
                .catch(() => { quotesLoading = null; });
        }
    }

    function render() {
        const text = source.value;
        if (!text.trim()) {
            box.hidden = true;
            return;
        }
        if (!index) {
            box.hidden = false;
            output.textContent = 'טוען את טבלת ההמרה...';
            ready.then(render);
            return;
        }
        if (!quoteIndex) loadQuotes();
        const result = masdirimRefs.convertText(text, index, {quotes: quotes.checked, quoteIndex: quoteIndex});
        converted = result.text;
        const link = (url, title, label, cls) => '<a class="' + cls + '" href="' + escapeHtml(url) + '" target="_blank" rel="noopener" title="' +
            escapeHtml(title) + '">' + escapeHtml(label) + '</a>';
        // a quote's words, shortened for the list
        const words = t => { const w = t.replace(/^["'״׳”“]+|["'״׳”“]+$/g, '').split(/\s+/); return w.length > 8 ? w.slice(0, 4).join(' ') + ' ... ' + w.slice(-3).join(' ') : t; };
        // the text, with each converted reference and each added source marked and linked to the seder on the site
        let html = '', last = 0;
        result.refs.forEach(r => {
            html += escapeHtml(text.slice(last, r.start));
            if (r.kind == 'quote')
                html += ' <span class="added">(' + r.sources.map(x => link(x.url, 'מקור הפסוק שצוטט', x.text, 'ref')).join('; ') + ')</span>';
            else
                html += escapeHtml(r.prefix) + link(masdirimRefs.sederUrl(r), 'במקור: ' + r.text.slice(r.prefix.length),
                                                    r.converted.slice(r.prefix.length), 'ref');
            last = r.end;
        });
        output.innerHTML = html + escapeHtml(text.slice(last));
        list.innerHTML = result.refs.map(r => r.kind == 'quote'
            ? '<tr><td>"' + escapeHtml(words(r.quoted)) + '"</td><td>נוסף מקור: ' + escapeHtml(r.sources.map(x => x.text).join('; ')) + '</td></tr>'
            : '<tr><td>' + escapeHtml(r.text.slice(r.prefix.length)) + '</td><td>' + escapeHtml(r.converted.slice(r.prefix.length)) + '</td></tr>').join('');
        const added = result.refs.filter(r => r.kind == 'quote').length, refs = result.refs.length - added;
        const parts = [];
        if (refs) parts.push(refs == 1 ? 'הומר מראה מקום אחד' : 'הומרו ' + refs + ' מראי מקום');
        if (added) parts.push(added == 1 ? 'נוסף מקור לציטוט אחד' : 'נוספו מקורות ל־' + added + ' ציטוטים');
        count.textContent = parts.length ? parts.join(', ') : quoteIndex ? 'לא נמצאו מראי מקום או ציטוטים' : 'לא נמצאו מראי מקום';
        box.hidden = false;
        if (!tracked && result.refs.length) {
            tracked = true;
            track('convert_references', {count: refs, quotes: added});
        }
    }

    let timer = null;
    source.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(render, 250);
    });
    quotes.addEventListener('change', render);

    document.getElementById('example').addEventListener('click', () => {
        source.value = 'כמו שכתוב בבראשית ג\' ח\': "וישמעו את קול ה\' אלהים מתהלך בגן". ' +
            'ובתהלים כ"ג א-ג נאמר "ה\' רעי לא אחסר". ראו גם שמ"א ב, ג, ישעיה מ, א-ב, ' +
            'משלי פרק ג פסוק ה ועמוס ז יד. דברים רבים נאמרו על כך, ' +
            'ועל זה נאמר "בטח אל ה\' בכל לבך ואל בינתך אל תשען", וכן "וזכרת את ה\' אלקיך כי הוא הנתן לך כח לעשות חיל".';
        render();
        source.focus();
    });

    copy.addEventListener('click', () => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(converted).then(() => {
            copy.textContent = 'הועתק ✓';
            setTimeout(() => { copy.textContent = 'העתקה'; }, 1500);
        });
        track('copy_converted');
    });
})();
