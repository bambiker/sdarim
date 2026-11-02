// Write calendar/haftarot.json: the haftarah of every parasha, and of every Shabbat in
// calendar/parashot.json where it is a different one (a special Shabbat), by the Ashkenazi and the
// Sephardi / Edot HaMizrach custom, for the Israel schedule; and the readings of the special Shabbatot,
// Rosh Chodesh, the festivals and the fasts (the Torah reading, the maftir and the haftarah), which the
// parasha list on the home page offers after the parashot. The data comes from @hebcal/leyning (BSD).
//
//     npm install --no-save @hebcal/leyning @hebcal/core
//     node build_haftarot.mjs
//
// Each haftarah is a list of pieces [book, chapter, first verse, last verse], one per chapter, with the
// book and chapter as in sdarim.json, so the home page loads the verses from API/chapter_<chapter>_<book>.json.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getLeyningForParsha, getLeyningOnDate, getLeyningForHolidayKey} from '@hebcal/leyning';
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
const BOOKS = {'Genesis': 'בראשית', 'Exodus': 'שמות', 'Leviticus': 'ויקרא', 'Numbers': 'במדבר', 'Deuteronomy': 'דברים',
    'Joshua': 'יהושע', 'Judges': 'שופטים', 'I Samuel': 'שמואל א', 'II Samuel': 'שמואל ב',
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

// ~~~ the special readings: [name in the list, hebcal key or a range of our own, note shown above the reading] ~~~
// A name has no '-', which joins a double parasha (ויקהל-פקודי). The order and the names are those of the
// options in index.html (the special readings group of the parasha list).
const WEEKLY = 'בשבת זו קוראים את פרשת השבוע, ולמפטיר את הקריאה המיוחדת';
const READINGS = [
    ['פרשת שקלים', 'Shabbat Shekalim', WEEKLY + ':'],
    ['פרשת זכור', 'Shabbat Zachor', WEEKLY + ':'],
    ['פרשת פרה', 'Shabbat Parah', WEEKLY + ':'],
    ['פרשת החודש', 'Shabbat HaChodesh', WEEKLY + ':'],
    ['שבת הגדול', 'Shabbat HaGadol', 'בשבת זו קוראים את פרשת השבוע, ומפטירים בהפטרה מיוחדת.'],
    ['שבת שובה', 'Shabbat Shuva', 'בשבת זו קוראים את פרשת השבוע, ומפטירים בהפטרה מיוחדת.'],
    ['שבת ראש חודש', 'Shabbat Rosh Chodesh', WEEKLY + ' של ראש חודש:'],
    ['שבת מחר חודש', 'Shabbat Machar Chodesh', 'בשבת שלמחרתה ראש חודש קוראים את פרשת השבוע, ומפטירים בהפטרה מיוחדת.'],
    ['שבת חנוכה', 'Chanukah Day 1 (on Shabbat)', 'בשבת חנוכה קוראים את פרשת השבוע, ולמפטיר את קרבן הנשיא של אותו יום. ההפטרה:', 'haftarah'],
    ['שבת שנייה של חנוכה', 'Chanukah Day 8 (on Shabbat)', 'כשיש בחנוכה שתי שבתות, בשבת השנייה מפטירים בהפטרה זו.', 'haftarah'],
    ['ראש חודש', 'Rosh Chodesh', ''],
    ['ראש השנה יום ראשון', 'Rosh Hashana I', ''],
    ['ראש השנה יום שני', 'Rosh Hashana II', ''],
    ['יום כיפור', 'Yom Kippur', ''],
    ['יום כיפור במנחה', 'Yom Kippur (Mincha)', ''],
    ['סוכות', 'Sukkot I', ''],
    ['חול המועד סוכות', [['Numbers', '29:17', '29:34']], 'בכל יום מימי חול המועד קוראים את קרבן אותו יום.'],
    ['שבת חול המועד סוכות', 'Sukkot Shabbat Chol ha-Moed', 'ולמפטיר את קרבן אותו יום.'],
    ['שמיני עצרת ושמחת תורה', 'Simchat Torah', ''],
    ['חנוכה', [['Numbers', '7:1', '8:4']], 'בכל יום מימי חנוכה קוראים את קרבן הנשיא של אותו יום, וביום השמיני עד סוף הפרשה.'],
    ['פורים', 'Purim', 'ובערב ובבוקר קוראים את מגילת אסתר.'],
    ['פסח', 'Pesach I', ''],
    ['שבת חול המועד פסח', 'Pesach Shabbat Chol ha-Moed', ''],
    ['שביעי של פסח', 'Pesach VII', ''],
    ['שבועות', 'Shavuot', ''],
    ['תענית ציבור', 'Fast Day (Morning)', ''],
    ['תענית ציבור במנחה', 'Fast Day (Afternoon)', ''],
    ['תשעה באב', "Tish'a B'Av", ''],
    ['תשעה באב במנחה', "Tish'a B'Av (Mincha)", ''],
];

// verses [book, chapter, verse] of hebcal's ranges, in order and each once -> pieces, one per chapter
function versePieces(ranges) {
    const seen = new Set(), list = [];
    for (const part of ranges) {
        const book = BOOKS[part.k];
        if (!book) throw new Error('unknown book ' + part.k);
        const [c1, v1] = part.b.split(':').map(Number);
        const [c2, v2] = part.e.split(':').map(Number);
        for (let c = c1; c <= c2; c++)
            for (let v = c == c1 ? v1 : 1; v <= (c == c2 ? v2 : chapterLength(book, c)); v++) {
                const key = book + ' ' + c + ':' + v;
                if (!seen.has(key)) { seen.add(key); list.push([book, c, v]); }
            }
    }
    const out = [];
    for (const [book, c, v] of list) {
        const last = out[out.length - 1];
        if (last && last[0] == book && last[1] == hebrewNumber(c) && last[3] == v - 1) last[3] = v;
        else out.push([book, hebrewNumber(c), v, v]);
    }
    return out.length ? out : null;
}

const readings = {};
for (const [name, source, note, only] of READINGS) {
    const entry = {note};
    if (Array.isArray(source)) {
        entry.torah = versePieces(source.map(([k, b, e]) => ({k, b, e})));
    } else {
        const leyning = getLeyningForHolidayKey(source, undefined, true);
        if (!leyning) throw new Error('no reading for ' + source);
        const aliyot = Object.entries(leyning.fullkriyah || {});
        if (only != 'haftarah') {
            const torah = versePieces(aliyot.filter(([a]) => !a.startsWith('M')).map(([, r]) => r));
            const maftir = aliyot.filter(([a]) => a == 'M').map(([, r]) => r);
            entry.torah = torah;
            // the maftir, when it is not part of the reading itself
            const inTorah = JSON.stringify(versePieces(aliyot.filter(([a]) => a == 'M' || !a.startsWith('M')).map(([, r]) => r)));
            if (maftir.length && (!torah || inTorah != JSON.stringify(torah))) {
                const m = versePieces(maftir), last = torah && torah[torah.length - 1];
                // a maftir that goes on from the last verse of the reading is shown as part of it
                if (last && last[0] == m[0][0] && last[1] == m[0][1] && last[3] + 1 == m[0][2]) entry.torah = versePieces(aliyot.map(([, r]) => r));
                else entry.maftir = m;
            }
        }
        if (leyning.haft) Object.assign(entry, customs(leyning));
    }
    readings[name] = entry;
}

const json = '{\n"parashot": {\n' +
    Object.entries(parashot).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n') +
    '\n},\n"shabbatot": {\n' +
    Object.entries(shabbatot).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n') +
    '\n},\n"readings": {\n' +
    Object.entries(readings).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n') + '\n}\n}\n';
fs.writeFileSync(path.join(ROOT, 'calendar', 'haftarot.json'), json);
console.log(Object.keys(parashot).length, 'parashot,', Object.keys(shabbatot).length, 'special Shabbatot,',
    Object.keys(readings).length, 'special readings');
