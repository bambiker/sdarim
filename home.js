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
    // the text: #result on the home page, the page's own text on the static pages (layout.js loads this file there)
    const result = document.getElementById('result') || document.getElementById('page-text');
    let size = Number(stored('fontStep')) || 0;
    function applySize() {
        if (result) result.style.setProperty('--font-step', size);
    }
    document.querySelectorAll('[data-font]').forEach(button => {
        button.addEventListener('click', () => {
            size = Math.max(-2, Math.min(4, size + Number(button.dataset.font)));
            store('fontStep', size);
            applySize();
        });
    });
    applySize();

    // ~~~ this week's parasha: selected in the list (getWeeklyParasha in sdarim.js, by the Israel schedule).
    // A double portion has its own entry in the list (ויקהל-פקודי) ~~~
    const parashaList = document.getElementById('parasha');
    getWeeklyParasha().then(week => {
        const option = week && Array.from(parashaList.options).find(o => o.value == week.name);
        if (!option) return;
        option.textContent = week.name + ' (פרשת השבוע)';
        if (!parashaList.value) parashaList.value = week.name;
    }).catch(() => { /* no calendar: the list stays as it is */ });

    // ~~~ choices for the seder, chapter and verse fields: they can still be typed, and the list offers
    // only what exists (the sedarim of the chosen book, the verses of the chosen seder or chapter) ~~~
    function fill(listId, values) {
        document.getElementById(listId).replaceChildren(...values.map(v => {
            const option = document.createElement('option');
            option.value = v;
            return option;
        }));
    }
    // num2heb (sdarim.js) writes a geresh; the data has none
    const numbers = count => Array.from({length: count}, (_, i) => num2heb(i + 1).replace(/['"׳״]/g, ''));
    // a value that is not in the list is marked, so a typo is seen before pressing the button
    function check(input, listId) {
        const values = Array.from(document.getElementById(listId).options, o => o.value);
        input.classList.toggle('invalid', input.value.trim() != '' && values.length > 0 && !values.includes(input.value.trim()));
    }
    function field(id, listId, update) {
        const input = document.getElementById(id);
        input.addEventListener('input', () => { check(input, listId); update && update(); });
        input.addEventListener('change', () => { check(input, listId); update && update(); });
        return input;
    }

    const sbook = document.getElementById('sbook');
    const sederInput = field('seder', 'seders', sederVerses);
    const sverse = field('sverse', 'sederverses');
    async function sedarim() {
        const index = await getSederIndex();
        fill('seders', index.filter(s => s.book == sbook.value).map(s => s.seder));
        check(sederInput, 'seders');
        sederVerses();
    }
    async function sederVerses() {
        const index = await getSederIndex();
        const seder = index.find(s => s.book == sbook.value && s.seder == sederInput.value.trim());
        fill('sederverses', seder && seder.verses ? numbers(seder.verses) : []);
        check(sverse, 'sederverses');
    }
    sbook.addEventListener('change', sedarim);

    const cbook = document.getElementById('cbook');
    const chapterInput = field('chapter', 'chapters', chapterVerses);
    const cverse = field('cverse', 'chapterverses');
    // the number of chapters in each book
    const CHAPTERS = {'בראשית': 50, 'שמות': 40, 'ויקרא': 27, 'במדבר': 36, 'דברים': 34, 'יהושע': 24, 'שופטים': 21, 'שמואל א': 31, 'שמואל ב': 24, 'מלכים א': 22, 'מלכים ב': 25, 'ישעיהו': 66, 'ירמיהו': 52, 'יחזקאל': 48, 'הושע': 14, 'יואל': 4, 'עמוס': 9, 'עובדיה': 1, 'יונה': 4, 'מיכה': 7, 'נחום': 3, 'חבקוק': 3, 'צפניה': 3, 'חגי': 2, 'זכריה': 14, 'מלאכי': 3, 'תהילים': 150, 'משלי': 31, 'איוב': 42, 'שיר השירים': 8, 'רות': 4, 'איכה': 5, 'קהלת': 12, 'אסתר': 10, 'דניאל': 12, 'עזרא': 10, 'נחמיה': 13, 'דברי הימים א': 29, 'דברי הימים ב': 36};
    function chapters() {
        fill('chapters', numbers(CHAPTERS[cbook.value] || 0));
        check(chapterInput, 'chapters');
        chapterVerses();
    }
    async function chapterVerses() {
        const chapter = chapterInput.value.trim();
        const valid = Array.from(document.getElementById('chapters').options, o => o.value).includes(chapter);
        let verses = [];
        if (cbook.value && valid) {
            try { verses = ((await loadJson(apiPath('chapter', chapter, cbook.value))) || []).map(v => v.versechapter); } catch (e) { }
        }
        fill('chapterverses', verses);
        check(cverse, 'chapterverses');
    }
    cbook.addEventListener('change', chapters);
    // the fields are also filled in by sdarim.js (a link, a conversion, the arrows): when the text changes,
    // the lists follow the fields
    function refreshLists() {
        if (sbook.value) sedarim(); else check(sederInput, 'seders');
        if (cbook.value) chapters(); else check(chapterInput, 'chapters');
    }
    if (document.getElementById('result'))
        new MutationObserver(refreshLists).observe(document.getElementById('result'), {childList: true});

    // ~~~ copy the link ~~~
    const copy = document.getElementById('copylink');
    if (copy) copy.addEventListener('click', () => {
        const link = document.querySelector('#urlname a');
        if (!link || !navigator.clipboard) return;
        navigator.clipboard.writeText(link.href).then(() => {
            copy.textContent = 'הועתק ✓';
            setTimeout(() => { copy.textContent = 'העתקה'; }, 1500);
        });
    });
})();
