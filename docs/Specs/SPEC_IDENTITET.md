# Kartaonica — Identitet i prijatelji · Specifikacija v1

> Izvor: wireframe „Kartaonica · identitet — wireframe, faza 1" (Claude Design platno, https://claude.ai/artifact/1DkTrJNEv2148shhQUC3de).
> Oznake ekrana (A1, K3, F6…) su iste kao na platnu, pa se svaka stavka ovdje može naći na slici.
> Vizuelni dizajn (faza 2) još ne postoji: ovaj dokument definiše **strukturu, ponašanje i tekst**. Boje, razmaci i tipografija dolaze isključivo iz `docs/DESIGN_SYSTEM.md` / `globals.css`.
> Jezik interfejsa: ijekavica, obraćanje na „ti", kratko i toplo, **rodno neutralno** (bez „siguran si", „zaboravio si", „odigrao si").
> Prethodna verzija zahtjeva (širi opseg: blokiranje, prijave, Nedavni protivnici, link profila, mjerenje): `docs/Specs/player-profile-v1.md`.

---

## 1. Opseg

**U opsegu**
- Donja navigacija (Igraj · Prijatelji · Profil).
- Profil gosta, registracija i prijava (Google, e-mail), zaboravljena lozinka, potvrda e-maila.
- Izbor nadimka i avatara, Moj profil, promjena nadimka i avatara.
- Tuđi profil, kartica igrača bez naloga.
- Odjava, brisanje naloga.
- Avatar za stolom i u sobi.
- Prijatelji: lista, dodavanje (zahtjev → prihvatanje), uklanjanje, poziv na partiju.
- Blokiraj i prijavi na tuđem profilu (§6.9).
- Push obavještenja za zahtjev za prijateljstvo i poziv na partiju.

