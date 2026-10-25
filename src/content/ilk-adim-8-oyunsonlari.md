Oyunun en kritik bölümünün çoğu kez oyunsonu olduğuna daha önce çeşitli kereler değinmiştik; sonucu bu aşamada belirlenen oyunların sayısı, bir açılış hatası neticesinde ya da oyunortasında bir mat atağı ile biten oyunların sayısından daha büyüktür. bununla birlikte bu konuyu incelemek için kitabın ileri bölümlerini beklemek gerekti, zira oyunsonlarını doğru oynayabilmek için çoğu kez güçlü bir hesap yetisi ve belli bir düzeyde kuramsal bilgi gerekir. Taşların sayısının az oluşu oyuncuyu kesinlikle yanıltmamalıdır - azalan taşlara koşut olarak hesaplanması gereken devamyolları uzar, üstelik bunların birbirine karıştırılması çok daha kolaydır. Belki hepsinden daha önemlisi ise her zaman "optimum" hamleyi bulma gerekliliğidir; açılışta ve oyunortasında "makul ölçüde iyi" bir hamle bulmak çoğu kez yeterli olurken, oyunsonunda bu lüks nadiren vardır: kazancı ya da beraberliği sağlayan tek bir hamle vardır ve onu bulamazsak, önceki 50 hamlenin emeğini tek bir hamle ile çöpe atmış oluruz.

Tüm bunlar açıkça gösterir ki oyunsonu çalışması -elbette taktik çalışma ile birlikte- satrançta ilerlemeyi amaçlayan oyuncuların en büyük ağırlığı vermeleri gereken alandır.

### Er oyunsonu

Satranç tahtasında erlerin bulunmadığı konumlara oldukça seyrek denk gelinir, öte yandan tüm taşların kırışılarak sonunda yalnızca şahlar ve erlerin başbaşa kaldığı bir konuma ulaşmak gayet olağan bir durumdur. Bu nedenle inceleme sırasının en başında er oyunsonları yer alır.

### Tek bir er

Şah ve ere karşı şahın mücadele ettiği oyunsonları basit görünüşlerine karşın büyük incelikler içerirler. İlk olarak en temel konuma ve "kare kuralı" kavramına göz atalım:

[FEN "8/8/8/8/5P2/k7/8/K7 w - - 0 1"]

*Diyagram 8.1*

Beyaz şahın bir anlamda "konu dışı" olduğu bu konumda esas soru elbette erin sağlıklı biçimde vezire terfi etmeyi başarıp başaramayacağıdır. Hamle sırasına bağlı olarak oyunun sonucunu inceleyelim:

- Hamle Beyazın: 1 f5 ♔b4 2 f6 ♔c5 3 f7 ♔d6 4 f8=♕+ ve kazanır,

- Hamle Siyahın: 1...♔b4 2 f5 ♔c5 3 f6 ♔d6 4 f7 ♔e7 5 f8=♕+ ♔xf8 ve beraberlik.

Şahın rakip eri yakalamayı başarıp başaramayacağının hesabını her seferinde tek tek hamleleri sayarak yapmak yerine, çok daha hızlı (ve hata yapma olasılığını azaltan) bir yöntem olan "kare kuralı"'nı da kullanabiliriz:

[FEN "8/8/8/8/5P2/k7/8/K7 w - - 0 1"]

*Diyagram 8.1a*

Erin bulunduğu noktadan son yataya kadar çekilen bir çizgiyi, erin karesinin bir kenarı gibi düşünebiliriz (erin bulunduğu kareden son yataya çekilen çapraz bir çizgi, söz konusu karenin diyagonalini oluşturur). Bu kare belirlendikten sonra mücadelenin sonucunu öngörmek basittir: eğer rakip şah bu karenin içine adım atabiliyorsa eri yakalar, diğer durumda ise er vezire çıkar.

Eri olan tarafın şahı her zaman seyirci konumunda olmaz elbette. Şahın yardımda gelebildiği durumlarda işler biraz daha karışıktır:

[FEN "3k4/8/3KP3/8/8/8/8/8 w - - 0 1"]

*Diyagram 8.2*

Beyaz şah erinin yol güvenliğini sağlayarak onu terfi ettirmeye çalışırken, siyah şah erin tam önünde kalarak bunu engellemek için çaba gösterir. Bu konumda mücadelenin sonucunu hamle sırası belirler:

- Hamle Beyazın: 1 e7+ ♔e8 2 ♔e6 ve pat (diğer şah hamleleri erin kaybına yol açardı).

- Hamle Siyahın: 1...♔e8 2 e7 ♔f7 3 ♔d7 ve Beyaz kazanır.

Beyaz elbette rakibini biraz uğraştırmayı da deneyebilir: 1 ♔e5 ♔e7 2 ♔d5 ♔e8! (Beraberliği sağlayan tek hamle; 2...♔d8?? 3 ♔d6 sonrasında başlangıç konumuna geri dönülmüştür, ama bu kez hamle Siyahındır ve er vezire yürür) 3 ♔f6 ♔f8 ve Beyaz ilerleme kaydedememiştir.

Genel kanılara aykırı (paradoksal) bir konumla karşı karşıyayız: hamle sırası kendinde olan taraf, zugzwang'dan ötürü yarım puandan olmaktadır! Anımsayacağımız gibi kale, iki fil ve atfil matlarında da buna benzer durumlara oldukça sık denk gelmiştik: hamle sırasının kendisinde olması, savunan tarafın (bizim örneklerimizde Siyahın) zararına oluyordu. Ancak o konumlarda hamle sırası Beyaza verilmiş olsa da sonuç pek değişmezdi çünkü Beyaz, emrindeki bekleme hamlelerinden birini yaparak sırayı yine rakibine aktarabilmekteydi. Bu son örnekte ise durum çok farklıdır: İki taraf da ellerinde bekleme hamlesi olmadığı için kendilerini bir “karşılıklı zugzwang” durumunda bulurlar!

Bu mücadelenin dinamiklerini daha iyi anlayabilmek için filmi biraz geriye saralım ve eri 5. yataya çekelim.

[FEN "3k4/8/3K4/4P3/8/8/8/8 w - - 0 1"] (crop: top-half)

*Diyagram 8.3*

Bu kez işler biraz daha farklıdır:

- Hamle Beyazın: 1 e6, ve Diyagram 8.2'de gösterilen konuma hamle Siyahta olacak biçimde ulaşılmıştır, Beyaz kazanır.

- Hamle Siyahın: 1...♔e8 Şimdi Beyaz erini sürerse sonucun beraberlik olacağını biliyoruz. Ne var ki burada Beyazın elinde daha iyi bir olanak var: 2 ♔e6!, ve şahların karşı karşıya geldiği bu durumda hamle sırasının sahibi olan Siyah bir tarafa çekilerek rakibine yol vermek zorundadır: 2...♔d8 3 ♔f7 ve Beyaz er vezire yürür.

Gördüğümüz gibi bütün mücadele, erin "yol güvenliğinin" sağlanacağı karelerin ele geçirilmesine dayanır.

Eğer beyaz şah bu karelerden birine yerleşebilirse (hamle sırasından bağımsız olarak) eri vezire yürür, yok Siyah bunu engellerse o zaman sonuç beraberlik olur. Yol güvenliğini sağlayan bu kareler satranç yazınında "anahtar kareler" olarak adlandırılırlar. Şimdi 6. ve 5. yataydaki erlerin (önemli not: a- ve h-erleri hariç; zira kenar erlerinin farklı dinamikleri vardır) anahtar karelerinin hangileri olduğunu görelim.

[FEN "8/8/4P3/8/8/8/8/8 w - - 0 1"] (crop: top-half)
{ [%csl Gd8,Ge8,Gf8,Gd7,Ge7,Gf7] }

*Diyagram 8.4a*

[FEN "8/8/8/4P3/8/8/8/8 w - - 0 1"] (crop: top-half)
{ [%csl Gd7,Ge7,Gf7,Gd6,Ge6,Gf6] }

*Diyagram 8.4b*

Diyagram 8.3'teki konumu bir sıra aşağıya kaydırdığımızda, işlerin yine değiştiğini görürüz:

[FEN "8/3k4/8/3K4/4P3/8/8/8 w - - 0 1"]

*Diyagram 8.5*

- Hamle Beyazın: 1 e5 ♔e7! 2 e6 ♔e8! ve beraberlik, ya da:

