// convert.html: write the references in a text by seder, as you type (the work is done by refs.js).

(function () {
    const source = document.getElementById('source');
    const quotes = document.getElementById('quotes');
    const box = document.getElementById('result-box');
    const output = document.getElementById('output');
    const list = document.getElementById('list');
    const count = document.getElementById('count');
    const copy = document.getElementById('copy');
    let index = null;
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
        const result = masdirimRefs.convertText(text, index, {quotes: quotes.checked});
        converted = result.text;
        // the text, with each converted reference marked and linked to the seder on the site
        let html = '', last = 0;
        result.refs.forEach(r => {
            html += escapeHtml(text.slice(last, r.start)) + escapeHtml(r.prefix) +
                '<a class="ref" href="' + escapeHtml(masdirimRefs.sederUrl(r)) + '" target="_blank" rel="noopener" title="במקור: ' +
                escapeHtml(r.text.slice(r.prefix.length)) + '">' + escapeHtml(r.converted.slice(r.prefix.length)) + '</a>';
            last = r.end;
        });
        output.innerHTML = html + escapeHtml(text.slice(last));
        list.innerHTML = result.refs.map(r => '<tr><td>' + escapeHtml(r.text.slice(r.prefix.length)) + '</td><td>' +
            escapeHtml(r.converted.slice(r.prefix.length)) + '</td></tr>').join('');
        count.textContent = result.refs.length == 0 ? 'לא נמצאו מראי מקום' :
            result.refs.length == 1 ? 'הומר מראה מקום אחד' : 'הומרו ' + result.refs.length + ' מראי מקום';
        box.hidden = false;
        if (!tracked && result.refs.length) {
            tracked = true;
            track('convert_references', {count: result.refs.length});
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
            'משלי פרק ג פסוק ה ועמוס ז יד. דברים רבים נאמרו על כך.';
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
