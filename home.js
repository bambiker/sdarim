// The home page around sdarim.js: tabs, text size, copying the link and "continue reading".

(function () {
    function stored(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function store(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* private mode: not remembered */ }
    }

    // ~~~ tabs ~~~
    const tabs = Array.from(document.querySelectorAll('.tabs .tab'));
    function select(tab) {
        tabs.forEach(t => {
            const on = t === tab;
            t.setAttribute('aria-selected', on);
            t.tabIndex = on ? 0 : -1;
            document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
        });
    }
    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(tab));
        tab.addEventListener('keydown', event => {
            // in a right-to-left tab list the left arrow moves to the next tab
            const step = event.key == 'ArrowLeft' ? 1 : event.key == 'ArrowRight' ? -1 : 0;
            if (!step) return;
            const next = tabs[(i + step + tabs.length) % tabs.length];
            select(next);
            next.focus();
        });
    });
    select(tabs[0]);

    // ~~~ text size ~~~
    const result = document.getElementById('result');
    let size = Number(stored('fontStep')) || 0;
    function applySize() {
        result.style.setProperty('--font-step', size);
    }
    document.querySelectorAll('[data-font]').forEach(button => {
        button.addEventListener('click', () => {
            size = Math.max(-2, Math.min(4, size + Number(button.dataset.font)));
            store('fontStep', size);
            applySize();
        });
    });
    applySize();

    // ~~~ copy the link ~~~
    const copy = document.getElementById('copylink');
    copy.addEventListener('click', () => {
        const link = document.querySelector('#urlname a');
        if (!link || !navigator.clipboard) return;
        navigator.clipboard.writeText(link.href).then(() => {
            copy.textContent = 'הועתק ✓';
            setTimeout(() => { copy.textContent = 'העתקה'; }, 1500);
        });
    });

    // ~~~ continue reading: remember the last seder shown ~~~
    const show = window.userSeder;
    window.userSeder = function (verses, book, seder, verse) {
        show(verses, book, seder, verse);
        if (verses.length) store('lastSeder', JSON.stringify({book: book, seder: seder}));
    };
    let last = null;
    try { last = JSON.parse(stored('lastSeder')); } catch (e) { /* ignore */ }
    if (last && last.book && last.seder && !location.search) {
        const p = document.getElementById('continue');
        const a = document.createElement('a');
        a.href = sederUrl(last);
        a.textContent = last.book + ' סדר ' + last.seder;
        a.addEventListener('click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.button != 0) return;
            event.preventDefault();
            showSeder(last.book, last.seder);
        });
        p.append('להמשיך מהמקום שעצרתם: ', a);
        p.hidden = false;
    }
})();
