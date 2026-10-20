// On every page: the site as an installable app, and "continue where you stopped".

const masdirimApp = (function () {
    function stored(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function store(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* private mode: not remembered */ }
    }

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

    // the home page remembers the seder or parasha it shows (sdarim.js draws them)
    if (typeof userSeder == 'function') {
        const renderSeder = userSeder;
        window.userSeder = function (verses, book, seder, verse) {
            renderSeder(verses, book, seder, verse);
            if (verses.length) remember('/seder/' + addunderscore(book) + '/' + seder + '.html' +
                (verse && verse != 'א' ? '#' + verse : ''), book + ' סדר ' + seder);
        };
    }
    if (typeof findparasha == 'function') {
        const renderParasha = findparasha;
        window.findparasha = function () {
            const parasha = document.getElementById('parasha').value;
            return renderParasha().then(result => {
                if (parasha) remember('/parasha/' + addunderscore(parasha) + '.html', 'פרשת ' + parasha);
                return result;
            });
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
            prompt.prompt();
            prompt.userChoice.finally(() => { prompt = null; });
        } else if (ios) {
            iosHelp();
        }
    });

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
        }
    });

    return {remember: remember};
})();
