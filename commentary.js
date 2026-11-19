// Commentaries under a verse, opened by clicking the verse or its number; and commentators the reader
// chose to see under every verse (the button "פירושים בכל הפסוקים", remembered in the browser).
// Used by the main site (sdarim.js renders the verses) and by the static pages.
// The data comes from commentary/<book>/<seder>.json, made by build_commentary.py from
// Sefaria's public export (only editions whose license allows reuse); its HTML is already cleaned.

(function () {
    const cache = {};
    function load(path) {
        if (!cache[path]) {
            cache[path] = fetch(path).then(response => {
                if (response.status == 404) return {};
                if (!response.ok) throw new Error(response.status);
                return response.json();
            });
            cache[path].catch(() => { delete cache[path]; });
        }
        return cache[path];
    }

    // where the verse is by the chapters, in small print next to the sources ("בראשית ג, ח")
    function chapterNote(link) {
        const note = document.createElement('div');
        note.className = 'commentary-chapter';
        note.textContent = 'לפי החלוקה לפרקים: ' + link.dataset.chapter;
        return note;
    }

    // marking the verse as learned (account.js shows the button and handles the click)
    function learnButton(link) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'learn-verse';
        button.hidden = true;
        button.dataset.book = link.dataset.book;
        button.dataset.seder = link.dataset.seder;
        button.dataset.verse = link.dataset.verse;
        return button;
    }

    // the reader's own commentary on the verse (account.js writes it in)
    function myNote(link) {
        const box = document.createElement('div');
        box.className = 'my-note';
        box.dataset.book = link.dataset.book;
        box.dataset.seder = link.dataset.seder;
        box.dataset.verse = link.dataset.verse;
        return box;
    }

    function render(panel, entries, sources, link) {
        panel.replaceChildren();
        if (!entries || entries.length == 0) {
            panel.textContent = 'אין פירושים לפסוק זה.';
            if (link.dataset.chapter) panel.appendChild(chapterNote(link));
            panel.append(myNote(link), learnButton(link));
            return;
        }
        const used = [];
        // the Aramaic translation and Rashi are shown; the other commentators open on click
        entries.forEach(e => {
            const src = sources[e.source] || {};
            const text = document.createElement('span');
            // cleaned at build time: only b, i, br, small, and links to the sedarim (build_commentary_refs.js)
            text.innerHTML = e.comments.join(' • ');
            const name = document.createElement('strong');
            let item;
            if (src.open) {
                item = document.createElement('div');
                name.textContent = (src.commentator || '') + ': ';
                item.append(name, text);
            } else {
                item = document.createElement('details');
                const summary = document.createElement('summary');
                name.textContent = src.commentator || '';
                summary.appendChild(name);
                item.append(summary, text);
            }
            item.className = 'commentator';
            panel.appendChild(item);
            if (!used.includes(e.source)) used.push(e.source);
        });
        const credit = document.createElement('div');
        credit.className = 'commentary-source';
        credit.append('מקור: ');
        used.forEach((key, i) => {
            const src = sources[key];
            if (!src) return;
            if (i > 0) credit.append(' · ');
            credit.append(src.commentator + ', ' + src.edition + ' (');
            if (src.license_url) {
                const a = document.createElement('a');
                a.href = src.license_url;
                a.target = '_blank';
                a.rel = 'license noopener';
                a.textContent = src.license_he;
                credit.append(a);
            } else {
                credit.append(src.license_he);
            }
            credit.append(')');
        });
        credit.append(', דרך ');
        const sefaria = document.createElement('a');
        sefaria.href = 'https://www.sefaria.org.il';
        sefaria.target = '_blank';
        sefaria.rel = 'noopener';
        sefaria.textContent = 'ספריא';
        credit.append(sefaria);
        panel.appendChild(credit);
        if (link.dataset.chapter) panel.appendChild(chapterNote(link));
        panel.append(myNote(link), learnButton(link));
    }

    function toggle(link) {
        let anchor = link.closest('.verse') || link;
        if (anchor.parentElement && anchor.parentElement.tagName == 'MARK') anchor = anchor.parentElement;
        const next = anchor.nextElementSibling;
        if (next && next.classList.contains('commentary')) {
            next.remove();
            return;
        }
        const panel = document.createElement('div');
        panel.className = 'commentary';
        panel.textContent = 'טוען פירושים...';
        anchor.after(panel);
        const file = '/commentary/' + encodeURIComponent(link.dataset.book.replace(/ /g, '_')) + '/' +
            encodeURIComponent(link.dataset.seder) + '.json';
        Promise.all([load(file), load('/commentary/sources.json')])
            .then(([seder, sources]) => render(panel, seder[link.dataset.verse], sources, link))
            .catch(() => { panel.textContent = 'לא ניתן לטעון את הפירושים כרגע.'; });
    }

    // a click on the verse number, or anywhere on the verse, opens (or closes) its commentaries.
    // Not when the click ends a text selection, so verses can still be selected and copied
    document.addEventListener('click', function (event) {
        if (event.button != 0 || !event.target.closest) return;
        let link = event.target.closest('.vnum[data-seder]');
        if (!link) {
            const verse = event.target.closest('.verse');
            if (!verse || event.target.closest('a') || String(window.getSelection && window.getSelection()) != '') return;
            link = verse.querySelector('.vnum[data-seder]');
            if (!link) return;
        }
        event.preventDefault();
        toggle(link);
    });

    // ~~~ commentators under every verse: chosen once, remembered (localStorage), shown wherever verses are ~~~
    const KEY = 'alwaysCommentators';
    let chosen = [];
    try { chosen = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { chosen = []; }
    const fileOf = link => '/commentary/' + encodeURIComponent(link.dataset.book.replace(/ /g, '_')) + '/' +
        encodeURIComponent(link.dataset.seder) + '.json';
    const anchorOf = link => {
        const verse = link.closest('.verse') || link;
        return verse.parentElement && verse.parentElement.tagName == 'MARK' ? verse.parentElement : verse;
    };

    // the commentators, as the reader sees them: the first part of the source key ("Rashi|Genesis") and its name
    let commentators = null;
    function listCommentators() {
        if (!commentators) commentators = load('/commentary/sources.json').then(sources => {
            const names = new Map();
            Object.entries(sources).forEach(([key, src]) => {
                const id = key.split('|')[0];
                if (!names.has(id)) names.set(id, new Set());
                names.get(id).add(src.commentator);
            });
            // the Targum is Onkelos in the Torah and Jonathan in the Prophets
            return [...names.entries()].map(([id, n]) => ({id, name: id == 'Targum' ? 'תרגום (אונקלוס, יונתן)' : [...n][0]}));
        });
        return commentators;
    }

    // under one verse: the comments of the chosen commentators, in the order of the site
    async function showUnder(link) {
        const anchor = anchorOf(link);
        let box = anchor.nextElementSibling;
        while (box && box.classList.contains('commentary')) box = box.nextElementSibling;   // after an open panel
        if (!(box && box.classList.contains('always-box'))) {
            box = document.createElement('div');
            box.className = 'always-box';
            const open = anchor.nextElementSibling && anchor.nextElementSibling.classList.contains('commentary') ? anchor.nextElementSibling : null;
            (open || anchor).after(box);
        }
        box.dataset.for = chosen.join(',');
        const [seder, sources] = await Promise.all([load(fileOf(link)), load('/commentary/sources.json')]);
        const entries = (seder[link.dataset.verse] || []).filter(e => chosen.includes(e.source.split('|')[0]));
        box.replaceChildren();
        entries.forEach(e => {
            const item = document.createElement('div');
            item.className = 'always-item';
            const name = document.createElement('strong');
            name.textContent = ((sources[e.source] || {}).commentator || '') + ': ';
            const text = document.createElement('span');
            text.innerHTML = e.comments.join(' • ');   // cleaned at build time
            item.append(name, text);
            box.appendChild(item);
        });
        box.hidden = !entries.length;
    }

    // every verse on the page that has no box for the current choice yet
    let busy = false;
    function showAll() {
        if (busy) return;
        busy = true;
        requestAnimationFrame(() => {
            busy = false;
            const sign = chosen.join(',');
            if (!chosen.length) {
                document.querySelectorAll('.always-box').forEach(b => b.remove());
                return;
            }
            document.querySelectorAll('.verse .vnum[data-seder]').forEach(link => {
                const anchor = anchorOf(link);
                let next = anchor.nextElementSibling;
                while (next && next.classList.contains('commentary')) next = next.nextElementSibling;
                if (next && next.classList.contains('always-box') && next.dataset.for == sign) return;
                showUnder(link).catch(() => {});
            });
        });
    }

    // the button, at the corner of every page that shows verses, and its list of commentators
    async function chooser() {
        if (document.getElementById('always-button')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'always-button';
        button.className = 'always-button no-print';
        button.setAttribute('aria-expanded', 'false');
        const label = () => { button.textContent = chosen.length ? 'פירושים בכל הפסוקים (' + chosen.length + ')' : 'פירושים בכל הפסוקים'; };
        label();
        const panel = document.createElement('div');
        panel.id = 'always-panel';
        panel.className = 'always-panel no-print';
        panel.hidden = true;
        document.body.append(button, panel);
        button.addEventListener('click', async () => {
            panel.hidden = !panel.hidden;
            button.setAttribute('aria-expanded', String(!panel.hidden));
            if (panel.hidden || panel.dataset.ready) return;
            panel.textContent = 'טוען...';
            const list = await listCommentators().catch(() => []);
            panel.dataset.ready = '1';
            panel.innerHTML = '<p class="always-title">הצגת פירושים מתחת לכל הפסוקים</p>' +
                '<p class="always-hint">בחרו את הפירושים והתרגומים שתרצו לראות מתחת לכל פסוק. הבחירה נשמרת בדפדפן הזה.</p>';
            const boxes = document.createElement('div');
            boxes.className = 'always-list';
            list.forEach(c => {
                const row = document.createElement('label');
                const check = document.createElement('input');
                check.type = 'checkbox';
                check.value = c.id;
                check.checked = chosen.includes(c.id);
                row.append(check, ' ' + c.name);
                boxes.appendChild(row);
            });
            const done = document.createElement('div');
            done.className = 'always-tools';
            done.innerHTML = '<button type="button" class="always-clear">ניקוי הבחירה</button> <button type="button" class="always-close">סגירה</button>';
            panel.append(boxes, done);
            const update = () => {
                chosen = [...boxes.querySelectorAll('input:checked')].map(i => i.value);
                try { localStorage.setItem(KEY, JSON.stringify(chosen)); } catch (e) { }
                label();
                showAll();
                try { if (typeof gtag == 'function') gtag('event', 'always_commentators', {commentators: chosen.join(',')}); } catch (e) { }
            };
            boxes.addEventListener('change', update);
            done.querySelector('.always-clear').addEventListener('click', () => { boxes.querySelectorAll('input').forEach(i => { i.checked = false; }); update(); });
            done.querySelector('.always-close').addEventListener('click', () => { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); });
        });
    }
    // the button shows once there are verses on the page (the home page has them only after a search)
    function ready() {
        if (document.querySelector('.verse .vnum[data-seder]')) { chooser(); showAll(); }
    }
    new MutationObserver(ready).observe(document.body, {childList: true, subtree: true});
    if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();

    // the verse number takes the keyboard focus (tabindex): Enter or Space opens the commentaries too
    document.addEventListener('keydown', function (event) {
        if (event.key != 'Enter' && event.key != ' ') return;
        const link = event.target.closest && event.target.closest('.vnum[data-seder]');
        if (!link) return;
        event.preventDefault();
        toggle(link);
    });
})();
