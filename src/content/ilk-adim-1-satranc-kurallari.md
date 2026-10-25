Satranç, iki kişi arasında sıra ile yapılan hamlelerle oynanan bir zekâ oyunudur. Oyun, **SATRANÇ TAHTASI** adı verilen bir zeminin üzerinde, **SATRANÇ TAŞLARI** denen taşlarla oynanır. Tahta ve taşlar birlikte **SATRANÇ TAKIMI** olarak adlandırılır.

### 1 Satranç takımı

#### 1a. Satranç tahtası

Satranç tahtası, 64 küçük kareye bölünmüş büyük ve kare şeklinde bir zemindir. Oynamayı kolaylaştırmak için satranç tahtasındaki kareler yarısı açık renkli, diğer yarısı da koyu renkli olmak üzere iki renge boyanırlar. Dolayısıyla kareler **BEYAZ KARELER** (ya da AÇIK RENKLİ KARELER) ve **SİYAH KARELER** (ya da KOYU RENKLİ KARELER) olarak ayrılırlar.

#### 1b. Diyagram

Satranç tahtasının kağıda çizilmiş haline **DİYAGRAM** denir.

[FEN "8/8/8/8/8/8/8/8 w - - 0 1"]

*Diyagram 1.1*

#### 1c. Dikeyler ve yataylar

Dikine üst üste konulmuş 8 kare, bir **DİKEY** oluşturur. Bu dikeylerin her biri alfabenin harfleri ile kodlanır. Beyaz taşlarla oynayan oyuncunun (satranç taşlarının özelliklerini ileride göreceğiz) en solundaki dikey **a-dikeyi** olarak adlandırılır.

Bitişik olarak yan yana konulmuş 8 kare, bir **YATAY** oluşturur. Bu yatayların her biri rakamlarla kodlanır. Beyaz taşlarla oynayan oyuncunun hemen önündeki yatay **1. yatay** (birinci yatay) olarak adlandırılır. Diyagram 1.2'de a-dikeyi ve 1. yatay gösterilmiştir.

[FEN "8/8/8/8/8/8/8/8 w - - 0 1"]
{ [%cal Ga1a8,Ga1h1] }

*Diyagram 1.2*

#### 1d. Kareler

Karelerin her biri, bulundukları yatayın harfi ile bulundukları dikeyin sayısının yan yana gelmesinden oluşan kodlarla anılır: a1, c4, f3 gibi.

#### 1e. Çaprazlar

Köşelerinden birbirine değen karelerin aynı çizgi üzerinde bulunanları bir **ÇAPRAZ** oluştururlar. Çaprazlar, onları oluşturan ilk ve son karelerin kodlarının birleştirilmesiyle belirtilirler. Diyagram 1.3'te a3-f8 ve h1-a8 çaprazları ile c2, h5 ve f1-kareleri gösterilmiştir.

[FEN "8/8/8/8/8/8/8/8 w - - 0 1"]
{ [%csl Gc2,Gh5,Gf1] [%cal Ba3f8,Bh1a8] }

*Diyagram 1.3*

#### 1f. Taşlar

Başlangıçta tahtada 32 adet taş bulunur. Bu taşlar, yarısı açık renkli, diğer yarısı ise koyu renkli olmak üzere iki gruba ayrılmıştır. Açık renkli taşlara **BEYAZ TAŞLAR**, koyu renkli olanlara ise **SİYAH TAŞLAR** denir. Oyunculardan biri beyaz taşlarla oynarken diğeri de siyah taşlarla oynar. Her bir tarafın sahip olduğu taşların tür ve sayısı aşağıda yer alan tabloda gösterilmiştir.

| Taş | Sembolü | Sayı |
| --- | :---: | :---: |
| ŞAH | ♔ | 1 |
| VEZİR | ♕ | 1 |
| KALE | ♖ | 2 |
| FİL | ♗ | 2 |
| AT | ♘ | 2 |
| PİYON | ♙ | 8 |

Taşların tahtaya başlangıçta dizilişi aşağıdaki şekildedir (Diyagram 1.4):

[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]

*Diyagram 1.4*

**DİKKAT!** Oyuncuların (kendilerine göre) sağ-alt köşede gördükleri kare beyaz renkte olmalıdır.

### 2 Taşların hareketi: hamle

Taşların hareket etme ve rakip taşları alma kurallarının ayrıntılarına geçmeden önce aşağıdaki birkaç noktaya değinmek yerinde olur.

#### 2a. Genel kurallar

2a1. Bir taş, rakip renkten bir taşın işgal ettiği bir kareye giderse, rakip taş aynı hamlenin parçası olarak tahtadan çıkarılır. Buna **TAŞ ALMAK** denir.

