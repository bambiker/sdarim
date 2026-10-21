#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Write calendar/parashot.json: the weekly Torah portion of every Shabbat, by the Israel schedule.

    pip install pyluach
    python3 build_calendar.py            # from this year for 15 years
    python3 build_calendar.py 2026 2045  # a range of years

The home page uses it to select this week's parasha. The names are the ones used in sdarim.json;
a double portion (ויקהל-פקודי) is listed as both names, and a Shabbat that is a festival has none.
"""
import datetime
import json
import os
import sys

from pyluach import dates, parshios

ROOT = os.path.dirname(os.path.abspath(__file__))

# the 54 portions in pyluach's order, with the names used in sdarim.json
NAMES = ['בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ', 'ויגש', 'ויחי',
         'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה', 'כי תשא', 'ויקהל', 'פקודי',
         'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות', 'קדשים', 'אמר', 'בהר', 'בחקתי',
         'במדבר', 'נשא', 'בהעלתך', 'שלח לך', 'קרח', 'חקת', 'בלק', 'פינחס', 'מטות', 'מסעי',
         'דברים', 'ואתחנן', 'עקב', 'ראה', 'שפטים', 'כי תצא', 'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה']


def main():
    this_year = datetime.date.today().year
    first = int(sys.argv[1]) if len(sys.argv) > 1 else this_year
    last = int(sys.argv[2]) if len(sys.argv) > 2 else this_year + 14
    day = datetime.date(first, 1, 1)
    day += datetime.timedelta(days=(5 - day.weekday()) % 7)   # the first Saturday
    shabbatot = {}
    while day.year <= last:
        portion = parshios.getparsha(dates.GregorianDate(day.year, day.month, day.day), israel=True)
        shabbatot[day.isoformat()] = [NAMES[i] for i in portion] if portion else []
        day += datetime.timedelta(days=7)
    os.makedirs(os.path.join(ROOT, 'calendar'), exist_ok=True)
    with open(os.path.join(ROOT, 'calendar', 'parashot.json'), 'w', encoding='utf-8') as f:
        f.write('{\n' + ',\n'.join(json.dumps(d) + ':' + json.dumps(p, ensure_ascii=False)
                                   for d, p in shabbatot.items()) + '\n}\n')
    print(len(shabbatot), 'Shabbatot,', first, '-', last)


if __name__ == '__main__':
    main()
