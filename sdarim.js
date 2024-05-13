function fetchJSONData() {
       fetch("./sdarim.json")
           .then((res) => {
               if (!res.ok) {
                   throw new Error
                       (`HTTP error! Status: ${res.status}`);
               }
               return res.json();
           })
           .then((data) => 
                 console.log(data))
           .catch((error) => 
                  console.error("Unable to fetch data:", error));
       return data;
   }

function chapter2seder(){
 payment = (3.13).toString();
 pay2 = (2).toString();
 const data =    fetchJSONData();
 payment = data.seder[1].parasha;
 papy2   = data.seder[1].verseseder;
 return [payment, pay2]; 
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


function userFree(word){
  var url = "https://docs.google.com/spreadsheets/d/1aI5zgF-ZqoRz7Pb2gU_G_TUOyqNVcesnBFuYN71NhwE/edit#gid=1699385220";
  var ss = SpreadsheetApp.openByUrl(url);
  var wss = ss.getSheetByName("seder");
  var valuesseder = wss.getDataRange().getValues();
  var book='דדד'
  var seder='אאא'
  var verse='בבב'
  var line='גגג'
  res = [];
  for (var i=0; i<valuesseder.length;i++)
  {
    if (valuesseder[i][8].indexOf(word)>-1)
    {
         book = valuesseder[i][3];
         seder = valuesseder[i][4];
         verse = valuesseder[i][5];
         line = valuesseder[i][8];
      opt = [book, seder, verse, ":", line].join(' ');
         res.push(opt);
    }
  }
  return res;
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

function userSeder(book, seder, verse, type){
  var url = "https://docs.google.com/spreadsheets/d/1aI5zgF-ZqoRz7Pb2gU_G_TUOyqNVcesnBFuYN71NhwE/edit#gid=1699385220";
  var ss = SpreadsheetApp.openByUrl(url);
  var wsf = ss.getSheetByName("seder");
  var values = wsf.getDataRange().getValues();
  seder = seder.trim()
  verse = verse.trim()
  if (verse=='') verse= 'א'
  if (type=="chapter")
  {
  for (var i=0; i<values.length;i++)
    if (values[i][0]==book & values[i][1]==seder & values[i][2]==verse)
    {
      fbook = values[i][3];
      fseder = values[i][4];
      fverse = values[i][5];     
    }
    book = fbook;
    seder = fseder;
    verse = fverse;
  }
  line = "<h1>"+book+" סדר " + seder + "</h1>";
  cbook=""; // if we didn't find anything
  chapter="";
  cverse="";
  for (var i=0; i<values.length;i++)
    if (values[i][3]==book & values[i][4]==seder)
    {
      mcbook = values[i][0]
      mchapter = values[i][1]
      mcverse = values[i][2]

    if (values[i][5]==verse)
         {line = line + '<mark>'
          cbook = mcbook;
          chapter = mchapter;
          cverse = mcverse;
         }
     line = line + '<a href="'+mgketer(mcbook,mchapter,mcverse)+'" target="_blank">' + "<sup>(" + values[i][5] + ")</sup> " + '</a>'  + cleanverse(values[i][7])
      if (values[i][5]==verse)
      {line = line + '</mark>'}
    }
  
  // we return the other type 
  if (type=="chapter")
     return [line, book, seder, verse]
  else // seder
     return [line, cbook, chapter, cverse]
}

function userParasha(parasha){
  var url = "https://docs.google.com/spreadsheets/d/1aI5zgF-ZqoRz7Pb2gU_G_TUOyqNVcesnBFuYN71NhwE/edit#gid=1699385220";
  var ss = SpreadsheetApp.openByUrl(url);
  var wsf = ss.getSheetByName("seder");
  var values = wsf.getDataRange().getValues();
  for (var i=values.length-1;i>=0;i--)
    if (values[i][6]==parasha)
    {
      pbook = values[i][3];
      pseder = values[i][4];
      pverse = values[i][5];     
    }
  line = "<h1>" + "פרשת " + parasha + "</h1>";
  oldseder='-1'
  for (var i=0; i<values.length;i++)
    if (values[i][6]==parasha)
    {
      mcbook = values[i][0]
      mchapter = values[i][1]
      mcverse = values[i][2]
      seder = values[i][4]
      if (seder!=oldseder) line += "<mark>("+ mcbook +" סדר " + seder + ")</mark>";
      line = line + '<a href="'+mgketer(mcbook,mchapter,mcverse)+'" target="_blank">' + "<sup>(" + values[i][5] + ")</sup> " + '</a>'  + cleanverse(values[i][7])
      oldseder = seder
    }
  
  return [line, pbook, pseder, pverse]

}