2a2. Bir taş, kendi renginden bir taşın işgal ettiği bir kareye gidemez (bir başka deyişle, kendi renginden bir taşı alamaz).

2a3. At dışındaki taşlar, diğer taşların üzerinden — kendi renklerinden ya da rakip renkten olsun — atlayamazlar.

2a4. Bir taş, hamlenin rakibe geçmesi halinde rakip taşlar tarafından alınabilecek durumda ise bu taş için **TEHDİT ALTINDA** denir.

Taşlar gibi kareler de tehdit (ya da kontrol) altında olabilirler. Bir kareye adım atan bir taş, rakip bir taş tarafından alınabilecek durumda kalıyor ise sözkonusu kare için tehdit altında (ya da kontrol altında) denir.

2a5. Sıra kendisine gelen oyuncu bir hamle yapmak zorundadır.

#### 2b. Taşların hareket biçimleri

**FİL**, çapraz olarak istediği kadar ilerler ve taş alır. Diyagram 1.5'teki fil, işaretlenmiş karelere gidebilir ve yolunun üzerindeki rakip taşları (b7-atı) alabilir.

[FEN "8/1n6/8/8/4B3/8/8/8 w - - 0 1"]
{ [%csl Gh7,Gg6,Gf5,Gc6,Gd5,Gf3,Gg2,Gh1,Gd3,Gc2,Gb1,Rb7] }

*Diyagram 1.5*

**KALE**, düz olarak istediği kadar ilerler ve taş alır. Diyagram 1.6'daki kale, işaretlenmiş karelere gidebilir ve yolunun üzerindeki rakip taşları (e6-fili) alabilir.

[FEN "8/8/4b3/8/1B2R3/8/8/8 w - - 0 1"]
{ [%csl Ge5,Ge3,Ge2,Ge1,Gd4,Gc4,Gf4,Gg4,Gh4,Re6] }

*Diyagram 1.6*

**VEZİR**, düz veya çapraz olarak istediği kadar ilerler ve taş alır. Diyagram 1.7'deki vezir, işaretlenmiş karelere gidebilir ve yolunun üzerindeki rakip taşları (c2-kalesi) alabilir.

[FEN "8/4B3/8/8/4Q3/8/2r5/8 w - - 0 1"]
{ [%csl Ga8,Gb7,Gc6,Gd5,Gf5,Gg6,Gh7,Gh1,Gg2,Gf3,Gd3,Ga4,Gb4,Gc4,Gd4,Gf4,Gg4,Gh4,Ge5,Ge6,Ge3,Ge2,Ge1,Rc2] }

*Diyagram 1.7*

**AT**, bir köşesinde bulunduğu (2 x 3) boyutlarındaki dikdörtgenin diğer köşesine doğru bir sıçrama hareketi yapar (bu hareket bir L-harfine de benzetilebilir). Ayrıca at her renkten taşın üzerinden atlayabilir (Diyagram 1.8).

[FEN "8/8/8/8/2b5/4N3/8/8 w - - 0 1"]
{ [%csl Gd5,Gf5,Gg4,Gc2,Gg2,Gd1,Gf1,Rc4] }

*Diyagram 1.8*

**PİYON**, yalnızca öne doğru ve tek bir kare ilerleyebilir, ancak söz konusu karenin boş olması gereklidir. Piyon yalnızca ön çaprazındaki iki karede bulunan taşları alabilir. İlerleme ve taş alma şekli farklı olan tek taş piyondur. Piyonlar ilk kez hareket ederken, yine önlerinin boş olması kaydıyla, bir yerine iki kare ilerleyebilirler. Örneğin Diyagram 1.9'da a2-karesinde bulunan piyon a3 ve a4 karelerinden birine gidebilir; f3 piyonu ise yalnızca f4'e gidebilir. c4-karesinde bulunan piyonun önü rakip at tarafından tıkanmış olduğu için düz ilerleyemez ama hemen ön çaprazında bulunan d5-filini alabilir.

[FEN "8/8/8/2nb4/2P5/5P2/P7/8 w - - 0 1"]
{ [%cal Ga2a3,Ga2a4] [%csl Gf4,Rd5] }

*Diyagram 1.9*

**ŞAH**, düz veya çapraz olarak tek bir kare ilerler ve taş alır (Diyagram 1.10).

[FEN "8/8/8/8/8/5r2/4K3/8 w - - 0 1"]
{ [%csl Gd1,Gd2,Ge1,Gf3] }

*Diyagram 1.10*

Şah, diğer taşlardan farklı olarak, tehdit altında bir kareye gidemez veya rakip taşların tehdidi altında bırakılamaz. Başka bir deyişle hamle sırasının sahibi olan oyuncu, rakibinin şahını alabiliyor durumda olmamalıdır. Eğer alabiliyor ise tahtadaki konum kurallara aykırıdır; tahtada kurallara aykırı bir konumun ortaya çıkmasına yol açan hamleye ise **KURALDIŞI HAMLE** denir.

