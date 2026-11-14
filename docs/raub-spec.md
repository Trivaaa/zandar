# Kartaonica — Raub modul (Spec v1.1)

Nov 6, 2026 · @Igor · v1.1 usklađena sa produkcijom 7.11.2026 · v1.2 pravila po feedbacku igrača 14.11.2026 **(odluka 13)**

> Dizajn: tabla „UI · Raub — kompletan UI" (`UI_Raub.dc.html`) na Claude Design platnu „Kartaonica · identitet", https://claude.ai/artifact/1DkTrJNEv2148shhQUC3de. Gdje se tabla i ovaj tekst razilaze, važi tekst. Gdje se tabla i produkcija razilaze, važi produkcija (postojeći sto, komponente i tokovi Žandara i Pokera).
> Jezik interfejsa: ijekavica, obraćanje na „ti", rodno neutralno. Riječi „bot", „računar" i „AI" se ne pojavljuju nigdje u UI-ju (HARD RULE 5).
> Odluke koje mijenjaju v1 su u tekstu označene sa **(odluka N)** i objašnjene u sekciji „Odluke i usklađivanje".

## Pregled

Raub je igra na štihove sa 32 karte: svaki igrač dobija 4 karte, jedan igrač „rauba” (preuzima) adut i mora uzeti propisan broj štihova, a svi počinju od 21 boda i odbrojavaju prema nuli. Ko prvi stigne do 0, pobjeđuje. Modul koristi isti UI, sobe, linkove, naloge i botove kao Žandar i Poker.

**Ciljevi**

- Ponuditi kafansku igru koju starija publika iz regiona zna, a velike aplikacije je nemaju.
- Kratke ruke (4 štiha) koje odgovaraju mobilnoj sesiji: partija do 0 bodova za 15–25 min.
- Isti obrasci kao Poker: trenutni Quick Play, privatne sobe s prijateljima, bez ekonomije.

**U opsegu V1**

- Klasična pravila: 21 bod, odbrojavanje, tri načina određivanja aduta (Štih, Raub, Moja), zamjena karata, refa.
- Quick Play: uvijek 4 igrača, trenutni ulazak, prazna mjesta popunjavaju botovi.
- Privatne sobe s prijateljima: kreator bira 2, 3 ili 4 igrača i poziva ih linkom ili iz liste prijatelja.
- Botovi koji licitiraju, mijenjaju karte i igraju po pravilima.

**Van opsega V1**

- Bilo kakva ekonomija: žetoni, ulozi, nagrade.
- Varijante mus i permus, 5 ili više igrača, timovi.
- ~~Mađarice kao poseban dizajn karata (faza 2)~~ — od 8.11.2026 Raub se igra mađaricama već u V1, bez izbora kompleta **(odluka 12)**.
- Chat, statistika igrača, replay partije.
- Preuzimanje mjesta botom kad igrač ode ili izgubi vezu **(odluka 3)**.

## Pravila igre

Svaka ruka ima pet faza: dijeljenje, određivanje aduta, „Idem / Ne idem”, zamjena karata i igranje 4 štiha. Karte nemaju bodovnu vrijednost, broji se samo broj osvojenih štihova.

**Špil i rang**

- 32 karte: A, K, Q, J, 10, 9, 8, 7 u četiri boje.
- Rang od najjače: A, K, Q, J, 10, 9, 8, 7. Isti rang važi za adut i za ostale boje.
- 2 do 4 igrača, svako igra za sebe.
- Smjer igre je isti za dijeljenje, licitaciju i igranje: na desno, suprotno od kazaljke na satu. Na ekranu je sljedeći igrač onaj desno od tebe, isto kao u Žandaru (`lib/seating.ts`).

**Dijeljenje**

1. Djelilac dijeli svakom igraču po 2 karte.
2. Okreće jednu kartu licem nagore na sredinu stola (talon).
3. Dijeli svakom igraču još po 2 karte. Svako ima 4 karte.
4. Djelilac se mijenja svake ruke, u smjeru igre.

**Određivanje aduta: tri načina** **(odluka 13)**

| Način | Kada | Ko je nosilac | Talon karta | Mora uzeti |
| --- | --- | --- | --- | --- |
| 1. Štih | Prva okrenuta karta je 7; djelilac kaže „Štih” (nije obavezno) | Djelilac | Djelilac je uzima | 1 štih |
| 2. Raub | Okrenuta karta je A, K, Q (O) ili J (U); igrač kaže „Raub” (nije obavezno) | Prvi koji kaže „Raub” | Samo zamjenom za sedmicu te boje iz ruke | 2 štiha |
| 3. Moja | Igrač ima sedmicu boje okrenute karte i kaže „Moja” (na bilo koju kartu osim 7) | Prvi koji kaže „Moja” | Uzima je, a daje svoju sedmicu | 2 štiha |

