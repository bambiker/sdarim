// Accounts: signing in with Google, and marking sedarim and verses as learned, kept in Firestore so the
// reader's progress follows them from device to device. Loaded as a module on every page.
//
// Firestore holds one document per reader, users/<uid>:
//     {sedarim: ['בראשית|א', ...], verses: ['בראשית|ב|ג', ...], dates: {'בראשית|א': <time learned>}, updated}
// by the seder numbering. The security rules (see firestore.rules) let each reader read and write only their
// own document; the list of readers is seen only in the Firebase console (Authentication, Users).
//
// The pages show:
//     <button class="learn-seder" data-book data-seder hidden>  in a seder (sdarim.js, the static seder pages)
//     <button class="learn-verse" data-book data-seder data-verse hidden>  in the commentaries of a verse
//     .verse.learned  on every verse learned, by itself or with its seder
// and the topbar gets a sign-in button, or the reader's name with a link to their progress (progress.html).
// progress.html listens to the 'masdirim:account' event, whose detail is the state below.

import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut} from
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getFirestore, doc, onSnapshot, setDoc, arrayUnion, arrayRemove, deleteField, serverTimestamp} from
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// the site's Firebase project; these identify it and are public (the rules protect the data)
const app = initializeApp({
    apiKey: 'AIzaSyDCxp7I5bk1Zzr6uYeqGzp0mDwmm30y7jc',
    authDomain: 'masdirim-bf82c.firebaseapp.com',
    projectId: 'masdirim-bf82c',
    storageBucket: 'masdirim-bf82c.firebasestorage.app',
    messagingSenderId: '880264251658',
    appId: '1:880264251658:web:baf548672293db54c152f3',
});
const auth = getAuth(app);
const db = getFirestore(app);

const state = {ready: false, user: null, sedarim: new Set(), verses: new Set(), dates: {}};
let pending = null;   // a mark asked for before signing in, done once signed in
let stopListening = null;

function track(name, params) {
    try { if (typeof gtag == 'function') gtag('event', name, params || {}); } catch (e) { }
}

export async function signIn() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        // a blocked popup (some phones, the installed app): the same, by leaving the page and coming back
        if (e && (e.code == 'auth/popup-blocked' || e.code == 'auth/operation-not-supported-in-this-environment'))
            await signInWithRedirect(auth, provider);
        else if (!(e && (e.code == 'auth/popup-closed-by-user' || e.code == 'auth/cancelled-popup-request')))
            alert('לא ניתן להתחבר כרגע. נסו שוב מאוחר יותר.');
    }
}

export function signOutReader() {
    return signOut(auth);
}

const userDoc = () => doc(db, 'users', state.user.uid);

export async function toggleSeder(book, seder) {
    if (!state.user) { pending = {book, seder}; return signIn(); }
    const key = book + '|' + seder;
    const learned = state.sedarim.has(key);
    await setDoc(userDoc(), learned
        ? {sedarim: arrayRemove(key), dates: {[key]: deleteField()}, updated: serverTimestamp()}
        : {sedarim: arrayUnion(key), dates: {[key]: serverTimestamp()}, updated: serverTimestamp()}, {merge: true});
    track(learned ? 'unmark_seder' : 'mark_seder', {book, seder});
}

export async function toggleVerse(book, seder, verse) {
    if (!state.user) { pending = {book, seder, verse}; return signIn(); }
    const key = book + '|' + seder + '|' + verse;
    const learned = state.verses.has(key);
    await setDoc(userDoc(), {verses: learned ? arrayRemove(key) : arrayUnion(key), updated: serverTimestamp()}, {merge: true});
    track(learned ? 'unmark_verse' : 'mark_verse', {book, seder, verse});
}

export function getState() {
    return state;
}

// ~~~ the page: the topbar button, the learn buttons and the learned verses ~~~

function topbar() {
    const inner = document.querySelector('.topbar-inner');
    if (!inner || !state.ready) return;
    let box = document.getElementById('account');
    if (!box) {
        box = document.createElement('div');
        box.id = 'account';
        box.className = 'account';
        const install = inner.querySelector('.install');
        inner.insertBefore(box, install || null);
    }
    if (state.user) {
        const name = (state.user.displayName || state.user.email || '').split(' ')[0];
        box.innerHTML = '<a class="account-link" href="/progress.html" title="ההתקדמות שלי">' +
            '<span class="account-mark" aria-hidden="true">✓</span><span class="wide-only"></span></a>';
        box.querySelector('.wide-only').textContent = 'ההתקדמות של ' + name;
    } else {
        box.innerHTML = '<button type="button" class="account-link">התחברות</button>';
        box.querySelector('button').addEventListener('click', signIn);
    }
}

function refresh() {
    document.querySelectorAll('.learn-seder').forEach(b => {
        const on = state.sedarim.has(b.dataset.book + '|' + b.dataset.seder);
        b.hidden = false;
        b.setAttribute('aria-pressed', on);
        b.textContent = on ? '✓ הסדר נלמד' : 'סימון הסדר כנלמד';
    });
    document.querySelectorAll('.learn-verse').forEach(b => {
        const on = state.verses.has(b.dataset.book + '|' + b.dataset.seder + '|' + b.dataset.verse);
        b.hidden = false;
        b.setAttribute('aria-pressed', on);
        b.textContent = on ? '✓ הפסוק נלמד' : 'סימון הפסוק כנלמד';
    });
    document.querySelectorAll('.verse').forEach(v => {
        const n = v.querySelector('.vnum[data-seder]');
        if (!n) return;
        const seder = n.dataset.book + '|' + n.dataset.seder;
        v.classList.toggle('learned', state.sedarim.has(seder) || state.verses.has(seder + '|' + n.dataset.verse));
    });
}

function changed() {
    topbar();
    refresh();
    document.dispatchEvent(new CustomEvent('masdirim:account', {detail: state}));
}

document.addEventListener('click', event => {
    const seder = event.target.closest && event.target.closest('.learn-seder');
    if (seder) { event.preventDefault(); toggleSeder(seder.dataset.book, seder.dataset.seder); return; }
    const verse = event.target.closest && event.target.closest('.learn-verse');
    if (verse) { event.preventDefault(); toggleVerse(verse.dataset.book, verse.dataset.seder, verse.dataset.verse); }
});

// the text is drawn again and again (a seder, a parasha, the commentaries): mark what is learned in it
let scheduled = false;
new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; refresh(); });
}).observe(document.body, {childList: true, subtree: true});

onAuthStateChanged(auth, user => {
    if (stopListening) { stopListening(); stopListening = null; }
    state.user = user;
    state.sedarim = new Set();
    state.verses = new Set();
    state.dates = {};
    state.ready = true;
    if (!user) { changed(); return; }
    track('sign_in');
    stopListening = onSnapshot(doc(db, 'users', user.uid), snap => {
        const data = snap.exists() ? snap.data() : {};
        state.sedarim = new Set(data.sedarim || []);
        state.verses = new Set(data.verses || []);
        state.dates = data.dates || {};
        changed();
        if (pending) {
            const p = pending;
            pending = null;
            if (p.verse) { if (!state.verses.has(p.book + '|' + p.seder + '|' + p.verse)) toggleVerse(p.book, p.seder, p.verse); }
            else if (!state.sedarim.has(p.book + '|' + p.seder)) toggleSeder(p.book, p.seder);
        }
    }, () => changed());
});

window.masdirimAccount = {signIn, signOut: signOutReader, toggleSeder, toggleVerse, getState};
changed();
