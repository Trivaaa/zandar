# Kartaonica — Poker modul (Spec v1.1)

Nov 1, 2026 · @Igor

## Pregled

Poker modul uvodi Texas Hold'em No-Limit kao novu igru u Kartaonici, na istom UI-ju, sobama, linkovima, nalozima i botovima kao Žandar. Svaki meč je zaseban: svi igrači počinju sa 100 žetona, ko ostane bez žetona bankrotirao je i ispada, a pobjeđuje posljednji igrač koji ima žetone.

**Ciljevi**

- Ponuditi igru koju zna šira i mlađa publika od tablića i žandara.
- Maksimalno iskoristiti postojeću infrastrukturu: sto, karte, lobby, Quick Play, privatne sobe, bot backfill.
- Ulazak u igru bez čekanja i meč prilagođen mobilnoj sesiji (12–20 min za 4 igrača).

**U opsegu V1**

- Texas Hold'em No-Limit.
- Quick Play: uvijek 4 igrača, trenutni ulazak, prazna mjesta popunjavaju botovi.
- Privatne sobe s prijateljima: kreator bira 2, 3 ili 4 igrača i poziva ih linkom ili iz liste prijatelja.
- 100 žetona po igraču na početku svakog meča.
- Struktura blindova koja raste po broju odigranih ruku.

**Van opsega V1**

- Ekonomija žetona: wallet, buy-in nivoi, nagrade, fee, dnevni bonus, kupovina žetona.
- Cash game, turniri s više stolova, rebuy i add-on.
- Klasični poker s 5 karata (kandidat za V2), Omaha.
- Chat, statistika igrača, replay ruke.

## Pravila igre

Igra se standardni Texas Hold'em No-Limit sa špilom od 52 karte, bez antea u V1.

**Tok ruke**

1. Dealer button se pomjera na sljedećeg aktivnog igrača. Igrač lijevo od buttona postavlja small blind, sljedeći big blind.
2. Svaki igrač dobija 2 skrivene karte.
3. Preflop: prvi igra igrač lijevo od big blinda.
4. Flop (3 zajedničke karte), turn (1), river (1). Na svakoj ulici prvi igra prvi aktivni igrač lijevo od buttona.
5. Showdown: pobjeđuje najbolja kombinacija od 5 karata iz 7 dostupnih.

**Akcije**

- Fold, check, call, bet, raise, all-in.
- Minimalni bet je jedan big blind.
- Minimalni raise je jednak prethodnom povećanju u toj ulici. Maksimum je cijeli stack.
- All-in manji od punog raisea ne otvara ponovo betovanje igračima koji su već odigrali u toj rundi.
- Igrač s manje žetona od blinda postavlja all-in za koliko ima.

**Showdown**

- U V1 se sve preostale ruke automatski otkrivaju. Jednostavnije je i smanjuje sumnju da je igra namještena.
- Ako svi osim jednog foldaju, pot se dodjeljuje bez otkrivanja karata.
- Ako su svi aktivni igrači all-in, preostale zajedničke karte se dijele automatski uz otkrivene ruke.
- Jednake ruke dijele pot. Neparan žeton ide prvom igraču lijevo od buttona.

**Rang kombinacija (od najjače)**

Royal flush, straight flush, poker (četiri iste), full house, flush, straight (kenta), tris, dva para, par, visoka karta. Kickeri odlučuju kod istih kombinacija. As je i najniža karta u kenti A-2-3-4-5.

**Heads-up (2 igrača)**

- Button postavlja small blind i igra prvi preflop.
- Postflop prvi igra igrač koji nije na buttonu.

**Bankrot**

Igrač koji ostane bez žetona je bankrotirao i ispada iz meča. Button uvijek ide na sljedećeg aktivnog igrača, blindovi za njim. Kad ostanu dva igrača, primjenjuju se heads-up pravila.

## Format meča

Svaki meč počinje od nule: svi igrači dobijaju 100 žetona, a žetoni ne prelaze u sljedeći meč. Igra se dok svi osim jednog ne bankrotiraju.

**Parametri stola**