Raub naslijepo ne postoji (uklonjen odlukom 13). Djelilac vidi svoje karte odmah po dijeljenju.

**Štih (sedmica na talonu)**

1. Ako je prva okrenuta karta 7, djelilac bira „Štih” ili „Dalje”.
2. „Štih”: djelilac uzima sedmicu, njena boja je adut, mora 1 štih.
3. „Dalje”: odmah se okreće sljedeća karta (broji se kao druga okrenuta) i ide licitacija.

**Licitacija (Raub i Moja)**

1. Počinje djelilac, zatim redom u smjeru igre. Svako kaže „Raub”, „Moja” ili „Dalje”, a server nudi samo ono što smije:
   - „Raub” samo kad je okrenuta karta A, K, Q ili J;
   - „Moja” samo igraču koji ima sedmicu te boje.
2. Prvi koji kaže „Raub” ili „Moja” postaje nosilac i mora 2 štiha.
   - Kod „Raub” karta ostaje na stolu. Ako ima sedmicu te boje, smije je zamijeniti za kartu s talona.
   - Kod „Moja” zamjena je dio izjave: sedmica ide na talon, a karta u ruku.
3. Ako svi kažu „Dalje”, djelilac okreće sljedeću kartu sa špila i licitacija ide ponovo, za boju nove karte. Prethodna okrenuta karta ostaje prigušena ispod nove i van je igre do kraja ruke.
4. Sedmica okrenuta kao druga ili treća karta je obična karta: na nju nema ni Štiha, ni Rauba, ni Moje, pa se okreće sljedeća.
5. Ako ni nakon treće okrenute karte niko ne uzme adut, ruka se poništava, upisuje se refa, a djeljenje prelazi na sljedećeg igrača.

**Višak karata**

Kod Štiha djelilac ima 5 karata i odmah odbacuje jednu licem nadolje. Sedmica uzeta s talona se ne smije odbaciti. „Moja” i zamjena sedmice poslije Rauba nisu višak: igrač daje sedmicu i dobija talon kartu, pa ostaje na 4.

**Idem / Ne idem** **(odluka 9)**

1. Kad je adut određen (i višak odbačen), svaki igrač osim nosioca, redom od nosioca u smjeru igre, kaže „Idem” ili „Ne idem”. Nosilac uvijek igra.
2. Ko kaže „Ne idem”, odlaže karte licem nadolje i ne igra do kraja ruke. Ne boduje se: bodovi mu ostaju isti, bez kazne.
3. Zamjena i štihovi idu samo među igračima koji igraju.
4. Ako niko osim nosioca ne ide, nosilac upisuje sva 4 štiha (−4) i ruka se završava bez zamjene i štihova.

**Zamjena karata**

1. Redom, počevši od nosioca aduta, svaki igrač koji igra odbacuje 0 do 4 karte licem nadolje i dobija isto toliko novih sa špila.
2. Prvi igrač koji zamijeni sve 4 karte dobija 5 karata ovako: 2 skrivene, 1 otvorena koju vide svi, pa 2 skrivene. Zatim odbacuje jednu, ali ne otvorenu, i ostaje na 4 **(odluka 1)**. Svaki sljedeći igrač koji mijenja sve 4 dobija ih skrivene, tačno 4.
3. Odbačene karte su van igre do kraja ruke.
4. Igrač ne može odbaciti više karata nego što ih ima u špilu, pa uvijek ulazi u štihove sa 4 karte **(odluka 4)**. Kad se špil isprazni, ostali igrači više ne mogu mijenjati, i to vide prije svog poteza.
5. Prvi koji mijenja sve 4, a u špilu je manje od 5 karata: dobija koliko ima (najmanje 4), treća karta je otvorena, a odbacuje samo ako je dobio 5 **(odluka 4)**.

**Igranje štihova**

1. Prvi štih otvara nosilac aduta, bilo kojom kartom. Svaki sljedeći otvara pobjednik prethodnog štiha.
2. Igrač mora odgovoriti na boju ako je ima.
3. Ako nema traženu boju, mora baciti adut ako ga ima.
4. Ako nema ni boju ni adut, baca bilo koju kartu.
5. U V1 igrač ne mora nadjačati kartu na stolu.
6. Štih nosi najjači adut. Ako adut nije bačen, štih nosi najjača karta tražene boje.
7. Ruka se završava nakon 4 štiha.

**Gdje se izvori razilaze: izbor za V1**

Izbore je vlasnik potvrdio 7.11.2026 **(odluka 5)**, osim ispadanja iz ruke, koje je promijenjeno poslije simulacije **(odluka 9)**.

