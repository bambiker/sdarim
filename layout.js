// The static pages (seder/, perek/, parasha/, book/, faq) have the same parts as the home page: the
// search and the tools above the text, and the cards, about, agreements and contact below it. They are
// taken from index.html, so the two always look the same; the page's own text stays in the page itself
// (for search engines, and without JavaScript). The tools here open their result on the home page.

(async function () {
    const top = document.getElementById('site-top');
    const bottom = document.getElementById('site-bottom');
    if (!top || !bottom) return;
    let home;
    try {
        home = new DOMParser().parseFromString(await (await fetch('/index.html')).text(), 'text/html');
    } catch (e) {
        return;   // the page still has its text and its links
    }
    const take = selector => {
        const part = home.querySelector(selector);
        return part ? document.importNode(part, true) : null;
    };
    top.append(...['.hero', '#tools'].map(take).filter(Boolean));
    // the page has its own h1; the home page's headline becomes a plain title here
    const headline = top.querySelector('.hero h1');
    if (headline) {
        const title = document.createElement('p');
        title.className = 'hero-title';
        title.textContent = headline.textContent;
        headline.replaceWith(title);
    }
    bottom.append(...['.features', '#about', '#agree', '#contact'].map(take).filter(Boolean));
    home.querySelectorAll('datalist').forEach(list => document.body.appendChild(document.importNode(list, true)));
    // the menu links of the home page point to its parts, which are on this page too
    document.querySelectorAll('.topnav a[href^="/#"]').forEach(a => a.setAttribute('href', a.getAttribute('href').slice(1)));

    const value = id => document.getElementById(id).value.trim();
    const book = id => encodeURIComponent(value(id).replace(/ /g, '_'));
    const go = query => { location.href = '/?' + query; };
    const on = (id, handler) => { const el = document.getElementById(id); if (el) el.addEventListener('click', handler); };
    on('btnfindseder', () => value('sbook') && value('seder') &&
        go('book=' + book('sbook') + '&seder=' + encodeURIComponent(value('seder')) + '&verse=' + encodeURIComponent(value('sverse') || 'א')));
    on('btnfindchapter', () => value('cbook') &&
        go('cbook=' + book('cbook') + '&chapter=' + encodeURIComponent(value('chapter') || 'א') + '&cverse=' + encodeURIComponent(value('cverse') || 'א')));
    on('btnfindfree', () => value('free').length >= 2 && go('q=' + encodeURIComponent(value('free'))));
    const showParasha = () => value('parasha') && go('parasha=' + book('parasha'));
    on('btnparasha', showParasha);
    document.getElementById('parasha').addEventListener('change', showParasha);
    ['seder', 'sverse', 'chapter', 'cverse'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', event => {
            if (event.key != 'Enter') return;
            event.preventDefault();
            document.getElementById(id[0] == 's' ? 'btnfindseder' : 'btnfindchapter').click();
        });
    });

    // the tabs, the lists of sedarim, chapters and verses, and this week's parasha: as on the home page
    const script = document.createElement('script');
    script.src = '/home.js';
    document.body.appendChild(script);
    const share = document.createElement('script');
    share.src = 'https://static.addtoany.com/menu/page.js';
    share.async = true;
    document.body.appendChild(share);

    // the parts above push the text down: keep the reader at the text (or at the verse in the address)
    if (!location.hash) {
        document.getElementById('page-text').scrollIntoView();
        // a chapter page: if the chapter starts further down in its seder, show where it starts
        const start = document.getElementById('chapter-start');
        if (start && start.getBoundingClientRect().bottom > innerHeight) start.scrollIntoView();
    }
    else if (typeof window.centerVerse == 'function') window.centerVerse();
})();