| Parametar | Quick Play | Privatna soba |
| --- | --- | --- |
| Broj igrača | Uvijek 4 | 2, 3 ili 4, bira kreator |
| Startni žetoni | 100 | 100 |
| Startni blindovi | 1/2 (50 BB) | 1/2 (50 BB) |
| Nivo blindova raste svakih | 5 ruku | 5 ruku |
| Ulazak | Odmah, prazna mjesta popunjavaju botovi | Kad se popune sva mjesta, ili kreator popuni prazna botovima |
| Ciljano trajanje | 12–20 min | Zavisi od broja igrača |

**Igra s prijateljima (privatna soba)**

1. Kreator bira Poker i broj igrača: 2, 3 ili 4.
2. Poziva prijatelje linkom (ulazak radi i bez naloga, kao gost) ili iz liste prijatelja, preko V1 sloja identiteta i prijatelja.
3. Pozvani vide igru i broj mjesta i ulaze direktno za sto.
4. Meč počinje automatski kad se popune sva mjesta. Ako neko kasni, kreator može prazna mjesta popuniti botovima i odmah početi.
5. Nakon meča dugme „Revanš” vraća isto društvo za isti sto. Svi ponovo počinju sa 100 žetona.

**Struktura blindova**

| Nivo | Small / Big blind |
| --- | --- |
| 1 | 1 / 2 |
| 2 | 2 / 4 |
| 3 | 3 / 6 |
| 4 | 5 / 10 |
| 5 | 8 / 16 |
| 6 | 10 / 20 |
| 7 | 15 / 30 |
| 8 | 20 / 40 |
| 9 | 30 / 60 |
| 10 | 50 / 100 |
| 11+ | duplira se svaki nivo |

Novi nivo stupa na snagu na početku ruke, nikad usred ruke. Ako se startni broj žetona promijeni, sve vrijednosti blindova se skaliraju istim faktorom. Strukturu kalibrisati simulacijom bot mečeva dok trajanje ne padne u ciljani raspon.

**Ishod meča**

- Pobjednik je posljednji igrač koji ima žetone.
- Ostali dobijaju plasman obrnutim redoslijedom bankrota: ko prvi bankrotira, posljednji je.
- Nema nagrada. Plasman se prikazuje na kraju meča.
- Mjesta i button se dodjeljuju nasumično.

## Žetoni

Žetoni postoje samo unutar jednog meča. Nema walleta, balansa ni prenosa između mečeva.

- Svaki igrač na početku meča dobija 100 žetona, bez obzira na ishod prethodnih mečeva.
- Igrač sa 0 žetona je bankrotirao i ispada iz meča. Može odmah ući u novi meč.
- Žetoni se ne mogu kupiti, osvojiti van meča ni prenijeti drugom igraču.

Posljedica: kad nema uloga van meča, dio igrača igra nepromišljeno, npr. all-in svaku ruku. Brzi rast blindova ovo djelimično neutrališe. Ako postane problem, rješenje je nešto što pobjedi daje težinu, npr. broj pobjeda na profilu.

## Tok meča i stanja

Meč je petlja ruku: nakon svake isplate pota server provjerava bankrote i, ako je ostalo više od jednog igrača, pokreće novu ruku.

Tok: Ulazak za sto (Quick Play odmah, prazno mjesto = bot) → Start meča (svima 100 žetona, nasumična mjesta) → Nova ruka (button i blindovi, po 2 karte) → Runde uloga (preflop, flop, turn, river) → Kraj ruke (showdown ili svi ostali fold) → Isplata pota (glavni i side potovi, 0 žetona = bankrot) → Ostao 1 igrač? Ne: nova ruka. Da: Kraj meča (konačni plasman, bez nagrada).

- **Ulazak za sto:** Quick Play odmah smješta igrača za sto s 4 mjesta. Server spaja prave igrače koji su u redu u tom trenutku (prozor do 3 s), a ostala mjesta popunjava botovima. U privatnoj sobi kreator pokreće meč.
- **Start meča:** svi dobijaju 100 žetona, mjesta i button se dodjeljuju nasumično.
- **Nova ruka:** na početku ruke se provjerava da li je vrijeme za novi nivo blindova.
- **Runde uloga:** ruka se može završiti u bilo kojoj ulici ako svi osim jednog foldaju.
- **Isplata pota:** svaki sloj pota se dodjeljuje posebno. Igrač sa 0 žetona je bankrotirao i dobija plasman.
- **Kraj meča:** ekran s plasmanom i dugme „Igraj ponovo”. U privatnoj sobi revanš s istim igračima.

