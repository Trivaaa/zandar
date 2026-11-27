# Kartaonica — Bela modul (Spec v0.1, nacrt)

Nov 21, 2026 · @Igor · v0.2: pravila P-1…P-17 prihvaćena kako su predložena **(odluka 7)** · v0.3: ruka u dva reda **(odluka 8)**, motor i odluke 9–14 · v0.4: server (odluka 15) i ekran · v0.5: beta, prijava greške sa stola (odluke 16–18)

> Status: faze 0–4 završene na granama `feat/bela-core` → `feat/bela-server` → `feat/bela-table` (nije spojeno u `main`). Preostaje faza 5: staging, uređaj, izdanje.
> Dizajn: tabla „UI · Bela" (`UI_Bela`) na Claude Design platnu „Kartaonica · identitet", https://claude.ai/artifact/1DkTrJNEv2148shhQUC3de#artboard-UI_Bela — nacrt B1–B12 od 21.11.2026, čeka odobrenje vlasnika. Gdje se tabla i ovaj tekst razilaze, važi tekst.
> Jezik interfejsa: ijekavica, obraćanje na „ti", rodno neutralno. Riječi „bot", „računar" i „AI" se ne pojavljuju nigdje u UI-ju (HARD RULE 5).
> Svako pravilo koje vlasnik treba da potvrdi nosi oznaku **(P-n)**. Kad se potvrdi ili promijeni, postaje **(odluka N)** u sekciji „Odluke", kao u `docs/raub-spec.md`.

## Problem

Bela je najigranija timska kartaška igra u Hrvatskoj i velikom dijelu BiH, Slavonije i Vojvodine, i igra se u četvoro, dvoje na dvoje. Kartaonica danas ima tri igre (Žandar, Poker, Raub). Svaka se igra „svako za sebe" ili u nasumičnom timu, a nijedna nije igra koju društvo od četvoro igra svako veče. Bela je već najavljena na početnoj („Javi mi", `lib/games.ts`). Preko forme se do 21.11.2026 niko nije prijavio, ali su igrači vlasnika usmeno pitali za Belu. Znak potražnje je dakle za sada samo usmeni.

Rizik je u dvije stvari:

1. **Pravila.** Bela ima više regionalnih varijanti (mus, do koliko se igra, štiglja, nadjačavanje kad partner nosi štih). Vlasnik ne zna pouzdano varijantu koju njegova publika igra. Ako izaberemo pogrešnu, igrači to prepoznaju u prvoj ruci.
2. **Ekran.** U ruci je 8 karata (Žandar i Raub 4), uz adut, zvanja, bodove dva tima i 8 štihova po ruci. Na 360 px to je najgušći sto u aplikaciji, pa raspored treba riješiti prije koda.

## Ciljevi

| # | Cilj | Kako znamo |
| --- | --- | --- |
| G1 | Igrač koji zna belu igra bez iznenađenja u pravilima | < 2 prijave „pogrešno pravilo" po 100 odigranih mečeva u prve 2 sedmice (Pošalji utisak + QA) |
| G2 | Cijela ruka stane na telefon | Sto, 8 karata, adut, zvanja i rezultat bez skrola na 360×640 (CDP mjerenje, pa uređaj) |
| G3 | Quick Play jednim dodirom, kao ostale igre | Od klika do prvog dijeljenja < 4,5 s (isto kao Raub, changelog 198–200) |
| G4 | Mečevi se završavaju | Stopa napuštanja prije kraja < 15 % (timska igra: jedan izlazak kvari meč trojici) |
| G5 | Bela vraća igrače | D7 povratak igrača koji su odigrali ≥1 Bela meč ≥ prosjek Rauba u istom periodu |

## Van opsega (V1)

- **2 i 3 igrača.** Bela u dvoje i troje ima drugačija pravila (karte s talona, bez partnera). Prvo radimo jedan raspored i jedna pravila. *Odluka vlasnika 21.11.2026.*
- **Francuske karte i izbor kompleta.** Samo mađarice, kao Raub (odluka 12 u Raub specu). Motor ostaje francuski iznutra, a prikaz je mađaričan.
- **Ekonomija, rang-liste, statistika igrača.** Isto kao ostale igre.
- **Chat i signali partneru.** Rade samo postojeće reakcije. Signali (dogovorni znakovi) bi bili varanje u kafani, a u aplikaciji bi trebali posebnu odluku.
- **Preuzimanje mjesta botom kad igrač ode** (PRD §38.4). Važe postojeća pauza i glasanje, kao u Raubu (odluka 3). To se radi kasnije, za sve igre zajedno.
- **Belot (8 u nizu = pobjeda).** Rijetko se dešava i varijante se tu najviše razilaze. Vidi P-15.

