async function start(){

   try{
          book  = removeunderscore(decode(GetURLParameter('book')));
          seder = decode(GetURLParameter('seder'));
          verse = decode(GetURLParameter('verse'));
      
          const response = await fetch("sdarim.json");
          const json = await response.json();
          const filt2 = [{label: 'bookseder', value: book}, {label: 'seder', value: seder}];
          const filtArray2 = json.seder.filter(item => filt2.every(filt2 => item[filt2.label] === filt2.value))
          userSeder(filtArray2, book, seder, verse)
          document.title=" מסדירים בספר " + book + " סדר " + seder;
          urlname = "https://www.masdirim.org/?book="+addunderscore(book)+"&seder="+seder+"&verse="+verse;
          document.getElementById("urlname").innerHTML  = '<a href ='+urlname+'>'+urlname+'</a>';
          document.getElementById("sbook").value  = book;
          document.getElementById("seder").value  = seder;
          document.getElementById("sverse").value  = verse;      
      }
      catch (err)
    {
       try{
          parasha  = removeunderscore(decode(GetURLParameter('parasha')));
          document.getElementById("parasha").value = parasha;
          findparasha();
       }
          catch{
       urlname = "https://www.masdirim.org";
       document.getElementById("urlname").innerHTML  = '<a href ='+urlname+'>'+urlname+'</a>'; 
       document.getElementById("result").innerHTML  = "";
               }
    }

    return;
 }

  function decode(str) {
            return decodeURIComponent(str.replace(/\+/g,  " "));
   }

function GetURLParameter(sParam)
{
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) 
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) 
        {
            return sParameterName[1];
        }
    }
}

async function chapter2seder(){

    document.getElementById("result").innerHTML  = " אנו מחפשים עבורך את המקור, נא להמתין בסבלנות ";

    
    var cbook = document.getElementById("cbook").value;
    var chapter = document.getElementById("chapter").value;         
    var cverse = document.getElementById("cverse").value;  
    if (chapter.trim()=="") chapter="א";
    if (cverse.trim()=="") cverse="א";
    
    const response = await fetch("sdarim.json");
    const json = await response.json();
    const filt = [{label: 'bookchapter', value: cbook}, {label: 'chapter', value: chapter}, {label: 'versechapter', value: cverse}];
    const filtArray = json.seder.filter(item => filt.every(filt => item[filt.label] === filt.value))

    try{  
    document.getElementById("sbook").value = filtArray[0].bookseder;
    document.getElementById("seder").value = filtArray[0].seder;
    document.getElementById("sverse").value = filtArray[0].verseseder;
    document.getElementById("result").innerHTML  = filtArray[0].versenikud;
    const filt2 = [{label: 'bookseder', value: filtArray[0].bookseder}, {label: 'seder', value: filtArray[0].seder}];
    const filtArray2 = json.seder.filter(item => filt2.every(filt2 => item[filt2.label] === filt2.value))
    userSeder(filtArray2, filtArray[0].bookseder, filtArray[0].seder, filtArray[0].verseseder)
    urlname = "https://www.masdirim.org/?book="+addunderscore(filtArray[0].bookseder)+"&seder="+filtArray[0].seder+"&verse="+filtArray[0].verseseder;
    document.getElementById("urlname").innerHTML  = '<a href ='+urlname+'>'+urlname+'</a>';
    document.title = "מסדירים - ספר " + filtArray[0].bookseder + " סדר " + filtArray[0].seder;
 
    }
    catch (err)
    {
    document.getElementById("result").innerHTML  = " הפרק לא נמצא ";
    }
    return;
}