**Van opsega (za sad)**
- Status „na mreži" / „posljednji put viđen" kod prijatelja.
- Poziv na nalog poslije partije („Sačuvaj ovih 12 partija").
- Promjena postojećih ekrana koji kažu „Ime za stolom" (`/ime`, `/igraj`, Postavke).
- Upload fotografije za avatar.

---

## 2. Pravila koja važe svuda

| # | Pravilo |
|---|---|
| G1 | **Prvo pokretanje vodi pravo u igru** (Igraj ili soba iz linka). Registracija nikad nije uslov za igru i nikad se ne otvara sama. |
| G2 | **Riječi „bot", „računar", „AI" ili bilo kakav nagovještaj da igrač nije čovjek ne pojavljuju se nigdje.** Klijent ne prima `isBot` (postojeće pravilo, `lib/antiLeak.ts`). |
| G3 | **Svi igrači bez naloga izgledaju isto**: slovo nadimka u krugu (kao danas), bez akcija. Botovi se prikazuju kao gosti. |
| G4 | **E-mail i način prijave nikad nisu vidljivi drugim igračima.** Ne idu u `PublicPlayer` ni u odgovor za tuđi profil. |
| G5 | Nema novca, uloga ni kupovine nigdje u ovim ekranima. |
| G6 | Dodirne mete najmanje 44 px. Animacije samo `transform` i `opacity`. |
| G7 | Telefon: 360×740 primarno, provjera 390×844 (tabla „Provjera 390×844"). Android u punom ekranu: gornjih 39 px (rupa kamere) se ne koristi, dole nema sistemske trake. Desktop: centrirana kolona do 600 px. |
| G8 | Svi sporedni izbori i potvrde su **listovi odozdo** (ista površina kao Postavke i Meni stola: ručka, naslov, Zatvori/Odustani na dnu). Forme s tastaturom su puni ekrani (kao `/ime`), polje i dugme pri vrhu da ostanu iznad tastature. |

---

## 3. Pojmovi i podaci

| Pojam | Definicija |
|---|---|
| **Gost** | Igrač bez naloga. Tehnički: Firebase anonimni nalog. Ima privremeni nadimak (današnje „ime za stolom"), nema avatar, nema prijatelje. |
| **Nalog** | Gost koji je povezao Google ili e-mail i lozinku. Isti `uid` kao gost, pa **partije odigrane kao gost prelaze na nalog**. |
| **Nadimak** | Jedinstven u cijeloj aplikaciji. 3–16 znakova: slova (uključujući č, ć, ž, š, đ), brojevi, `_` i `.`, bez razmaka. Poređenje jedinstvenosti bez obzira na velika/mala slova. Mijenja se najviše jednom u 30 dana. U UI se zove **nadimak**. **Igrač s nalogom sjeda za sto pod nadimkom** („Pod ovim imenom te vide za stolom."). |
| **Avatar** | Jedan od 10 ponuđenih (A1–A10). Svi igrači vide svih 10 (pol igrača ne znamo, ništa se ne filtrira). Set: stilizovane životinje, čitljive u krugu od 40 px. Id-jevi u kodu, redom A1–A10: `lisica`, `sova`, `jez`, `medvjed`, `zec`, `macka`, `jelen`, `pijetao`, `zaba`, `ovan` (crteži u `apps/web/public/avatars/`). |
| **Broj završenih partija** | Broj partija koje je igrač odigrao do kraja (`match_ended` s `end_reason: completed`). Prikazuje se na profilu. |
| **Prijatelj** | Obostrana veza: nastaje kad drugi igrač prihvati zahtjev. Samo između dva naloga. |

**Množina brojeva** (sve brojke u tekstu): 1 završena partija · 2–4 završene partije · 5+ završenih partija (21 završena partija itd.).

---

## 4. Navigacija (tabla „1 · Donja navigacija")

- **N1**: tri taba, **Igraj**, **Prijatelji**, **Profil**. Ikona + tekst ispod, visina 64 px, cijeli tab je meta.
- Vidljiva gostu i prijavljenom igraču.
- **Vidi se samo na tri glavna ekrana.** Ne vidi se: u partiji, u sobi (lobi), na matchingu, u koracima registracije, prijave i brisanja, na `/igraj`, `/ime`, `/create`.
- Tab Prijatelji nosi broj zahtjeva za prijateljstvo koji čekaju (D4). Bez broja kad je 0.
- Desktop: traka je na dnu kolone od 600 px.

---

## 5. Tokovi

### Tok a — Gost se registruje e-mailom (A1–A8)

1. **A1 Igraj** → dodir na tab Profil.
2. **A2 Profil gosta**: slovo u krugu, nadimak, „Gost · 12 završenih partija"; „Uz nalog:" + 4 stavke; dugmad **Registruj se**, **Prijavi se**, link **Nazad na igru** (vodi na tab Igraj).
3. **A3 List „Registruj se"**: „Partije odigrane kao gost prelaze na nalog." · **Nastavi s Googleom** · **Nastavi s e-mailom** · Odustani.
4. **A4 Registracija e-mailom** (Korak 1 od 3): naslov „Registruj se e-mailom"; E-mail, Lozinka (dugme za prikaz lozinke, „Najmanje 8 znakova."), **Napravi nalog**, ispod njega „Pravljenjem naloga prihvataš politiku privatnosti." (link na `/privatnost`; isti red i na listu A3), „Već imaš nalog? Prijavi se". **Nalog nastaje ovdje** (povezivanje e-maila s anonimnim nalogom) i šalje se e-mail za potvrdu.
5. **A5 Nadimak** (Korak 2 od 3): naslov „Izaberi nadimak", podnaslov „Pod ovim imenom te vide za stolom."; polje unaprijed popunjeno nadimkom gosta; checkbox „Prihvatam uslove korišćenja" (link na `/uslovi`); **Dalje** aktivno tek kad je nadimak slobodan i checkbox označen.
6. **A6 Avatar** (Korak 3 od 3): naslov „Izaberi avatar", podnaslov „Vidi se za stolom, pored nadimka."; veliki prikaz izabranog (120 px) + nadimak, mreža 5×2, jedan je unaprijed izabran nasumično; **Gotovo**.
7. **A7** Moj profil + list „Provjeri e-mail" (samo za e-mail registraciju; Google e-mail je već potvrđen, pa tok ide pravo na A8): „Poslali smo ti link na **adresa**. Dodirni ga da potvrdiš e-mail." · „Nema ga? Pogledaj i u neželjenoj pošti." · **U redu** · Pošalji ponovo.
8. **A8 Moj profil** s trakom „E-mail nije potvrđen. · Pošalji ponovo" dok e-mail ne bude potvrđen.

Grananja:
- Google umjesto e-maila → sistemski izbor Google naloga → A5. Ako taj Google nalog već ima profil → upozorenje (tok b, B4).
- E-mail koji već ima nalog → upozorenje R6 (vidi §6.3).
- Igrač izađe prije nadimka → nalog postoji bez nadimka (**nedovršen**, Q10); sljedeći ulazak u Profil vraća na A5. Nedovršen nalog igra normalno i skuplja partije, ali nema javni profil i nije u pretrazi. Ne briše se.

**Kriterijumi prihvatanja**
- [ ] Gost sa 12 završenih partija poslije registracije vidi 12 na profilu.
- [ ] Nijedan korak ne blokira igru; tab Igraj radi u svakom trenutku osim usred koraka 1–3 (gdje je traka skrivena, ali Android nazad radi).
- [ ] Nepotvrđen e-mail ne ograničava ništa osim što traka stoji na profilu.

### Tok b — Gost se prijavljuje Googleom na postojeći nalog (B1–B5)

1. **B1** Profil gosta → **Prijavi se**.
2. **B2** List „Prijavi se": **Nastavi s Googleom** · Nastavi s e-mailom (→ R1) · Odustani.
3. **B3** Sistemski izbor Google naloga (ne crtamo ga, izgled daje Google/Android).
4. **B4 Upozorenje** (list): „Ovaj nalog već postoji" · „Ako se prijaviš, gubiš rezultate odigrane kao gost na ovom uređaju: **12 završenih partija**." · **Prijavi se** · Odustani.
5. **B5** Moj profil postojećeg naloga (njegov nadimak, avatar, broj partija).

Pravila:
- Odustani na B4 → nazad na B1, igrač ostaje gost, ništa se ne mijenja.
- Gost bez završenih partija **ne vidi upozorenje**: B3 vodi pravo na B5.
- Google nalog bez profila → nastavlja se kao registracija (A5).

**Kriterijumi prihvatanja**
- [ ] Upozorenje prikazuje tačan broj partija koje se gube.
- [ ] Poslije prijave, gostujuće partije na ovom uređaju se ne pripisuju postojećem nalogu.

### Tok c — Prijavljen igrač briše nalog (C1–C6)

1. **C1** Moj profil → **Obriši nalog** (tekstualno dugme na dnu).
2. **C2 Korak 1 od 3 — šta se briše**: naslov „Obriši nalog"; „Brisanjem nestaje:" nadimak i avatar · N završenih partija i svi rezultati · prijava na svim uređajima. „**Ovo se ne može vratiti.** Igrati možeš i dalje, kao gost." · **Nastavi** · Odustani.
3. **C3 Korak 2 od 3 — „Potvrdi da si to ti"**, e-mail nalog: „Upiši lozinku za **adresa**.", Lozinka, Zaboravljena lozinka?, **Potvrdi** · Odustani.
   **C6** — ista stvar za Google nalog: „Prijavi se ponovo istim Google nalogom." · **Nastavi s Googleom** · Odustani; uspjeh vodi na C4.
4. **C4 Korak 3 od 3**: „Obrisati nalog zauvijek?" · kartica (avatar, nadimak, broj partija) · „Nalog i rezultati brišu se odmah i ne mogu se vratiti." · **Obriši nalog** · Odustani.
5. **C5**: „Nalog je obrisan" · „Hvala na partijama. Igrati možeš i dalje, kao gost." · **Igraj Žandar** (početna, igrač je novi gost).

**Kriterijumi prihvatanja**
- [ ] Odustani na bilo kom koraku vraća na profil i ništa se ne briše.
- [ ] Bez uspješne ponovne prijave u C3/C6 nema brisanja.
- [ ] Poslije brisanja nalog, nadimak, avatar, rezultati, prijateljstva i push registracije tog naloga više ne postoje.

### Tok d — Dodavanje prijatelja (D1–D5)

1. **D1** Prijatelji, prazno: „Još nemaš prijatelja" · „Dodaj ih po nadimku, ili dodirni igrača za stolom pa Dodaj za prijatelja." · **Dodaj prijatelja**.
2. **D2 Dodaj prijatelja**: „Upiši nadimak igrača. Dobiće zahtjev i odlučiti da li prihvata."; pretraga po nadimku, ispod polja „Najmanje 3 slova.". Red rezultata: avatar, nadimak, **Dodaj** · ili „Zahtjev poslat" · ili „Već ste prijatelji".
3. **D3** Poslije Dodaj: red pokazuje „Zahtjev poslat". **Drugi igrač dobija push** (§8).
4. **D4** Kod drugog igrača: broj na tabu Prijatelji; sekcija „Zahtjevi za prijateljstvo (N)" s **Prihvati** · Odbij.
5. **D5** Prihvaćeno: igrač je u listi; poruka „Zvonko je sada tvoj prijatelj."

Drugi ulaz: tuđi profil (za stolom ili u sobi) → **Dodaj za prijatelja** (F2).

Pravila:
- Odbij i uklanjanje su **tihi**: drugi igrač ne dobija obavještenje.
- Ako oba igrača pošalju zahtjev jedan drugom, prijateljstvo nastaje odmah.
- Igrač bez naloga se ne može dodati i ne može dodavati.

### Tok e — Poziv prijatelja na partiju (E1–E5)

1. **E1** Lista prijatelja → **Pozovi** pored prijatelja.
2. **E2 List „Pozovi na partiju"**: „Broj igrača · igra se do" (2/4 i 11/21, pamte zadnji izbor); lista prijatelja s checkboxom, dodirnuti već označen; **Pošalji poziv (N)** · Odustani.
3. **E3** Pravi se privatna soba; host je u sobi. Pozvani su u listi igrača kao „Poziv poslat · čeka se odgovor". Link sobe i dalje radi. Iz sobe: **Pozovi iz prijatelja** otvara isti list bez izbora broja igrača.
4. **E4** Pozvani dobija **push** (§8); ako je u aplikaciji na glavnom ekranu, dobija list: „Zvonko te zove na partiju" · „Žandar · 4 igrača · do 21" · **Pridruži se** · Ne sada.
5. **E5** Pridruži se → pravo u sobu, **bez odobrenja hosta**; pozvani vidi postojeći lobi („Čeka se da host pokrene igru…").

Stanja:
- Poziv više ne važi (F7): „Poziv više ne važi" · „Partija je već počela ili je soba zatvorena." · U redu.
- Ne sada samo zatvara list; poziv ostaje važeći dok ne istekne (§11).

---

## 6. Ekrani i stanja

### 6.1 Profil gosta (A2) — table „2·7·8" i „Učitavanje i greška"
| Stanje | Ponašanje |
|---|---|
| Osnovno | Kartica (slovo, nadimak, „Gost · N završenih partija"), „Uz nalog:" — Rezultati ostaju sačuvani · Nadimak je samo tvoj · Isti nalog na svakom uređaju · Možeš dodavati prijatelje; Registruj se · Prijavi se · Nazad na igru. |
| **G1** Učitavanje | Skeleton samo u kartici; dugmad rade odmah. |
| **G2** Greška | U kartici: nadimak + „Broj partija se nije učitao." + **Pokušaj ponovo**. Ostatak ekrana radi. |

### 6.2 Moj profil (P1–P8, A8) — tabla „7"
Sadržaj (**P1**): naslov „Profil" · avatar 120 px · nadimak · „N završenih partija" · red **Nadimak / Promijeni** · red **Avatar / Promijeni** · **Postavke** (otvara postojeći list Postavke) · **Odjavi se** · na dnu tekstualno **Obriši nalog**.

| Stanje | Ponašanje |
|---|---|
| **P2** Nadimak zaključan | Umjesto „Promijeni": katanac + „Opet od 9. novembra" (datum = zadnja promjena + 30 dana). |
| **P3** E-mail nije potvrđen | Traka ispod naslova: „E-mail nije potvrđen." · Pošalji ponovo. Nestaje kad se e-mail potvrdi. |
| **P4** Čuvanje nije uspjelo | Poruka dole: „Avatar nije sačuvan. Ostaje stari." · Pokušaj ponovo. Profil pokazuje **staru** vrijednost. |
| **P5** Promijeni nadimak | Puni ekran „Promijeni nadimak", „Pod ovim imenom te vide za stolom.", isto polje i stanja kao §6.4, bez checkboxa; „Poslije promjene, sljedeća je moguća za 30 dana."; **Sačuvaj**. |
| **P6** Promijeni avatar | List „Promijeni avatar": mreža 5×2, **Sačuvaj** · Odustani. Bez ograničenja učestalosti. |
| **P7** Učitavanje | Skeleton cijelog profila; traka vidljiva. |
| **P8** Greška | „Profil se nije učitao." · „Provjeri internet vezu i pokušaj ponovo." · **Pokušaj ponovo**. |

### 6.3 Prijava e-mailom i greške — tabla „3"
| Ekran | Tekst i ponašanje |
|---|---|
| R1 Prijava e-mailom | Naslov „Prijavi se e-mailom"; E-mail, Lozinka, „Zaboravljena lozinka?", **Prijavi se**, „Nemaš nalog? Registruj se". |
| R2 Zaboravljena lozinka | „Upiši e-mail naloga. Poslaćemo ti link za novu lozinku." · **Pošalji link**. |
| R3 Link poslat | Naslov „Provjeri e-mail"; „Ako **adresa** ima nalog, stići će link za novu lozinku." · „Nema ga? Pogledaj i u neželjenoj pošti." · Pošalji ponovo (tek nakon 60 s) · Nazad na prijavu. Ne otkriva da li nalog postoji. |
| R4 Pogrešni podaci | „E-mail ili lozinka nisu tačni." uz link „Zaboravljena lozinka?". Ne kaže koje polje je pogrešno. |
| R5 Greške registracije | „Ovo ne liči na e-mail adresu." · „Prekratka je. Najmanje 8 znakova." |
| R6 E-mail već ima nalog | List (javlja se poslije Napravi nalog u A4): „Ovaj e-mail već ima nalog" + isti tekst o gubitku partija kao B4 · **Prijavi se** (→ R7) · Odustani (nazad na formu). |
| R7 Prijava, e-mail već upisan | R1 sa e-mailom iz A4 već upisanim u polje; fokus na lozinci. |

### 6.4 Nadimak — stanja (K1–K7) — tabla „4"
| Stanje | Poruka ispod polja | Dalje |
|---|---|---|
| K1 Provjeravam | „Provjeravam…" (kreće 0,5 s poslije zadnjeg slova) | ugašeno |
| K2 Slobodan | „Slobodan je." | aktivno (uz checkbox) |
| K3 Zauzet | „Zauzet je. Možda neki od ovih:" + 3 slobodna prijedloga; dodir upisuje prijedlog | ugašeno |
| K4 Prekratak | „Prekratak je. Najmanje 3 znaka." | ugašeno |
| K5 Nedozvoljen znak | „Razmak nije dozvoljen." (za drugi znak: „Znak @ nije dozvoljen.") | ugašeno |
| K6 Neprimjeren | „Ovaj nadimak nije dozvoljen. Izaberi drugi." Bez objašnjenja; isti tekst za psovke, uvrede i lažno predstavljanje | ugašeno |
| K7 Ime gosta krši pravila | Polje stiže ispravljeno: ćirilica preslovljena u latinicu, razmak → `_`, ostali nedozvoljeni znakovi izbačeni, skraćeno na 16. Poruka: „Razmak iz imena smo zamijenili donjom crtom." · za ćirilicu „Ime smo prepisali latinicom." · ako je ostalo kraće od 3 znaka, polje je prazno i važi K4 | po provjeri |

Ispod poruke uvijek: „3–16 znakova: slova, brojevi, _ i tačka. Bez razmaka."

### 6.5 Tuđi profil i kartica gosta (T1–T5, F2–F6) — table „8·9" i „Prijatelji — stanja"
- Otvara se dodirom na avatar za stolom (**T1**) ili na red igrača u sobi (**T2**). List: avatar 120 px, nadimak, „N završenih partija", akcije, Zatvori.
- Nikad: e-mail, način prijave.
- Akcije po odnosu:

| Odnos | Red ispod nadimka | Glavna radnja | Sporedna |
|---|---|---|---|
| F2 Nije prijatelj | — | **Dodaj za prijatelja** | Blokiraj ili prijavi |
| F3 Zahtjev poslat | — | „Zahtjev je poslat" (ugašeno) | Povuci zahtjev · Blokiraj ili prijavi |
| F4 Dolazni zahtjev | „Želi da budete prijatelji" | **Prihvati zahtjev** | Odbij · Blokiraj ili prijavi |
| F5 Prijatelj | „Prijatelji ste" | **Pozovi na partiju** | Ukloni iz prijatelja → potvrda F6 · Blokiraj ili prijavi |
| Blokiran | „Blokiran" | **Odblokiraj** | — |

„Blokiraj ili prijavi" je uvijek **druga** sporedna akcija, tekstualno dugme ispod prve (mjesto koje platno rezerviše na F2 i T1). Otvara list iz §6.9.

- F6 Ukloni: „Ukloniti **nadimak** iz prijatelja?" · „Neće dobiti obavještenje. Kasnije možeš ponovo poslati zahtjev." · **Ukloni** · Odustani.
- **T4** Učitavanje i **T5** greška: list iste visine u svim stanjima; greška „Profil se nije učitao." · Pokušaj ponovo · Zatvori.
- **Igrač bez naloga** (T3): mali oblačić uz sjedište, samo slovo i nadimak, bez akcija i linka; zatvara se dodirom bilo gdje. Isto za sve goste (G3).

### 6.6 Prijatelji — tab
| Stanje | Ponašanje |
|---|---|
| F1 Gost | Naslov „Prijatelji"; „Prijatelji su za igrače s nalogom" · „Napravi nalog, dodaj svoje društvo i zovi ih na partiju jednim dodirom." · Registruj se · Prijavi se. |
| D1 Prazno | vidi tok d. |
| Lista | Naslov + **Dodaj**; sekcija zahtjeva (ako postoje); „Prijatelji (N)" po abecedi: avatar, nadimak, **Pozovi**. Dodir na red otvara tuđi profil. **Bez statusa na mreži.** |
| F8 Učitavanje | Skeleton redova. |
| F9 Greška | „Prijatelji se nisu učitali." · „Provjeri internet vezu i pokušaj ponovo." · **Pokušaj ponovo**. |

### 6.7 Odjava (O1) — tabla „10"
List: „Odjaviti se?" · „Na ovom uređaju igraćeš kao gost dok se ponovo ne prijaviš. Nalog i rezultati ostaju sačuvani." · **Odjavi se** · Odustani. Usred partije odjava nije moguća (traka se u partiji ne prikazuje).

### 6.8 Avatar za stolom i u sobi (S1–S3) — tabla „12"
- **S1** sto 2 igrača, **S2** sto 4 igrača (igrač bez naloga ostaje na slovu), **S3** soba (lobi); dodir na red igrača u sobi otvara profil (T2).
- Raspored stola se ne mijenja (`GameScreen`); mijenja se samo sadržaj kruga sjedišta.
- Igrač s nalogom: avatar **unutar** postojećeg prstena (4 px od ivice); prsten i dalje nosi tim (boja tima) i potez (zlatni prsten i sjaj).
- Igrač bez naloga: slovo, kao danas.
- Veličine: 56 ti · 52 ostali · 44 nizak ekran · soba 40 (danas 36 → povećati na 40).

### 6.9 Blokiraj i prijavi (Q5) — nije nacrtano
- **List „Blokiraj ili prijavi"** (sa tuđeg profila igrača s nalogom): naslov **nadimak** · **Blokiraj** · **Prijavi nadimak ili ponašanje** · Odustani.
- **Blokiraj** → potvrda: „Blokirati **nadimak**?" · „Više vam se neće slati zahtjevi ni pozivi, a prijateljstvo se prekida. Neće dobiti obavještenje." · **Blokiraj** · Odustani.
  - Briše prijateljstvo, zahtjeve i pozive između dva naloga u oba smjera; novi nisu mogući dok blokada traje.
  - Blokirani ne vidi blokatora u pretrazi (D2) i obrnuto.
  - Ne prekida započetu partiju; Quick Play ne garantuje razdvajanje.
  - Odblokiranje je na tuđem profilu (red „Blokiran" u §6.5) i ne vraća prijateljstvo.
  - Tiho: drugi igrač ne dobija obavještenje.
- **Prijavi** → list s razlogom (jedan izbor): Uvredljiv nadimak · Lažno predstavljanje · Uznemiravanje · Drugo; **Pošalji prijavu** · Odustani. Poslije: „Hvala. Pogledaćemo prijavu." Prijava se upisuje (ko, koga, razlog, vrijeme, nadimak u tom trenutku) i šalje e-mail vlasniku igre. Pregled je ručni: nadimak se preimenuje u neutralan (npr. `Igrac4821`) ili se nalog suspenduje. V1 nema admin ekran.
- Igrač bez naloga (T3) nema ove akcije; ostaje mu Meni stola kao danas.

---

## 7. Server i podaci (šta backend mora da obezbijedi)

| Oblast | Zahtjev |
|---|---|
| Identitet | Firebase Auth; gost = anonimni nalog; povezivanje Google/e-mail na isti `uid` (`linkWithCredential`). Konflikt (`credential-already-in-use`, `email-already-in-use`) → klijent prikazuje B4/R6; tek na Prijavi se ide prijava na postojeći nalog. |
| Nadimak | Jedinstven (case-insensitive), validacija pravila iz §3 i na serveru; filter neprimjerenih (postojeća blocklista iz generatora imena, §39 PRD, uključujući nacionalističke i etničke uvrede); zaključavanje 30 dana; endpoint za provjeru dostupnosti + 3 prijedloga. |
| Profil | Javni podaci: nadimak, avatar, broj završenih partija, `hasAccount`. Nikad e-mail ni provider. |
| Sjedište | `PublicPlayer` dobija `avatar` samo za naloge; gosti i botovi šalju isto (slovo). |
| Brisanje | Ponovna autentifikacija obavezna; briše nalog, profil, rezultate, prijateljstva, zahtjeve, pozive i push registracije naloga. |
| Prijatelji | Zahtjev (od, ka, vrijeme), prihvatanje, odbijanje, povlačenje, uklanjanje; obostrani zahtjev = automatsko prijateljstvo. |
| Pozivi | Poziv vezan za sobu i pozvanog; pozvani ulazi bez odobrenja hosta; poziv prestaje da važi kad partija počne, soba se zatvori ili popuni, a najkasnije poslije 30 minuta (Q1). |
| Skladište | Firestore, samo sa servera (Q6). Rezultati se upisuju idempotentno po (partija, `uid`): ponovljena dostava ili reconnect ne broje partiju dvaput. |
| Blokade i prijave | Blokada (ko, koga, vrijeme) provjerava se pri svakom zahtjevu, pozivu i pretrazi. Prijava se upisuje i šalje e-mail vlasniku (§6.9). |
| Nedovršeni nalozi | Ostaju (Q10); bez javnog lica dok ne izaberu nadimak. Napušten gost (T6) se briše: `POST /api/me/abandon`. |

---

## 8. Push obavještenja (NOVO)

Koristi postojeću push infrastrukturu (`apps/server/src/push/`, FCM HTTP v1, `NativePush`). Šalje se samo igračima **s nalogom**; push registracija uređaja se veže za nalog (uz postojeći `pushId`), pa obavještenje stiže na sve uređaje na kojima je igrač prijavljen.

| Događaj | Prima | Naslov | Tekst | Dodir vodi na |
|---|---|---|---|---|
| Zahtjev za prijateljstvo | igrač kome je zahtjev poslat | „**Zvonko** želi da budete prijatelji" | „Otvori Prijatelje da prihvatiš." | tab Prijatelji, sekcija zahtjeva |
| Poziv na partiju | svaki pozvani prijatelj | „**Zvonko** te zove na partiju" | „Žandar · 4 igrača · do 21. Dodirni da sjedneš za sto." | pravo u sobu (kao Pridruži se); ako poziv više ne važi → F7 |

Pravila:
- **Aplikacija u prvom planu:** umjesto sistemskog push-a prikazuje se UI u aplikaciji — za poziv list E4 (na glavnim ekranima; u partiji se čuva dok partija ne završi), za zahtjev samo broj na tabu Prijatelji.
- **Rok trajanja poziva (TTL):** push za poziv nosi isti rok kao poziv (§11), pa ne stiže kad više ne važi. Zahtjev za prijateljstvo nema rok.
- **Bez dupliranja:** jedan push po zahtjevu i po pozivu; ponovno slanje istom igraču u roku od 1 minute se ignoriše.
- **Bez obavještenja za:** odbijen zahtjev, uklanjanje iz prijatelja, povučen zahtjev.
- **Android kanal:** poziv ide u postojeći kanal „Sto i pozivi"; zahtjevi za prijateljstvo u novi kanal „Prijatelji" (da se mogu isključiti odvojeno).
- **Dozvola za obavještenja:** postojeći blagi upit (`PushPrompt`) traži se u trenutku kad ima smisla — prvi put kad igrač pošalje zahtjev za prijateljstvo ili poziv, i prvi put kad otvori tab Prijatelji s nalogom. „Ne sada" = 7 dana, kao danas.
- **Isključivanje:** postojeća preklopka u Postavkama gasi oba tipa.
- Tekst samih obavještenja živi na serveru (`push/messages.ts`), kao postojeća tri.

**Kriterijumi prihvatanja**
- [ ] Igrač van aplikacije dobija push za novi zahtjev; dodir otvara tab Prijatelji sa zahtjevom.
- [ ] Igrač van aplikacije dobija push za poziv; dodir ga stavlja u sobu bez odobrenja hosta.
- [ ] Push za istekao poziv ne stiže; ako stigne pa se dodirne poslije isteka, prikazuje se F7.
- [ ] Gost i bot nikad ne dobijaju niti pokreću ova obavještenja.

---

## 9. Kriterijumi prihvatanja — opšti

- [ ] Prvo pokretanje i link pozivnice nikad ne prolaze kroz registraciju.
- [ ] Nigdje u UI ni u tekstu obavještenja nema riječi bot/računar/AI.
- [ ] Odgovor za tuđi profil (API) ne sadrži e-mail ni provider (provjera testom, kao `antiLeak`).
- [ ] Svi ekrani rade na 360×740 i 390×844 bez horizontalnog skrolanja; dugme glavne radnje vidljivo iznad tastature na formama.
- [ ] Sve mete ≥ 44 px; svaki ekran radi na desktopu u koloni do 600 px.
- [ ] Svi tekstovi iz ovog dokumenta su u `lib/sr.ts`, bez hardkodiranog teksta u komponentama.

---

## 10. Redoslijed izrade (predlog)

1. Firebase Auth: gost kao anonimni nalog, bez promjene UI-ja.
1b. Firestore skladište (Q6) + brojač završenih partija po `uid`-u; bez toga Profil gosta nema broj.
2. Donja navigacija + Profil gosta.
3. Registracija/prijava (Google, e-mail), konflikt naloga, potvrda e-maila.
4. Nadimak (jedinstvenost, filter, prijedlozi) + avatar.
5. Moj profil, promjene, odjava.
6. Avatar za stolom i u sobi, tuđi profil, kartica gosta.
7. Brisanje naloga.
8. Prijatelji: zahtjevi, lista, uklanjanje, blokiraj i prijavi.
9. Pozivi na partiju.
10. Push za zahtjev i poziv.

Svaki korak: provjera na S10e prije sljedećeg.

---

## 11. Odluke (zatvorena pitanja, 2026-10-22)

| # | Pitanje | Odluka |
|---|---|---|
| Q1 | Koliko dugo važi poziv na partiju? | Dok partija ne počne ili se soba ne popuni, **najduže 30 minuta**. |
| Q2 | Kad nadimak obrisanog naloga postaje slobodan? | **Poslije 30 dana** (zaštita od lažnog predstavljanja). Do tada je rezervisan i nije u pretrazi. |
| Q3 | Treba li push i kad je zahtjev **prihvaćen**? | **Ne** u v1. |
| Q4 | Status „na mreži" kod prijatelja | Van opsega. |
| Q5 | Jedna ili dvije sporedne akcije na tuđem profilu? | **Dvije.** Druga je **Blokiraj / Prijavi** (§6.9). Google Play pravila za korisnički sadržaj traže oboje. |
| Q6 | Gdje žive profili, nadimci, broj partija, prijateljstva, zahtjevi, pozivi i blokade? | **Firestore** u postojećim Firebase projektima (staging / produkcija, odvojeni kao i za push). Čita i piše **samo server** (servisni ključ); klijent nema direktan pristup, Security Rules zabranjuju sve. Jedinstvenost nadimka drži transakcija nad dokumentom po ključu nadimka (mala slova). |
| Q7 | Treba li potvrđen e-mail za zahtjeve i pozive? | **Ne.** Nepotvrđen e-mail ne ograničava ništa; ostaje samo traka na profilu (P3). Svjesno odstupanje od `player-profile-v1.md` AC-17. |
| Q8 | Ćirilica u nadimku i u imenu gosta | Nadimak je **samo latinica**. Ime gosta na ćirilici u K7 stiže **preslovljeno** (Марко → Marko; љ → lj, њ → nj, џ → dž), uz poruku iz §6.4. Ručno ukucan ćirilični znak u polju daje K5 („Znak Ж nije dozvoljen."). |
| Q9 | Limiti zahtjeva za prijateljstvo | **Bez limita koje igrač vidi**, osim dedupe-a od 1 minute (§8). Odbijeni zahtjev se može odmah ponovo poslati; zaštitu daje Blokiraj (§6.9). Server ipak ima **tihi tehnički limit** od 100 zahtjeva i 100 poziva dnevno po nalogu (zaštita od skripte; preko njega 429 i opšta greška, bez posebnog ekrana). |
| Q10 | Saglasnost s uslovima je na A5, a nalog nastaje na A4 | Checkbox **ostaje na A5**. Nalog bez nadimka je **nedovršen**: nema javni profil, nije u pretrazi, ne može slati ni primati zahtjeve i pozive; Profil ga vraća na A5. Nedovršen nalog se **ne briše** (izmjena 2026-10-22): igra i skuplja partije kao svaki drugi, pa bi brisanje uzelo igraču ono što koristi. Osnov za čuvanje e-maila od trenutka kad nalog nastane daje red uz A3 i A4: „Pravljenjem naloga prihvataš politiku privatnosti." Ako se ikad uvede čišćenje, važi za SVE naloge (npr. 24 mj. neaktivnosti), ne samo za nedovršene. |

## 12. Tehnički i pravni preduslovi

Nisu ekrani, ali bez njih tokovi iz ovog dokumenta ne rade ili ne smiju na produkciju.

| # | Preduslov | Zašto / kad |
|---|---|---|
| T1 | **Google prijava preko nativnog plugina** (npr. `@capacitor-firebase/authentication`): nativni izbor naloga, pa `linkWithCredential` u JS-u. U Firebase konzoli SHA-1 otisci **upload ključa i Play app-signing ključa** za `com.kartaonica.zandar`, i debug ključa za `.staging`. | Google odbija `signInWithPopup`/`Redirect` iz WebView-a. Isti obrazac otisaka kao `assetlinks.json`. Prije koraka 3. |
| T2 | **Korisnički socket kanal** (`user:<uid>`), autentifikovan Firebase ID tokenom (već postoji na `feat/identity-v1`, korak 1). | Broj na tabu (D4) i list poziva u aplikaciji (E4) stižu i kad igrač nije u sobi. Današnji socket je vezan za sobu. Prije koraka 8. |
| T3 | **Push uređaj se veže za `uid`** i **odvezuje na odjavi** (O1) i brisanju (C4). | Inače odjavljen telefon i dalje dobija zahtjeve i pozive. |
| T4 | **Javni `profileId`** u `PublicPlayer`, ne Firebase `uid`; gost i bot imaju `profileId: null`, i to **isto**. | Otvaranje tuđeg profila (T1/T2). Razlika između gosta i bota ne smije postojati ni u podacima (HARD RULE 3, `lib/antiLeak.ts`). |
| T5 | **Generator imena botova izbjegava nadimke ljudi za istim stolom.** | PRD §39: bez duplog imena za stolom; bot „Zvonko" pored igrača s nadimkom „Zvonko". |
| T6 | **Napušteni gostujući nalog** poslije prijave na postojeći (B4/R6) server briše, sa rezultatima. | Gostujući `uid` inače ostaje siroče sa podacima. Ulazi u politiku privatnosti. |
| T7 | **`/delete-account`** opisuje brisanje **naloga** (ne samo podataka gosta i prijava za igre) i stiže na produkciju **istog dana** kad i registracija. | Google Play traži web URL za brisanje naloga čim nalog postoji. |
| T8 | **Politika privatnosti i Data safety forma:** e-mail, Firebase Auth, Google prijava, prijave igrača, rokovi brisanja (napušten gost odmah, rezervisan nadimak 30 dana). | Prije objave na `production`. |
| T9 | **Firebase e-mail šabloni** (potvrda e-maila, nova lozinka) na ijekavici, rodno neutralno, u **oba** projekta (staging, produkcija). Reset lozinke otvara Firebase stranicu, ne aplikaciju. | Podrazumijevani su na engleskom. |
| T10 | **Mjerenje** (PostHog, šalje samo produkcija; tipovi u `AnalyticsEvents`, vidi `docs/analytics.md`): `registration_completed` (`method`, `from_guest`), `login_completed`, `friend_request_sent` (`source`: pretraga \| sto \| soba), `friend_request_accepted`, `room_invite_sent`, `room_invite_resolved` (`outcome`: prihvaćen \| istekao \| nevažeći), `player_blocked`, `player_reported`. Bez e-maila i nadimka u svojstvima. | Bez njih se ne vidi da li sloj prijatelja radi. |
| T11 | **Izdanje:** svaka klijentska izmjena ide u novi AAB (`versionCode` 3+, čist worktree `zandar-apk`), deploy weba ne mijenja aplikaciju. Server mora ostati kompatibilan sa starim APK-om bez naloga (1.0.0, 1.1.0). | Planirati koraci po izdanjima, ne po deployu. |

## 13. Nije nacrtano (ni na platnu)

- **D2:** pretraga bez rezultata, učitavanje pretrage, red za igrača koji je tebi već poslao zahtjev (prikazati **Prihvati**, ne Dodaj).
- **E2:** igrač bez ijednog prijatelja; varijanta lista iz sobe bez izbora broja igrača.
- Dodir na push za istekao poziv (F7 iz push-a); `PushPrompt` u novim trenucima (§8).
- Prelazi A2 → A5 (nalog bez nadimka) i R6 → R7.
- §6.9 Blokiraj i prijavi: list izbora, potvrda blokade, list razloga prijave, potvrda prijave, profil u stanju „Blokiran".
- K7 za ćirilično ime gosta („Ime smo prepisali latinicom.").