1 ♔e5 ♔e7! 2 ♔f5 ♔f7! ve rakip şahı göğüslemeyi sürdüren Siyah yine beraberliği kurtarır.

- Hamle Siyahın: 1...♔e7 2 ♔e5! ♔d7 3 ♔f6! ve er vezire yürür.

Önemli bir fark: erin 4. veya daha gerideki yataylarda bulunması durumunda, anahtar karelerin sayısı altıdan üçe düşer ve "beyaz şahın, erinin önünde yer alması" basitçe kazancı sağlamak için yeterli olmaktan çıkar. Sayısı azalan anahtar kareleri savunmak (bkz. Diyagram 8.6) Siyah için daha kolay hale gelmiştir, bu nedenle de hamle sırası ve ona bağlı olarak "opozisyon" kavramı devreye girmiştir.

[FEN "8/8/8/8/2P5/6P1/8/8 w - - 0 1"]
{ [%csl Gb6,Gc6,Gd6,Gf5,Gg5,Gh5] }

*Diyagram 8.6*

### Opozisyon

Yukarıda incelediğimiz türden bir er oyunsonunda, şahların üç anahtar kare için mücadele ederken tam karşı karşıya geldikleri bir durum ele alalım:

[FEN "8/2k5/8/2K5/2P5/8/8/8 w - - 0 1"]
{ [%csl Gb6,Gc6,Gd6] }

*Diyagram 8.7*

Şahların, aralarında bir kare olacak biçimde karşı karşıya gelmeleri durumu *opozisyon* olarak adlandırılır. Opozisyon konumunda hamle sırası kendisinde olan taraf yana çekilmek ve "geçiş hakkından" vazgeçmek zorundadır; dolayısıyla kendisi için *opozisyonu kaybetmiş*, rakibi için ise *opozisyonu kazanmış* denir.

Diyagram 8.7'deki konumu opozisyon ve anahtar kareler kavramlarını kullanarak analiz edelim:

- Hamle Beyazın: 1 ♔b5 ♔b7! 2 ♔c5 ♔c7 3 ♔d5 ♔d7 ve Beyaz ilerleme kaydedemez.

- Hamle Siyahın: 1...♔b7 2 ♔d6! ♔c8 3 c5 (veya daha sistematik 3 ♔c6 ♔b8 4 ♔d7) ve Beyaz amacına ulaşır.

Yukarıda da gördüğümüz gibi opozisyon savaşı aslında bir tempo mücadelesinden başka bir şey değildir, bu da demektir ki elde fazladan bir "yedek tempo" olması söz konusu mücadelede üstünlük anlamına gelir. Diyagram 8.7'de beyaz eri c4- yerine c3-karesine koyalım - şimdi Beyaz hamle kendinde olsa bile kazanır, çünkü 1 c4! sürüşüyle sırayı rakibine aktararak opozisyonun sahibi olur.

### Uzak opozisyon

Opozisyonun daha önce incelediğimiz örneklerinde şahların arasında yalnızca bir kare vardı. Opozisyonun bu haline genellikle *yakın* (ya da *normal*) opozisyon adı verilir. Öte yandan anahtar karelere yönelik bu tempo mücadelesinin şahlar biraz daha uzaktayken başlaması da pekala mümkündür ve bu durumda ortaya *uzak opozisyon* denen kavram ortaya çıkar: şahların arasında tek sayıda (3 ya da 5) karenin bulunması durumu. Uzak opozisyonun sahibi olmak aynı zamanda yakın opozisyonun da kazanılması anlamına gelir.

[FEN "4k3/8/8/8/8/8/4K3/8 w - - 0 1"]
{ [%csl Gd5,Ge5,Gf5] }

*Diyagram 8.8*

Diyagram 8.8'deki konumda iki şahın anahtar kareler için opozisyon mücadelesi yaptıklarını varsayalım (tahtada bir er olmadığından anahtar kareler de elbette "varsayılmıştır"):

- Hamle Beyazın: 1 ♔e3 ♔e7! 2 ♔d4 ♔d6! Burada 2...♔e6?? büyük bir hata olurdu: 3 ♔e4! ve Beyaz mücadeleyi kazanmıştır! 3 ♔e4 ♔e6 ve mücadelenin galibi Siyahtır.