## UI i UX

Poker koristi vizuelni pravac „kafanski sto” i postojeće komponente. Novo je ono što poker ima, a žandar nema: ulozi, pot, zajedničke karte i akcije. Prioritet je da se u svakom trenutku vidi ko je na potezu i šta je ko odigrao.

**Šta se preuzima, a šta je novo**

| Element | Status | Napomena |
| --- | --- | --- |
| Sto (sukno, mesing) | Preuzima se | Oval za najviše 4 mjesta, igrač uvijek dolje u sredini |
| Karte | Preuzima se | Dodati prikaz karata protivnika licem nadolje |
| Avatari i mjesta | Proširuje se | Ispod avatara broj žetona, oznake D, SB, BB |
| Lobby, sobe, link poziv | Proširuje se | Izbor igre; u privatnoj sobi i broj igrača (2, 3 ili 4) |
| Quick Play | Proširuje se | Jedno dugme, odmah za sto s 4 mjesta |
| Tajmer poteza | Preuzima se | Prsten oko avatara igrača na potezu |
| Akcioni panel | Novo | Fold, check/call, raise, all-in |
| Pot i ulozi | Novo | Pot u sredini, ulog ulice ispred svakog igrača |
| Zajedničke karte | Novo | 5 mjesta u sredini stola |
| Indikator blindova | Novo | Trenutni nivo i „sljedeći nivo za N ruku” |
| Rezultat ruke | Novo | Naziv kombinacije, istaknutih 5 karata koje pobjeđuju |
| Ekran kraja meča | Novo | Plasman i dugme „Igraj ponovo” |

**Akcioni panel**

- Tri glavna dugmeta: Fold, Check ili Call (s iznosom, npr. „Call 120”), Raise.
- Raise otvara panel s brzim izborom: Min, ½ pota, Pot, All-in, plus slider i dugmad +/- (korak = big blind).
- Iznos na dugmetu uvijek odgovara tačnom iznosu koji će se uložiti.
- Dugmad najmanje 48dp visine, krupan tekst, jak kontrast.
- Panel je vidljiv samo kad je igrač na potezu. Inače je prikazano „Čeka se: [ime]”.

**Jasnoća „ko šta radi”**

- Igrač na potezu: istaknut avatar i tajmer prsten.
- Posljednja akcija svakog igrača prikazana iznad avatara (npr. „Raise 300”) dok ulica traje.
- Animacija žetona iz uloga u pot na kraju ulice i iz pota prema pobjedniku.
- Foldani igrači su zatamnjeni.
- Bankrotirani igrači ostaju vidljivi kao prazno mjesto s plasmanom.

**Layout**

Portrait, minimalna širina 360px. Sva mjesta i zajedničke karte moraju biti vidljivi bez skrolanja. Iznosi su u žetonima, ne u big blindovima.

## Botovi

Botovi omogućavaju trenutni ulazak u Quick Play: svako mjesto koje u tom trenutku ne popuni pravi igrač odmah dobija bota. Dok je igrača malo, većina Quick Play mečeva biće 1 pravi igrač i 3 bota, pa je kvalitet botova ključan za doživljaj igre.

**Kada se koriste**

- Quick Play: popunjavaju sva prazna mjesta do 4 igrača, odmah pri ulasku.
- Privatne sobe: samo ako kreator izričito doda botove.
- Za stolom uvijek mora biti barem jedan pravi igrač. Meč samo s botovima se ne pokreće.
- Kad pravi igrač napusti meč ili se ne vrati nakon prekida veze, njegovo mjesto preuzima bot s istim brojem žetona.
- Prikazuju se kao gosti, u skladu s odlukom iz V1 sloja identiteta.

**Ponašanje V1 (pravila, bez učenja)**