| Pravilo | Izbor u V1 | Alternativa |
| --- | --- | --- |
| Smjer igre | Na desno | Na lijevo |
| Ko prvi licitira u scenariju 3 | Djelilac | Igrač desno od djelioca |
| Broj okrenutih karata prije refe | 3 | 2 |
| Obaveza nadjačavanja štiha | Nema | Mora nadjačati ako može |
| Ispadanje iz ruke („ne idem”) | Igrač može odustati i ne boduje se **(odluka 9)** | Nema, svi igraju |
| Pobjeda | Prvi s 0 ili manje bodova | Mora pogoditi tačno 0 |

Sva pravila iz ove tabele su parametri u `RaubRulesConfig`, da se mogu mijenjati bez prepravljanja logike.

## Bodovanje i format meča

Svi počinju s 21 bodom. Svaki osvojeni štih skida 1 bod, a neuspjeh dodaje kaznene bodove. Meč dobija prvi igrač koji stigne do 0.

**Bodovi po ruci**

| Igrač | Rezultat | Bodovi |
| --- | --- | --- |
| Bilo koji igrač | Uzeo 1 ili više štihova (i ispunio obavezu) | −1 po štihu |
| Igrač koji nije nosilac | 0 štihova | +2 |
| Igrač koji je rekao „Ne idem” | Ne igra ruku | 0 |
| Djelilac koji je rekao Štih (mora 1) | 0 štihova | +3 |
| Nosilac poslije Rauba ili Moje (mora 2) | 1 štih | +3 |
| Nosilac poslije Rauba ili Moje (mora 2) | 0 štihova | +4 |

Primjer: nosilac poslije Rauba uzme 3 štiha i ide s 21 na 18. Drugi igrač uzme 1 štih i ide na 20. Treći uzme 0 i ide na 23.

**Refa**

- Kad se ruka poništi jer niko nije uzeo adut, upisuje se refa.
- Sljedeća odigrana ruka se boduje duplo: i odbijeni i kazneni bodovi.
- Refe se skupljaju u red: svaka refa duplira po jednu sljedeću ruku. Tri refe zaredom znače da se naredne tri ruke boduju duplo, ne da se jedna ruka množi s 8.
- Broj refa koje čekaju vidi se na tabeli rezultata.

**Kraj meča**

- Meč se završava na kraju ruke u kojoj je neko stigao do 0 ili ispod.
- Pobjednik je igrač s najmanje bodova. Ostali dobijaju plasman po bodovima.
- Nema nagrada ni žetona. Prikazuje se konačni plasman.

**Parametri stola**

| Parametar | Quick Play | Privatna soba |
| --- | --- | --- |
| Broj igrača | Uvijek 4 | 2, 3 ili 4, bira kreator |
| Startni bodovi | 21 | 21 |
| Ulazak | Odmah; server do 2 s spaja druge prave igrače, ostala mjesta popunjavaju botovi (isto kao Poker) | Meč kreće sam kad se popune sva mjesta, ili kad kreator popuni prazna („Popuni prazna mjesta i počni”) |
| Tajmer poteza | 25 s **(odluka 10)** | 25 s |
| Sljedeća ruka | Host pokreće dugmetom „Sljedeća ruka →” **(odluka 2)** | Isto |
| Ciljano trajanje | 15–25 min | Zavisi od broja igrača |

**Igra s prijateljima (privatna soba)**

Isti tok kao kod Pokera: kreator bira Raub i broj igrača (2, 3 ili 4), poziva prijatelje linkom ili iz liste prijatelja, meč kreće kad se popune mjesta, a nakon meča dugme „Revanš” vraća isto društvo za sto.

S 2 igrača u špilu ostaje 23 karte, pa je zamjena gotovo uvijek moguća. S 4 igrača ostaje 15 karata, pa posljednji u redu za zamjenu može ostati bez karata.

## Tok meča i stanja

Meč je niz ruku. Svaka ruka prolazi isti put: adut se odredi na jedan od tri načina ili se upiše refa, zatim svi mijenjaju karte i igraju 4 štiha, a nakon bodovanja server provjerava da li je neko stigao do 0.

Tok ruke: Dijeljenje (po 4 karte, 1 na talon) → Talon je 7? Da: djelilac bira Štih (mora 1) ili Dalje (nova karta). Ne → Licitacija (Raub na A/K/Q/J, Moja sa sedmicom te boje, ili Dalje u krug): neko kaže Raub ili Moja → nosilac mora 2 štiha; svi Dalje → nova karta na talon i nova licitacija, nakon 3. karte refa. Iz sva tri načina → Idem / Ne idem (niko ne ide: nosilac −4, kraj ruke) → Zamjena (svako 0–4 karte) → 4 štiha (boja, pa adut) → Bodovanje (21 prema 0, kazne, refa) → host pokreće novu ruku dok neko ne stigne do 0.