- Hamle Siyahın: 1...♔e7 2 ♔e3 ♔f6 3 ♔f4! ♔e6 4 ♔e4 ve bu kez kazanan Beyazdır.

Uzak opozisyon mücadelesini somutlaştırmak amacıyla pratikten alınma bir örnek inceleyelim:

**Gligoric - Fischer**, *Adaylar 1959*

[FEN "2k5/8/8/8/1PK5/8/8/8 b - - 0 1"]

*Hamle Siyahın*

Siyah uzak opozisyonu yitirmiş olduğundan oyun kayıp gibi görünüyor, zira ileri doğru atılacak her adım anahtar karelerin kaybıyla sonuçlanır. Buna rağmen 16 yaşındaki genç Fischer oyunu kurtaran tek hamleyi buldu: 1...♔b8! Şimdi Beyaz uzak opozisyonu korumak için 2 ♔b4 oynamalıdır - ama maalesef orada kendi eri var! Şimdi 2 ♔c5 ♔c7! ya da 2 ♔b5 ♔b7! hamlelerinden sonra Siyah yakın opozisyonu kazanır, dolayısıyla oyuncular beraberlikte anlaştılar.

Şimdi ise buraya kadar gördüklerimizin tümünü özetleyen bir örnek:

**Drtina**, 1908

[FEN "5k2/8/8/8/8/2P5/8/3K4 w - - 0 1"]

*Kazanç*

Bu gördüğümüz konum bir *etüt* örneğidir (bkz. Bölüm 10). Şimdilik, etütlerde tersi belirtilmedikçe hamlenin Beyazda olduğunu ve verilen koşulun yerine getirilmesinin istendiğini (kazanç ya da beraberlik) bilmemiz yeterli olacaktır.