Rakip şahın tehdit edilmesine **ŞAH ÇEKMEK** denir.

Şaha yöneltilen tehdit kurallara uygun hiç bir hamle yardımıyla engellenemiyorsa, şah için **MAT OLMUŞ** denir. Aşağıdaki diyagramlarda birkaç mat örneği gösterilmiştir.

[FEN "4R1k1/8/6K1/8/8/8/8/8 b - - 0 1"] (crop: top-right-quarter)
[FEN "6k1/6Q1/6K1/8/8/8/8/8 b - - 0 1"] (crop: top-right-quarter)
[FEN "6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1"] (crop: top-right-quarter)

#### 2c. Özel hareketler

##### 2c1. Geçerken alma

Bir piyon başlangıçta bulunduğu yerden iki kare ilerleyerek hareket ettiğinde, geçtiği kareyi kontrol altında tutan (=hareketini tamamladığında hemen yanında bulunan) rakip bir piyon onu, sanki tek bir kare ilerlemiş gibi alma hakkına sahiptir. Bu harekete **GEÇERKEN ALMA** (=EN PASSANT) denir. Sözkonusu hak yalnızca ilerleyişin hemen sonrasındaki hamle için geçerlidir ve kullanılmadığı takdirde kaybolur.

Başlangıç konumu:

[FEN "8/4p3/8/5P2/8/8/8/K6k b - - 0 1"] (crop: top-half)
{ [%cal Ge7e5] }

Siyahın hamlesi (e7-e5):

[FEN "8/8/8/4pP2/8/8/8/K6k w - e6 0 1"] (crop: top-half)
{ [%cal Rf5e6] }

Beyazın geçerken alışı sonrası konum (f5xe6):

[FEN "8/8/4P3/8/8/8/8/K6k b - - 0 1"] (crop: top-half)

##### 2c2. Piyonun terfi etmesi

Son yataya (Beyazlar için 8., Siyahlar için ise 1. yatay) kadar ilerleyen piyon, artık piyon olarak kalamaz ve kendi renginden bir vezir, kale, fil ya da ata dönüşür. Dönüşüm, yapılan hamlenin bir parçası olarak hemen gerçekleşir ve piyonun **TERFİ ETMESİ** olarak adlandırılır.

Başlangıç konumu:

[FEN "8/2P5/8/8/8/8/8/K6k w - - 0 1"] (crop: top-half)
{ [%cal Gc7c8] }

Piyon terfii sonrası konum (c8=V):

[FEN "2Q5/8/8/8/8/8/8/K6k b - - 0 1"] (crop: top-half)

##### 2c3. Rok atmak

Oyunun başlangıcındaki konumlarında bulunan şah ve kalenin birlikte hareketinden oluşan bu hamle, aynı renkten iki taşın birden hareket ettiği tek örnektir. Söz konusu harekette:

a) Şah, rok atacağı kaleye doğru iki hamle ilerler,

b) Bunun ardından kale kendi şahının üzerinden atlayarak yanındaki kareye yerleşir.

Başlangıç konumu:

[FEN "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1"] (crop: bottom-half)
{ [%cal Ge1c1,Ga1d1,Ye1h1,Yh1f1] }

a1-kalesi ile uzun rok sonrası konum:

[FEN "4k3/8/8/8/8/8/8/2KR3R b - - 1 1"] (crop: bottom-half)

h1-kalesi ile kısa rok sonrası konum:

[FEN "4k3/8/8/8/8/8/8/R4RK1 b - - 1 1"] (crop: bottom-half)

Bu hareketin özel koşulları:

2c3.1 Rok atacak şah ve kalenin aralarındaki karelerin boş olması gereklidir.

2c3.2 Şahın bulunduğu, geçtiği veya gideceği karenin rakip bir taş tarafından kontrol edilmiyor olması gereklidir. Bu üç kareden biri tehdit altında olduğu sürece rok hakkı yoktur.

2c3.3 Rok atacak şah ve kalenin daha önce hareket etmemiş olmaları gerekmektedir. Şahın hareket etmesi durumunda rok hakkı kaybolur. Kalenin hareket etmesi durumunda ise yalnızca hareket eden kale ile rok hakkı kaybolur, diğer kale ile rok hakkı sürer.

Şaha yakın olan kale ile yapılan rok "kısa rok", diğer kale ile yapılan rok "uzun rok" olarak adlandırılır.

### 3 Oyunun amacı

Oyunun amacı rakip şahı mat etmektir.

### 4 Oyunun sonuçlanması

Oyun, taraflardan birinin kazanması ya da oyunun beraberlikle bitmesi ile sonuçlanır.