- **Ulazak za sto:** Quick Play odmah smješta igrača za sto s 4 mjesta, prazna mjesta dobijaju botove. U privatnoj sobi meč kreće kad se popune mjesta.
- **Start meča:** svi imaju 21 bod, prvi djelilac se bira nasumično.
- **Ruka:** dijeljenje, izbor aduta, odbacivanje viška, Idem / Ne idem, zamjena, 4 štiha, bodovanje.
- **Refa:** ruka bez aduta se poništava bez bodovanja, djeljenje prelazi dalje, a sljedeća odigrana ruka se boduje duplo. Poruka o refi stoji dok host ne pokrene novu ruku.
- **Kraj ruke:** pregled ruke stoji dok host ne pritisne „Sljedeća ruka →”; ostali vide „Čeka se: [ime]” **(odluka 2)**.
- **Kraj meča:** nakon ruke u kojoj je neko stigao do 0 ili ispod. Ekran s plasmanom; u Quick Play „Igraj ponovo”, u privatnoj sobi „Revanš” za hosta, i „Na početnu” za sve.

## UI i UX

Raub koristi „kafanski sto” i postojeće komponente. Novo su faze koje Žandar nema: licitacija za adut, zamjena karata i tabela s odbrojavanjem. U svakom trenutku mora biti jasno koja je faza, ko je na potezu, šta je adut i koliko štihova nosilac mora uzeti.

**Šta se preuzima, a šta je novo**

| Element | Status | Napomena |
| --- | --- | --- |
| Sto, mjesta, avatari | Preuzima se | `.felt-stage`, podloge (`TableSurface` teme), `PlayerSeat`; najviše 4 mjesta, igrač uvijek dolje u sredini |
| Karte | Preuzima se | `PlayingCard`, `CardBack`, postojeći asseti, samo A do 7 |
| Lobby, sobe, link poziv | Proširuje se | Izbor igre; u privatnoj sobi broj igrača (2, 3 ili 4), bez cilja i timova (isto kao Poker) |
| Quick Play | Proširuje se | Jedno dugme, odmah za sto s 4 mjesta |
| Tajmer poteza | Preuzima se | Prsten oko avatara igrača na potezu (kao Poker), 25 s |
| Meni, izlazak, reakcije, pauza | Preuzima se | `GameMenuSheet`, `LeaveTableSheet`, `ReactionFab`, `PauseAbandonOverlay` **(odluka 3)** |
| Talon | Novo | Okrenuta karta na sredini stola, uz brojač „karta 1 od 3” i broj karata u špilu |
| Panel licitacije | Novo | Dugmad „Dalje”, „Raub” (samo na A, K, O, U) i „Moja” (samo uz sedmicu te boje); kod sedmice na talonu djelilac bira „Štih” / „Dalje” **(odluka 13)** |
| Panel „Idem / Ne idem” | Novo | Dva dugmeta, uz adut i ugovor nosioca; ko ne ide, prigušen je do kraja ruke **(odluka 9)** |
| Panel zamjene | Novo | Igrač tapom označi karte za odbacivanje, dugme „Zamijeni N” ili „Zadrži sve” |
| Oznaka aduta | Novo | Simbol boje aduta stalno vidljiv u uglu stola; prije određivanja „nudi se” |
| Oznaka nosioca | Novo | Kod avatara nosioca: „Raub · mora 2” i trenutni broj uzetih štihova (1/2) |
| Prostor štiha | Novo | Do 4 karte u sredini, svaka ispred igrača koji ju je bacio |
| Brojač štihova | Novo | Ispod svakog avatara bodovi i broj uzetih štihova u ovoj ruci |
| Tabela rezultata | Novo | List odozdo: bodovi svih igrača po rukama, refa kao red, ×2 ruke označene, refe koje čekaju |
| Kraj ruke i meča | Novo | Po obrascu `RoundEndOverlay`: pregled ruke s dugmetom hosta, plasman na kraju meča |

**Igranje karata**

- Karte koje igrač ne smije baciti (zbog obaveze boje ili aduta) su zatamnjene i ne mogu se izabrati. Ovo je glavna pomoć početnicima i sprječava nevažeće poteze. Ispod piše zašto („Odgovori na boju ♦”, „Moraš baciti adut”).
- Bacanje karte: tap pa potvrda, isti obrazac kao u Žandaru.
- Nakon štiha karte ostaju vidljive 1 sekundu, pa animacija ide prema pobjedniku.

**Jasnoća faza**

- Natpis faze na vrhu stola: „Licitacija”, „Idem?”, „Zamjena”, „Štih 2 od 4”.
- Odgovori u licitaciji („Dalje”, „Raub”, „Moja”) prikazani su iznad avatara dok faza traje.
- Broj karata koje je svaki igrač zamijenio prikazan je kratko iznad avatara: „Zamjena 3” ili „Bez zamjene” (rodno neutralno, ne „Zamijenio 3”).
- Na kraju ruke kratak pregled: ko je koliko uzeo i promjena bodova, uz isticanje kazne (+3, +4, riječ „kazna”, `--danger-signal`) i dupliranja zbog refe (×2, `--warn`).