İlk bakışta, anahtar kareler (b5, c5 ve d5) için yapılacak mücadeleyi Beyaz kolaylıkla kazanacak gibi görünüyor: 1 ♔d2 ♔e7 2 ♔d3 ♔d6 3 ♔d4, ve amaca ulaşılmıştır. Ne var ki etütlerde ilk görünüşe hiç bir zaman aldanmamak gerekir! Nitekim Siyahın elinde (tıpkı bir önceki örnekte Fischer'in yaptığına benzer) bir savunma olanağı var: 2...♔c7! (Hatalı 2...♔d6?? yerine). Şimdi Beyaz uzak opozisyonu koruyamayarak ileri çıkmak zorunda kalır, ki bu da yakın opozisyonun kaybı demektir: 3 ♔d4 ♔d6! 4 ♔c4 ♔c6, beraberlik.

İlginçtir ki Beyaz, anahtar kareleri ele geçirmek istiyorsa erin diğer tarafına doğru yola çıkmalıdır: 1 ♔c2! ♔e7 2 ♔b3 ♔d6 3 ♔b4! (*analiz d.*)

Şahların aralarında çapraz olarak bir kare bulunduğu bu durum *çapraz opozisyon* olarak adlandırılır. Şimdi Beyaz çapraz opozisyonun sahibidir ve Siyah, rakibin girmeyi tehdit ettiği b5- ve c5-karelerini savunmak amacıyla 3...♔c6 oynamak zorundadır -

ne var ki bu kez de 4 ♔c4! hamlesinden sonra normal opozisyonu, anahtar kareleri ve oyunu kaybeder. "Şaha karşı şah ve er" oyunsonunda bilinmesi gerekenlerin hemen hemen tümünü içeren bu etüt gerçekten de bir sanat eseridir...

**Drtina**, 1908 *(analiz d.)*

[FEN "8/8/3k4/8/1K6/2P5/8/8 w - - 0 1"]
{ [%csl Gb5,Gc5,Gd5] }

### Kenar erleri

Kenar erlerinin dinamiklerinin diğer erlerden biraz farklı olduğunu en baştan söylemiştik. Güçlü olan taraf için sorun şudur ki, tahtanın köşesine girmiş bir şah "yer darlığı" yaşadığından savunma olanakları hissedilir biçimde artar - kimi zaman zayıf tarafın şahının pat limanına sığınması, kimi zaman ise güçlü tarafın şahının kapana kısılarak kendi erinin önünü tıkaması nedeniyle.

[FEN "7k/8/6KP/8/8/8/8/8 w - - 0 1"] (crop: top-half)

*Diyagram 8.9a*

[FEN "8/5k1K/7P/8/8/8/8/8 w - - 0 1"] (crop: top-half)

*Diyagram 8.9b*

Diyagram 8.9a ve 8.9b'deki konumlar, hamle sırasından bağımsız olarak beraberliktir. İlk örnekte siyah şahın g8-h8 sarkaç hareketini yapması yeterlidir: 1...♔g8 2 h7+ ♔h8 3 ♔h6 pat, ya da doğrudan 1 h7 pat. İkinci örnekte aynı sarkaç hareketini f8-f7 arasında yapmak yeterlidir: 1...♔f8 Şimdi beyaz köşeden çıkmak istiyorsa orayı rakibinin ele geçirmesine izin vermek zorundadır: 2 ♔g6 ♔g8! ve beraberlik. Hamlenin kendisinde olması durumunda ise Beyaz 1

♔h8 ♔f8 hamlelerinden sonra ya konum tekrarı yapmak zorundadır, ya da 2 h7 ♔f7 sonrasında kendisi pat olur!

Kenar erleri için anahtar kareler sabittir ve *erin hangi yatayda bulunduğuna bağlı olarak değişmezler*.

[FEN "2k5/8/8/8/7K/8/7P/8 w - - 0 1"]
{ [%csl Gg8,Gg7] }

*Diyagram 8.10*

Oyunun sonucu yine hamle sırasına bağlıdır:

- Hamle Beyazın: 1 ♔g5 ♔d7 2 ♔f6 ♔e8 3 ♔g7 ♔e7 4 h4 ve er vezire yürür.

- Hamle Siyahın: 1...♔d8 2 ♔g5 ♔e8 3 ♔g6 ♔f8 4 ♔h7 ♔f7 ve Siyah beraberliği kurtarır.

Kenar erleri güçlü tarafın kazanmasını o kadar zorlaştırırlar ki kimi zaman bir *at ya da fil fazlası* bile oyunu kazandırmaya yetmez! İşte birkaç ilginç örnek:

[FEN "7k/8/2B3KP/8/8/8/8/8 w - - 0 1"] (crop: top-half)

*Diyagram 8.11*

Diyagram 8.11'de fil, köşenin ters renginde olduğu için siyah şahı saklanmış olduğu köşeden çıkmaya zorlamak olanaksızdır: 1...♔g8 2 ♗d5+ ♔h8 3 ♔g5 ♔h7 4 ♔h5 ♔h8 ve Beyaz ilerleme kaydedemez. Fili köşenin renginde olsaydı Beyaz elbette kolayca kazanacaktı.

[FEN "8/6kP/2K2N2/8/8/8/8/8 w - - 0 1"] (crop: top-half)

*Diyagram 8.12*

İlginçtir ki Beyaz bu konumu kazanamaz. Siyahın şahı h8-g7 kareleri arasında sarkaç hareketini sürdürdükçe oradan çıkarılması olanaksızdır, örneğin: 1 ♔d6 ♔h8 2 ♔e6 ♔g7 3

♔f5 ♔h8 4 ♔g5 ♔h8 ve Beyaz, atını serbestleyebilmek için eri şahıyla korumaya kalkarsa oyun pat ile biter.

[FEN "4k2K/7P/N7/8/8/8/8/8 w - - 0 1"] (crop: top-half)

*Diyagram 8.13*

Hamle sırasıyla Beyaz elbette kazanır, ancak hamle kendisinde ise Siyah 1...♔f7! oynayarak rakip şahı köşeye hapseder ve f8-f7 sarkaç hareketini sürdürür. Her hamlesinde renk değiştiren atın söz konusu sarkaç hareketini hiç bir zaman bozamayacağına dikkat edelim - bu nedenle 1...♔f8?? büyük bir hata olurdu, 2 ♘b8 ♔f7 3 ♘d7 ve beyaz şah köşeden çıkar.

İncelediğimiz bu en temel örnekler okuyucuya oyunsonunun ne kadar zor ve incelik gerektiren bir aşama olduğunu göstermek için herhalde yeterli olmuştur. Satrançta ilerlemeyi amaçlıyorsanız, ilk fırsatta oyunsonlarının genelini ayrıntılı olarak inceleyen bir kitap edinmeniz salık verilir.

[FEN "7k/7P/6P1/5K2/8/8/8/8 w - - 0 1"]

*Alıştırma 1: Beyaz oynar ve kazanır.*

[FEN "8/3k4/8/3K1P2/8/8/8/8 w - - 0 1"]

*Alıştırma 2: Beyaz oynar ve kazanır.*

[FEN "8/6p1/8/3k1P2/8/8/2K5/8 w - - 0 1"]

*Alıştırma 3: Beyaz oynar ve beraberliği sağlar.*

[FEN "2B5/5k2/7P/7K/8/8/8/8 w - - 0 1"]

*Alıştırma 4: Beyaz oynar ve kazanır.*

[FEN "8/8/PkN1K3/8/8/8/8/8 w - - 0 1"]

*Alıştırma 5: Beyaz oynar ve kazanır.*

[FEN "7k/5K2/8/6P1/8/8/8/8 w - - 0 1"]

*Alıştırma 6: Beyaz oynar ve kazanır.*

**1)** Burada şahla h6 ya da f6'ya gitmek patla sonuçlanır - ama unutmayalım ki kazanmak için Beyaza tek bir er yeterlidir! Dolayısıyla: 1 ♔g5 ♔g7 2 h8=♕+! ♔xh8 3 ♔h6, buradan gerisini biliyoruz: 3...♔g8 4 g7 ♔f7 5 ♔h7 ve kazanır.