- Preflop: tabela ruku po poziciji i broju igrača za stolom.
- Postflop: odluka prema jačini ruke (napravljena kombinacija, draw, ništa) i odnosu uloga i pota (pot odds).
- Kratak stack (ispod 12 BB): push/fold logika.
- Nasumičnost u odlukama da bot ne bude predvidiv, npr. ponekad blef, ponekad slowplay.
- Vrijeme odluke 1–5 sekundi, nasumično, duže kod većih odluka.
- Jedan nivo jačine: solidan, ali ne savršen.

**Ograničenja**

- Bot dobija isti javni pogled na stanje kao klijent igrača. Nema pristup tuđim kartama ni špilu. Ovo provodi server.
- Botovi ne sarađuju međusobno.
- Bot ne napušta meč.

## Tehnička arhitektura

Server je jedini izvor istine: klijent šalje samo namjeru (akciju i iznos), server je validira, primjenjuje i šalje svakom igraču samo ono što smije vidjeti.

**Poker kao modul igre**

Poker se uklapa u postojeći okvir igara kroz isti interfejs kao Žandar, npr. `createMatch`, `applyAction`, `getPublicState(viewer)`, `isFinished`. Sobe, matchmaking, nalozi i realtime sloj se ne dupliraju.

**Miješanje karata**

- Kriptografski siguran generator slučajnih brojeva (npr. `crypto.randomInt`) i Fisher-Yates miješanje, novo za svaku ruku.
- Špil se čuva samo na serveru i nikad se ne šalje klijentu.
- V2 opcija: objaviti hash špila prije ruke i sam špil poslije ruke, da igrači mogu provjeriti da karte nisu mijenjane.

**Vidljivost podataka**

- Klijent prima samo svoje dvije karte. Tuđe karte stižu tek na showdownu.
- Ista pravila važe za bot modul.

**Evaluacija ruku**

Koristiti provjerenu biblioteku za evaluaciju poker ruku umjesto vlastite implementacije, i pokriti je testovima za kickere, kentu A-2-3-4-5 i podijeljene potove.

**Side potovi**

1. Na kraju ruke sortirati ukupne uloge svih igrača koji su ulagali.
2. Za svaki all-in iznos napraviti sloj pota do te visine, s listom igrača koji imaju pravo na njega.
3. Igrači koji su foldali doprinose potu, ali nemaju pravo na njega.
4. Svaki sloj se dodjeljuje zasebno, od glavnog prema posljednjem side potu.

**Model podataka**

| Entitet | Ključna polja |
| --- | --- |
| PokerMatch | id, roomId, mode (quickplay, private), seats, startStack, blindLevel, handNo, status |
| PokerSeat | matchId, seatNo, userId ili botId, stack, status (active, sitting out, bankrupt) |
| PokerHand | id, matchId, buttonSeat, board, pots, deck (samo server) |
| PokerAction | handId, seatNo, street, type, amount, timestamp |
| MatchResult | matchId, userId ili botId, place |

Stanje meča se snima nakon svake akcije, da se meč može obnoviti nakon pada servera.

**Testovi**

- Unit testovi za rang ruku, side potove, min-raise pravila, blindove nakon eliminacija i heads-up redoslijed.
- Simulacija 10.000 mečeva samo s botovima: zbir žetona mora biti konstantan u svakoj ruci, a trajanje u ciljanom rasponu.

## Edge caseovi

Meč se nikad ne zaustavlja zbog jednog igrača: ko ne odigra, server odigra umjesto njega najpasivniju dozvoljenu akciju, a kod dužeg odsustva mjesto preuzima bot.

