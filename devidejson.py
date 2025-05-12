#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Wed Feb 19 14:55:48 2025

@author: nirb
"""
print('start')
cd /data4bk/nirb/Documents/seder
filename=r'/data5/NOBACKUP/nirb/sdarim.json'
import json
import codecs
data1=json.load(codecs.open(filename, 'r', 'utf-8-sig'))
d1=data1['seder']
print(d1[0])
unique_names = {item["bookchapter"] for item in d1}
unique_names1 = {item["bookseder"] for item in d1}
unique_parasha = set(item.get("parasha") for item in d1 if "parasha" in item)
unique_pairs = set((item["bookseder"], item["seder"]) for item in d1 if "bookseder" in item and "seder" in item)



# Convert set to list (since JSON doesn't support sets)
unique_names_list = list(unique_names)
unique_names_list1 = list(unique_names1)

# Create a JSON object
json_data = {"chapter_books": unique_names_list, "seder_books": unique_names_list1}

# Save to a JSON file
with open("book_names.json", "w") as file:
    json.dump(json_data, file, indent=4, ensure_ascii=False)

# Print the JSON output
print(json.dumps(json_data, indent=4))
############ dict of books ##################
for i in range(len(data1['seder'])):
# for i in range(40):
    # ssname=str(gematria_value(data1['seder'][i]['seder']))
    # svname=str(gematria_value(data1['seder'][i]['verseseder']))
    # csname=str(gematria_value(data1['seder'][i]['chapter']))
    # cvname=str(gematria_value(data1['seder'][i]['versechapter']))
    ssname=str(data1['seder'][i]['seder'])
    svname=str(data1['seder'][i]['verseseder'])
    csname=str(data1['seder'][i]['chapter'])
    cvname=str(data1['seder'][i]['versechapter'])
    sbname=data1['seder'][i]['bookseder']
    cbname=data1['seder'][i]['bookchapter']
   
    jsonsedername='seder_'+svname+'_'+ssname+'_'+sbname+'.json'
    jsonchaptername='chapter_'+cvname+'_'+csname+'_'+cbname+'.json'
    jsonsedername = jsonsedername.replace(" ", "_")
    jsonchaptername = jsonchaptername.replace(" ", "_")

    # print(i,jsonsedername,jsonchaptername,data1['seder'][i])
    print(i,jsonsedername,jsonchaptername)
    with open(jsonsedername, "w") as file:
        json.dump(data1['seder'][i], file, indent=4, ensure_ascii=False)
    with open(jsonchaptername, "w") as file:
        json.dump(data1['seder'][i], file, indent=4, ensure_ascii=False)

   
for i in range(len(data1['seder'])):
# for i in range(40):
    ssname=str(data1['seder'][i]['seder'])
    svname=str(data1['seder'][i]['verseseder'])
    csname=str(data1['seder'][i]['chapter'])
    cvname=str(data1['seder'][i]['versechapter'])
    sbname=data1['seder'][i]['bookseder']
    cbname=data1['seder'][i]['bookchapter']U

   
    jsonsedername='seder_'+ssname+'_'+sbname+'.json'
    jsonchaptername='chapter_'+csname+'_'+cbname+'.json'
    jsonsedername = jsonsedername.replace(" ", "_")
    jsonchaptername = jsonchaptername.replace(" ", "_")

    # print(i,jsonsedername,jsonchaptername,data1['seder'][i])
    print(i,jsonsedername,jsonchaptername)
    with open(jsonsedername, "w") as file:
        json.dump(data1['seder'][i], file, indent=4, ensure_ascii=False)
    with open(jsonchaptername, "w") as file:
        json.dump(data1['seder'][i], file, indent=4, ensure_ascii=False)

    filtered_seder = [d for d in data1['seder'] if d.get('bookseder') == sbname and d.get('seder') == ssname]
    filtered_chapter = [d for d in data1['seder'] if d.get('bookseder') == cbname and d.get('chapter') == csname]
    with open(jsonsedername, 'w') as f:
        json.dump(filtered_seder, f, ensure_ascii=False, indent=4)
    with open(jsonchaptername, 'w') as f:
        json.dump(filtered_chapter, f, ensure_ascii=False, indent=4)



############dict of numbers##################3
import json

# ערכי הגימטריה לפי סדר
gematria_ordered = [
    ('ר', 200), ('ק', 100),
    ('צ', 90), ('פ', 80), ('ע', 70), ('ס', 60), ('נ', 50), ('מ', 40), ('ל', 30), ('כ', 20), ('י', 10),
    ('ט', 9), ('ח', 8), ('ז', 7), ('ו', 6), ('ה', 5), ('ד', 4), ('ג', 3), ('ב', 2), ('א', 1)
]

# פונקציה שמחשבת את הגימטריה
def number_to_hebrew(n):
    result = ''
    for letter, value in gematria_ordered:
        while n >= value:
            result += letter
            n -= value

    # טיפול בצירופים לא תקניים של יה ו-יו
    result = result.replace('יה', 'טו')
    result = result.replace('יו', 'טז')
    return result

# יצירת שני מילונים
hebrew_to_number = {}
number_to_hebrew_dict = {}

for i in range(1, 201):
    hebrew = number_to_hebrew(i)
    hebrew_to_number[hebrew] = i
    number_to_hebrew_dict[i] = hebrew

# שמירה לשני קבצי JSON
with open('hebrew_numbers.json', 'w', encoding='utf-8') as f1:
    json.dump(hebrew_to_number, f1, ensure_ascii=False, indent=2)

with open('number_to_hebrew.json', 'w', encoding='utf-8') as f2:
    json.dump(number_to_hebrew_dict, f2, ensure_ascii=False, indent=2)

print("✅ נוצרו שני קבצים: hebrew_numbers.json ו־number_to_hebrew.json")

# הפונקציה שמחשבת ערך גימטרי
def gematria_value(hebrew_str):
    return sum(gematria.get(letter, 0) for letter in hebrew_str)

# דוגמה
word = "קיב"
value = gematria_value(word)
print(f"הערך של '{word}' הוא {value}")

##############################
import requests
url2 = "https://raw.githubusercontent.com/bambiker/sdarim/main/API/chapter_א_כב_שמואל_ב.json"

# Fetch and parse the JSON
response = requests.get(url2)
response.encoding = 'utf-8'  # Ensure Hebrew characters are handled properly
data = response.json()
print(data)


# ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

# Save to a text file
with open("sitemap.txt", "w") as file:
    file.write('<?xml version="1.0" encoding="UTF-8"?>' + '\n')
    file.write('<urlset' + '\n')
    file.write('      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' + '\n')
    file.write('      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' + '\n')
    file.write('      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9' + '\n')
    file.write('            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">' + '\n')
    file.write('<url>' + '\n')
    file.write('<loc>https://www.masdirim.org/</loc>' + '\n')
    file.write('<lastmod>2025-05-11T11:35:24+00:00</lastmod>' + '\n')
    file.write('<priority>1.00</priority>' + '\n')
    file.write('</url>' + '\n')
    file.write('<url>' + '\n')
    file.write('<loc>https://www.masdirim.org/api</loc>' + '\n')
    file.write('<lastmod>2025-05-11T11:35:24+00:00</lastmod>' + '\n')
    file.write('<priority>0.80</priority>' + '\n')
    file.write('</url>' + '\n')
    file.write('<url>' + '\n')
    file.write('<loc>https://www.masdirim.org/fame</loc>' + '\n')
    file.write('<lastmod>2025-05-11T11:35:24+00:00</lastmod>' + '\n')
    file.write('<priority>0.80</priority>' + '\n')
    file.write('</url>' + '\n')
   
    for iparasha in unique_parasha:
        file.write('<url>' + '\n')
        parashan = iparasha.replace(" ", "_")
        file.write('<loc>https://www.masdirim.org/?parasha='+parashan+'</loc>' + '\n')
        file.write('<lastmod>2025-05-11T11:35:24+00:00</lastmod>' + '\n')
        file.write('<priority>0.60</priority>' + '\n')
        file.write('</url>' + '\n')
   
   
    for bookseder, seder in unique_pairs:
        # print(f"name: {bookseder}, color: {seder}")
        # ssname=str(data1['seder'][i]['seder'])
        # svname=str(data1['seder'][i]['verseseder'])
        # sbname=data1['seder'][i]['bookseder']
        # sbname1 = sbname.replace(" ", "_")
        sbname1 = bookseder.replace(" ", "_")
        file.write('<url>' + '\n')
        parashan = iparasha.replace(" ", "_")
        file.write('<loc>https://www.masdirim.org/?book='+sbname1+'&seder='+seder+'&verse=א'+'</loc>' + '\n')
        file.write('<lastmod>2025-05-11T11:35:24+00:00</lastmod>' + '\n')
        file.write('<priority>0.60</priority>' + '\n')
        file.write('</url>' + '\n')
   
   
   
    file.write('' + '\n')
    file.write('' + '\n')
    file.write('' + '\n')
    file.write('' + '\n')
    file.write('' + '\n')
    file.write('' + '\n')
    file.write('</urlset>' + '\n')
   
# ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
