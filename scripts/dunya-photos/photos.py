import json,os,re,sys,time
sys.path.insert(0,os.path.dirname(__file__))
T=os.path.dirname(os.path.abspath(__file__))
persons=json.load(open(T+'/persons.json')); mimg=json.load(open(T+'/matchimgs.json'))
ALL={}
for v in mimg.values():
    for k,i in v.items():
        if 'w' in i: ALL[k]=i
for k,v in persons.items():
    if v.get('info'): ALL['File:'+v['file'].replace('_',' ')]=v['info']
def P(n): return 'File:'+persons[n]['file'].replace('_',' ')
# slug: (görünen ad, dosya)
PEOPLE={
'steinitz':('Wilhelm Steinitz',P('Wilhelm Steinitz')),'zukertort':('Johannes Zukertort',P('Johannes Zukertort')),'chigorin':('Mikhail Chigorin',P('Mikhail Chigorin')),
'gunsberg':('Isidor Gunsberg',P('Isidor Gunsberg')),'lasker':('Emanuel Lasker','File:Emanuel Lasker.jpg'),'marshall':('Frank Marshall','File:Frank Marshall (chess player).jpg'),
'tarrasch':('Siegbert Tarrasch',P('Siegbert Tarrasch')),'capablanca':('José Raúl Capablanca',P('José Raúl Capablanca')),'alekhine':('Alexander Alekhine',P('Alexander Alekhine')),
'bogoljubov':('Efim Bogoljubov','File:Efim Bogoljubov.jpg'),'euwe':('Max Euwe',P('Max Euwe')),'botvinnik':('Mikhail Botvinnik',P('Mikhail Botvinnik')),'bronstein':('David Bronstein',P('David Bronstein')),
'smyslov':('Vasily Smyslov',P('Vasily Smyslov')),'tal':('Mikhail Tal',P('Mikhail Tal')),'petrosian':('Tigran Petrosian',P('Tigran Petrosian')),'spassky':('Boris Spassky',P('Boris Spassky')),
'fischer':('Bobby Fischer',P('Bobby Fischer')),'karpov':('Anatoly Karpov',P('Anatoly Karpov')),'korchnoi':('Viktor Korchnoi','File:Hoogovenschaaktoernooi Kortsjnoj, Bestanddeelnr 929-5514.jpg'),
'kasparov':('Garry Kasparov',P('Garry Kasparov')),'short':('Nigel Short',P('Nigel Short')),'timman':('Jan Timman',P('Jan Timman')),'anand':('Viswanathan Anand',P('Viswanathan Anand')),
'kamsky':('Gata Kamsky',P('Gata Kamsky')),'khalifman':('Alexander Khalifman',P('Alexander Khalifman')),'akopian':('Vladimir Akopian',P('Vladimir Akopian')),'shirov':('Alexei Shirov',P('Alexei Shirov')),
'kramnik':('Vladimir Kramnik','File:London Chess Classic 2010 Kramnik 01.jpg'),'leko':('Péter Lékó',P('Péter Lékó')),'ponomariov':('Ruslan Ponomariov',P('Ruslan Ponomariov')),'ivanchuk':('Vasyl Ivanchuk',P('Vasyl Ivanchuk')),
'kasimdzhanov':('Rustam Kasimdzhanov','File:Rustam Kasimdzhanov 08 19 2007.jpg'),'adams':('Michael Adams',P('Michael Adams (chess player)')),'topalov':('Veselin Topalov',P('Veselin Topalov')),
'gelfand':('Boris Gelfand',P('Boris Gelfand')),'carlsen':('Magnus Carlsen','File:MagnusCarlsen13a.jpg'),'karjakin':('Sergey Karjakin',P('Sergey Karjakin')),'caruana':('Fabiano Caruana',P('Fabiano Caruana')),
'nepomniachtchi':('Ian Nepomniachtchi',P('Ian Nepomniachtchi')),'ding':('Ding Liren',P('Ding Liren')),'gukesh':('Gukesh Dommaraju','File:Gukesh at the 46th FIDE Chess Olympiad (2).jpg'),
'sindarov':('Javokhir Sindarov','File:Javokhir Sindarov at the 46th FIDE Chess Olympiad (1) (v2).jpg'),'nakamura':('Hikaru Nakamura',P('Hikaru Nakamura')),'giri':('Anish Giri',P('Anish Giri')),
'weiyi':('Wei Yi',P('Wei Yi')),'blubaum':('Matthias Blübaum',P('Matthias Blübaum')),'pragg':('R Praggnanandhaa',P('R Praggnanandhaa')),'esipenko':('Andrey Esipenko',P('Andrey Esipenko')),
'philidor':('François-André Danican Philidor',P('François-André Danican Philidor')),'labourdonnais':('Louis-Charles Mahé de La Bourdonnais',P('Louis-Charles Mahé de La Bourdonnais')),
'staunton':('Howard Staunton',P('Howard Staunton')),'anderssen':('Adolf Anderssen',P('Adolf Anderssen')),'morphy':('Paul Morphy',P('Paul Morphy')),'rubinstein':('Akiba Rubinstein',P('Akiba Rubinstein')),
'keres':('Paul Keres',P('Paul Keres')),'polgar':('Judit Polgár',P('Judit Polgár')),'larsen':('Bent Larsen',P('Bent Larsen')),'geller':('Efim Geller',P('Efim Geller')),'reshevsky':('Samuel Reshevsky',P('Samuel Reshevsky')),
'nimzowitsch':('Aron Nimzowitsch',P('Aron Nimzowitsch')),'fine':('Reuben Fine',P('Reuben Fine')),'campomanes':('Florencio Campomanes',P('Florencio Campomanes')),
}
# çift/grup fotoğrafları: slug: (dosya, Türkçe açıklama, kişiler)
PAIRS={
'1948':('File:ChessWC1948-4.jpg','Soldan sağa: Euwe, Smyslov, Keres, Botvinnik, Reshevsky (Lahey, 1948)',['euwe','smyslov','keres','botvinnik','reshevsky']),
'1957':('File:Botvinnik vs Smyslov 1957-04-19.jpg','Botvinnik (solda) ve Smyslov (sağda), Moskova',['botvinnik','smyslov']),
'1960':('File:Botvinnik and Tal 22 March 1960.jpg','Botvinnik ve Tal, 22 Mart 1960 (Moskova)',['botvinnik','tal']),
'1978':('File:Euwe Schaakvierkamp in Amsterdam Karpov in partij tegen Kortsjnoj, Bestanddeelnr 933-9756.jpg','Karpov, Korchnoi’ye karşı oynarken (Amsterdam; maçtan başka bir karşılaşma)',['karpov','korchnoi']),
'2008':('File:SchachWM2008.jpg','Anand – Kramnik, Bonn 2008',['anand','kramnik']),
'2018':('File:Match Carlsen-Caruana, London 2018.jpg','Carlsen – Caruana, Londra 2018',['carlsen','caruana']),
'2021':('File:Magnus Carlsen, Sergey Sobyanin, Ian Nepomniachtchi (2021-12-03).jpg','Carlsen ve Nepomniachtchi; ilk hamleyi Moskova Belediye Başkanı Sobyanin yapıyor (Dubai, 3 Aralık 2021)',['carlsen','nepomniachtchi']),
'2023':('File:World Chess Championship 2023, game 01, start.jpg','Astana 2023, 1. oyunun başı',['nepomniachtchi','ding']),
'2024':('File:TataSteelChess2023-22.jpg','Ding Liren – Gukesh, Tata Steel Satranç 2023 (Wijk aan Zee); maçtan değil, iki oyuncunun daha önceki karşılaşması',['ding','gukesh']),
}