**Layout**

Portrait, minimalna širina 360px. Sva mjesta, talon, prostor štiha i oznaka aduta vidljivi bez skrolanja. Bodovi i štihovi su stalno vidljivi ispod avatara, a puna tabela se otvara iz zaglavlja stola. Novi tokeni se ne uvode; nosilac je `--accent`, a boja igre (`--game-raub-1/2`) je samo na kartici igre i oznaci u lobiju.

## Botovi

Botovi omogućavaju trenutni Quick Play, isto kao u Pokeru: svako mjesto koje u tom trenutku ne popuni pravi igrač odmah dobija bota. Raub je s 4 karte jednostavniji od pokera, pa pravila za bota mogu biti kratka, a da igra izgleda razumno.

**Kada se koriste**

- Quick Play: popunjavaju sva prazna mjesta do 4 igrača, odmah pri ulasku.
- Privatne sobe: samo ako kreator izričito popuni prazna mjesta.
- Za stolom uvijek mora biti barem jedan pravi igrač.
- Bot ne preuzima mjesto igrača koji ode ili izgubi vezu u V1 **(odluka 3)**.
- Prikazuju se kao gosti, u skladu s odlukom iz V1 sloja identiteta (HARD RULE 3 i 5: `isBot` nikad ne stiže do klijenta).

**Ponašanje V1 (pravila, bez učenja)**

- Štih: sa sedmicom u ruci ima bar 2 aduta, ili A/K sa strane; ponekad i sa slabijom rukom (mora samo 1).
- Licitacija: procjena snage ruke za ponuđenu boju. Npr. „Raub” ili „Moja” (šta server dozvoli) ako bi imao 2 ili više aduta, ili 1 jak adut (A, K) i 1 as sa strane.
- Idem / Ne idem: ide sa 2 ili više aduta ili sa asom sa strane, ponekad i sa slabijom rukom.
- Zamjena: zadržava adute i aseve, mijenja ostale karte. Kao nosilac nikad ne mijenja sve 4.
- Igranje: otvara jakim adutom kad mu trebaju štihovi; kad ne može uzeti štih, baca najslabiju dozvoljenu kartu; ne troši jak adut na štih koji već nosi drugi igrač.
- Nasumičnost u pragovima, da bot ne bude predvidiv.
- Vrijeme odluke 2,5–7 sekundi, nasumično **(odluka 11)**.
- Svi pragovi i šum su u konfiguraciji (`DEFAULT_RAUB_BOT_CONFIG`), ne u kodu (HARD RULE 7).

**Ograničenja**

- Bot vidi samo ono što vidi igrač na njegovom mjestu: svoje karte, talon, odigrane karte. Odluku donosi iz istog pogleda koji dobija klijent. Nema pristup špilu ni tuđim kartama. Ovo provodi server.
- Bot igra samo dozvoljene poteze, kroz istu validaciju kao čovjek (HARD RULE 2 i 4).
- Botovi ne sarađuju međusobno.

## Tehnička arhitektura

Server je jedini izvor istine: klijent šalje samo namjeru (licitacija, karte za zamjenu, bačena karta), server provjerava da li je potez dozvoljen u trenutnoj fazi i šalje svakom igraču samo ono što smije vidjeti.

**Raub kao modul igre**

Raub se uklapa u isti okvir kao Poker: `GameId` dobija `"raub"`, soba nosi `game: "raub"` i stanje u `LobbyRoom.raub` (nikad `gameState`, pa Žandar kod Raub sobe preskače). Čist motor je u `packages/game-core/src/raub/`, logika stola na serveru u `apps/server/src/raub/table.ts`, socket akcija `raub:action`, ekran `apps/web/components/raub/`. Sobe, matchmaking, nalozi i realtime sloj se ne dupliraju. Miješanje karata koristi isti kriptografski siguran generator (`crypto.randomInt`, ubrizgan kao `rng`) i Fisher-Yates miješanje kao Poker.

**Faze ruke kao stanja**

Ruka je mašina stanja: `dealing` → `trump_selection` (koraci `seven_choice`, `bidding`, `swap_seven`) → `discard_extra` (samo ako neko ima 5 karata) → `exchange` → `trick_1` … `trick_4` → `scoring`. Iz `trump_selection` ruka može otići i u `void` (refa). Svaka akcija je dozvoljena samo u svojoj fazi i samo igraču koji je na potezu.

**Validacija poteza**

