// On every page: the site as an installable app, "continue where you stopped", and the Google Analytics
// events that show how the site is used.

const masdirimApp = (function () {
    function stored(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function store(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* private mode: not remembered */ }
    }

    // ~~~ Google Analytics events (gtag is loaded in the head of every page) ~~~

    function track(name, params) {
        try {
            if (typeof gtag == 'function') gtag('event', name, params || {});
        } catch (e) { /* analytics must never break the site */ }
    }

    // the direct link shown under the text, readable (Hebrew, not %D7...)
    function shownUrl() {
        const link = document.querySelector('#urlname a');
        try { return decodeURI(link ? link.href : location.href); } catch (e) { return link ? link.href : location.href; }
    }

    // where the text on the home page came from: the button pressed just before it is drawn
    let source = null;
    document.addEventListener('click', event => {
        const target = event.target.closest && event.target;
        if (!target) return;
        if (target.closest('#btnfindseder')) source = 'form';
        else if (target.closest('#btnfindchapter')) source = 'chapter';
        else if (target.closest('.seder-nav a')) source = 'arrows';
        else if (target.closest('#continue a')) track('continue_reading', {page: target.closest('a').getAttribute('href')});
        else if (target.closest('#whatsapp')) track('share_whatsapp', {page_title: document.title.trim(), page_url: shownUrl()});
        else if (target.closest('#copylink')) track('copy_link', {page_title: document.title.trim(), page_url: shownUrl()});
        else if (target.closest('.vnum[data-seder]') ||
                 (target.closest('.verse') && !target.closest('a') && String(window.getSelection()) == '' &&
                  target.closest('.verse').querySelector('.vnum[data-seder]'))) {
            const v = target.closest('.vnum[data-seder]') || target.closest('.verse').querySelector('.vnum[data-seder]');
            // the click opens the commentary panel, or closes it if it is open
            const anchor = v.closest('.verse') || v;
            const box = (anchor.parentElement && anchor.parentElement.tagName == 'MARK' ? anchor.parentElement : anchor).nextElementSibling;
            if (!(box && box.classList.contains('commentary')))
                track('open_commentary', {book: v.dataset.book, seder: v.dataset.seder, verse: v.dataset.verse});
        }
    }, true);
    // a commentator other than the Targum and Rashi, opened under a verse
    document.addEventListener('toggle', event => {
        const item = event.target;
        if (item.matches && item.matches('details.commentator') && item.open) {
            const name = item.querySelector('summary');
            track('open_commentator', {commentator: name ? name.textContent.trim() : ''});
        }
    }, true);
    document.addEventListener('change', event => {
        if (event.target.id == 'nusach') track('choose_nusach', {nusach: event.target.value});
    });
    window.addEventListener('beforeprint', () => track('print', {page_title: document.title.trim()}));

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
    }

    // ~~~ the last page read ~~~

    function remember(url, title) {
        store('lastPage', JSON.stringify({url: url, title: title}));
    }

    // the static pages of a seder, chapter, parasha or book remember themselves
    if (/^\/(seder|perek|parasha|book)\/.+\.html$/.test(decodeURIComponent(location.pathname))) {
        const h1 = document.querySelector('h1');
        if (h1) remember(location.pathname, h1.textContent.trim());
    }

    // the home page remembers the seder or parasha it shows (sdarim.js draws them), as a link back to the home page
    if (typeof userSeder == 'function') {
        const renderSeder = userSeder;
        window.userSeder = function (verses, book, seder, verse) {
            renderSeder(verses, book, seder, verse);
            if (verses.length) {
                const from = source || 'link';
                source = null;
                track('open_seder', {book: book, seder: seder, verse: verse || 'א', source: from});
                if (from == 'chapter') track('convert_chapter', {
                    book: document.getElementById('cbook').value, chapter: document.getElementById('chapter').value,
                    verse: document.getElementById('cverse').value, seder_book: book, seder: seder});
            }
            if (verses.length) remember('/?book=' + addunderscore(book) + '&seder=' + seder + '&verse=' + (verse || 'א'),
                book + ' סדר ' + seder);
        };
    }
    if (typeof findparasha == 'function') {
        const renderParasha = findparasha;
        window.findparasha = function () {
            const parasha = document.getElementById('parasha').value;
            return renderParasha().then(result => {
                if (parasha) remember('/?parasha=' + addunderscore(parasha), 'פרשת ' + parasha);
                if (parasha) track('open_parasha', {parasha: parasha});
                return result;
            });
        };
    }

    // a link to a verse on a static page (seder/א.html#ג): the browser puts the verse at the very top;
    // move it to the middle of the screen so the verses before it show and it is clear where to read
    function centerVerse() {
        if (!location.hash) return;
        const verse = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (verse && verse.classList.contains('verse')) verse.scrollIntoView({block: 'center'});
    }
    window.centerVerse = centerVerse;   // layout.js calls it after adding the parts above the text
    window.addEventListener('load', centerVerse);
    window.addEventListener('hashchange', centerVerse);

    if (typeof findfree == 'function') {
        const runSearch = findfree;
        window.findfree = function () {
            const text = (document.getElementById('free') || {}).value || '';
            if (text.trim().length >= 2) track('search', {search_term: text.trim()});
            return runSearch.apply(this, arguments);
        };
    }

    function lastPage() {
        try {
            const last = JSON.parse(stored('lastPage'));
            if (last && typeof last.url == 'string' && last.url[0] == '/' && last.title) return last;
        } catch (e) { /* ignore */ }
        return null;
    }

    // ~~~ installing ~~~

    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform == 'MacIntel' && navigator.maxTouchPoints > 1);
    let prompt = null;

    function buttons() {
        return document.querySelectorAll('[data-install]');
    }
    function showButtons() {
        buttons().forEach(b => { b.hidden = false; });
    }

    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        prompt = event;
        showButtons();
    });
    window.addEventListener('appinstalled', () => {
        track('app_installed');
        prompt = null;
        buttons().forEach(b => { b.hidden = true; });
    });

    function iosHelp() {
        let dialog = document.getElementById('install-help');
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'install-help';
            dialog.className = 'install-help';
            dialog.innerHTML = '<h2>הוספת מסדירים למסך הבית</h2>' +
                '<ol><li>לחצו על כפתור השיתוף (ריבוע עם חץ כלפי מעלה) בתחתית הדפדפן, או בראשו באייפד.</li>' +
                '<li>גללו ובחרו <b>"הוספה למסך הבית"</b>.</li>' +
                '<li>לחצו <b>"הוסף"</b>. האתר יופיע כאפליקציה עם הסמל של מסדירים.</li></ol>' +
                '<button type="button">הבנתי</button>';
            dialog.querySelector('button').addEventListener('click', () => dialog.close());
            document.body.appendChild(dialog);
        }
        dialog.showModal();
    }

    document.addEventListener('click', event => {
        const button = event.target.closest && event.target.closest('[data-install]');
        if (!button) return;
        if (prompt) {
            track('install_click', {method: 'prompt'});
            prompt.prompt();
            prompt.userChoice.then(choice => track('install_choice', {outcome: choice.outcome}))
                .finally(() => { prompt = null; });
        } else if (ios) {
            track('install_click', {method: 'ios_help'});
            iosHelp();
        }
    });

    // opened as the installed app (from the home screen or the desktop): returning readers
    if (standalone) track('app_launch', {page: location.pathname + location.search});

    document.addEventListener('DOMContentLoaded', () => {
        // Safari on iPhone and iPad has no install prompt; the button explains how to add the site instead
        if (ios && !standalone) showButtons();

        // the home page, opened without a link to a text: offer to continue where the reader stopped
        const box = document.getElementById('continue');
        const last = lastPage();
        if (box && last && !location.search && !location.hash) {
            const a = document.createElement('a');
            a.href = last.url;
            a.textContent = last.title;
            box.replaceChildren('להמשיך מהמקום שעצרתם: ', a);
            box.hidden = false;
            track('continue_offered', {page: last.url});
        }
    });

    return {remember: remember};
})();
