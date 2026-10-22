# Igrač, profil i prijatelji (V1)

## Cilj

Igrač može sačuvati identitet, pronaći prijatelja u igri ili izvan nje, uspostaviti prijateljstvo i započeti zajedničku partiju.

Glavni kanal rasta je link sobe preko Vibera i WhatsAppa. Tok koji ovaj dokument podržava: link vodi u partiju, partija do naloga, nalog do prijateljstva, prijateljstvo do sljedeće partije.

Status: odluke za V1 su potvrđene. Šta nije u V1 navedeno je u sekciji Van V1.

## Navigacija

Referentna skica navbara je u [Google dokumentu](https://docs.google.com/document/d/14EDrFoDuS8CERz8x39gDny-G-71Rusb-YCZYWv0_HjY/edit).

- Tabovi: Igraj, Prijatelji, Profil. Podešavanja su unutar Profila. Ikonica Settings na referentnoj skici nije dio rasporeda.
- Tab se zove Igraj dok postoji samo Žandar. Kad dođe druga igra, postaje Igre s izborom igre.
- Tabovi su vidljivi i gostu. Prijatelji i Profil gostu objašnjavaju korist naloga i nude registraciju, prijavu ili povratak. Nakon prijave otvara se traženi ekran.

## Gost i ulazak u igru

- Prvo pokretanje vodi direktno u igru, bez ekrana za registraciju.
- Gost od prvog pokretanja ima anonimni Firebase nalog sa stalnim ID-jem. Rezultati partija vezuju se za taj ID.
- Gost može: igrati Brzu partiju, ući u privatnu sobu preko linka, otvoriti privatnu sobu i podijeliti njen link, vidjeti nadimke i avatare učesnika partije.
- Gost nema: javni profil, pretragu igrača, prijateljstva ni pozive iz liste prijatelja.
- Ulazak preko linka: ko otvori link sobe ulazi direktno u sobu kao gost, bez ikakvog ekrana između. Ako je soba puna ili zatvorena, ili je partija već počela, prikazati razlog i dugme Brza partija.
- Prikaz gosta za stolom: zadržati postojeće ponašanje za nadimak gosta. Avatar je jedan od ponuđenih.

## Registracija i prijava

### Kada se nudi nalog

- Na kraju prve završene partije: „Sačuvaj rezultat i dodaj protivnike za prijatelje“. Ako igrač odbije, ponuda se ponavlja najranije nakon tri nove završene partije.
- Na tap na Prijatelji ili Profil.
- Na tap na Dodaj za prijatelja ili na otvaranje tuđeg linka profila.
- Poslije uspješne registracije ili prijave igrač se vraća na akciju koju je tražio. Ako poziv ili soba više nisu važeći, prikazati razlog i povratak na Igraj.

### Načini prijave i servis

- V1: Google i email. Facebook je prvi sljedeći korak poslije V1.
- Servis: Firebase Auth. Registracija nadograđuje anonimni nalog gosta u Google ili email nalog uz isti ID, pa nadimak, avatar i rezultati ostaju bez posebnog prenosa.
- Server (Fastify i Socket.IO) provjerava Firebase ID token za svaki zaštićeni poziv i socket konekciju.
- Pri registraciji ponuditi nadimak koji gost već koristi ako je slobodan i ispunjava pravila. U suprotnom igrač bira drugi prije završetka profila.

### Postojeći nalog

- Ako izabrani Google nalog ili email već pripada postojećem nalogu, igrač se prijavljuje na taj nalog. Učitavaju se njegov profil, prijatelji i statistika.
- Gostujući podaci se ne spajaju s postojećim nalogom i ne prepisuju njegov nadimak ni avatar. Prije prijave upozoriti da će gostujući rezultati s ovog uređaja biti izgubljeni.
- Više načina prijave može voditi na isti nalog samo kroz potvrđeno povezivanje. Isti email nije dovoljan za automatsko spajanje.

### Email, lozinka i sesija

- Email registracija uključuje potvrdu email adrese, s mogućnošću ponovnog slanja. Nepotvrđen nalog igra normalno, a zahtjevi za prijateljstvo, pozivi i dijeljenje profila dostupni su tek po potvrdi.
- Oporavak lozinke ide kroz Firebase tok: jednokratan link s rokom važenja i unos nove lozinke. Za Google prijavu oporavak se obavlja kod Googlea.
- Povratak u aplikaciju ne traži ponovnu prijavu dok sesija važi. Ako sesija istekne, tražiti ponovnu prijavu za zaštićene akcije, pa osvježiti stanje. Započeta društvena akcija se ne izvršava kao drugi nalog.
- Odjava prekida pristup podacima naloga na uređaju; uređaj nastavlja kao novi gost. Odjava usred partije traži upozorenje i potvrdu napuštanja partije.
- Promjena uređaja: registrovani nalog se vraća prijavom. Gostujući podaci se ne vraćaju nakon brisanja aplikacije ili promjene uređaja.

## Profil

### Sadržaj

- Moj profil: nadimak, avatar, broj završenih partija, podešavanja, lista blokiranih, Podijeli moj profil, odjava i brisanje naloga.
- Tuđi profil, samo za čitanje: avatar, nadimak, broj završenih partija, status, akcija prema stanju odnosa, Prijavi i Blokiraj.
- Tuđi profil se otvara tapom na avatar u sobi ili partiji, iz pretrage, iz liste prijatelja, iz Nedavnih protivnika i preko linka profila.
- Tap na gosta ili bota otvara kratku karticu s nadimkom i avatarom, bez profila i bez akcija.
- Email, način prijave i podaci za oporavak nisu dio javnog profila.
- Profil i prijateljstva vezuju se za stalni ID igrača. Promjena nadimka ili avatara ne kreira novi identitet i ne prekida prijateljstva.
- Sačuvana izmjena sopstvenog profila prikazuje se svuda gdje se igrač pojavljuje. Greška pri čuvanju zadržava prethodnu vrijednost.

### Nadimak

- Dužina od 3 do 16 znakova.
- Dozvoljena slova (uključujući č, ć, ž, š i đ), brojevi, donja crta i tačka. Bez razmaka; razmaci s početka i kraja se uklanjaju.
- Jedinstven bez razlike između velikih i malih slova.
- Promjena najviše jednom u 30 dana.
- Provjera protiv liste zabranjenih riječi pri unosu (vidi Blokiranje, prijave i moderacija).
- Nadimak se prikazuje na profilu, u sobi, tokom partije, u pretrazi i u listi prijatelja.

### Avatari

- Ponuđeno 8 do 12 avatara u vizuelnom stilu Kartaonice, dovoljno različitih da se za stolom od četvoro rijetko ponavljaju.
- Igrač bez izbora dobija podrazumijevani avatar. Izabrani avatar čuva se uz nalog i prikazuje u profilu, listi prijatelja, sobi i partiji.
- Upload fotografije nije u V1.

### Statistika i status

- Broj završenih partija uključuje sve završene partije, i one protiv botova.
- Započete, otkazane i napuštene partije se ne broje. Jedna partija se broji tačno jednom, i nakon reconnecta ili ponovljene dostave rezultata.
- Statusi: dostupan, u partiji, offline. Status prati aktivnu vezu, a ne samo prijavljenost. Igrač prelazi u offline nakon 45 sekundi bez veze.

## Botovi u društvenom sloju

- Botovi se prikazuju tačno kao gosti: nadimak u formatu gosta, ponuđeni avatar, bez javnog profila i bez akcija.
- Botovi se ne pojavljuju u pretrazi ni u listama prijatelja i nemaju link profila. U Nedavnim protivnicima prikazuju se kao gosti, bez dugmeta.
- Klijent nikad ne dobija informaciju da je igrač bot (postojeće pravilo, bez isBot oznake u klijentu).
- Privatna soba: ako format traži više igrača nego što je ušlo, kreator vidi dugme Popuni prazna mjesta. Botovi ulaze prikazani kao gosti. Ostali učesnici ne vide dugme. Privatna soba se ne popunjava automatski.
- Partije protiv botova broje se u statistici kao i ostale.

## Prijatelji

### Ekran

- Ekran Prijatelji sadrži listu prijatelja sa statusom, primljene i poslate zahtjeve, Nedavne protivnike, pretragu po nadimku i dugme Podijeli moj profil.
- Na tabu Prijatelji prikazuje se oznaka novih zahtjeva.

### Odakle dolaze prijatelji

- Kraj partije: Dodaj za prijatelja pored svakog registrovanog protivnika. Gosti i botovi nemaju dugme. Gost koji klikne dobija ponudu za nalog, a nakon registracije zahtjev se šalje.
- Nedavni protivnici: zadnjih 20 protivnika iz završenih partija. Registrovani protivnici imaju akciju prema stanju odnosa; gosti i botovi su bez akcije.
- Link profila: Podijeli moj profil otvara dijeljenje linka kartaonica.com/p/`<kod>`. Kod je stalan i ne zavisi od nadimka, pa link radi i nakon promjene nadimka. Otvaranje linka prikazuje profil s akcijom Dodaj prijatelja, uz prijavu ako je potrebna.
- Pretraga po nadimku: od 3 znaka, po početku nadimka, bez razlike velikih i malih slova, najviše 20 rezultata. Ne prikazuje goste, botove, sopstveni nalog ni naloge između kojih postoji blokada.

### Stanja odnosa i akcije

- Nema odnosa: Dodaj prijatelja.
- Poslat zahtjev: Zahtjev poslat i Povuci.
- Primljen zahtjev: Prihvati i Odbij.
- Prijatelji: Pozovi i Ukloni.
- Blokada: Odblokiraj, samo na sopstvenoj listi blokiranih.

### Pravila

- Prijateljstvo nastaje tek prihvatanjem. Prihvatanje ga prikazuje kod oba igrača.
- Za isti par naloga postoji najviše jedan aktivan zahtjev. Ako već postoji dolazni zahtjev, prikazati Prihvati i Odbij umjesto slanja novog. Istovremena slanja ne stvaraju automatsko prijateljstvo.
- Primljeni zahtjev ostaje vidljiv i nakon ponovnog pokretanja aplikacije dok nije prihvaćen, odbijen ili povučen. Primalac ne mora biti online u trenutku slanja.
- Odbijanje ili povlačenje zatvara zahtjev. Uklanjanje prijatelja uklanja odnos kod oba igrača i poništava njihove aktivne pozive.
- Limiti: najviše 20 poslanih zahtjeva dnevno, istom igraču ponovo tek 7 dana nakon odbijanja, najviše 200 prijatelja. Ponovljen mrežni zahtjev ne pravi duplikate.

### Prazna stanja i greške

- Prazna lista prijatelja nudi Nedavne protivnike, pretragu i Podijeli moj profil.
- Prazne liste zahtjeva objašnjavaju da trenutno nema zahtjeva. Pretraga bez rezultata kaže da nema igrača s tim nadimkom.
- Učitavanje i greška imaju odvojena stanja i opciju Pokušaj ponovo.

## Igra s prijateljima

### Privatna soba

- Kreator bira igru i pravila, pa otvara privatnu sobu. Soba ima link za dijeljenje (Viber, WhatsApp i drugo) i listu prijatelja za poziv unutar aplikacije.
- Pozovi sa profila prijatelja prvo traži izbor igre i kreira sobu.
- Svi učesnici vide istu sobu, učesnike i status spremnosti. Kreator pokreće partiju kad je broj igrača ispunjen (ljudima ili popunom botovima) i svi učesnici su spremni.
- Ako kreator napusti sobu prije početka, soba se zatvara, svi pozivi se poništavaju i učesnici dobijaju obavještenje.
- Link sobe važi dok soba postoji. Soba bez početka partije zatvara se nakon 30 minuta neaktivnosti.

### Poziv prijatelju

- Prijatelj dostupan: dobija obavještenje unutar aplikacije s nadimkom pošiljaoca, nazivom igre, pravilima i opcijama Prihvati i Odbij. Poziv važi 60 sekundi.
- Prijatelj offline: Pozovi otvara dijeljenje linka sobe (Viber, WhatsApp i drugo).
- Prijatelj u partiji: poruka „Trenutno igra“ i opcija da mu se pošalje link sobe.
- Istom prijatelju novi poziv može se poslati tek kad prethodni istekne. Kreator može povući poziv.
- Pri prihvatanju sistem ponovo provjerava poziv, prijateljstvo i blokadu, dostupnost igrača, postojanje sobe i slobodno mjesto. Mjesto se zauzima tek uspješnim prihvatanjem.
- Ishodi poziva: na čekanju, prihvaćen, odbijen, povučen, istekao, više nije važeći. Istek, zatvaranje ili punjenje sobe i početak partije uklanjaju mogućnost kasnog ulaska preko tog poziva.
- Ponovljeni klik ili ponovljen mrežni zahtjev ne stvaraju duplu sobu, poziv ni mjesto. Isti nalog ne može kroz poziv ući u drugu aktivnu partiju.
- Poziv nikada automatski ne prekida tekuću partiju.
- Prekid veze u sobi: po povratku prikazati važeće stanje sobe i poziva, uz jasan razlog ako povratak više nije moguć. Prekid veze u započetoj partiji ostaje na postojećem reconnect ponašanju.

## Blokiranje, prijave i moderacija

- Na tuđem profilu dostupne su akcije Prijavi i Blokiraj.
- Blokiranje uklanja prijateljstvo i aktivne zahtjeve i pozive između dva naloga. Novi zahtjevi i pozivi nisu dozvoljeni dok blokada postoji. Odblokiranje ne vraća prijateljstvo.
- Blokiranje ne prekida započetu partiju. Matchmaking izbjegava uparivanje blokiranih igrača kad može, bez garancije.
- Pravila korišćenja su kratka stranica koju igrač prihvata pri izboru nadimka. Zabranjeni su uvredljivi, vulgarni i mrzilački nadimci, lažno predstavljanje i reklame.
- Lista zabranjenih riječi na našem jeziku provjerava se pri unosu nadimka, uključujući varijante sa zamijenjenim slovima i brojevima.
- Prijava igrača upisuje se u tabelu prijava u bazi i šalje email vlasniku igre. Pregled je ručni: nadimak se preimenuje u neutralan (npr. Igrac4821) ili se nalog suspenduje. V1 nema admin ekran.

[Google Play pravila za korisnički sadržaj](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en)

## Brisanje naloga

- U Profilu je vidljiva opcija Obriši nalog, s ponovnom prijavom kao potvrdom identiteta i potvrdom namjere.
- Zahtjev za brisanje može se poslati i preko jednostavne web stranice s formom, navedene u Google Play Console.
- Po izvršenom brisanju: opozvati sesije, ukloniti profil iz pretrage, lista prijatelja i Nedavnih protivnika, ukloniti zahtjeve i pozive i obrisati korisničke podatke i Firebase nalog. Ako se neki podaci opravdano zadržavaju, to se jasno objašnjava korisniku.

[Google Play zahtjevi za brisanje naloga](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)

## Mjerenje

### Događaji

Događaji idu u PostHog, sa servera gdje je moguće. Događaji poziva i partije povezuju se istim ID-jem poziva i partije. Email i drugi lični podaci ne šalju se u analitiku.

- invite_link_shared, sa izvorom: soba, profil ili offline prijatelj
- invite_link_opened
- joined_via_link
- registration_prompt_shown, sa okidačem: kraj partije, tab, Dodaj za prijatelja ili link profila
- registration_completed, sa načinom prijave i oznakom da li je nalog nastao iz gosta
- friend_request_sent i friend_request_accepted, sa izvorom: kraj partije, Nedavni protivnici, pretraga ili link profila
- room_invite_sent i room_invite_resolved, s ishodom: prihvaćen, odbijen, povučen, istekao ili neuspješan ulazak
- first_friend_match_finished

### Početni ciljevi

Ciljevi su hipoteze i koriguju se nakon četiri sedmice podataka.

- Otvoren link do ulaska u partiju: 40%.
- Gost poslije prve partije do naloga: 20%.
- Registrovani igrači s bar jednim prijateljem u prvih 7 dana: 30%.
- K-faktor (novi igrači preko linka po aktivnom igraču, mjesečno): 0,3.
- D7 registrovanih igrača: 15%. Kill kriterijum ostaje D7 od najmanje 10%.

## Kriterijumi prihvatanja

- AC-01: Prvo pokretanje vodi u igru bez ekrana za registraciju. Gost igra Brzu partiju i ulazi u sobu preko linka bez naloga. Prijatelji i Profil gostu objašnjavaju korist naloga i nude prijavu, registraciju ili povratak.
- AC-02: Nakon odjave i ponovne prijave vraćaju se isti profil, nadimak, avatar i prijatelji. Podaci drugog naloga na istom uređaju nisu vidljivi.
- AC-03: Registracija iz gosta zadržava isti ID i rezultate gosta. Prijava na postojeći nalog ne prepisuje njegov profil niti spaja gostujuće podatke.
- AC-04: Nadimak koji se razlikuje samo po velikim i malim slovima ne može pripasti drugom nalogu. Promjena nadimka ne prekida prijateljstva i ne mijenja link profila.
- AC-05: Za par igrača postoji najviše jedan aktivan zahtjev. Prihvatanje prikazuje prijateljstvo kod oba igrača; odbijanje, povlačenje i uklanjanje daju usklađeno stanje na oba naloga.
- AC-06: Prihvatanje važećeg poziva vodi u istu sobu. Ponovljeni klik ne zauzima drugo mjesto. Istekao poziv, puna ili zatvorena soba prikazuju jasan razlog.
- AC-07: Igrač koji već igra ne može prihvatanjem poziva nenamjerno napustiti partiju. Dostupnost se ponovo provjerava pri prihvatanju.
- AC-08: Blokirani igrač ne može slati zahtjeve ni pozive. Odblokiranje samo uklanja zabranu, bez vraćanja prijateljstva.
- AC-09: Jedna završena partija, uključujući partiju protiv botova, povećava broj partija tačno jednom, i nakon reconnecta ili ponovljene dostave rezultata.
- AC-10: Brisanje naloga je dostupno u aplikaciji i preko weba. Po brisanju stara sesija ne daje pristup nalogu, a javni profil nije dostupan.
- AC-11: Tap na bota prikazuje isto što i tap na gosta. Bot se ne pojavljuje u pretrazi ni u listama prijatelja i nema akciju u Nedavnim protivnicima. Klijent ne dobija oznaku bota.
- AC-12: Otvaranje linka sobe vodi gosta direktno u sobu. Puna, zatvorena ili već započeta soba prikazuje razlog i dugme Brza partija.
- AC-13: Pozovi na offline prijatelju otvara dijeljenje linka sobe. Na prijatelju u partiji prikazuje „Trenutno igra“ i nudi slanje linka.
- AC-14: Na kraju partije registrovani protivnici imaju Dodaj za prijatelja, a isti igrači se pojavljuju u Nedavnim protivnicima.
- AC-15: Link profila radi i nakon promjene nadimka i vodi na profil s akcijom prema stanju odnosa.
- AC-16: Dugme Popuni prazna mjesta vidi samo kreator privatne sobe. Botovi ulaze prikazani kao gosti.
- AC-17: Nalog s nepotvrđenim emailom može igrati, ali ne može slati zahtjeve, pozive ni dijeliti profil dok ne potvrdi email.

## Van V1

- Facebook prijava, kao prvi sljedeći korak.
- Upload fotografije za avatar.
- Push obavještenja za pozive, nakon Android builda (FCM).
- Admin ekran za pregled prijava.

## Tehničke provjere prije implementacije

- Kako se danas prikazuje nadimak gosta i koje podatke o gostu sistem čuva. Anonimni Firebase nalog zamjenjuje postojeći guest UUID iz localStorage; PostHog identitet treba povezati s novim ID-jem.
- Koje formate (broj igrača) Žandar podržava u privatnoj sobi, radi dugmeta Popuni prazna mjesta.