#### 4a. Oyunun kazanılması

4a1. Rakip şahı mat eden oyuncu oyunu kazanır.

4a2. Oyunculardan birinin oyunu terkettiğini ilan etmesi halinde diğer oyuncu oyunu kazanır.

#### 4b. Beraberlik (yenişmezlik)

Oyun aşağıdaki durumlarda beraberlikle biter:

4b1. Taraflardan hiçbirinin mat etmek için yeterli taşı bulunmuyorsa,

4b2. Hamle sırasına sahip olan oyuncu, şahı tehdit altında olmadığı halde, kurallara uygun hiçbir hamle yapamıyorsa (**PAT**, aşağıda **hamle sırasının Siyahta** olduğu birkaç pat örneği gösterilmiştir),

[FEN "7k/8/6Q1/8/8/8/8/K7 b - - 0 1"] (crop: top-right-quarter)
[FEN "8/5KBk/8/8/8/8/8/8 b - - 0 1"] (crop: top-right-quarter)

[FEN "6kr/7p/4P2B/8/8/8/8/K7 b - - 0 1"] (crop: top-right-quarter)
[FEN "4R1bk/7p/7P/8/8/8/8/K7 b - - 0 1"] (crop: top-right-quarter)

*Pat örnekleri*

4b3. Oyuncular aralarında beraberlikte anlaşırlarsa.

Bunun yanı sıra,

4b4. Aynı konum tahtada 3 ya da daha fazla kez oluşursa (geçerken alma ve rok hakları da aynı olmak kaydıyla),

4b5. Son 50 hamle içerisinde taraflardan hiçbiri taş almamış ve piyon hamlesi yapmamış ise,

oyunculardan herhangi biri oyunun beraberlikle bitmesini isteme hakkına sahiptir.

Ayrıca:

4b6. Aynı konum tahtada 5 ya da daha fazla kez oluşursa; yahut

4b7. Son 75 hamle içerisinde taraflardan hiçbiri taş almamış ve piyon hamlesi yapmamış ise,

oyuncuların isteyip istememesinden bağımsız olarak oyun beraberlikle sonuçlanır.

### 5 Diğer kurallar

Satranç turnuvalarında geçerli olan kuralların tümünü buraya almak ne mümkün, ne de pratiktir. Zaman zaman değiştikleri de gözönüne alınırsa, turnuvalarda yarışacak oyuncuların doğrudan FIDE'nin (*Fédération Internationale des Échecs*, Uluslararası Satranç Federasyonu) resmi el kitaplarına veya internet sitesine başvurmaları daha sağlıklı olacaktır. Bununla birlikte turnuvalarda uygulanan kuralların birkaçına kısaca değinmek gerekirse:

#### 5a. Kuraldışı hamle

Yukarıda belirtilen taş hareketi kurallarına uymayan veya kuraldışı bir konumun ortaya çıkmasına yol açan hamle "Kuraldışı hamle" olarak adlandırılır. Tespit edilen kuraldışı hamle geri alınır ve hamleyi yapan oyuncu uyarılır. İkinci kez kuraldışı hamle yapan oyuncu oyunu kaybeder.

#### 5b. Taşlara dokunmak

Bir oyuncu kendi taşına dokunduğunda (söz konusu taşın kurallara uygun bir hamlesinin olmaması durumu müstesna olmak üzere) onu oynamak zorundadır. Dokunulan taşla kurallara uygun herhangi bir hamle yapılamıyorsa, oyuncu başka bir taşla oynayabilir.

Bir oyuncu rakibinin bir taşına dokunmuşsa (söz konusu taşın kurallara uygun bir hamle yardımıyla alınamaması durumu müstesna olmak üzere) onu almak zorundadır. Dokunulan taş alınamıyorsa, oyuncu başka bir taşla oynayabilir. Oyuncunun amacı bir ya da daha fazla taşı düzeltmek ise bu niyetini önceden "Düzeltiyorum" (ya da Fransızca *J'adoube*; "jadub" okunur) diyerek belirtmelidir.

#### 5c. Sportmen tutum

Oyuncular oyundan önce ve sonra el sıkışır. Rakibiyle el sıkışmayı reddeden oyuncu hakem tarafından uyarılır ve ceza alabilir.

#### 5d. Dışarıdan yardım

Oyuncu oyun süresince üçüncü bir kişiden, bilgisayardan, basılı ve yazılı materyalden veya analiz tahtasından yardım alamaz. Üçüncü kişilerle oyun hakkında konuşamaz.

Önceki bölüm: [Satranca ilk adım](/ilk-adim-grs52xep8g-onsoz-ve-giris/)<br>
Sonraki bölüm: [Notasyon](/ilk-adim-grs52xep8g-2-notasyon/)