**2)** Bu konumda 1 ♔e5 ♔e7 ile bir yere varılamayacağı apaçık. Kazanan tek hamle 1 f6! sürüşüdür: 1...♔d8 2 ♔d6! Elbette beraberliğe götüren 2 ♔e6?? ♔e8 değil. Oyunsonlarında dikkati hiç gevşetmemek gerektiğinin bir başka kanıtı. 2...♔e8 3 ♔e6 ♔f8 4 f7 ve kazanır.

**3)** Siyah şah f5'teki eri kırdığında opozisyonu almış olmak bile Beyaz için yeterli değil, zira Siyahın elinde yedek ...g7-g6 temposu var. Şu halde: 1 f6! gxf6 2 ♔d3! ve beraberlik. Uzak opozisyon işe yaramazdı, 2 ♔d1?? ♔e4 3 ♔e2 f5 ile Siyah kazanırdı.

4) Siyah şah köşeye ulaşırsa oyunun berabere biteceğini biliyoruz, o zaman bu yürüyüş ne pahasına olursa olsun engellenmelidir: 1 ♗e6+! ♔f8 Fil elbette dokunulmazdır: 1...♔xe6 2 h7 vs. 2 ♔g6! ve kazanır. Hata yapmak için hiçbir zaman geç değildir: 2 h7?? ♔g7! ile Siyah amacına ulaşırdı.

**5)** 1 a7?? ♔b7! ile siyah şahı bir daha o köşeden çıkaramayacağımızı biliyoruz, 1 ♘b8? ♔a7! ise eri (ya da atı) kazanarak berabere yapar. Dolayısıyla: 1 ♘b4! ve beyaz şahın yardıma gelmesi oyunu kazandırır, örneğin 1...♔a7 2 ♔d6 ♔b6 3 ♔d7 ♔a7 4 ♔c6 ♔a8 5 ♔b6 Şah erin korumasını devralmıştır, şimdi tüm yapılması gereken at ile a8-karesini kontrol altına almaktır: 5...♔b8 6 ♘d5 ♔a8 7 ♘c7+ ♔b8 8 a7+ ve kazanır.

**6)** Beyaz şah anahtar karelerden birini işgal etmiş olduğu için bu konum kazançtır; bununla birlikte aceleci 1 g6?? pata yol açarken 1 ♔f8 ♔h7 ise ilerleme sağlayamaz. Amaca ulaşmak için küçük bir yer değişikliği gereklidir: 1 ♔g6! ♔g8 2 ♔h6 ♔h8 3 g6 ♔g8 4 g7 ve kazanır.

Önceki bölüm: [Mat temaları](/ilk-adim-grs52xep8g-7-mat-temalari/)<br>
Sonraki bölüm: [Analizli oyunlar](/ilk-adim-grs52xep8g-9-analizli-oyunlar/)