async function seder2chapter(){

        document.getElementById("result").innerHTML  = " אנו מחפשים עבורך את המקור, נא להמתין בסבלנות ";

    
    var sbook = document.getElementById("sbook").value;
    var seder = document.getElementById("seder").value;         
    var sverse = document.getElementById("sverse").value; 
    if (seder.trim()=="") seder="א";
    if (sverse.trim()=="") sverse="א";
   
    const response = await fetch("sdarim.json");
    const json = await response.json();

    const filt = [{label: 'bookseder', value: sbook}, {label: 'seder', value: seder}, {label: 'verseseder', value: sverse}];
    const filtArray = json.seder.filter(item => filt.every(filt => item[filt.label] === filt.value))
    try{
    document.getElementById("cbook").value = filtArray[0].bookchapter;
    document.getElementById("chapter").value = filtArray[0].chapter;
    document.getElementById("cverse").value = filtArray[0].versechapter;
    document.getElementById("result").innerHTML  = filtArray[0].versenikud;
    const filt2 = [{label: 'bookseder', value: filtArray[0].bookseder}, {label: 'seder', value: filtArray[0].seder}];
    const filtArray2 = json.seder.filter(item => filt2.every(filt2 => item[filt2.label] === filt2.value))
    userSeder(filtArray2, filtArray[0].bookseder, filtArray[0].seder, filtArray[0].verseseder)
    urlname = "https://www.masdirim.org/?book="+addunderscore(filtArray[0].bookseder)+"&seder="+filtArray[0].seder+"&verse="+filtArray[0].verseseder;
    document.getElementById("urlname").innerHTML  = '<a href ='+urlname+'>'+urlname+'</a>';
    document.title = " ספר " + sbook + " סדר " + seder;

    }
    catch (err)
    {
    document.getElementById("result").innerHTML  = " הסדר לא נמצא ";
    }
    return ;

}

async function findparasha(){
    document.getElementById("result").innerHTML  = " אנו מחפשים עבורך את המקור, נא להמתין בסבלנות ";

    var parasha = document.getElementById("parasha").value;

    const response = await fetch("sdarim.json");
    const json = await response.json();

    const filters = [{label: 'parasha', value: parasha}];
    const filteredArray = json.seder.filter(item => filters.every(filter => item[filter.label] === filter.value))
    console.log(filteredArray);

    output = "<h2>" + "פרשת " + parasha + "</h2>";
    oldseder='-1' 
    for (let i = 0; i < filteredArray.length; i++) {
         if (filteredArray[i].seder!=oldseder) output += "<h3>"+ filteredArray[i].bookseder +" סדר " + filteredArray[i].seder + "</h3>";
         output +=  '<a href="'+mgketer(filteredArray[i].bookchapter,filteredArray[i].chapter,filteredArray[i].versechapter)+'" target="_blank">' + "<sup>(" + filteredArray[i].verseseder + ")</sup> " + '</a>'  + cleanverse(filteredArray[i].versenikud)//filteredArray[i].versenikud + "<br>";
         oldseder = filteredArray[i].seder
    }
    document.getElementById("result").innerHTML  = output;

    urlname = "https://www.masdirim.org/?parasha="+addunderscore(parasha);
    document.getElementById("urlname").innerHTML  = '<a href ='+urlname+'>'+urlname+'</a>';
    document.title = " פרשת " + parasha + " לפי החלוקה לסדרים ";
    return ;

}

async function findfree(){

    var freetext = document.getElementById("free").value;
    document.getElementById("result").innerHTML  = " אנו מחפשים עבורך את המקור, נא להמתין בסבלנות ";

    const response = await fetch("sdarim.json");
    const json = await response.json();

    var results = "";
//    console.log(json.seder);
//    console.log(json.seder.length);

    for (index = 0; index < json.seder.length; ++index) {
        entry = json.seder[index];
    //    console.log(entry);
        try{        
            if (entry.versenonikud.indexOf(freetext) !== -1) {
                console.log(entry);
                urltext = "https://www.masdirim.org/?book="+addunderscore(entry.bookseder)+"&seder="+entry.seder+"&verse="+entry.verseseder;

                results += '<a href="'+urltext+'">' +
                    '<u>' + entry.bookseder + ' סדר ' + entry.seder + ' פסוק ' + entry.verseseder + '</u></a><br>' + entry.versenonikud + '<br>'
            }
        }
            catch (err)
    {
        console.log("not found verse text");
    }
    }
    if (results == "") results = "לא נמצאו תוצאות"
    document.getElementById("result").innerHTML  = results;
    console.log(results);

    urlname = "https://www.masdirim.org";
    document.getElementById("urlname").innerHTML  = '<a href ='+urlname+'>'+urlname+'</a>';
    document.title = "מסדירים - חלוקת התנך היהודית, חיפוש חופשי של " + freetext;
    return ;

}

