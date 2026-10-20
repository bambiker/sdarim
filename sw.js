// Service worker: lets the site be installed as an app, and shows pages already read when offline.
// Always asks the network first, so a new version of the site is seen at once; the cache is only a fallback.

const CACHE = 'masdirim-v1';
const SHELL = ['/', '/sdarim.css', '/sdarim.js', '/commentary.js', '/app.js',
               '/manifest.webmanifest', '/icon-192.png', '/API/sedarim.json', '/commentary/sources.json'];
const MAX_SIZE = 2 * 1024 * 1024;   // sdarim.json (15MB, used by the word search) is not kept

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k != CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

function keep(request, response) {
    const url = new URL(request.url);
    // the Google Fonts stylesheet comes back opaque (no CORS); it is small, so it is kept too
    if (response.type == 'opaque') return url.hostname == 'fonts.googleapis.com';
    if (!response.ok || url.pathname == '/sdarim.json') return false;
    const size = Number(response.headers.get('content-length'));
    return !(size > MAX_SIZE);
}

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method != 'GET') return;
    const url = new URL(request.url);
    const fonts = url.hostname == 'fonts.googleapis.com' || url.hostname == 'fonts.gstatic.com';
    if (url.origin != location.origin && !fonts) return;   // analytics, sharing buttons: not touched

    event.respondWith(fetch(request).then(response => {
        if (keep(request, response)) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
    }).catch(() => caches.match(request).then(hit => {
        if (hit) return hit;
        // offline, a page never opened: the home page with its query (?book=...&seder=...) still works
        // for sedarim whose files are in the cache
        if (request.mode == 'navigate') return caches.match(request, {ignoreSearch: true}).then(page => page || caches.match('/'));
        return Response.error();
    })));
});