- Server računa listu dozvoljenih karata (boja, pa adut, pa bilo šta) i šalje je klijentu uz stanje. UI je koristi za zatamnjivanje, ali server provjerava ponovo.
- U zamjeni server provjerava da igrač ne odbacuje kartu uzetu s talona i da ne traži više karata nego što ih ima u špilu.
- Zamjena sedmice poslije Rauba dozvoljena je samo nosiocu koji drži sedmicu boje aduta.
- „Raub” server prima samo na A, K, Q, J, a „Moja” samo od igrača koji drži sedmicu te boje. Pogled igrača na potezu nosi `bidOptions`, pa UI crta samo dozvoljena dugmad.

**Vidljivost podataka**

- Klijent vidi svoje karte, talon, odigrane karte i broj karata koje su drugi zamijenili.
- Ne vidi tuđe karte, odbačene karte ni špil, ni na kraju ruke.
- Otvorena karta kod prve zamjene sve 4 karte šalje se svima.
- Karta uzeta s talona (Štih, Moja, zamjena sedmice) je javna i ostaje vidljiva na stolu do štihova.

**Stari klijenti**

Klijent koji ne javlja da zna Raub (`games` u `join-request`, `invites/accept` i `auth.games` na socketu, kao za Poker) ne ulazi u Raub sobu. Od odluke 13 klijent mora javiti i `"raub:2"` (`GAME_PROTOCOL` u shared-types), pa i APK 1.4.0, koji zna stara pravila, dobija poruku o ažuriranju: 426 `update_required` / `UPDATE_REQUIRED`, „Za ovu igru ažuriraj aplikaciju.”. Inače bi APK 1.x crtao Raub stanje kao Žandar sto.

**Model podataka**

| Entitet | Ključna polja |
| --- | --- |
| RaubMatch | id, roomId, mode (quickplay, private), seats, startScore, pendingRefas, dealNo, status |
| RaubSeat | matchId, seatNo, userId ili botId, score, status (active, sitting out) |
| RaubDeal | id, matchId, dealerSeat, talonCards, trumpSuit, scenario (seven, bid, moja, void; `blind` samo u istoriji), declarerSeat, requiredTricks, multiplier, phase, deck (samo server) |
| RaubAction | dealId, seatNo, phase, type (stih, raub, moja, pass, discard, exchange, play), cards, timestamp |
| RaubTrick | dealId, trickNo, leaderSeat, cards, winnerSeat |
| MatchResult | matchId, userId ili botId, place, finalScore |

Ovo je logički model. U V1 cijelo stanje meča živi u jednom objektu (`RaubGameState`, samo server) koji se snima uz sobu (file-snapshot, kao Žandar i Poker) nakon svake akcije, da se meč može obnoviti nakon pada servera. Promjena oblika tog objekta mora tolerisati stari oblik (deploy = restart = hidracija).

**Testovi**

- Unit testovi za sva tri načina aduta (Štih, Raub samo na A/K/Q/J, Moja), sedmicu kao drugu ili treću kartu, refu i dupliranje, sve redove tabele bodovanja, obaveze boje i aduta, zamjenu kad nestane špila.
- Simulacija 10.000 mečeva samo s botovima: svaka ruka ima tačno 4 štiha, ukupno 32 karte su uvijek na tačno jednom mjestu, i trajanje meča u ciljanom rasponu.

## Edge caseovi

Meč se nikad ne zaustavlja zbog jednog poteza: ko ne odigra na vrijeme, server odigra najsigurniju dozvoljenu akciju. Kod prekida veze važi postojeća pauza i glasanje **(odluka 3)**.

| Situacija | Ponašanje |
| --- | --- |
| Istekne tajmer u licitaciji | „Dalje” |
| Istekne tajmer djeliocu kod sedmice na talonu | „Dalje” (bez štiha), okreće se nova karta |
| Istekne tajmer kod zamjene sedmice za talon | Ne mijenja |
| Istekne tajmer kod „Idem / Ne idem” | „Ne idem” (bez kazne) |
| Istekne tajmer u zamjeni | Igrač zadržava sve karte |
| Istekne tajmer kod odbacivanja viška (5 karata) | Odbacuje se najslabija karta koja nije adut i nije karta s talona (ako su sve adut, najslabiji adut koji nije s talona) |
| Istekne tajmer u štihu | Baca se najslabija dozvoljena karta |
| Igrač izgubi vezu | Gornja pravila važe za svaki potez dok traje rok za povratak. Zatim sto ide u pauzu, pa u glasanje „Čekaj” / „Završi”, isto kao Žandar (`pause.ts`, `PauseAbandonOverlay`) |
| Igrač namjerno napusti meč | Potvrda „Napusti partiju?”. Ostali odmah vide pauzu „[ime] nije za stolom”, pa glasanje, isto kao Žandar |
| Špil se isprazni tokom zamjene | Ostali u redu ne mogu mijenjati; UI to prikazuje prije njihovog poteza („Špil je prazan”, Zamijeni ugašen) |
| Igrač želi odbaciti kartu uzetu s talona | Nije dozvoljeno, karta je zaključana u UI-ju i na serveru |
| Sedmica okrenuta kao druga ili treća karta | Obična karta: nema Štiha, Rauba ni Moje, svi „Dalje” i okreće se sljedeća |
| Pad servera dok djelilac bira raub naslijepo (snapshot prije odluke 13) | Hidracija prevodi ruku u licitaciju sa otvorenim kartama (`upgradeRaubState`) |
| Tri refe zaredom | Naredne tri odigrane ruke boduju se duplo, svaka posebno |
| Dva ili više igrača stignu do 0 ili ispod u istoj ruci | Pobjeđuje onaj s manje bodova. Ako su jednaki, dijele prvo mjesto |
| Pad servera usred meča | Obnova iz posljednjeg snimljenog stanja. Ako obnova nije moguća, meč se poništava bez plasmana |
| Kreator privatne sobe izađe prije starta | Soba se zatvara |
| Quick Play, u redu nema drugih pravih igrača | Igrač ulazi odmah, s 3 bota |
| Stari klijent otvori link za Raub sto | „Za ovu igru ažuriraj aplikaciju.” (426 / `UPDATE_REQUIRED`) |