function addunderscore(str)
{
     return str.replace(" ", "_");
}
function removeunderscore(str)
{
     return str.replace("_", " ");
}

function mgketer(bookname, chapter, verse)
{
//https://www.mgketer.org/tanach/27/119/165
url='https://www.mgketer.org/tanach/'
 if (bookname=='בראשית')
   mgbook=1
 if (bookname=='שמות')
   mgbook=2
 if (bookname=='ויקרא')
   mgbook=3
 if (bookname=='במדבר')
   mgbook=4
 if (bookname=='דברים')
   mgbook=5
 if (bookname=='יהושע')
   mgbook=6
 if (bookname=='שופטים')
   mgbook=7
 if (bookname=='שמואל א')
     mgbook=8
 if (bookname=='שמואל ב')
   mgbook=9
  if (bookname=='מלכים א')
    mgbook=10
   if (bookname=='מלכים ב')
   mgbook=11
 if (bookname=='ישעיהו')
   mgbook=12
 if (bookname=='ירמיהו')
   mgbook=13
 if (bookname=='יחזקאל')
   mgbook=14
 if (bookname=='הושע')
   mgbook=15
 if (bookname=='יואל')
   mgbook=16
 if (bookname=='עמוס')
   mgbook=17
 if (bookname=='עובדיה')
   mgbook=18
 if (bookname=='יונה')
   mgbook=19
 if (bookname=='מיכה')
   mgbook=20
 if (bookname=='נחום')
   mgbook=21
 if (bookname=='חבקוק')
   mgbook=22
 if (bookname=='צפניה')
   mgbook=23
 if (bookname=='חגי')
   mgbook=24
 if (bookname=='זכריה')
   mgbook=25
 if (bookname=='מלאכי')
   mgbook=26
 if (bookname=='תהילים')
   mgbook=27
 if (bookname=='משלי')
   mgbook=28
 if (bookname=='איוב')
   mgbook=29
 if (bookname=='שיר השירים')
   mgbook=30
 if (bookname=='רות')
   mgbook=31
 if (bookname=='איכה')
   mgbook=32
 if (bookname=='קהלת')
   mgbook=33
 if (bookname=='אסתר')
   mgbook=34
 if (bookname=='דניאל')
   mgbook=35
 if (bookname=='עזרא')
   mgbook=36
 if (bookname=='נחמיה')
   mgbook=37
 if (bookname=='דברי הימים א')
   mgbook=38
 if (bookname=='דברי הימים ב')
   mgbook=39
 
 url=url+mgbook+'/'+heb2num(chapter,2) +'/' + heb2num(verse, 2)
// url = 'http://ynet.co.il'
 return url
}
function mamre(bookname, chapter){
  
 offset=''
 url='https://www.mechon-mamre.org/i/t/t'
 if (bookname=='בראשית')
   book='01'
 if (bookname=='שמות')
   book='02'
 if (bookname=='ויקרא')
   book='03'
 if (bookname=='במדבר')
   book='04'
 if (bookname=='דברים')
   book='05'
 if (bookname=='יהושע')
   book='06'
 if (bookname=='שופטים')
   book='07'
   if (bookname=='שמואל א'){
     offset='a'
     book='08'}
   if (bookname=='שמואל ב'){
   book='08'
   offset = 'b'}
  if (bookname=='מלכים א'){
    offset='a'
    book='09'}
   if (bookname=='מלכים ב'){
   book='09'
   offset = 'b'}
 if (bookname=='ישעיהו')
   book='10'
 if (bookname=='ירמיהו')
   book='11'
 if (bookname=='יחזקאל')
   book='12'
 if (bookname=='הושע')
   book='13'
 if (bookname=='יואל')
   book='14'
 if (bookname=='עמוס')
   book='15'
 if (bookname=='עובדיה')
   book='16'
 if (bookname=='יונה')
   book='17'
 if (bookname=='מיכה')
   book='18'
 if (bookname=='נחום')
   book='19'
 if (bookname=='חבקוק')
   book='20'
 if (bookname=='צפניה')
   book='21'
 if (bookname=='חגי')
   book='22'
 if (bookname=='זכריה')
   book='23'
 if (bookname=='מלאכי')
   book='24'
   if (bookname=='דברי הימים א'){
     offset='a'
     book='25'}
   if (bookname=='דברי הימים ב'){
   book='25'
   offset = 'b'}
 if (bookname=='תהילים')
   book='26'
 if (bookname=='איוב')
   book='27'
 if (bookname=='משלי')
   book='28'
 if (bookname=='רות')
   book='29'
 if (bookname=='שיר השירים')
   book='30'
 if (bookname=='קהלת')
   book='31'
 if (bookname=='איכה')
   book='32'
 if (bookname=='אסתר')
   book='33'
 if (bookname=='דניאל')
   book='34'
   if (bookname=='עזרא'){
   book='35'
   offset='a'
   }
   if (bookname=='נחמיה'){
   book='35'
   offset = 'b'}
   
 chapternum = heb2num(chapter, 1)
 url += book + offset + chapternum + '.htm'
 
 return url
}

