// Commentaries under a verse, opened by clicking its number.
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

    function render(panel, entries, sources) {
        panel.replaceChildren();
        if (!entries || entries.length == 0) {
            panel.textContent = 'אין פירושים לפסוק זה.';
            return;
        }
        const used = [];
        // the Aramaic translation and Rashi are shown; the other commentators open on click
        entries.forEach(e => {
            const src = sources[e.source] || {};
            const text = document.createElement('span');
            text.innerHTML = e.comments.join(' • ');   // cleaned at build time: only b, i, br, small
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
            .then(([seder, sources]) => render(panel, seder[link.dataset.verse], sources))
            .catch(() => { panel.textContent = 'לא ניתן לטעון את הפירושים כרגע.'; });
    }

    // a click on the verse number, or anywhere on the verse, opens (or closes) its commentaries.
    // Not when the click ends a text selection, so verses can still be selected and copied
    document.addEventListener('click', function (event) {
        if (event.button != 0 || !event.target.closest) return;
        let link = event.target.closest('a.vnum[data-seder]');
        if (!link) {
            const verse = event.target.closest('.verse');
            if (!verse || event.target.closest('a') || String(window.getSelection && window.getSelection()) != '') return;
            link = verse.querySelector('a.vnum[data-seder]');
            if (!link) return;
        }
        event.preventDefault();
        toggle(link);
    });
})();