## Odluke i usklađivanje

Odluke vlasnika od 7.11.2026 i mjesta gdje je v1 usklađena s postojećim pravilima projekta.

| # | Tema | Odluka | Zašto |
| --- | --- | --- | --- |
| 1 | Zamjena sve 4 karte | 5 karata (2 skrivene, 1 otvorena, 2 skrivene), pa odbacuje jednu, ali ne otvorenu | Spec v1 je opisivao 5 karata za 4 zamijenjene; vlasnik je potvrdio da je to namjera |
| 2 | Kraj ruke | Dugme hosta „Sljedeća ruka →”, bez auto-prelaza od 5 s s table | Isti obrazac kao Žandar u produkciji (igrač vodi tempo; changelog 2026-06-11) |
| 3 | Izlazak i prekid veze | Postojeća pauza i glasanje Žandara; bot ne preuzima mjesto u V1 | Isto ponašanje i isti ekran kao u produkciji; preuzimanje mjesta botom (PRD §38.4) ide kasnije, zajedno za sve igre |
| 4 | Zamjena kad je špil kratak | Igrač ne može tražiti više karata nego što ih ima u špilu, pa uvijek ima 4 za štihove | Spec v1 je imao i „dobija koliko je ostalo” i „ne smije tražiti više nego ima u špilu”; prvo bi ostavilo igrača s manje od 4 karte, a ruka mora imati 4 štiha |
| 5 | Tabela „Gdje se izvori razilaze” | Izbori za V1 potvrđeni, alternative su parametri | — |
| 6 | Riječi u UI-ju | „Popuni prazna mjesta i počni” (bez riječi „bot”), „Zamjena 3” / „Bez zamjene” (rodno neutralno), „Sto” umjesto „Soba” | HARD RULE 5 i pravilo rodno neutralnog teksta (SPEC_IDENTITET); „Sto” je odluka sa table Pokera |
| 7 | Kraj meča | Obrazac `RoundEndOverlay` i kraja meča Pokera (Igraj ponovo / Revanš / Na početnu) | Isti ekran za sve igre |
| 8 | Prekidač izdanja | Raub se uključuje prekidačem kao Poker: staging i razvoj odmah, produkcija svjesnim upisom | Produkcija ne dobija igru sama od sebe kad kod stigne na `production` |
| 9 | Idem / Ne idem | Uvedeno (pagat): poslije određivanja aduta svako osim nosioca bira da li igra; ko ne ide, ne boduje se; ako niko ne ide, nosilac −4 | Simulacija botova (7.11.2026) sa „svi igraju”: 2 igrača završe za ~11 ruku, 3 za ~23, a sa 4 igrača nijedan od 60 mečeva ni za 150 ruku — bodovi u prosjeku rastu +0,15 po ruci (4 štiha, a ~45 % igrača bez štiha dobija +2). Sa „Idem / Ne idem” 4 igrača završe za medijan ~21 ruku |
| 10 | Tajmer poteza | 25 s umjesto 15 s | Vlasnik na uređaju (7.11.2026): 15 s ističe prije nego se stigne razmisliti; traženo bar 50 % duže. Botovi igraju za 1–3 s, pa tempo meča raste samo kad čovjek razmišlja |
| 11 | Brzina botova | Nasumično 2,5–7 s po odluci (bilo 1–3 s) | Vlasnik (7.11.2026): da izgleda realnije. Simulacija: 4 igrača, medijan ~34 min (bilo ~20), p90 ~50 min — iznad ciljanih 15–25 min |
| 12 | Mađarice | Raub se crta mađaricama (komplet vlasnika „Kartaonica_RAUB”, `public/cards/hu/`), i za stolom i na početnoj. Samo prikaz: pik → list, herc → srce, karo → tikva, tref → žir; J → U, Q → O. U tekstu znak boje je ikonica sa karte, figure kao na karti (U, O, K, A), četvrta boja „Tikva” | Vlasnik, 8.11.2026. Motor, server i `Card.id` ostaju francuski, pa nema promjene snapshota ni protokola |
| 13 | Pravila po feedbacku igrača | Raub samo na A, K, Q (O), J (U), nije obavezan, mora 2. Na 10, 9 i 8 nema rauba. „Moja”: igrač sa sedmicom boje okrenute karte je daje za tu kartu, nosi adut i mora 2 (kazne kao Raub); Raub, Moja i Dalje su u istom krugu, prvi koji se javi nosi adut. Sedmica na talonu nije obavezna: djelilac bira „Štih” (mora 1) ili „Dalje” (odmah nova karta, broji se u 3 okretanja). Raub naslijepo uklonjen. Pravila su parametri (`raubRanks`, `stihOptional`, `mojaRequiredTricks`) | Vlasnik, 14.11.2026, po feedbacku igrača. Simulacija 10.000 mečeva (botovi): refa 2 igrača 30,2 % (bilo 13,6 %), 3 igrača 18,6 % (5,5 %), 4 igrača 11,7 % (2,2 %); trajanje 4 igrača medijan ~31 min (~34). Refa raste jer na 10, 9 i 8 adut može uzeti samo igrač sa sedmicom te boje |