function heb2num(lword, site){
  if (lword[2]=='ק')
//    if (lword.length==3)
//      word = lword[0]+lword[1]
//    else
//      word = lword[0]
     word = 'א'
  else
    word = lword
  num='01'
 if (word=='א')
   num = '01'
 if (word=='ב')
   num = '02'
 if (word=='ג')
   num = '03'
 if (word=='ד')
   num = '04'
 if (word=='ה')
   num = '05'
 if (word=='ו')
   num = '06'
 if (word=='ז')
   num = '07'
 if (word=='ח')
   num = '08'
 if (word=='ט')
   num = '09'
 if (word=='י')
   num = '10'
 if (word=='יא')
   num = '11'
 if (word=='יב')
   num = '12'
 if (word=='יג')
   num = '13'
 if (word=='יד')
   num = '14'
 if (word=='טו')
   num = '15'
 if (word=='טז')
   num = '16'
 if (word=='יז')
   num = '17'
 if (word=='יח')
   num = '18'
 if (word=='יט')
   num = '19'
 if (word=='כ')
   num = '20'
 if (word=='כא')
   num = '21'
 if (word=='כב')
   num = '22'
 if (word=='כג')
   num = '23'
 if (word=='כד')
   num = '24'
 if (word=='כה')
   num = '25'
 if (word=='כו')
   num = '26'
 if (word=='כז')
   num = '27'
 if (word=='כח')
   num = '28'
 if (word=='כט')
   num = '29'
 if (word=='ל')
   num = '30'
 if (word=='לא')
   num = '31'
 if (word=='לב')
   num = '32'
 if (word=='לג')
   num = '33'
 if (word=='לד')
   num = '34'
 if (word=='לה')
   num = '35'
 if (word=='לו')
   num = '36'
 if (word=='לז')
   num = '37'
 if (word=='לח')
   num = '38'
 if (word=='לט')
   num = '39'
 if (word=='מ')
   num = '40'
 if (word=='מא')
   num = '41'
 if (word=='מב')
   num = '42'
 if (word=='מג')
   num = '43'
 if (word=='מד')
   num = '44'
 if (word=='מה')
   num = '45'
 if (word=='מו')
   num = '46'
 if (word=='מז')
   num = '47'
 if (word=='מח')
   num = '48'
 if (word=='מט')
   num = '49'
 if (word=='נ')
   num = '50'
 if (word=='נא')
   num = '51'
 if (word=='נב')
   num = '52'
 if (word=='נג')
   num = '53'
 if (word=='נד')
   num = '54'
 if (word=='נה')
   num = '55'
 if (word=='נו')
   num = '56'
 if (word=='נז')
   num = '57'
 if (word=='נח')
   num = '58'
 if (word=='נט')
   num = '59'
 if (word=='ס')
   num = '60'
 if (word=='סא')
   num = '61'
 if (word=='סב')
   num = '62'
 if (word=='סג')
   num = '63'
 if (word=='סד')
   num = '64'
 if (word=='סה')
   num = '65'
 if (word=='סו')
   num = '66'
 if (word=='סז')
   num = '67'
 if (word=='סח')
   num = '68'
 if (word=='סט')
   num = '69'
 if (word=='ע')
   num = '70'
 if (word=='עא')
   num = '71'
 if (word=='עב')
   num = '72'
 if (word=='עג')
   num = '73'
 if (word=='עד')
   num = '74'
 if (word=='עה')
   num = '75'
 if (word=='עו')
   num = '76'
 if (word=='עז')
   num = '77'
 if (word=='עח')
   num = '78'
 if (word=='עט')
   num = '79'
 if (word=='פ')
   num = '80'
 if (word=='פא')
   num = '81'
 if (word=='פב')
   num = '82'
 if (word=='פג')
   num = '83'
 if (word=='פד')
   num = '84'
 if (word=='פה')
   num = '85'
 if (word=='פו')
   num = '86'
 if (word=='פז')
   num = '87'
 if (word=='פח')
   num = '88'
 if (word=='פט')
   num = '89'
 if (word=='צ')
   num = '90'
 if (word=='צא')
   num = '91'
 if (word=='צב')
   num = '92'
 if (word=='צג')
   num = '93'
 if (word=='צד')
   num = '94'
 if (word=='צה')
   num = '95'
 if (word=='צו')
   num = '96'
 if (word=='צז')
   num = '97'
 if (word=='צח')
   num = '98'
 if (word=='צט')
   num = '99'
 if (word=='ק')
   num = 'a0'  
 if (word=='קא')
   num = 'a1'
 if (word=='קב')
   num = 'a2'
 if (word=='קג')
   num = 'a3'
 if (word=='קד')
   num = 'a4'
 if (word=='קה')
   num = 'a5'
 if (word=='קו')
   num = 'a6'
 if (word=='קז')
   num = 'a7'
 if (word=='קח')
   num = 'a8'
 if (word=='קט')
   num = 'a9'
 if (word=='קי')
   num = 'b0'
 if (word=='קיא')
   num = 'b1'
 if (word=='קיב')
   num = 'b2'
 if (word=='קיג')
   num = 'b3'
 if (word=='קיד')
   num = 'b4'
 if (word=='קטו')
   num = 'b5'
 if (word=='קטז')
   num = 'b6'
 if (word=='קיז')
   num = 'b7'
 if (word=='קיח')
   num = 'b8'
 if (word=='קיט')
   num = 'b9'
 if (word=='קכ')
   num = 'c0'
 if (word=='קכא')
   num = 'c1'
 if (word=='קכב')
   num = 'c2'
 if (word=='קכג')
   num = 'c3'
 if (word=='קכד')
   num = 'c4'
 if (word=='קכה')
   num = 'c5'
 if (word=='קכו')
   num = 'c6'
 if (word=='קכז')
   num = 'c7'
 if (word=='קכח')
   num = 'c8'
 if (word=='קכט')
   num = 'c9'
 if (word=='קל')
   num = 'd0'
 if (word=='קלא')
   num = 'd1'
 if (word=='קלב')
   num = 'd2'
 if (word=='קלג')
   num = 'd3'
 if (word=='קלד')
   num = 'd4'
 if (word=='קלה')
   num = 'd5'
 if (word=='קלו')
   num = 'd6'
 if (word=='קלז')
   num = 'd7'
 if (word=='קלח')
   num = 'd8'
 if (word=='קלט')
   num = 'd9'
 if (word=='קמ')
   num = 'e0'
 if (word=='קמא')
   num = 'e1'
 if (word=='קמב')
   num = 'e2'
 if (word=='קמג')
   num = 'e3'
 if (word=='קמד')
   num = 'e4'
 if (word=='קמה')
   num = 'e5'
 if (word=='קמו')
   num = 'e6'
 if (word=='קמז')
   num = 'e7'
 if (word=='קמח')
   num = 'e8'
 if (word=='קמט')
   num = 'e9'
 if (word=='קנ')
   num = 'f0'
 if (word=='קנא')
   num = 'f1'
 if (word=='קנב')
   num = 'f2'
 if (word=='קנג')
   num = 'f3'
 if (word=='קנד')
   num = 'f4'
 if (word=='קנה')
   num = 'f5'
 if (word=='קנו')
   num = 'f6'
 if (word=='קנז')
   num = 'f7'
 if (word=='קנח')
   num = 'f8'
 if (word=='קנט')
   num = 'f9'
 if (word=='קס')
   num = 'g0'
 if (word=='קסא')
   num = 'g1'
 if (word=='קסב')
   num = 'g2'
 if (word=='קסג')
   num = 'g3'
 if (word=='קסד')
   num = 'g4'
 if (word=='קסה')
   num = 'g5'
 if (word=='קסו')
   num = 'g6'
 if (word=='קסז')
   num = 'g7'
 if (word=='קסח')
   num = 'g8'
 if (word=='קסט')
   num = 'g9'
 if (word=='קע')
   num = 'h0'
 if (word=='קעא')
   num = 'h1'
 if (word=='קעב')
   num = 'h2'
 if (word=='קעג')
   num = 'h3'
 if (word=='קעד')
   num = 'h4'
 if (word=='קעה')
   num = 'h5'
 if (word=='קעו')
   num = 'h6'
 if (site==2)
 {
   if (num[0]=='a')
     num = '10'+num[1]
   if (num[0]=='b')
     num = '11'+num[1]
   if (num[0]=='c')
     num = '12'+num[1]
   if (num[0]=='d')
     num = '13'+num[1]
   if (num[0]=='e')
     num = '14'+num[1]
   if (num[0]=='f')
     num = '15'+num[1]
   if (num[0]=='g')
     num = '16'+num[1]
   if (num[0]=='h')
     num = '17'+num[1]
  }
   return num
}
function num2heb(num){
 word = "" 
 if (num>99)
 {word = "ק";
  num = num - 100;
 }
 if (num==1)
   word +=  "א"
 if (num==2)
   word +=  "ב"
 if (num==3)
   word +=  "ג"
 if (num==4)
   word +=  "ד"
 if (num==5)
   word +=  "ה"
 if (num==6)
   word +=  "ו"
 if (num==7)
   word +=  "ז"
 if (num==8)
   word +=  "ח"
 if (num==9)
   word +=  "ט"
 if (num==10)
   word +=  "י"
 if (num==11)
   word +=  "יא"
 if (num==12)
   word +=  "יב"
 if (num==13)
   word +=  "יג"
 if (num==14)
   word +=  "יד"
 if (num==15)
   word +=  "טו"
 if (num==16)
   word +=  "טז"
 if (num==17)
   word +=  "יז"
 if (num==18)
   word +=  "יח"
 if (num==19)
   word +=  "יט"
 if (num==20)
   word +=  "כ"
 if (num==21)
   word +=  "כא"
 if (num==22)
   word +=  "כב"
 if (num==23)
   word +=  "כג"
 if (num==24)
   word +=  "כד"
 if (num==25)
   word +=  "כה"
 if (num==26)
   word +=  "כו"
 if (num==27)
   word +=  "כז"
 if (num==28)
   word +=  "כח"
 if (num==29)
   word +=  "כט"
 if (num==30)
   word +=  "ל"
  if (num==31)
   word +=  "לא"
 if (num==32)
   word +=  "לב"
 if (num==33)
   word +=  "לג"
 if (num==34)
   word +=  "לד"
 if (num==35)
   word +=  "לה"
 if (num==36)
   word +=  "לו"
 if (num==37)
   word +=  "לז"
 if (num==38)
   word +=  "לח"
 if (num==39)
   word +=  "לט"
 if (num==40)
   word +=  "מ"
 if (num==41)
   word +=  "מא"
 if (num==42)
   word +=  "מב"
 if (num==43)
   word +=  "מג"
 if (num==44)
   word +=  "מד"
 if (num==45)
   word +=  "מה"
 if (num==46)
   word +=  "מו"
 if (num==47)
   word +=  "מז"
 if (num==48)
   word +=  "מח"
 if (num==49)
   word +=  "מט"
 if (num==50)
   word +=  "נ"
 if (num==51)
   word +=  "נא"
 if (num==52)
   word +=  "נב"
 if (num==53)
   word +=  "נג"
 if (num==54)
   word +=  "נד"
 if (num==55)
   word +=  "נה"
 if (num==56)
   word +=  "נו"
 if (num==57)
   word +=  "נז"
 if (num==58)
   word +=  "נח"
 if (num==59)
   word +=  "נט"
 if (num==60)
   word +=  "ס"
 if (num==61)
   word +=  "סא"
 if (num==62)
   word +=  "סב"
 if (num==63)
   word +=  "סג"
 if (num==64)
   word +=  "סד"
 if (num==65)
   word +=  "סה"
 if (num==66)
   word +=  "סו"
 if (num==67)
   word +=  "סז"
 if (num==68)
   word +=  "סח"
 if (num==69)
   word +=  "סט"
 if (num==70)
   word +=  "ע"
 if (num==71)
   word +=  "עא"
 if (num==72)
   word +=  "עב"
 if (num==73)
   word +=  "עג"
 if (num==74)
   word +=  "עד"
 if (num==75)
   word +=  "עה"
 if (num==76)
   word +=  "עו"
 if (num==77)
   word +=  "עז"
 if (num==78)
   word +=  "עח"
 if (num==79)
   word +=  "עט"
 if (num==80)
   word +=  "פ"
 if (num==81)
   word +=  "פא"
 if (num==82)
   word +=  "פב"
 if (num==83)
   word +=  "פג"
 if (num==84)
   word +=  "פד"
 if (num==85)
   word +=  "פה"
 if (num==86)
   word +=  "פו"
 if (num==87)
   word +=  "פז"
 if (num==88)
   word +=  "פח"
 if (num==89)
   word +=  "פט"
 if (num==90)
   word +=  "צ"
 if (num==91)
   word +=  "צא"
 if (num==92)
   word +=  "צב"
 if (num==93)
   word +=  "צג"
 if (num==94)
   word +=  "צד"
 if (num==95)
   word +=  "צה"
 if (num==96)
   word +=  "צו"
 if (num==97)
   word +=  "צז"
 if (num==98)
   word +=  "צח"
 if (num==99)
   word +=  "צט"
   
 word +="'"  
 return word 
  
}

