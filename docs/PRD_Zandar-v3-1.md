# Žandar Multiplayer Web MVP — PRD v3 (AI Layer)

> **Verzija:** 3.2
> **Status:** Home/entry redizajn; Quick Play pojednostavljen; single-player izbačen
> **Datum:** 2026-06-08
> **Jezik:** ijekavica
> **Bazira se na:** PRD v2.0 (Section 30 zatvorena)

---

## Changelog (v2 → v3)

| Sekcija | Promjena |
|---------|----------|
| 3 MVP Scope | **Quick Play (javni stolovi sa botovima)** ulazi u scope; "AI bots" izlazi iz Out-of-scope; privatne sobe ostaju bot-free uz opcioni host toggle |
| 5 Success criteria | Dodat kriterij za bot-illusion i za odvajanje human-only signala |
| 6 Pravila igre | **Bez promjene.** Botovi igraju po istim pravilima (vidi 36.3) |
| 12 State model | Dodati `isBot`, `botProfile`; `isBot` se NIKAD ne šalje klijentu (vidi 42) |
| 13 Public/private state | Dodato pravilo: public state ne smije otkriti bota |
| 25 Analytics | Dodati bot/quickplay eventi + win-rate-by-session tracking |
| 29 Risks | Dodati Risk 6 (bot detection), Risk 7 (DDA "rigged" feeling), Risk 8 (bot-padded metrics maskiraju PMF) |
| 35 Playtest | Razdvojeni human-only metrici; dodat bot-illusion survey; izmijenjen go/no-go za mobile |
| **36 NOVO** | AI igrači — pregled i filozofija |
| **37 NOVO** | Quick Play (javni stolovi) |
| **38 NOVO** | Bot-backfill i likvidnost stolova |
| **39 NOVO** | Sistem random imena i identiteta |
| **40 NOVO** | Bot difficulty, balans i DDA |
| **41 NOVO** | Bot timing, ponašanje i social sloj |
| **42 NOVO** | State model izmjene za botove |
| **43 NOVO** | Analytics izmjene (v3) |
| **44 NOVO** | Etika, disclosure i regulatorni okvir |
| **45 NOVO** | Amandmani na postojeće sekcije |
| **46 NOVO** | Playtest izmjene (v3) |
| **47 NOVO** | Milestones (v3 dodaci) |
| **48 NOVO** | Otvorena pitanja v3 |

---

## Changelog (v3.0 → v3.1)

Odluke iz Sekcije 48 zatvorene:

| Promjena | Opis |
|----------|------|
| Single-player u scope | Eksplicitni PvE mod (vježba protiv AI) prelazi iz Should-have u **Must-have v3** (odluka #6, vidi 37.5) |
| Handoff copy | Kad čovjek preuzme bot sjedište, UI prikazuje samo "**[nickname] je otišao**" — nikad riječ "bot" (odluka #4) |
| Sekcija 48 | Sva pitanja **ZATVORENA** sa odlukama |

---

## Changelog (v3.1 → v3.2)

| Promjena | Opis |
|----------|------|
| Home/entry redizajn | Dominantni CTA "Igra – nađi sto"; sekundarni "Kreiraj svoj sto" (privatno). Vidi §49 |
| Quick Play pojednostavljen | Korisnik upisuje SAMO ime; fiksno **4 igrača, target 21** (konfiguracija skrivena). Vidi §37.1 |
| Matching ekran | Fake-matching loading koji popunjava imena/avatare jedan po jedan (design-system dopuna). Vidi §49.2 |
| Single-player IZBAČEN | §37.5 uklonjen — Quick Play sa lakim botovima već služi kao vježba |
| Remember name | Povratni korisnik preskače unos imena ("Nađi sto" = jedan tap) |

---

## 36. AI igrači — pregled i filozofija 🆕

### 36.1 Zašto botovi uopšte postoje

Botovi NISU feature radi feature-a. Oni rješavaju **cold-start liquidity** problem: multiplayer igra sa nula konkurentnih igrača je mrtva na startu — novi korisnik otvori app, nema protiv koga da igra, i ode. Bot popunjava sto **u sekundi**, novi igrač odmah uđe u partiju, uhvati core loop, i vrati se.

> **Princip:** Bot je infrastruktura za preživljavanje proizvoda dok ne izgradimo ljudsku likvidnost — ne dugoročni endgame. Cilj je da se botovi vremenom **smanjuju** kako raste broj realnih igrača, ne da postanu trajni štap.

### 36.2 Dvije različite stvari (ne miješati)

| Pojam | Šta je | Status |
|-------|--------|--------|
| **Bot-backfill** | Nevidljivo puni sjedišta na javnom stolu da partija krene odmah; bot se predstavlja kao običan igrač | **Must-have v3** |
| **Single-player vs AI (eksplicitni PvE)** | Korisnik svjesno bira "igraj protiv računara" za vježbu/onboarding | **Must-have v3** (odluka #6) |

v3 fokus je na bot-backfill, ali eksplicitni single-player mod sada ulazi u v3 scope (odluka #6). Gotovo je besplatan: isti bot engine (Sekcija 40), samo drugi entry point. Vidi 37.5.

### 36.3 Zlatno pravilo: bot igra po istim pravilima

Bot **nikada** ne krši pravila igre da bi bio lakši ili teži:
- Bot uvijek poštuje force-capture (ako može kupiti, mora kupiti).
- Bot bira samo legalne capture opcije koje vraća `getCaptureOptions`.
- Težina se reguliše **isključivo kroz kvalitet izbora poteza** (koju legalnu opciju bira, kako tempira J), nikad kroz "varanje" pravila.

Ovo je važno i etički i tehnički: bot je samo još jedan klijent intent-a koji prolazi kroz isti server-side `applyMove`. Server ostaje sudija.

---

## 37. Quick Play (javni stolovi) 🆕

### 37.1 Novi entry point

Home dobija dominantni CTA **"Igra – nađi sto"** (kompletan home/matching redizajn: §49).

**Flow (pojednostavljen — v3.2):**
1. Korisnik upisuje **samo svoje ime** (povratni korisnik preskače — ime se pamti na uređaju).
2. Klikne "Igra – nađi sto".
3. **Bez izbora konfiguracije:** Quick Play je fiksno **4 igrača, target score 21**.
4. Matching ekran (fake matching, §49.2) → matchmaker stavi korisnika za sto i popuni prazna sjedišta botovima (§38).
5. Partija kreće.

> Konfiguracija (broj igrača, target score) postoji samo u "Kreiraj svoj sto" (privatne sobe), nikad u Quick Play-u.

### 37.2 Privatne sobe ostaju bot-free (uz opcioni toggle)

- Privatna soba je i dalje "friends & family", bez botova po defaultu.
- 🆕 **Host toggle "Popuni prazna mjesta botovima"**: ako Marko ne dođe za 4-player partiju, host može popuniti sjedište botom umjesto da otkazuje veče. Ovo direktno rješava "imamo 3 od 4 igrača" scenario.

### 37.3 Šta korisnik vidi

- Korisnik **ne vidi** oznaku "bot". Botovi se predstavljaju kao obični igrači sa realnim random imenima (vidi Sekciju 39) i avatarima.
- Disclosure se rješava na nivou Terms-of-Service ("stolovi mogu uključivati AI igrače"), ne in-game etiketom. Obrazloženje i granice: Sekcija 44.

### 37.4 FR dodaci za Quick Play

**FR-018: Quick Play matchmaking 🆕**
- Korisnik NE bira konfiguraciju — Quick Play je fiksno 4 igrača, target 21.
- Sistem vraća sto za < 2s.
- Ako nema human stola koji čeka → kreira novi sto i popunjava botovima.

**FR-019: Bot seat fill 🆕**
- Prazna sjedišta se popunjavaju botovima do traženog playerCount-a.
- Svaki bot dobija jedinstven identitet (ime + avatar + skill profil) stabilan kroz cijelu partiju.
- Botov identitet i potezi prolaze kroz isti public-state pipeline kao i ljudski igrač.

**FR-020: Human-over-bot prioritet 🆕**
- Kad realan igrač uđe u Quick Play, matchmaker preferira da ga sjedne na **bot sjedište** (na granici ruke) ili na sto sa najviše ljudi, prije nego da otvara novi sto pun botova.

### 37.5 Single-player — IZBAČENO (v3.2)

Eksplicitni single-player ("Vježbaj") je **izbačen iz scope-a**. Razlog: Quick Play sa lakim onboarding botovima (§40.4) već služi kao vježba protiv računara, samo nevidljivo — eksplicitni mod je suvišan. Bot engine i identiteti ostaju (potrebni za Quick Play).

---

## 38. Bot-backfill i likvidnost stolova 🆕

### 38.1 Matchmaking logika (pseudo)

```typescript
function findOrCreateTable(req: QuickPlayRequest): Room {
  // 1. Pokušaj human-first: postojeći javni sto koji čeka igrače
  const waiting = findWaitingPublicTable(req.playerCount, req.targetScore);
  if (waiting && hasHumanSeatPriority(waiting)) {
    return seatHuman(waiting, req);   // preferiraj zamjenu bota čovjekom
  }

  // 2. Inače kreiraj novi sto i popuni botovima do punog broja
  const room = createPublicRoom(req.playerCount, req.targetScore);
  seatHuman(room, req);
  fillRemainingSeatsWithBots(room);   // vidi 38.2
  return room;
}
```

### 38.2 Pravila popunjavanja

- Sto se popunjava do **traženog playerCount-a** (ne više).
- Broj botova po stolu = `playerCount - brojLjudi`.
- Skill miks botova bira se prema onboarding fazi čovjeka (vidi Sekciju 40.4), ne nasumično.
- Bot identiteti za jedan sto se generišu odjednom uz garanciju **bez duplikata imena/avatara** na istom stolu.

### 38.3 Blending kako raste ljudska likvidnost

```typescript
type LiquidityConfig = {
  maxBotsPerTable: number;          // default = playerCount - 1 (uvijek bar 1 čovjek)
  preferHumanReplacement: boolean;  // default true
  newTableBotThreshold: number;     // ispod koliko aktivnih ljudi smije sto biti 100% backfill-ovan
  botRetirementWindowMs: number;    // koliko dugo bot "živi" prije nego ga zamijeni čovjek na granici ruke
};
```

- Dok je malo ljudi online → agresivan backfill (svaki sto = 1 čovjek + botovi).
- Kako raste broj konkurentnih ljudi → matchmaker spaja ljude na iste stolove i smanjuje botove.
- **Cilj nije fiksni broj botova nego opadajući udio** — pratimo `bot_seat_share` metrik (Sekcija 43) i želimo da pada kroz vrijeme.

### 38.4 Human ulazak u tekuću partiju

- Mid-hand join je kompleksan → realan igrač koji čeka sjedište koje drži bot **uskače na granici ruke** (između rundi), preuzimajući bot sjedište i njegov match score. Bot tiho "izlazi".
- 🔒 **Copy pravilo (odluka #4):** UI prikazuje samo "**[nickname] je otišao**" koristeći bot persona ime — **nikad riječ "bot" ni naznaku da je bilo AI**. Novi (realni) igrač zatim sjeda. Tranzicija na granici ruke, bez otkrivanja.

---

## 39. Sistem random imena i identiteta 🆕

> Ovo je illusion engine. Ako imena izgledaju generisano (npr. "Player1", "Player2", "Player3"), iluzija pada i cijela vrijednost botova nestaje. Mora biti raznoliko i "naše".

### 39.1 Kategorije imena i distribucija

Svaki bot identitet se bira iz ponderisane distribucije kategorija (zbir = 100%):

| # | Kategorija | Primjeri | Težina |
|---|-----------|----------|--------|
| 1 | Ime + Prezime (M) | Marko Petrović, Stefan Jovanović, Nemanja Ilić | 12% |
| 2 | Ime + Prezime (Ž) | Ana Kovačević, Jelena Marić, Milica Savić | 10% |
| 3 | Samo ime (M) | Nikola, Luka, Đorđe, Haris | 9% |
| 4 | Samo ime (Ž) | Sara, Teodora, Lejla, Tijana | 8% |
| 5 | Nadimak / hipokoristik | Bata, Seka, Đole, Maca, Zoki, Keba | 10% |
| 6 | Ime/nadimak + broj | deki92, ana_88, zoki.023, marko1991 | 14% |
| 7 | Handle / gamertag | CrniVuk, RakijaBoss, KaubojSa, Legenda011 | 12% |
| 8 | Handle + grad tag | vukNS, zmajBL, careBG, fantomZG | 6% |
| 9 | Guest / generic | guest1244, Gost8821, Igrac_4471, Player7732 | 9% |
| 10 | Ironični / šaljivi | Pivopija, ČikaMika, TetkaRada, DedaKockar, BabaMica | 6% |
| 11 | Inicijal + prezime | M. Petrović, J. K., S. Jović | 4% |

**Napomena o gender miksu:** kategorije 1–4 nose eksplicitan rod; 5–11 su uglavnom rodno neutralne (kako i jeste u realnim lobby-jima). Ukupan vidljivi rod treba ispasti otprilike izbalansiran, sa blagim nagibom — što je realnije za kartaške igre u regionu (otvoreno za tuning).

### 39.2 Data pool-ovi (seed — proširiti)

```typescript
const NAME_POOLS = {
  firstM: ["Marko","Stefan","Nikola","Luka","Aleksandar","Miloš","Nemanja",
    "Đorđe","Vuk","Petar","Ivan","Filip","Dragan","Goran","Zoran","Saša",
    "Dejan","Mirko","Mladen","Vedran","Damir","Haris","Emir","Tarik","Adnan"],
  firstF: ["Ana","Jelena","Milica","Marija","Ivana","Sara","Teodora","Katarina",
    "Jovana","Tijana","Dragana","Sanja","Nataša","Maja","Tamara","Andrea","Nina",
    "Snežana","Mirjana","Lejla","Amra","Selma"],
  surname: ["Petrović","Jovanović","Marković","Nikolić","Kovačević","Ilić",
    "Đorđević","Stanković","Pavlović","Lukić","Babić","Hodžić","Begić","Tadić",
    "Vuković","Knežević","Mitrović","Savić","Popović","Tomić","Jović","Perić"],
  nick: ["Bata","Seka","Cane","Đole","Maca","Buca","Pera","Žika","Mića","Steva",
    "Brka","Keba","Coa","Gaga","Lola","Buba","Riki","Dado","Zoki","Deki","Kiza"],
  handleStem: ["Vuk","Zmaj","Kauboj","Rakija","Pivo","Gazda","Majstor","Profa",
    "Baja","Car","Legenda","Fantom","Ratnik","Soko","Lav","Medo","Bik"],
  cityTag: ["NS","BG","BL","ZG","SA","NI","KG","PG","TZ","MO","OS"],
  guestStem: ["guest","Gost","Igrac","Player"],
  ironic: ["Pivopija","ČikaMika","TetkaRada","DedaKockar","BabaMica","KumIzSela",
    "ŠefSale","KomšijaPero","TaksistaJoca"],
};
```

> Pool treba biti dovoljno velik da se izbjegne ponavljanje (cilj: 300+ kombinatornih jedinica po kategoriji nakon kompozicije). Seed iznad je polazni, ne finalni.

### 39.3 Kompozicija broja (za kategoriju 6 i sl.)

```typescript
function attachNumber(base: string): string {
  const patterns = [
    () => `${base}${randYear()}`,         // marko1991, ana1988
    () => `${base}${randYear2()}`,        // deki92, sara88
    () => `${base}_${rand2to3()}`,        // zoki_023
    () => `${base}.${rand2to3()}`,        // ana.88
    () => `${base}${rand2to4()}`,         // pera774
  ];
  return pick(patterns)();
}
// randYear: 1980–2006; randYear2: '80–'06 dvocifreno; ostalo nasumično
```

### 39.4 Realism / quality pravila (obavezno)

1. **Bez duplikata na istom stolu** — nikad dva "Marko" za istim stolom.
2. **Recency po korisniku** — isti korisnik ne smije vidjeti isti identitet u kratkom roku (npr. ne ponavljaj zadnjih ~50 viđenih, ili unutar 30 dana). Inače isti čovjek primijeti "opet Marko Petrović" → iluzija pada.
3. **Profanity / hate filter** — generisani handle-ovi prolaze blocklist. U ex-yu kontekstu OBAVEZNO blokirati nacionalističke/etničke/uvredljive kombinacije. Ovo nije opciono.
4. **Rod ↔ avatar konzistentnost** — ako je ime eksplicitno rodno (kat. 1–4), avatar mora pristajati. Za neutralne handle-ove avatar je nasumičan.
5. **Stabilnost u partiji** — identitet (ime + avatar + skill) je fiksiran za cijelu partiju; ne mijenja se usred meča.
6. **Distribucija "osjeća se živo"** — za stolom od 4 idealno mix kategorija (npr. jedan full name, jedan nick+broj, jedan guest, jedan handle), ne 4 ista tipa.

### 39.5 Opciono: "regulari" (post-MVP polish)

Pool od ~150–250 trajnih persona koji se **ponavljaju** kroz vrijeme (isto ime + avatar + tipičan stil igre + tipične reactions). Cilj: korisnik počne prepoznavati "evo opet onaj RakijaBoss" → osjećaj žive zajednice. Snažan retention trik, ali polish — ne blokira MVP. (Pažnja: kombinovati sa pravilom recency da ne postane očigledno.)

### 39.6 Generator (pseudo)

```typescript
function generateIdentity(seenByUser: Set<string>, atTable: Set<string>): BotIdentity {
  for (let attempt = 0; attempt < 25; attempt++) {
    const category = weightedPickCategory();     // tabela 39.1
    const candidate = composeName(category);      // koristi NAME_POOLS
    if (atTable.has(candidate)) continue;
    if (seenByUser.has(normalize(candidate))) continue;
    if (failsProfanityFilter(candidate)) continue;
    const gender = inferGender(category, candidate);
    return {
      displayName: candidate,
      avatar: pickAvatar(gender),
      gender,
    };
  }
  return fallbackGuestIdentity(atTable); // garantovano jedinstven guest####
}
```

---

## 40. Bot difficulty, balans i DDA 🆕

> "Po pravilima ovog tržišta": casual igrač treba da pobjeđuje **taman toliko** da se osjeća dobro, ali da gubi dovoljno da ima šta da "popravlja". Cilj je flow kanal — ni prelako (dosadno), ni preteško (frustracija i churn).

### 40.1 Skill tierovi

| Tier | Naziv | Ponašanje |
|------|-------|-----------|
| 1 | **Početnik** | Poštuje force-capture, ali inače bira slabije: često uzme manje vrijednu kombinaciju, ignoriše 2♣/10♦/trefove, loše tempira J, dosta "šuma" u izboru |
| 2 | **Igrač** | Prioritet vrijednim kartama (2♣, 10♦, trefovi), osnovno praćenje odigranih karata, drži J za bogat sto |
| 3 | **Majstor** | Prati odigrane karte, procjenjuje protivničke ruke, optimalno tempira J, igra na uskraćivanje, bori se za "najviše karata" pred kraj ruke, blagi lookahead |

Botovi za stolom su **miks** tierova (kao realni ljudi), a miks zavisi od onboarding faze čovjeka (40.4).

### 40.2 Evaluacija poteza (jedan engine, skaliran težinom)

Bot za svaki legalan potez računa skor; bira max skor + (kod nižih tierova) dodaje šum i ponekad bira suboptimalno.

```typescript
function scoreMove(move: LegalMove, ctx: BotContext): number {
  let s = 0;
  s += move.capturedCount * W.cards;                 // "najviše karata" je 2 poena
  s += move.capturesClubs * W.clubs;                 // "najviše trefova"
  s += move.captures2Clubs ? W.twoClubs : 0;         // 2♣ = 1 poen
  s += move.captures10Diamonds ? W.tenDiamonds : 0;  // 10♦ = 1 poen
  s += move.isJackSweep ? jackTimingValue(ctx) : 0;  // J vrijednost zavisi od bogatstva stola
  s -= move.leavesEasyCaptureForOpp ? W.defense : 0; // samo tier 3 ovo "vidi"
  return s;
}

function chooseMove(legal: LegalMove[], ctx: BotContext): LegalMove {
  const scored = legal.map(m => ({ m, base: scoreMove(m, ctx) }));
  const noise = NOISE_BY_TIER[ctx.tier];             // tier1 visok, tier3 ~0
  const blunderP = BLUNDER_PROB_BY_TIER[ctx.tier];   // šansa da namjerno odigra suboptimalno
  if (Math.random() < blunderP) return pickPlausibleSuboptimal(scored);
  return argmaxWithNoise(scored, noise);
}
```

- **W (weights)** i **defense** se uključuju/gase po tieru.
- "Softer" bot = veći `noise`, veći `blunderP`, isključen `defense`, lošiji `jackTimingValue`. **Nikad** = kršenje pravila.

### 40.3 Tier parametri (polazne vrijednosti — tuning kroz playtest)

| Param | Početnik | Igrač | Majstor |
|-------|----------|-------|---------|
| `noise` | visok | srednji | ~0 |
| `blunderP` | 0.25 | 0.08 | 0.0 |
| card-tracking | ne | osnovno | puno |
| J timing | loš | dobar | optimalan |
| defense (uskraćivanje) | ne | djelimično | da |
| lookahead | 0 | 0 | 1 potez |

### 40.4 Onboarding win-curve (new-player protection)

Standardna praksa tržišta: prvih nekoliko partija novom igraču naginju ka pobjedi da uhvati "ja sam dobar u ovome" dopaminsku kuku, pa se normalizuje.

| Faza | Partije | Ciljana win prob. čovjeka | Bot miks |
|------|---------|---------------------------|----------|
| Hook | 1–5 | ~60–65% | pretežno Početnik |
| Regresija | 6–15 | ~52–55% | Početnik + Igrač |
| Fer | 16+ | ~48–52% | Igrač + Majstor (DDA balansira) |

> Brojke su **hipoteze za validaciju**, ne dogma. Implementiraj ih kao config (`onboardingCurve`) da se tuniraju iz analitike, ne hardkodirano. "Softer" se postiže izborom slabijih tierova i parametara iz 40.2 — ne varanjem pravila.

### 40.5 DDA (dynamic difficulty adjustment)

```typescript
type DDAConfig = {
  targetWinRate: number;        // npr. 0.5 nakon onboardinga
  windowGames: number;          // posmatra zadnjih N partija
  maxAdjustmentPerStep: number; // ograniči koliko brzo mijenja (da ne bude očigledno)
  frustrationSignals: boolean;  // losing streak, rage-quit, brzo napuštanje
};
```

- Ako je čovjek na losing streak-u / pokazuje frustraciju → blago olakšaj (slabiji bot miks).
- Ako predugo pobjeđuje → blago otežaj.
- **Ograničeno i sporo** — ako je očigledno da je "namješteno", gore je nego ništa. Cilj je nevidljivo držanje u flow kanalu.
- DDA djeluje samo na **izbor bot tierova i parametara**, nikad na rezultat direktno.

---

## 41. Bot timing, ponašanje i social sloj 🆕

### 41.1 Timing (da sto ne izgleda robotski)

- Potez se ne igra instant. Delay se uzorkuje iz distribucije, npr. **1.2–5.5s**, duže kad ima više legalnih opcija (simulacija "razmišljanja").
- Varijabilnost po botu (jedan bot "brz", drugi "spor") — dio njegovog profila.
- **Botovi nikad ne smiju okinuti turn-timer / auto-play / AFK sistem** (FR-015/016). Oni su server-driven akteri; auto-play je samo za realne AFK ljude.
- Kod 2-bot stolova (čovjek + 1 bot u 2P, ili više botova u 4P) paziti da zbir delay-a ne čini partiju sporom — cap ukupno tempo.

### 41.2 Reactions (botovi koriste postojeći sistem iz Sekcije 34)

Botovi povremeno šalju reactions da sto "živi":
- Niska vjerovatnoća + poštuju isti 2s cooldown.
- Kontekstualno: nakon J sweep-a → 😮/🔥; kad izgube 2♣ → 😭; protivnikov dobar potez → 🙌; nasumično tokom partije → 😂/🤔.
- Ne pretjerivati — par reactions po partiji po botu, ne spam.

### 41.3 Disconnect/abandon: botovi su imuni

- Bot se ne "diskonektuje". Nema pause/abandon vote zbog bota.
- Ako u Quick Play stolu **čovjek** ode, primjenjuju se postojeća pravila (Sekcija 32), ali sto sa preostalim botovima može jednostavno da završi partiju ili da se raspusti bez glasanja (vidi otvoreno pitanje 48).

---

## 42. State model izmjene za botove 🆕

### 42.1 Player tip (proširenje)

```typescript
type Player = {
  id: string;
  displayName: string;
  seatIndex: number;
  teamId?: number;
  connectionStatus: "connected" | "reconnecting" | "abandoned";
  isHost: boolean;
  consecutiveAutoPlays: number;
  isBot: boolean;            // 🆕 SAMO server-side
  botProfile?: BotProfile;   // 🆕 SAMO server-side
};
```

### 42.2 Novi tipovi

```typescript
type BotSkillTier = 1 | 2 | 3;

type BotIdentity = {
  displayName: string;
  avatar: string;
  gender: "m" | "f" | "neutral";
};

type BotProfile = {
  identity: BotIdentity;
  tier: BotSkillTier;
  timing: { minMs: number; maxMs: number };
  reactionProbability: number;   // 0..1 po potezu
  personaId?: string;            // za "regulare" (39.5)
};
```

### 42.3 KRITIČNO: bot se ne smije otkriti klijentu

`PublicPlayer` (Sekcija 13) **NE SMIJE** sadržavati `isBot` ni `botProfile`. Bot se serijalizuje identično kao čovjek (samo `displayName`, `avatar`, `seatIndex`, score-ovi, `handCounts`).

```typescript
function toPublicPlayer(p: Player): PublicPlayer {
  return {
    id: p.id,
    displayName: p.displayName,
    avatar: p.botProfile?.identity.avatar ?? p.avatar,
    seatIndex: p.seatIndex,
    teamId: p.teamId,
    isHost: p.isHost,
    // NEMA isBot, NEMA botProfile
  };
}
```

Dodati u **Sekciju 22 (anti-cheat)** test: payload za bilo kog igrača ne smije sadržavati `isBot`/`botProfile`. (Bot-leak je isto curenje skrivene informacije kao i tuđa ruka.)

### 42.4 Bot kao server-driven akter

- Bot nema socket; server interno poziva `chooseMove` (Sekcija 40.2) i šalje isti `PlayCardRequest` kroz `applyMove`.
- Bot "potez" prolazi kroz identičnu validaciju kao ljudski — nema posebne grane.
- Move history označava bot poteze interno (`is_bot_move`) za analitiku, ali to se NE emituje u public log kao bot.

---

## 43. Analytics izmjene (v3) 🆕

### 43.1 Novi eventi

- `quickplay_requested` (playerCount, targetScore)
- `quickplay_matched` (waitMs, botsAtTable, humansAtTable)
- `bot_seat_filled`
- `bot_replaced_by_human`
- `bot_difficulty_adjusted` (oldMix, newMix, reason)
- `suspected_bot_reported` 🆕 (ako uvedemo report dugme — Could-have)

### 43.2 Ključni novi metrici

| Metrik | Zašto |
|--------|-------|
| `bot_seat_share` (udio bot sjedišta u svim odigranim sjedištima) | Mora **padati** kroz vrijeme; trajno visok = nema realne likvidnosti |
| `win_rate_by_session_number` | Validacija onboarding krive (40.4) |
| `human_only_retention` (D1/D7 računato SAMO na bazi human-vs-human partija) | Pravi PMF signal |
| `time_to_first_match` | Quick Play obećanje "igraj odmah" |

### 43.3 Oprez (povezano sa Risk 8)

Botovi **napumpaju** "completion rate", "games played", "session length". Ti metrici više nisu čisti PMF signal. Uvijek odvajati **human-only** kohortu. Bot-padded engagement može da te slaže da imaš proizvod kad nemaš.

---

## 44. Etika, disclosure i regulatorni okvir 🆕

> Ovo nije pravni savjet — provjeri sa pravnikom za tvoju jurisdikciju. Ovo je inženjersko-produkt okvir granica.

### 44.1 Zašto je in-game prikrivanje botova ovdje OK

- Coins su **kozmetika i ne mogu se unovčiti** → nije kockanje, nema realnog novca na stolu.
- Predstavljanje botova kao igrača sa realnim imenima je **standardna i raširena praksa** u casual mobilnom gaming-u (kartaške igre, .io igre itd.).
- "Obmana" je samo: misliš da igraš protiv ljudi, a dio su botovi. Bez finansijske štete, bez ranjivih korisnika u riziku.

### 44.2 Granice koje se NE prelaze

1. **Coins ostaju neunovčivi.** Onog trenutka kad coins postanu cashable ili se uvede pravi ulog → ulaziš u kockarsku regulativu **i** botovi protiv pravog novca postaju prevara. To je tvrda crta. Domena "kartaonica" čini ovo pitanje još osjetljivijim — drži se kozmetike.
2. **ToS disclosure.** Stavi liniju u Uslove korišćenja: "stolovi mogu uključivati AI igrače radi bržeg uparivanja." Pokriva te, a ne ruši iluziju u igri.
3. **Marketing ≠ in-game.** Smiješ imati botove u igri, ali NE smiješ u marketingu lažirati "X hiljada igrača online" napumpano botovima — to je lažno oglašavanje, drugačija i rizičnija stvar.
4. **DDA u granicama.** Dinamičko podešavanje težine je OK (nema novca). Ne vezuj ga ni za kakvu kupovinu/ishod koji utiče na trošenje.

### 44.3 Sažeto

In-game: botovi se predstavljaju kao igrači — OK za neunovčive coins, standardno. ToS: reci da AI igrači postoje. Tvrda crta: nikad cashable / pravi ulog uz botove.

---

## 45. Amandmani na postojeće sekcije 🆕

- **Sekcija 3 (Scope):** "Quick Play (javni stolovi sa botovima)" → In scope. "Botovi / AI igrači" izlazi iz Out-of-scope (ostaje out: public *human* matchmaking ranking, login). Privatne sobe: dodat host toggle za bot-fill.
- **Sekcija 5 (Success criteria):** dodati (10) "Botovi se ne mogu trivijalno razlikovati od ljudi u kratkom testu" i (11) "human-only signal se odvojeno mjeri".
- **Sekcija 12/13 (State):** kako u Sekciji 42.
- **Sekcija 22 (Anti-cheat):** dodati red u tabelu — "Igrač pokušava detektovati bote iz payload-a → public state ne sadrži isBot/botProfile".
- **Sekcija 25 (Analytics):** kako u Sekciji 43.
- **Sekcija 28 (Backlog):** Must-have += Quick Play matchmaking, Bot engine (3 tiera), Name generator, Bot timing+reactions, **home redizajn + matching ekran (§49)**. Should-have += regulari pool. Could-have += suspected-bot report dugme, sound za bot reactions. **Single-player izbačen (v3.2).**

---

## 46. Playtest izmjene (v3) 🆕

### 46.1 Razdvajanje signala

- Svi retention/PMF go/no-go iz Sekcije 35 se sada računaju na **human-only** partijama. Bot-padded brojke su zasebne (operativni health, ne PMF).

### 46.2 Novi survey/metric u Fazi 2/3

- Pitanje: **"Da li ti se činilo da igraš protiv pravih ljudi?"** (skala). Cilj: visok udio "da" = name/timing/behavior sistem radi.
- `win_rate_by_session_number` prati krivu iz 40.4; ako nova-igrač win rate nije podignut → hook ne radi; ako je predivisok (npr. >75%) → prelako, dosadno.
- Auto-play događaji **bota** moraju biti **0** (bot ne smije ikad pasti na timer).

### 46.3 Izmijenjen go/no-go za mobile

Iz našeg razgovora: web validira **ljepljivost loop-a**, ne monetizaciju. Botovi čine loop **testabilnim na nuli**, ali pazi —

> **Native go/no-go se oslanja na human-to-human ljepljivost, NE na bot-padded brojke.**
> - `human_only D7 ≥ 20%` **I** `organic invite ≥ 40%` **I** `bot_seat_share` pokazuje silazni trend → idi mobile.
> - Ako sve izgleda dobro ali je `bot_seat_share` trajno ~100% → nemaš ljudsku likvidnost, samo igraš sam protiv svojih botova. To je **no-go za mobile**, koliko god "engagement" izgledao lijepo.

---

## 47. Milestones (v3 dodaci) 🆕

### Milestone 7: Bot engine
- `chooseMove` evaluacija (Sekcija 40), 3 tiera, parametri kao config.
- Unit testovi: bot uvijek bira legalan potez; force-capture poštovan; J timing po tieru; blunderP/noise se ponašaju kako treba.
- **DoD:** bot može odigrati kompletnu partiju (2P/3P/4P) kroz `applyMove` bez ijednog ilegalnog poteza, deterministički uz seed.

### Milestone 8: Name & identity generator
- Pool-ovi + kompozicija + distribucija (Sekcija 39).
- Dedup (sto + recency po korisniku), profanity filter, rod↔avatar.
- **DoD:** 1000 generisanih identiteta — 0 duplikata na stolu, 0 kroz profanity filter, distribucija kategorija u granicama ±3% od tabele 39.1.

### Milestone 9: Quick Play + backfill + home/matching redizajn
- Entry point, matchmaking (Sekcija 38), human-over-bot prioritet, host bot-fill toggle za privatne sobe.
- 🆕 Home redizajn (§49): dominantni "Igra – nađi sto", sekundarni "Kreiraj svoj sto", remember-name.
- 🆕 Matching ekran (§49.2) sa staggered "player joined" iz §39.
- **DoD:** korisnik upiše ime (ili preskoči), klikne "Nađi sto", vidi matching ekran i za < ~3s je u partiji koja kreće.

### Milestone 10: Bot timing, reactions, polish
- Timing distribucije, bot reactions, "regulari" (opciono).
- **DoD:** u blind testu većina testera vjeruje da je igrala protiv ljudi (Sekcija 46.2).

---

## 48. Otvorena pitanja v3 — ZATVORENO 🆕

Sve odluke donesene (2026-06-07).

| # | Pitanje | Odluka |
|---|---------|--------|
| 1 | Javni Quick Play ili samo backfill privatnih soba? | **Javni Quick Play** (sa strancima) + privatne sobe ostaju bot-free uz host toggle |
| 2 | In-game prikrivanje bota + ToS disclosure? | **Da** — human-presenting in-game, AI disclosure u ToS, coins ostaju neunovčivi |
| 3 | Onboarding win-curve (~60–65% prvih partija)? | **Da**, kao config za tuning (ne hardkod) |
| 4 | Copy pri zamjeni bot sjedišta čovjekom? | **Samo "[nickname] je otišao"** — nikad riječ "bot" ni naznaka AI (vidi 38.4) |
| 5 | Čovjek napusti sto pun botova? | **Raspustiti bez glasanja** |
| 6 | Eksplicitni single-player mod? | **IZBAČEN (v3.2)** — Quick Play sa lakim botovima je dovoljan; vidi 37.5 |

---

## 49. Home & matching flow (v3.2) 🆕

### 49.1 Home screen (redizajn)

Fokus je na jednoj akciji. Hijerarhija:

- **Primarni (dominantni) CTA:** "Igra – nađi sto" — vizuelno najjači element ekrana.
- **Polje za ime:** jedan input uz primarni CTA. Povratni korisnik ga ne vidi (ime zapamćeno na uređaju), pa je akcija jedan tap.
- **Sekundarni CTA:** "Kreiraj svoj sto" — manje istaknut, sa podtekstom: *"Privatni sto samo za tebe i prijatelje."* Vodi na postojeći flow (ime + broj igrača + target score).
- Uklonjeno sa home-a: izbor broja igrača / target score-a za Quick Play (sada fiksno 4 / 21), i "Vježbaj" (izbačen).

### 49.2 Matching ekran (fake matching) — design-system dopuna 🆕

Nakon "Nađi sto", loading/matching ekran koji popunjava sto pred korisnikom:

- Prikazuje "Tražimo igrače..." + napredak.
- **Imena/avatari se pojavljuju jedan po jedan** ("Marko se pridružio", "ana_88 se pridružila") koristeći generator iz §39.
- Svrha: (a) prodaje iluziju pune, žive sobe; (b) zabavlja tokom 1–2s spin-up-a.
- Trajanje: kratko ali ne instant — realna mikro-pauza pojačava osjećaj "pravog" matchmakinga; ne predugo (frustracija).

**Potrebne nove design-system komponente:**
- Matching screen layout (4 seat placeholdera koji se popunjavaju).
- "Player joined" red/animacija (avatar + ime, staggered).
- Progress/loading indikator u stilu brenda.

### 49.3 FR dodaci

**FR-021: Pojednostavljen Quick Play entry 🆕**
- Quick Play traži samo ime; konfiguracija fiksna (4 igrača, target 21).
- Ime se persistuje lokalno; povratni korisnik preskače unos.

**FR-022: Matching screen 🆕**
- Prikazuje staggered "player joined" događaje sa imenima iz §39.
- Botovi i ljudi se prikazuju identično (ne otkriva se ko je bot).
- Min/max trajanje konfigurabilno (npr. 1.5–3s).

---

**KRAJ DOKUMENTA v3.2**

> Living document. Promjene preko PR-ova sa updated changelog tabelom na vrhu.