| Situacija | Ponašanje |
| --- | --- |
| Istekne tajmer poteza (20 s) | Check ako je moguć, inače fold |
| Igrač izgubi vezu | Status „sitting out”: automatski check ili fold, blindovi se i dalje plaćaju. Ako se ne vrati za 60 s, mjesto preuzima bot s istim brojem žetona |
| Igrač namjerno napusti meč | Potvrda „Napuštaš meč?”. Dobija najlošiji preostali plasman, mjesto preuzima bot s istim brojem žetona |
| Dva ili više igrača bankrotiraju u istoj ruci | Bolji plasman dobija onaj s više žetona na početku ruke. Ako su jednaki, dijele plasman |
| Svi aktivni igrači all-in | Karte se otkrivaju, preostale zajedničke karte se dijele automatski |
| All-in manji od punog raisea | Ne otvara ponovo betovanje igračima koji su već odigrali |
| Igrač ima manje od blinda | Postavlja all-in za koliko ima |
| Neparan žeton u podijeljenom potu | Ide prvom igraču lijevo od buttona |
| Svi osim jednog foldaju | Pot pobjedniku bez otkrivanja karata |
| Quick Play, u redu nema drugih pravih igrača | Igrač ulazi odmah, s 3 bota |
| Pad servera usred meča | Obnova iz posljednjeg snimljenog stanja. Ako obnova nije moguća, meč se poništava bez plasmana |
| Kreator privatne sobe izađe prije starta | Soba se zatvara |

## Google Play i usklađenost

Poker se na Google Playu vodi kao simulirano kockanje, a to utiče na cijelu aplikaciju (com.kartaonica.zandar), ne samo na poker. Prije objave treba provjeriti aktuelnu Play politiku. Ovaj spec je nije provjeravao.

- [ ] Ponovo popuniti IARC upitnik za dobni rejting u verziji s pokerom i provjeriti koliko raste dobna granica.
- [ ] U aplikaciji i uslovima korištenja jasno navesti: žetoni nemaju novčanu vrijednost, ne mogu se isplatiti ni prenijeti van igre.
- [ ] Ne koristiti riječi „kazino”, „pravi novac”, „dobitak” u nazivima ekrana i u Play listingu.
- [ ] Ažurirati Play listing (opis, screenshotove) da spominje poker.
- [ ] Prije uvođenja kupovine žetona ponovo provjeriti Play politiku za social casino aplikacije i lokalne zakone o igrama na sreću u ciljanim zemljama.

## Metrike, acceptance i otvorena pitanja

Poker V1 je gotov kad prođe sve acceptance kriterije ispod. Uspjeh se mjeri po tome da li igrači završavaju mečeve i vraćaju se.

**Metrike**

| Metrika | Cilj |
| --- | --- |
| Udio aktivnih korisnika koji odigraju ≥1 poker meč u 7 dana | Postaviti nakon prve 2 sedmice |
| Vrijeme od klika na Quick Play do prve podijeljene ruke | Ispod 3 s |
| Prosječno trajanje Quick Play meča | 12–20 min |
| Stopa napuštanja meča prije kraja | Ispod 10% |
| Igrači s ≥2 meča u istoj sesiji | Postaviti nakon prve 2 sedmice |
| Prosječan broj pravih igrača u Quick Play meču | Pratiti, cilj da raste |

**Acceptance kriteriji**

- [ ] Kompletna ruka Hold'em No-Limit po pravilima iz ovog speca, uključujući heads-up redoslijed.
- [ ] Side potovi tačni u svim testnim scenarijima (najmanje 30 scenarija).
- [ ] 10.000 simuliranih mečeva bez ijednog odstupanja u zbiru žetona.
- [ ] Klijent nikad ne prima tuđe karte prije showdowna, provjereno pregledom mrežnog saobraćaja.
- [ ] Reconnect vraća igrača u isti meč s tačnim stanjem.
- [ ] Svaki meč počinje sa tačno 100 žetona po igraču, nezavisno od prethodnih mečeva.
- [ ] Quick Play uvijek pokreće meč s 4 igrača, za manje od 3 s od klika.
- [ ] UI radi na 360px širine, sva dugmad akcija najmanje 48dp.

**Otvorena pitanja**

- [ ] Startni broj žetona: 100 ili drugi? Blindovi se skaliraju istim faktorom.
- [ ] Treba li meču bez uloga nešto što daje težinu pobjedi (broj pobjeda na profilu, rang lista)?
- [ ] Nazivi akcija: engleski (Fold, Call, Raise), kako ih koriste igrači u regionu, ili prevedeni?
- [ ] Pre-akcije (Check/Fold unaprijed) i time bank: V1 ili V1.1?
- [ ] Kada uvesti klasični poker s 5 karata kao drugu varijantu?