function clean(word){
  newword=''
    for (i=0;i<word.length;i++)
    {
      if (word[i]!="/")
        newword += word[i];
    }
  return newword
}


function cleanverse(para){
  paraclean = '';
  for (var m=0;m<para.length;m++)
  {
    if (para.substr(m,3)=='{פ}')     
    {
      paraclean = paraclean + '<br>';
      m+=2
    }
    else
      if (para.substr(m,3)=='{ס}')     
      {
        paraclean = paraclean + '&emsp;&emsp;&emsp;&emsp;';
        m+=2
      }
    else
      paraclean = paraclean + para.substr(m,1);
  }

  return paraclean;  
}

function userSeder(filtArray2, book, seder, verse){
    if (verse=='') verse= 'א'
        
    output = "<h3>"+book+" סדר " + seder + "</h3>";
    
    for (let i = 0; i < filtArray2.length; i++) {
         if (filtArray2[i].verseseder==verse) output += "<mark>"
         output +=  '<a href="'+mgketer(filtArray2[i].bookchapter,filtArray2[i].chapter,filtArray2[i].versechapter)+'" target="_blank">' + "<sup>(" + filtArray2[i].verseseder + ")</sup> " + '</a>'  + cleanverse(filtArray2[i].versenikud)//filteredArray[i].versenikud + "<br>";
         if (filtArray2[i].verseseder==verse) output += "</mark>"
    }
    document.getElementById("result").innerHTML  = output;
    return;
    }

