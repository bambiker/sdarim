// Write calendar/haftarot.json: the haftarah of every parasha, and of every Shabbat in
// calendar/parashot.json where it is a different one (a special Shabbat), by the Ashkenazi and the
// Sephardi / Edot HaMizrach custom, for the Israel schedule. The data comes from @hebcal/leyning (BSD).
//
//     npm install --no-save @hebcal/leyning @hebcal/core
//     node build_haftarot.mjs
//
// Each haftarah is a list of pieces [book, chapter, first verse, last verse], one per chapter, with the
// book and chapter as in sdarim.json, so the home page loads the verses from API/chapter_<chapter>_<book>.json.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getLeyningForParsha, getLeyningOnDate} from '@hebcal/leyning';
import {HDate, parshiot} from '@hebcal/core';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// hebcal's 54 parashot, in order, with the names used in sdarim.json
const NAMES = ['בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ', 'ויגש', 'ויחי',
    'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה', 'כי תשא', 'ויקהל', 'פקודי',
    'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות', 'קדשים', 'אמר', 'בהר', 'בחקתי',
    'במדבר', 'נשא', 'בהעלתך', 'שלח לך', 'קרח', 'חקת', 'בלק', 'פינחס', 'מטות', 'מסעי',
    'דברים', 'ואתחנן', 'עקב', 'ראה', 'שפטים', 'כי תצא', 'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'];
const DOUBLE = [['Vayakhel', 'Pekudei'], ['Tazria', 'Metzora'], ['Achrei Mot', 'Kedoshim'], ['Behar', 'Bechukotai'],
    ['Matot', 'Masei'], ['Nitzavim', 'Vayeilech']];
const BOOKS = {'Joshua': 'יהושע', 'Judges': 'שופטים', 'I Samuel': 'שמואל א', 'II Samuel': 'שמואל ב',
    'I Kings': 'מלכים א', 'II Kings': 'מלכים ב', 'Isaiah': 'ישעיהו', 'Jeremiah': 'ירמיהו', 'Ezekiel': 'יחזקאל',
    'Hosea': 'הושע', 'Joel': 'יואל', 'Amos': 'עמוס', 'Obadiah': 'עובדיה', 'Jonah': 'יונה', 'Micah': 'מיכה',
    'Nahum': 'נחום', 'Habakkuk': 'חבקוק', 'Zephaniah': 'צפניה', 'Haggai': 'חגי', 'Zechariah': 'זכריה', 'Malachi': 'מלאכי'};
const REASONS = [['Shekalim', 'שבת שקלים'], ['Zachor', 'שבת זכור'], ['Parah', 'שבת פרה'], ['HaChodesh', 'שבת החודש'],
    ['HaGadol', 'שבת הגדול'], ['Shuva', 'שבת שובה'], ['Chanukah', 'שבת חנוכה'], ['Machar Chodesh', 'שבת מחר חודש'],
    ['Rosh Chodesh', 'שבת ראש חודש'], ['17 Tammuz', 'אחרי י"ז בתמוז'],
    ['Consolation', 'עם הפטרת ראה, שנדחתה בשבת ראש חודש'], ['following Special Shabbat', 'אחרי שבת מיוחדת']];

const english = parshiot.slice(0, 54);
const hebrewName = new Map(english.map((name, i) => [name, NAMES[i]]));

function hebrewNumber(n) {
    const units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    if (n == 15) return 'טו';
    if (n == 16) return 'טז';
    return (n >= 100 ? 'ק' : '') + tens[Math.floor(n % 100 / 10)] + units[n % 10];
}

const chapterCache = new Map();
function chapterLength(book, chapter) {
    const key = book + chapter;
    if (!chapterCache.has(key)) {
        const file = path.join(ROOT, 'API', `chapter_${hebrewNumber(chapter)}_${book.replace(/ /g, '_')}.json`);
        chapterCache.set(key, JSON.parse(fs.readFileSync(file, 'utf8')).length);
    }
    return chapterCache.get(key);
}

// hebcal's {k: 'I Kings', b: '7:51', e: '8:21'} (or a list of them) -> pieces, one per chapter
function pieces(haft) {
    if (!haft) return null;
    const out = [];
    for (const part of [].concat(haft)) {
        const book = BOOKS[part.k];
        if (!book) throw new Error('unknown book ' + part.k);
        const [c1, v1] = part.b.split(':').map(Number);
        const [c2, v2] = part.e.split(':').map(Number);
        for (let c = c1; c <= c2; c++) {
            const last = c == c2 ? v2 : chapterLength(book, c);
            const first = c == c1 ? v1 : 1;
            if (last > chapterLength(book, c) || first > last) throw new Error(`bad range ${part.k} ${part.b}-${part.e}`);
            out.push([book, hebrewNumber(c), first, last]);
        }
    }
    return out;
}

function customs(leyning) {
    const ashkenazi = pieces(leyning.haft);
    const sephardi = pieces(leyning.seph) || ashkenazi;
    return {ashkenazi, sephardi};
}

const parashot = {};
for (const name of english) parashot[hebrewName.get(name)] = customs(getLeyningForParsha(name));
for (const pair of DOUBLE) parashot[pair.map(n => hebrewName.get(n)).join('-')] = customs(getLeyningForParsha(pair.join('-')));

const calendar = JSON.parse(fs.readFileSync(path.join(ROOT, 'calendar', 'parashot.json'), 'utf8'));
const shabbatot = {};
for (const [date, names] of Object.entries(calendar)) {
    if (!names.length) continue;
    const [y, m, d] = date.split('-').map(Number);
    const leyning = getLeyningOnDate(new HDate(new Date(y, m - 1, d)), true);
    if (!leyning || !leyning.haft) continue;
    const week = customs(leyning);
    const regular = parashot[names.join('-')];
    if (JSON.stringify(week) == JSON.stringify(regular)) continue;
    const why = (leyning.reason && (leyning.reason.haftara || leyning.reason.sephardic)) || '';
    const reason = (REASONS.find(([en]) => why.includes(en)) || [null, ''])[1];
    shabbatot[date] = Object.assign({reason}, week);
}

const json = '{\n"parashot": {\n' +
    Object.entries(parashot).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n') +
    '\n},\n"shabbatot": {\n' +
    Object.entries(shabbatot).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n') + '\n}\n}\n';
fs.writeFileSync(path.join(ROOT, 'calendar', 'haftarot.json'), json);
console.log(Object.keys(parashot).length, 'parashot,', Object.keys(shabbatot).length, 'special Shabbatot');
