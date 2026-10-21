// The home page around sdarim.js: tabs, text size, this week's parasha and copying the link.
// Installing the app and "continue where you stopped" are in app.js, shared with the static pages.

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

    // ~~~ this week's parasha: selected in the list, by the Israel schedule (calendar/parashot.json,
    // made by build_calendar.py). On a Shabbat that is a festival it is the next Shabbat's parasha ~~~
    const parashaList = document.getElementById('parasha');
    fetch('/calendar/parashot.json').then(r => r.json()).then(shabbatot => {
        const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Jerusalem'}).format(new Date());
        const date = Object.keys(shabbatot).sort().find(d => d >= today && shabbatot[d].length);
        if (!date) return;
        const week = shabbatot[date];
        const option = Array.from(parashaList.options).find(o => o.value == week[0]);
        if (!option) return;
        option.textContent = week.join('-') + ' (פרשת השבוע)';
        if (!parashaList.value) parashaList.value = week[0];
    }).catch(() => { /* no calendar: the list stays as it is */ });

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
})();