## Metrike, acceptance i otvorena pitanja

Raub V1 je gotov kad prođe sve acceptance kriterije ispod. Uspjeh se mjeri po tome da li igrači završavaju mečeve i vraćaju se.

**Metrike**

| Metrika | Cilj |
| --- | --- |
| Udio aktivnih korisnika koji odigraju ≥1 Raub meč u 7 dana | Postaviti nakon prve 2 sedmice |
| Vrijeme od klika na Quick Play do prvog dijeljenja | Ispod 3 s |
| Prosječno trajanje Quick Play meča | 15–25 min |
| Stopa napuštanja meča prije kraja | Ispod 10% |
| Udio ruku koje završe refom | Pratiti; ako je iznad 20%, botovi su previše oprezni |
| Prosječan broj pravih igrača u Quick Play meču | Pratiti, cilj da raste |

Analitika ide kroz postojeće `match_started` / `match_ended` sa `game: "raub"` (docs/analytics.md).

**Acceptance kriteriji**

- [ ] Sva tri scenarija aduta rade po pravilima iz ovog speca, uključujući zamjenu sedmice u scenariju 3.
- [ ] Refa se upisuje i duplira tačno onoliko narednih ruku koliko je refa bilo.
- [ ] Bodovi tačni za svaki red tabele bodovanja, provjereno testovima.
- [ ] Server odbija svaku kartu koja krši obavezu boje ili aduta.
- [ ] Zamjena radi i kad se špil isprazni.
- [ ] Klijent nikad ne prima tuđe karte, odbačene karte ni špil, provjereno pregledom mrežnog saobraćaja.
- [ ] 10.000 simuliranih mečeva bez greške u broju karata i štihova.
- [ ] Quick Play uvijek pokreće meč s 4 igrača, za manje od 3 s od klika.
- [ ] Privatna soba radi za 2, 3 i 4 igrača.
- [ ] UI radi na 360px širine, nedozvoljene karte su zatamnjene i ne mogu se baciti.
- [ ] Stari klijent ne ulazi u Raub sto i dobija poruku o ažuriranju.

**Otvorena pitanja**

- [x] Potvrditi izbore iz tabele „Gdje se izvori razilaze” — potvrđeno 7.11.2026 (odluka 5).
- [ ] Da li je 15–25 min za partiju od 21 boda predugo? Opcija: brza partija od 11 bodova (u lobiju jedan red 21 / 11, kao Žandar).
- [ ] Da li u V1 uvesti mus, s obzirom na to da ga dio igrača očekuje?
- [ ] Da li uz Raub prikazivati kratko objašnjenje pravila pri prvoj partiji? Predlog sa table: pravila se sama otvore jednom, kao „Kako se igra Raub” u 3 kartice.
- [x] Mađarice: zamijenile francuske karte u Raubu (odluka 12). Izbor kompleta (francuske/mađarice) nije planiran.

**Izvori pravila**

- ~~Raub – pravila, igrajkarte.com~~ — link (`igrajkarte.com/blog/post/raub-pravila/`) od 7.11.2026 preusmjerava na nepovezan domen; ne koristiti.
- [Raub pravila igre, igresakartama.com](https://igresakartama.com/raub/)
- [Raub, pagat.com](https://pagat.com/rams/raub.html) (varijanta Hrvata u SAD-u, s „idem / ne idem” i obavezom nadjačavanja; izvor odluke 9)