## Korisničke priče

**Igrač koji zna belu (glavna publika)**
- Kao igrač koji igra belu u kafani, hoću da pravila budu kao „kod nas", da ne moram učiti novu igru.
- Kao igrač na potezu, hoću da vidim koje karte smijem baciti, da ne izgubim štih zbog greške u tapu.
- Kao igrač sa zvanjem, hoću da aplikacija sama prepozna moje zvanje i ponudi da ga prijavim, da ga ne propustim.
- Kao igrač, hoću da u svakom trenutku vidim adut, ko je zvao i koliko moj tim ima u ovoj ruci i u meču.

**Društvo od četvoro**
- Kao host, hoću da napravim sto i pozovem trojicu prijatelja (timovi po redu ulaska u V1, odluka 15; izbor timova kasnije).
- Kao igrač u privatnom stolu, hoću da prazna mjesta mogu popuniti „igrači" kad nas je troje.

**Igrač koji ne zna belu dobro**
- Kao početnik, hoću kratka pravila i objašnjenje zašto je karta zatamnjena („Moraš ići jače"), da naučim igrajući.

**Rubni slučajevi**
- Kao igrač čiji partner izgubi vezu, hoću da meč stane i da se glasa, a ne da igram 1 na 2.
- Kao igrač koji je zvao adut i pao, hoću da na kraju ruke jasno vidim zašto (bodovi naspram bodova, zvanja).

## Pravila igre (nacrt)

Polazište je bela kako se igra mađaricama u BiH, Slavoniji i Vojvodini. Tamo gdje se izvori razilaze dat je prijedlog i alternativa. Sve što je označeno sa **P-n** je parametar u `BelaRulesConfig`, da se poslije feedbacka igrača ne mijenja logika (iskustvo Rauba: 31 odluka posle izlaska, većinom feedback igrača).

**Špil i karte**

- 32 mađarice: VII, VIII, IX, X, U (dečko), O (baba), K (kralj), A (as) u četiri boje: srce, list, tikva, žir.
- Prikaz kao u Raubu: `public/cards/hu/`, unutra francuski id (herc → srce, pik → list, karo → tikva, tref → žir; J → U, Q → O).
- 4 igrača, dva tima. Partneri sjede jedan naspram drugog.
- Igra ide na desno, suprotno od kazaljke, isto kao Žandar i Raub (`lib/seating.ts`) **(P-1)**.

**Vrijednost i jačina karata**

| Karta | Adut: jačina | Adut: bodovi | Ostale boje: jačina | Ostale boje: bodovi |
| --- | --- | --- | --- | --- |
| U | 1. | 20 | 5. | 2 |
| IX | 2. | 14 | 6. | 0 |
| A | 3. | 11 | 1. | 11 |
| X | 4. | 10 | 2. | 10 |
| K | 5. | 4 | 3. | 4 |
| O | 6. | 3 | 4. | 3 |
| VIII | 7. | 0 | 7. | 0 |
| VII | 8. | 0 | 8. | 0 |

Karte nose 152 boda, zadnji štih još 10 („štih"), ukupno **162** po ruci bez zvanja.

**Dijeljenje**

1. Prvi djelilac se bira nasumično, a poslije se djelilac mijenja svake ruke u smjeru igre.
2. Svako dobija 6 karata (3 + 3) i vidi ih. Još 2 karte po igraču ostaju zatvorene ispred njega („talon") **(P-2)**.

**Zvanje aduta**

1. Počinje igrač desno od djelioca. Redom, svako kaže boju (postaje adut) ili „Dalje".
2. Prvi koji kaže boju zvao je adut, a njegov tim je **tim koji je zvao**.
3. Ako svi do djelioca kažu „Dalje", djelilac **mora** zvati („mus") **(P-3)**. Alternativa: novi krug ili novo dijeljenje.
4. Zvanje je jedan krug. Nema nadmetanja ni preuzimanja zvanja **(P-4)**.
5. Kad je adut zvan, svako uzima svoje 2 karte iz talona i ima 8 karata.

**Zvanja (prijave)**

| Zvanje | Bodovi |
| --- | --- |
| Tri u nizu iste boje (terca) | 20 |
| Četiri u nizu (kvarta) | 50 |
| Pet ili više u nizu | 100 |
| Četiri U | 200 |
| Četiri IX | 150 |
| Četiri A, X, K ili O | 100 |
| Bela (K i O aduta kod istog igrača) | 20 |

- Niz ide prirodnim redom: VII, VIII, IX, X, U, O, K, A **(P-5)**.
- Zvanja se prijavljuju uz svoju prvu kartu u prvom štihu **(odluka 9)**: broj („Zove 50") vide svi čim igrač baci kartu, a karte zvanja se pokazuju poslije prvog štiha, samo kod tima koji ih boduje **(P-6)**.
- Ista karta smije biti i u nizu i u četiri iste; broje se oba zvanja **(odluka 11)**.
- Zvanja boduje **samo tim sa najjačim pojedinačnim zvanjem**, ali tada sva svoja. Porede se redom: vrijednost, pa dužina niza **(odluka 12)**, pa viša karta niza, pa adutski niz, pa igrač bliži prvom na potezu **(P-7)**.
- Bela (K + O aduta) se uvijek boduje, bez poređenja. Prijavljuje se kad se baci druga od te dvije karte **(P-8)**.

**Igranje štihova**

1. Prvi štih otvara igrač desno od djelioca **(P-9)**. Svaki sljedeći otvara ko je odnio prethodni.
2. Mora se odgovoriti na boju.
3. Ko nema boju, mora baciti adut, i kad ne može nadjačati adut koji već nosi štih (podsijecanje) **(odluka 14)**. Ko nema ni boju ni adut, baca bilo šta. Kad štih nosi adut, a igrač ima traženu boju, prati boju bilo kojom kartom te boje.
4. **Mora se ići jače** kad se može, u boji i u adutu. Prijedlog: i kad štih nosi partner **(P-10)**. Alternativa (francuski belot): kad nosi partner, nije obavezno.
5. Štih nosi najjači adut, a bez aduta najjača karta tražene boje.
6. Ruka ima 8 štihova.

**Bodovanje ruke**

1. Svaki tim sabira bodove karata iz svojih štihova, +10 za zadnji štih, pa zvanja koja mu pripadaju i belu.
2. Tim koji je zvao mora imati **više od pola** svih bodova ruke (karte + sva bodovana zvanja). Inače **pada**: protivnik dobija sve bodove ruke, uključujući zvanja tima koji je zvao **(P-11)**.
3. **Jednako („visi")**: tim koji je zvao ne dobija ništa, protivnik dobija svoje, a bodovi tima koji je zvao prelaze na pobjednika sljedeće ruke (kod prolaza tim koji je zvao, kod pada protivnik). Ako i ta ruka visi, bodovi se sabiraju i čekaju dalje **(P-12, odluka 13)**. Alternativa: jednako = pad.
4. **Štiglja**: tim koji odnese svih 8 štihova dobija +90 **(P-13)**.
5. Bodovi se upisuju puni (ne dijeljeni sa 10) **(P-14)**.

**Kraj meča**

- Pobjeđuje prvi tim sa **1001** bodom **(P-16)**. Ako oba pređu u istoj ruci, pobjeđuje tim koji je zvao **(P-17)**.
- Quick Play: kraća partija **501**, cilj je 15–25 min (P-16, vidi „Trajanje").
- Belot (svih 8 karata u nizu) **ne dobija meč** u V1: vrijedi kao niz od 5+, 100 bodova. Parametar `belotWinsMatch` postoji, isključen **(P-15)**.

### Pravila za potvrdu

Svi prijedlozi su prihvaćeni 21.11.2026 **(odluka 7)**. Ispravke dolaze kasnije, iz feedbacka igrača: svaka postaje nova odluka i mijenja samo parametar u `BelaRulesConfig`, kao kod Rauba. Kolona „Potvrda" ostaje za te ispravke.

| # | Pravilo | Prijedlog | Alternativa | Potvrda |
| --- | --- | --- | --- | --- |
| P-1 | Smjer igre | Na desno, kao Žandar i Raub | Na lijevo | |
| P-2 | Dijeljenje | 6 vidljivih + 2 zatvorene po igraču | Svih 8 odmah (bez talona) | |
| P-3 | Svi kažu „Dalje" | Djelilac mora zvati (mus) | Novo dijeljenje | |
| P-4 | Krugovi zvanja | Jedan krug, prva boja pobjeđuje | Dva kruga | |
| P-5 | Red niza za zvanja | VII–VIII–IX–X–U–O–K–A | — | |
| P-6 | Kad se zvanja pokazuju | Prijava prije 1. štiha, karte se vide poslije 1. štiha | Odmah pri prijavi | |
| P-7 | Ko boduje zvanja | Samo tim s najjačim zvanjem, sva svoja | Oba tima sva svoja | |
| P-8 | Bela | 20, uvijek se boduje, prijava pri drugoj karti | Prijava na početku | |
| P-9 | Ko otvara prvi štih | Igrač desno od djelioca | Igrač koji je zvao | |
| P-10 | Ići jače kad štih nosi partner | Obavezno | Nije obavezno | |
| P-11 | Pad | Protivnik dobija sve, i zvanja tima koji je zvao | Protivnik dobija samo karte | |
| P-12 | Jednaki bodovi | „Visi", prelazi na sljedeću ruku | Jednako = pad | |
| P-13 | Štiglja | +90 | Bez bonusa | |
| P-14 | Upis bodova | Puni bodovi (162) | Podijeljeno sa 10 (16) | |
| P-15 | Belot (8 u nizu) | Nije u V1 | Pobjeda u meču / 1000 | |
| P-16 | Do koliko | Privatni sto 1001 (host bira 501/701/1001), Quick Play 501 | Svuda 1001 | |
| P-17 | Oba tima pređu cilj | Pobjeđuje tim koji je zvao | Tim s više bodova | |

## Tok meča i stanja

Dijeljenje (6 + 2 zatvorene) → zvanje aduta (jedan krug, djelilac mora) → talon odmah u ruku (8 karata) → štih 1, svako prijavljuje zvanje uz svoju kartu → pokazivanje zvanja → štihovi 2–8 (bela kad padne druga karta) → bodovanje (prolaz / pad / visi / štiglja) → pregled ruke, host pokreće sljedeću ruku → kraj meča kad tim pređe cilj.

- **Ulazak za sto:** Quick Play odmah smješta igrača za sto s 4 mjesta, a prazna mjesta dobijaju botove. Timovi u Quick Playu su nasumični.
- **Privatni sto:** timovi po redu ulaska, kao 4P Žandar: 1. i 3. protiv 2. i 4. **(odluka 15)**. Cilj 501, 701 ili 1001 (`targetScore`, bez polja 1001). Meč kreće sam kad se popune sva 4 mjesta. Prazna mjesta može popuniti samo izričito („Popuni prazna mjesta i počni").
- **Kraj ruke:** pregled stoji dok host ne pritisne „Sljedeća ruka →", kao Žandar i Raub.
- **Kraj meča:** Igraj ponovo / Revanš / Na početnu, kao Raub (odluka 7).

## UI i wireframe

Bela preuzima sto Rauba: mađarice, `.felt-stage`, `PlayerSeat`, prsten tajmera, `GameMenuSheet`, `TableSoundButton`, `ReactionFab`, `PauseAbandonOverlay`, ekran „Miješamo špil" i oznaku tima iz 4P Žandara. Novo je ono čega nema nigdje: ruka od 8 karata, zvanje aduta bojom, zvanja i rezultat dva tima kroz cijelu ruku.

**Šta se preuzima, a šta je novo**

| Element | Status | Napomena |
| --- | --- | --- |
| Sto, mjesta, avatari, podloge | Preuzima se | Partner gore, protivnici lijevo i desno; oznaka tima kao 4P Žandar |
| Karte (mađarice) | Preuzima se | Komplet iz Rauba, VII–A |
| Tajmer | Preuzima se | Prsten, 25 s (Raub odluka 10) |
| Meni, zvuk, reakcije, pauza, „Miješamo špil" | Preuzima se | Bez izmjena |
| **Ruka od 8 karata** | Novo | Dva reda po 4 **(odluka 8)**: karta 84×132 px, korak 68 px (red = 288 px), gornji red viri 64 px; neparan broj = gornji red kartu više. Sortirano po boji (adut prvi, u gornjem redu), dozvoljene karte podignute 12 px, nedozvoljene zatamnjene uz razlog. Tvoje sjedište se ne crta: potez i razlog su u traci iznad ruke (zeleni okvir kad si na redu) |
| **Zvanje aduta** | Novo | Četiri boje + „Dalje"; djeliocu kod musa „Dalje" ugašen i napomena „Moraš zvati" |
| **Talon** | Novo | 2 zatvorene karte ispred svakog igrača dok traje zvanje, pa let u ruku |
| **Prijava zvanja** | Novo | Uz prvu kartu (odluka 9): server prepozna zvanja (`myDeclarations`), iznad ruke stoji traka „Terca u žiru · 20" sa izborom Zovi 20 / Ne zovem, podrazumijevano Zovi, pa je dovoljno baciti kartu; poslije 1. štiha kratko se pokažu karte tima koji boduje |
| **Bela** | Novo | Oblačić „Bela!" iznad igrača kad baci drugu kartu |
| Oznaka aduta i ko je zvao | Novo | Znak boje stalno u uglu stola, uz ime/tim koji je zvao |
| **Rezultat** | Novo | Stalno vidljivo „Mi : Vi" za ruku (uživo) i za meč; puna tabela iz zaglavlja (kao Raub tabela) |
| Prostor štiha | Proširuje se | 4 karte ispred igrača, kao Raub |
| Kraj ruke | Novo | Mi / Vi: karte, zadnji štih, zvanja, bela, ukupno; jasno „Prolaz" / „Pad" / „Visi" / „Štiglja" |

**Brief za tablu `UI_Bela`** (portrait, 360×640 kao najmanji okvir, 390×844 kao glavni)

| Ekran | Stanje | Šta mora pokazati |
| --- | --- | --- |
| B1 | Dijeljenje | 6 karata u ruci, 2 zatvorene ispred svakog igrača, djelilac označen |
| B2 | Zvanje aduta, moj red | Panel 4 boje + Dalje iznad ruke; odgovori drugih iznad avatara |
| B3 | Zvanje aduta, mus | Djelilac: „Moraš zvati", bez Dalje |
| B4 | Uzimanje talona | Let 2 karte u ruku, ruka se preslaže na 8, adut prvi |
| B5 | Prijava zvanja uz prvu kartu | Traka sa zvanjem i izborom Zovi / Ne zovem iznad ruke, dok je igrač na redu u prvom štihu (odluka 9) |
| B6 | Štih u toku | 8 karata, zatamnjene karte uz razlog, adut i rezultat ruke vidljivi |
| B7 | Pokazivanje zvanja | Poslije 1. štiha: karte zvanja tima koji boduje, 2–3 s |
| B8 | Bela | Oblačić „Bela!" i +20 |
| B9 | Kraj ruke | Pregled Mi / Vi, prolaz ili pad, dugme hosta |
| B10 | Tabela | Ruke po redovima, Mi / Vi, cilj |
| B11 | Kraj meča | Pobjednički tim, Igraj ponovo / Revanš / Na početnu |
| B12 | 360×640 | B6 na najmanjem ekranu, sve bez skrola |

Bela je i u aplikaciji (odluka 5), pa tabla crta i okvir aplikacije: pun ekran bez traka, ali sa `safe-area-inset-top` u visini rupe kamere (S10e: 39 px). Taj okvir uzima visinu baš na 360×640.

Ruka: prvi nacrt je bio jedan red (karta 64 px, korak 38 px, 330 px) — vlasnik ga je ocijenio sitnim i izabrao dva reda po 4 sa kartom 84 px **(odluka 8)**. Poređenje je na tabli `UI_Bela2Reda`. Cijena: ruka je visoka 196 px, sto gubi ~85 px, a na 360×640 dno donjeg reda je 7 px od ivice — prva stvar za provjeru na uređaju.

## Botovi

Isti okvir kao Raub: bot odlučuje samo iz `BelaPlayerView`, igra samo dozvoljene poteze kroz istu validaciju i ne pokreće AFK (HARD RULE 2–4). Svi pragovi su u `DEFAULT_BELA_BOT_CONFIG` (HARD RULE 7).

- **Zvanje aduta:** procjena bodova i broja jakih adutskih karata za svaku boju (U i IX aduta su najvažniji), uz šum. Kod musa bira najbolju boju.
- **Zvanja:** prijavljuje uvijek.
- **Igra:** igra za tim, ali bez znanja o partnerovim kartama (vidi samo ono što vidi igrač na tom mjestu). Ne nadjačava partnera kad ne mora (ako P-10 = obavezno, pravilo to i tako određuje), „maže" bodove partneru kad partner sigurno nosi, i čuva U i IX aduta.
- **Tempo:** 2,5–7 s po potezu (Raub odluka 11); brže kad nijedan čovjek ne igra (ovdje nema „Ne idem", pa se to ne dešava).

Napomena: u timskoj igri bot je čovjekov partner. Loš bot-partner je razlog za izlazak, a ne loš protivnik, pa kvalitet igre bota ovdje vrijedi više nego u Raubu.

## Tehnička arhitektura

Isti okvir kao Poker i Raub, ništa novo u infrastrukturi:

- `GameId` + `"bela"`, `LobbyRoom.bela` (nikad `gameState`), motor u `packages/game-core/src/bela/` (čist, `rng` se ubrizgava, `crypto.randomInt` na serveru), sto u `apps/server/src/bela/table.ts`, socket `bela:action`, ekran `apps/web/components/bela/`, prikaz u `lib/belaView.ts`, preview `/dev/bela?s=…`.
- Faze ruke: `calling` → `tricks` (talon prelazi u ruku čim je adut zvan; zvanje putuje uz prvu kartu: akcija `play` nosi `declare`, bez polja = prijavi) **(odluka 9)**.
- Server šalje listu dozvoljenih karata i opcija (`myDeclarations` za zvanja), UI samo crta. Javno: `declaredPoints` odmah po bacanju, `shownDeclarations` poslije prvog štiha, samo za tim koji boduje.
- `"bela"` je u `GameId` / `GAME_PROTOCOL` od faze 3 (odluka 10). Server: `apps/server/src/bela/table.ts` (`BelaTables`), socket `bela:action`; `LobbyRoom.bela`, nikad `gameState`. Rok poteza `BELA_TURN_MS` (25 s), Quick Play prozor `BELA_MATCH_WINDOW_MS` (2 s).
- **Vidljivost:** igrač vidi svoje karte i odigrane karte. Ne vidi talon drugih, tuđe karte ni špil, ni na kraju ruke, osim karata zvanja koje se pokazuju po pravilu P-6.
- **Stari klijenti:** `games` / `auth.games` mora nositi `"bela"` (`GAME_PROTOCOL` `"bela:1"`), inače 426 `update_required`.
- **Prekidač izdanja `belaLive`:** staging i dev uključeno, produkcija tek uz `NEXT_PUBLIC_BELA=1`.
- **Snapshot:** cijelo stanje u `BelaGameState` (samo server), file-snapshot uz sobu. Promjena oblika mora tolerisati stari oblik.
- **Analitika:** `match_started` / `match_ended` sa `game: "bela"`, bez novih događaja u V1.
- **Simulacija:** `simulate:bela`, 10.000 mečeva: svaka ruka 8 štihova, 162 boda + zvanja, svaka karta na tačno jednom mjestu, 0 odbijenih akcija, trajanje u ciljanom rasponu.

## Edge caseovi

| Situacija | Ponašanje |
| --- | --- |
| Istekne tajmer u zvanju aduta | „Dalje"; djelilac kod musa: boja s najviše bodova u ruci |
| Istekne tajmer u prvom štihu | Najslabija dozvoljena karta, uz prijavu zvanja (zvanje se ne gubi zbog sporosti) |
| Istekne tajmer u štihu | Najslabija dozvoljena karta |
| Igrač izgubi vezu ili izađe | Pauza i glasanje kao Žandar/Raub. Bez partnera tim ne može dalje, pa „Završi" poništava meč bez plasmana |
| Oba tima imaju isto najjače zvanje | Red poređenja iz P-7 |
| Bela je i dio niza (K-O u terci aduta) | Boduje se i niz i bela |
| Tim koji je zvao padne, a ima zvanja | Po P-11 |
| Oba tima pređu cilj u istoj ruci | Po P-17 |
| Pad servera usred ruke | Obnova iz snapshota |
| Stari klijent otvori link za Bela sto | „Za ovu igru ažuriraj aplikaciju." |

## Metrike

| Metrika | Tip | Cilj | Izvor |
| --- | --- | --- | --- |
| Klik → prvo dijeljenje | Vodeća | < 4,5 s | Mjerenje u pregledaču, kao changelog 200 |
| Udio aktivnih koji odigraju ≥1 Bela meč u 7 dana | Vodeća | Postaviti posle 2 sedmice | PostHog `match_started` `game = bela` |
| Napuštanje meča prije kraja | Vodeća | < 15 % | `match_ended` `end_reason = abandoned` |
| Trajanje Quick Play meča (501) | Vodeća | 15–25 min | `match_ended`, simulacija prije izlaska |
| Prijave „pogrešno pravilo" | Vodeća | < 2 na 100 mečeva | Pošalji utisak + QA |
| Pad tima koji je zvao | Kontrolna | 15–30 % ruku (više znači da bot zove preagresivno) | Simulacija + server log |
| D7 povratak Bela igrača | Prateća | ≥ Raub u istom periodu | PostHog kohorta |

Analitika šalje samo produkcija (`docs/analytics.md`), pa se ciljevi čitaju tek posle izlaska na kartaonica.com.

## Faze i vremenski okvir

Nema tvrdog roka. Redoslijed je bitniji od datuma:

| Faza | Šta | Gotovo kad |
| --- | --- | --- |
| 0 — Pravila | Vlasnik potvrdi P-1…P-17, idealno uz 2–3 igrača koji igraju belu | Tabela „Pravila za potvrdu" popunjena, P-n postaju odluke |
| 1 — Wireframe | Tabla `UI_Bela` (B1–B12) na Claude Design platnu | Vlasnik odobri, posebno ruku od 8 karata na 360 px |
| 2 — Motor + bot + simulacija | `game-core/src/bela/`, testovi, `simulate:bela` | **Gotovo 21.11.2026** (`feat/bela-core`): game-core 515 testova (+57). 10.000 mečeva × 501 i × 1001: 0 grešaka karata, štihova i bodova, 0 odbijenih akcija. Medijan 5 ruku / 13,4 min (501), 9 ruku / 25,1 min (1001); pad 21,7 %, visi 0,8 %, štiglja 2,2 %, mus 15,6 %. Trajanje je model kao za Raub, ne mjerenje |
| 3 — Server | Sto, socket, snapshot, Quick Play, stari klijent | E2E socket, restart usred ruke |
| 4 — Web | `components/bela/`, `/dev/bela`, lobi (timovi, cilj) | **Urađeno 21.11.2026** (`feat/bela-table`): web 315 testova, `next build` i `build:mobile` prolaze; prava partija u headless Chromeu protiv lokalnog servera (sto za 2,1 s, 2 ruke, 0 grešaka u konzoli). **Nije provjereno na uređaju**, ni zatamnjenje nedozvoljenih karata (headless ga ne crta pouzdano) |
| 5 — Izdanje | Staging (web + staging APK) → uređaj → `NEXT_PUBLIC_BELA=1` na Vercelu i u `TARGETS.prod` (`build-mobile.mjs`) → novi AAB na Play, obavještenje prijavljenima | Odigrana prava partija na S10e, na webu i u aplikaciji |

Zavisnosti: tabla zavisi od pravila (P-2, P-6 i P-8 mijenjaju ekrane). Motor zavisi od pravila, ali ne i od table, pa faze 1 i 2 mogu teći paralelno kad je faza 0 gotova.

## Otvorena pitanja

| Pitanje | Ko odgovara | Blokira |
| --- | --- | --- |
| Da li Quick Play 501 nije prekratak za ljude koji znaju samo 1001? | Vlasnik, posle simulacije | Ne |
| Pravila pri prvoj partiji: da se „Kako se igra Bela" otvori sam jednom? | Dizajn | Ne |
| Brojanje u UI-ju: „Mi / Vi" ili imena timova? | Dizajn | Fazu 1 |

## Odluke

| # | Tema | Odluka | Zašto |
| --- | --- | --- | --- |
| 1 | Broj igrača u V1 | Samo 4 (2 na 2) | Vlasnik, 21.11.2026: klasična bela je timska; jedan raspored i jedna pravila do prve igre |
| 2 | Karte | Mađarice | Vlasnik, 21.11.2026; komplet već postoji iz Rauba |
| 3 | Pravila | Nacrt piše Claude, vlasnik potvrđuje P-n | Vlasnik, 21.11.2026: pravila ne zna pouzdano |
| 4 | Wireframe | Tabla `UI_Bela` na Claude Design platnu prije koda | Vlasnik, 21.11.2026: 8 karata u ruci je najveći rizik ekrana |
| 5 | Platforme | Web i aplikacija (Android), isti ekran, bez `isNative` grananja u Bela komponentama | Vlasnik, 21.11.2026; izuzetak od pravila „UI rad samo za web" (15.11.2026), isto kao Raub i Poker. U aplikaciju stiže tek novim AAB-om (sljedeći `versionCode` 14+) |
| 6 | Potražnja | Preko forme „Javi mi" 0 prijava (21.11.2026), igrači su pitali usmeno | Vlasnik. Odluka da se gradi ne zavisi od broja prijava. Kad Bela izađe, obavještenje ide i svima koji se prijave do tada |
| 7 | Pravila V1 | P-1…P-17 prihvaćena kako su predložena; ispravke kasnije, iz feedbacka igrača | Vlasnik, 21.11.2026: brže do igre, a pravila su parametri, pa ispravka ne traži prepravku logike |
| 8 | Ruka u dva reda | 8 karata u dva reda po 4, karta 84×132 px (umjesto jednog reda od 64 px); tvoje sjedište se ne crta, potez pokazuje traka iznad ruke | Vlasnik, 21.11.2026, poređenjem na tabli `UI_Bela2Reda`: karte u jednom redu su sitne |
| 9 | Zvanje uz prvu kartu | Nema posebnog koraka prijave: igrač prijavljuje zvanje kad baca svoju prvu kartu u prvom štihu (podrazumijevano „Zovi"). Nema ni posebnog koraka uzimanja talona: talon ide u ruku čim je adut zvan. Faze su samo `calling` i `tricks` | Prijedlog iz izrade motora, vlasnik prihvatio 21.11.2026: tako se radi za pravim stolom, a štedi četiri poteza sa tajmerom po ruci. Tabla B5 prepravljena |
| 10 | `"bela"` van `GameId` do servera | Tipovi i motor postoje, ali server Belu ne prihvata dok faza 3 ne doda `"bela"` u `GameId` / `GAME_PROTOCOL` | `parseGameId` bi je odmah prihvatio i server bi pravio Bela sobe bez stola |
| 11 | Karta u dva zvanja | Ista karta smije biti i u nizu i u četiri iste; broje se oba | Spec nije rekao; tako se uobičajeno igra |
| 12 | Dužina niza u poređenju | Između vrijednosti i više karte poredi se dužina niza: niz od 6 pobjeđuje niz od 5, iako oba vrijede 100 | Spec nije rekao; dopuna P-7 |
| 13 | Visi više puta zaredom | Bodovi koji vise idu pobjedniku sljedeće ruke; ako i ona visi, sabiraju se i čekaju dalje | Dopuna P-12 |
| 14 | Podsijecanje | Ko nema boju mora baciti adut i kad ne može nadjačati; kad štih nosi adut, boja se prati bilo kojom kartom te boje | Dopuna P-10, uobičajeno pravilo |
| 15 | Timovi u privatnom stolu | Po redu ulaska: mjesta 0 i 2 protiv 1 i 3 (`seatIndex % 2`), isto kao 4P Žandar. Izbor timova dolazi kasnije, uz ekran | Vlasnik, 21.11.2026: Žandar sa 4 igrača takav izbor nema; spec ga je tražio |
| 16 | Beta | Bela nosi oznaku „BETA" uz ime na svim karticama igara (web i aplikacija) i u meniju stola. Na prvoj Bela partiji na uređaju iskače prozor „Bela je u beta fazi" koji POKAZUJE dugme za prijavu greške i gdje stoji — samo „Razumijem", bez prijave odmah (vlasnik, 21.11.2026: na prvom ekranu nema šta da se prijavi). Jednom po uređaju, `kartaonica:bela:beta-seen`. Prozor iskače PRIJE ulaska za sto (Igraj, Napravi sto, poziv prijatelja, link pozivnice — `useBelaBetaGate`), jer server pokreće partiju čim igrač sjedne; na stolu ga nema | Vlasnik, 21.11.2026: igra još nije provjerena sa pravim igračima; prijave trebaju odmah |
| 17 | Prijava greške sa stola | Okruglo dugme sa bubom desno iznad ruke i red „Prijavi grešku" u meniju otvaraju postojeću formu „Pošalji utisak" kao sloj preko stola (partija teče). Uz prijavu ide red o partiji (`context`: sto, ruka, faza, verzija stanja, adut — bez karata); server ga čuva, šalje u mejlu i izvozi u CSV | Vlasnik, 21.11.2026. Forma je ista kao `/utisak` (bez nove rute ni novog servisa) |
| 18 | Bez zvuka na Bela stolu | Dugme za zvuk nije na Bela stolu; na njegovom mjestu je dugme za grešku. Zvuk ostaje u meniju (pločica „Zvuk"). Ostali stolovi se ne mijenjaju | Vlasnik, 21.11.2026 |
| 19 | Brza igra do 501 ili 1001 | Igrač bira u Profil → Moje igre → Bela (podrazumijevano 501, `lib/belaTarget.ts`). Klijent šalje `belaTarget` na `/api/quickplay`; server (`parseBelaQuickTarget`) prima 501 ili 1001, sve drugo → 501, i spaja samo igrače istog izbora. `belaTargetFor` za javni sto čita `rulesConfig.targetScore` (1001 → 1001, inače 501, pa hidrirani stolovi ostaju na 501). Privatni sto i dalje 501 / 701 / 1001 | Vlasnik, 27.11.2026 (paket 1.5.2) |
