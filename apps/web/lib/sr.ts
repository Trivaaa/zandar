// Serbo-Croatian (ijekavica), sentence case, plain verbs.
// Single source for every visible string. No component hardcodes copy.

import {
  CONSENT_TEXTS,
  CURRENT_CONSENT_TEXT_ID,
  inviteSummary,
  type GameId,
  type ProfileAvatar,
  type TableTheme,
} from "@zandar/shared-types";

import { pluralForm } from "./plural";

/** Broj mjesta koja fale, riječima — poruka se čita kao rečenica, ne kao brojač. */
const MISSING_WORDS = ["", "jedan", "dva", "tri"] as const;

/** Ime igre u genitivu — „partija Žandara / Pokera / Rauba". */
const GAME_GENITIVE: Record<GameId, string> = { zandar: "Žandara", poker: "Pokera", raub: "Rauba", bela: "Bele" };
const GAME_NAME: Record<GameId, string> = { zandar: "Žandar", poker: "Poker", raub: "Raub", bela: "Bela" };

/** „jedan na jedan" / „dva na dva" (samo Žandar ima timove) / „u troje" / „u četvoro". */
function lineupPhrase(game: GameId, players: number): string {
  if (players === 2) return "jedan na jedan";
  if (game === "zandar" && players === 4) return "dva na dva";
  return players === 3 ? "u troje" : "u četvoro";
}

/** „fali još jedan" / „fale još dva" / „fale još tri". */
function missingPhrase(n: number): string {
  const word = MISSING_WORDS[n] ?? String(n);
  return n === 1 ? `fali još ${word}` : `fale još ${word}`;
}

/** „Poker", „Poker i Raub", „Poker, Remi i Raub". */
export function listJoin(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} i ${names[names.length - 1]}`;
}

export const sr = {
  header: {
    menu: "Meni",
  },
  menu: {
    title: "Meni",
    rules: "Pravila igre",
    sound: "Zvuk",
    haptics: "Vibracija",
    soundOn: "Uključen",
    soundOff: "Isključen",
    hapticsOn: "Uključena",
    hapticsOff: "Isključena",
    hapticsUnsupported: "Ovaj uređaj ne podržava vibraciju",
    leave: "Napusti partiju",
    close: "Zatvori",
    // Red stanja ispod naslova (lib/tableMenu.ts).
    players: (n: number) => `${n} igrača`,
    playTo: (n: number) => `do ${n}`,
    countDown: (n: number) => `od ${n} do 0`,
    nextBlinds: (sb: number, bb: number, n: number) =>
      n <= 1 ? `sljedeći nivo ${sb}/${bb} od iduće ruke` : `sljedeći nivo ${sb}/${bb} za ${n} ${n < 5 ? "ruke" : "ruku"}`,
    // Raub, izbor karata (M7).
    deck: "Karte",
    deckHungarian: "Mađarice",
    deckFrench: "Klasik",
    deckNote: "Mijenja samo izgled karata, i to samo kod tebe. Pravila i partija ostaju isti.",
  },
  // Zvuk na stolu (M1): okruglo dugme dolje desno.
  tableSound: {
    on: "Isključi zvuk",
    off: "Uključi zvuk",
  },
  // Potvrda izlaska dok partija traje (QA B1/B11).
  leaveTable: {
    title: "Napusti partiju?",
    body: "Ostali za stolom će odmah vidjeti da te nema i mogu prekinuti partiju. Vratiti se možeš preko linka stola.",
    confirm: "Napusti",
    stay: "Ostani",
  },
  turn: {
    you: "Ti si na potezu",
    other: (name: string) => `${name} je na potezu`,
    thinking: "Razmišlja",
    secondsLeft: (n: number) => `${n} s`,
  },
  table: {
    empty: "Sto je prazan",
    handEmpty: "Ruka prazna",
    jackClear: "Žandar — kupi sve",
    rankMatch: "Isti rank",
    sumMatch: "Zbir",
    // Kratko: traka stoji iznad ruke i dijeli taj pojas sa spilom, pa duga
    // recenica pocne da mu se penje preko. Karte koje treba tapnuti ionako
    // svijetle — recenica nosi PRAVILO, glow nosi metu.
    chooseCapture: "Izaberi grupu",
    trailHint: "Tapni sto da spustiš",
    // Uputstvo, ne panel: puno objasnjenje pravila zivi u RulesModal-u. Ranija
    // dva stringa (103 znaka) su stajala U play-zoni i rasla je za ~9 redova.
    mustCapture: "Moraš kupiti označene",
    pot: "Ulog",
  },
  deck: {
    remaining: "Karata u špilu",
  },
  hand: {
    selectHint: "Dodirni kartu da je podigneš",
  },
  seat: {
    score: "Poeni",
    coins: "Žetoni",
    cards: (n: number) => `${n} karata u ruci`,
  },
  connection: {
    /** Naša veza sa stolom je prekinuta (PK-B3). */
    lost: "Veza je prekinuta — vraćamo te…",
    connected: "Na vezi",
    reconnecting: "Ponovno povezivanje",
    left: "Nije za stolom",
    abandoned: "Nije za stolom",
  },
  suits: {
    clubs: "Tref",
    diamonds: "Karo",
    hearts: "Srce",
    spades: "Pik",
  },
  reveal: {
    sweep: "ŽANDAR!",
    /* Natpis uz sjediste NE ponavlja ime: ono stoji u cipu tacno iznad njega.
       Ime je bilo jedino sto je kutiju cinilo sirokom, a izmjereno je da na
       360px tako pokriva karte na stolu — `BataPenzioner kupi` je 126px, a uz
       bocno sjediste ili partnera to je preko pola karte. */
    captures: "kupi",
    trails: "spušta",
    autoPlay: "automatski",
  },
  score: {
    title: "Rezultat",
    target: (n: number) => `do ${n}`,
    /* Traka rezultata na stolu. "Runda" je ono sto igrac broji za stolom; u kodu
       je to `handNumber` (dijeljenje). Ne mijenjati jedno bez drugog. */
    barRound: (n: number) => `Runda ${n}`,
    barTarget: (n: number) => `do ${n}`,
    barNear: (n: number) => `fali ${n}`,
    barAria: (sides: string) => `Rezultat: ${sides}. Dodirni za detalje.`,
    we: "Mi",
    they: "Oni",
    you: "Ti",
    newsOursSmall: "Mala je naša!",
    newsTheirsSmall: "Mala ide njima",
    newsOursBig: "Velika je naša!",
    newsTheirsBig: "Velika ide njima",
    /* 2P/3P: bez roda i bez "naša". */
    newsYoursSmall: "Mala je tvoja!",
    newsYoursBig: "Velika je tvoja!",
    newsOtherSmall: (name: string) => `Mala ide ${name}`,
    newsOtherBig: (name: string) => `Velika ide ${name}`,
    newsSub: (name: string) => `${name} · na kraju dijeljenja`,
    newsHandEnd: "Kraj dijeljenja",
    newsHandEndSub: "karte, trefovi, mala, velika",
    detailsTitle: "Rezultat",
    thisHand: "Ovo dijeljenje",
    playTo: (n: number) => `igra se do ${n}`,
    points: (n: number) => `${n} ${pluralForm(n, "poen", "poena", "poena")}`,
    teamA: "Tim A",
    teamB: "Tim B",
    expand: "Prikaži razradu",
    collapse: "Sakrij razradu",
    hand: (n: number) => `${n}. dijeljenje`,
    noHands: "Nema odigranih dijeljenja",
    /* Narodski izraz vodi, karta je u zagradi: stari igrac vidi svoj termin, a
       novi zna na koju kartu se odnosi. Isti natpisi idu i u razradu na kraju
       ruke i u `ScorePill` — jedan izvor, da dvije povrsine ne tvrde razlicito.
       Objasnjenje termina stoji u `RulesModal`. */
    mostCards: "Najviše karata",
    mostClubs: "Mak — najviše trefova",
    tenOfDiamonds: "Velika (10 karo)",
    twoOfClubs: "Mala (2 tref)",
    /* Nerijeseno: kategorija ne ide nikome. Malo slovo — cita se kao dio reda
       ("Najvise karata … niko"), ne kao ime igraca. */
    nobody: "niko",
  },
  reactions: {
    title: "Reakcije",
    labels: {
      laugh: "Smijeh",
      wow: "Ma nemoj",
      fire: "Vatra",
      clap: "Bravo",
      cry: "Suze",
      angry: "Ljutnja",
      thinking: "Razmišljam",
      respect: "Svaka čast",
    },
  },
  back: "← Nazad",
  /** Isto, bez strelice u tekstu — strelicu crta ikonica sa aria-hidden. */
  backLabel: "Nazad",
  /* Podloga stola — bira se pred igru. `satisfies`: nova podloga u
     `TABLE_THEMES` bez naziva ovdje ne prolazi typecheck. */
  tableTheme: {
    label: "Izgled stola",
    names: { classic: "Klasik", wood: "Drvo", cloth: "Kafana" } satisfies Record<TableTheme, string>,
  },
  /* Igraj sa početne: list sa izborom stola (zadnji izbor označen), pa za
     sto. Isti izbor je i u Postavkama → Brza igra; ime se pita samo prvi put. */
  quickSetup: {
    players: "Broj igrača",
    target: "Igra se do",
    settingsTitle: (game: string) => `Brza igra · ${game}`,
    saveAndClose: "Sačuvaj i zatvori",
    cancel: "Odustani",
    nameTitle: "Kako da te zovemo?",
    nameSub: "Pod ovim imenom te vide za stolom. Promijeniti ga možeš u Postavkama.",
    nameLabel: "Ime za stolom",
    submit: "Nađi sto",
    submitting: "Tražim sto...",
    error: "Nismo uspjeli naći sto. Pokušaj ponovo.",
  },
  create: {
    title: "Nova soba",
    name: "Ime za stolom",
    namePlaceholder: "Kako da te zovemo?",
    game: "Igra",
    players: "Broj igrača",
    target: "Ciljni broj poena",
    /** Raub odbrojava do nule — red cilja kaže od koliko se kreće (odluka 34). */
    raubStart: "Kreće se od",
    submit: "Napravi sobu",
    submitting: "Kreiranje...",
  },
  lobby: {
    // „Sto", ne „Soba" (tabla Poker NL, odluka 9).
    title: (id: string) => `Sto ${id}`,
    meta: (n: number, of: number, pts: number) => `${n} / ${of} igrača · ${pts} poena`,
    /** Red ispod naslova lobija i pozivnice, po igri (QA 2026-11-09 B1/B2). */
    metaFor: (game: GameId, n: number, of: number, pts: number) =>
      game === "poker"
        ? `${n} / ${of} igrača · Poker · 100 žetona`
        : game === "raub"
          ? `${n} / ${of} igrača · Raub · od ${pts} do 0`
          : game === "bela"
            ? `${n} / ${of} igrača · Bela · do ${pts}`
            : `${n} / ${of} igrača · ${pts} poena`,
    invite: "Pozovi prijatelje:",
    copy: "Kopiraj",
    copied: "✓ Kopirano",
    share: "Pošalji pozivnicu",
    requests: (n: number) => `Zahtjevi za ulazak (${n})`,
    approve: "Odobri",
    reject: "Odbij",
    players: "Igrači:",
    you: "(ti)",
    seat: (n: number) => `Sjedište ${n}`,
    host: "Host",
    team: (letter: string) => `Tim ${letter}`,
    emptySeat: "Čeka se igrač...",
    fillOn: "Popuni prazna mjesta",
    fillOff: "Ostavi mjesta prazna",
    fillHint: "Prazna mjesta popunjavaju protivnici. Ljudi koji se pridruže zauzimaju njihovo mjesto.",
    /** Poker i Raub: popunjavanje praznih mjesta je start (QA PK-P2). */
    startNow: "Počni odmah",
    startingNow: "Pokrećem…",
    startNowHint: "Prazna mjesta popunjavaju protivnici. Ili sačekaj prijatelje — partija počinje čim se mjesta popune.",
    start: "Pokreni igru",
    starting: "Pokretanje...",
    needMore: (n: number) => `Čeka se još ${n} igrača`,
    waitingHost: "Čeka se da host pokrene igru...",
  },
  join: {
    /* „Hej, {host} te poziva na partiju Žandara" — ime hosta crta ekran između. */
    inviteLead: "Hej,",
    inviteTail: (game: GameId) => `te poziva na partiju ${GAME_GENITIVE[game]}`,
    inviteNoHost: (game: GameId) => `Čeka te partija ${GAME_GENITIVE[game]}`,
    name: "Tvoje ime",
    namePlaceholder: "Marko",
    submit: "Sjedi za sto",
    submitting: "Šaljem zahtjev...",
    sending: "Šaljem zahtjev...",
    pending: "Čeka se odobrenje hosta...",
    pendingLead: "Čeka se da",
    pendingTail: "odobri ulazak...",
    approved: "Odobreno! Ulaziš u sobu...",
    rejected: "Host te je odbio",
    expired: "Zahtjev je istekao",
    expiredBody: "Host nije odgovorio na vrijeme.",
  },
  home: {
    brand: "Kartaonica",
    domain: "kartaonica.com",
    /* Ime igre kao rijec; velika slova daje CSS (text-transform), jer citac
       ekrana ume da speluje 'ZANDAR' slovo po slovo. */
    play: "Igraj",
    playSub: "protiv drugih igrača",
    playLoading: "Tražim sto...",
    friends: "S prijateljima",
    create: "Napravi sto",
    createSub: "i pozovi prijatelje",
    /** „2 ili 4 igrača · ~10 min" */
    meta: (players: string, minutes: number) => `${players} · ~${minutes} min`,
    pinned: "Zakačeno",
    lastPlayed: "Zadnje igrano",
    /** Podnaslov igre na kartici liste (tabla „UI · Početna — opcija 1 Lista"). */
    listSub: {
      zandar: "2 ili 4 igrača · do 11 ili 21",
      poker: "Texas Hold'em · 2–4 igrača",
      remi: "2–4 igrača · slaži nizove",
      bela: "4 igrača · 2 na 2",
      raub: "2–4 igrača · od 11 ili 21 do 0",
      tablic: "2–4 igrača · nosi zbirom",
    } as Record<string, string>,
    playGame: (name: string) => `Igraj ${name}`,
    createGame: (name: string) => `Napravi sto: ${name}`,
    more: "Još igara",
    isNew: "Novo",
    openGame: (name: string) => `${name} — više o igri`,
    /* Velika slova daje CSS, kao i za ime igre. */
    soonTitle: "Uskoro · dodirni zvono da ti javimo",
    notifyFor: (name: string) => `Javi mi kad stigne ${name}`,
    // List igre (H4)
    rules: "Pravila",
    pin: "Zakači na vrh",
    unpin: "Otkači",
    close: "Zatvori",
    privacy: "Privatnost",
    terms: "Uslovi korišćenja",
    about: "O nama",
  },
  /* Početna za web (tabla „UI · Početna za web — novi igrači"). Aplikacija je ne
     koristi. Podnaslov kaže ono što novi igrač ne zna: može odmah, bez naloga. */
  homeWeb: {
    title: "Izaberi igru i sjedi za sto",
    sub: {
      zandar: "4 igrača · odmah, bez registracije",
      poker: "2–4 igrača · odmah, bez registracije",
      raub: "4 igrača · odmah, bez registracije",
      bela: "2 na 2 · odmah, bez registracije",
      tablic: "2–4 igrača · odmah, bez registracije",
      remi: "2–4 igrača · odmah, bez registracije",
    } as Record<string, string>,
    friends: "Igraj s prijateljima",
    friendsSub: "Napravi sto i pošalji pozivnicu",
    friendsSheetSub: "Izaberi igru. Zatim napraviš sto i pošalješ pozivnicu.",
    /** Broj igrača u listu „Igraj s prijateljima" (W4). */
    friendsPlayers: {
      zandar: "2 ili 4 igrača",
      poker: "2–4 igrača",
      raub: "2–4 igrača",
    } as Record<string, string>,
    friendsGame: (name: string) => `Napravi sto: ${name}`,
    app: "Igraj u aplikaciji",
    appOpen: "Aplikacija je na telefonu",
    appOpenGo: "Otvori",
    /** Alt = tekst na zvaničnoj oznaci (engleska verzija, od vlasnika 15.11.2026). */
    playBadgeAlt: "Get it on Google Play",
    nav: "Glavni meni",
    /** List za ime poslije „Igraj" (tabla „Ime za stolom — web", I1–I5). */
    name: {
      title: "Kako da te zovemo?",
      label: "Ime za stolom",
      placeholder: "Ime ili nadimak",
      help: "Ovo ime vide ostali za stolom. Promijeniti ga možeš u Postavkama.",
      empty: "Upiši ime, pa sjedaš za sto.",
      submit: "Sjedi za sto",
      submitting: "Tražim sto…",
      guestPrefix: "Preskoči i igraj kao",
      close: "Zatvori",
      /** Red ispod imena igre: kuda igrač ide (brojevi iz `WEB_ZANDAR_PREFS`). */
      meta: {
        zandar: "4 igrača · igra se do 11",
        poker: "4 igrača · Texas Hold'em",
        raub: "4 igrača",
      } as Record<string, string>,
    },
  },
  /* „Vrati se za sto" na početnoj (tabla „UI · Vrati se za sto", QA 10-24 P2).
     Ista traka za sve igre i za web i aplikaciju; mijenja se samo stanje desno. */
  homeResume: {
    myTurn: "NA POTEZU SI",
    away: "IGRA SE BEZ TEBE",
    /** Lobi, i Žandar u pauzi zbog tvog odsustva — sto stoji i čeka. */
    waiting: "STO TE ČEKA",
    finished: "PARTIJA ZAVRŠENA",
    go: "Vrati se",
    result: "Rezultat",
    dismiss: "Zatvori",
    team: (mine: number, theirs: number) => `Vi ${mine} : ${theirs} Oni`,
    duel: (mine: number, theirs: number, name?: string) => `Ti ${mine} : ${theirs}${name ? ` ${name}` : ""}`,
    chips: (n: number) => `${n} ${pluralForm(n, "žeton", "žetona", "žetona")}`,
    toZero: (n: number) => `do 0 ti fali ${n}`,
    seats: (taken: number, total: number) => `${taken} od ${total} igrača`,
    won: "Pobjeda",
    lost: "Poraz",
    place: (n: number) => `${n}. mjesto`,
    /** Desktop (V4): naslov ispod trake, da je jasno šta je glavno. */
    orNew: "Ili izaberi novu igru",
    /** Čitač ekrana: cijela traka je jedno dugme. */
    label: (game: string) => `Vrati se za sto: ${game}`,
    sheet: {
      title: (game: string) => `Već igraš ${game}`,
      /** `other` null = „Igraj s prijateljima" (igra još nije izabrana). */
      body: (other: GameId | null) =>
        `Partija je u toku. Ako sjedneš za ${other ? `sto ${GAME_GENITIVE[other]}` : "novi sto"}, napuštaš ovu partiju, a ostali za stolom to vide.`,
      back: "Vrati se za sto",
      leave: (game: string) => `Napusti partiju i igraj ${game}`,
      leaveFriends: "Napusti partiju i napravi sto",
      leaving: "Napuštam partiju…",
      error: "Nije uspjelo. Pokušaj ponovo.",
      close: "Zatvori",
    },
  },
  /** Ekran prije partije — „Miješamo špil" (tabla UI_MijesanjeSpila). */
  shuffle: {
    title: "Miješamo špil",
    ready: "Svi su tu. Počinjemo!",
    waiting: "Čekamo igrače za stolom",
    starting: "Partija počinje",
    you: "Ti",
    free: "slobodno",
  },
  end: {
    handTitle: (n: number) => `Ruka #${n} gotova`,
    /* Jedan blok, dvije kolone: sta je ruka donijela i gdje si ukupno. Ranije
       dva odvojena spiska — igrac je sam spajao red iz jednog sa redom iz
       drugog, a razrada ispod nije imala gdje da stane. */
    result: "Rezultat:",
    colHand: "ruka",
    colTotal: "ukupno",
    handBreakdown: "Kako su podijeljeni:",
    matchWinner: (name: string) => `${name} pobjeđuje!`,
    nextHand: "Sljedeća ruka →",
    waitingHand: "Čeka se da host pokrene sljedeću ruku…",
    rematch: "Revanš (isti sto)",
    waitingRematch: "Čeka se da host pokrene revanš…",
    newTable: "Novi sto i igrači",
    leave: "Izađi na početnu",
    closeLabel: "Zatvori i idi na početnu",
    pending: "...",
  },
  pause: {
    waitingFor: (name: string) => `${name} se ponovo povezuje`,
    left: (name: string) => `${name} više nije za stolom`,
    unknownPlayer: "Igrač",
    /* Pauza je samo za puklu vezu; glasanje o prekidu se otvara samo kad rok
       istekne, pa tekst ne smije obećavati dugme kojeg nema (QA 2026-11-09 B3). */
    body: "Igra je pauzirana dok se igrač ne vrati. Ako se ne vrati do isteka vremena, glasate o prekidu.",
    seconds: (n: number) => `${n} s`,
    keepWaiting: "Sačekaj još",
    voteTitle: "Glasanje o prekidu",
    voteBody: "Igrač se ne vraća. Odluči hoćeš li čekati dalje ili prekinuti partiju.",
    /** Glasanje odmah poslije namjernog izlaska (QA 2026-11-09 B3). Bez obećanja
        povratka: Žandar ga dozvoljava preko linka, Raub ne. */
    voteBodyLeft: (name: string) =>
      `${name} više nije za stolom. Odluči hoćeš li čekati ili prekinuti partiju.`,
    voteWait: "Čekaj",
    voteEnd: "Prekini",
    voteNone: "Nije glasao",
    abandonedTitle: "Partija je prekinuta",
    abandonedBody: "Partija je završena jer je igrač napustio igru. Možeš izaći i započeti novu.",
    leave: "Izađi",
  },
  /* Korak sa imenom prije ulaska za sto (`/ime`). Home više ne nosi polje za
     ime — traži se tek kad je igrač izabrao šta hoće. Validacija ista kao do
     sad (`lib/playerName.ts`). */
  name: {
    label: "Ime za stolom",
    placeholder: "Kako da te zovemo?",
    submit: "Nastavi",
    change: "Promijeni",
  },
  /* Po igri. Ključ je slug iz `@zandar/shared-types` — nova igra = novi blok.
     Velika slova daje CSS (text-transform) — citac ekrana ume da speluje
     naslov napisan velikim slovima, slovo po slovo. */
  /**
   * Poker (Texas Hold'em NL). Sve na našem (odluka vlasnika 7.11.2026 — ranije
   * su akcije i kombinacije bile na engleskom). Izrazi kakvi se govore za
   * stolom: kenta, boja, ful, poker, va-bank.
   */
  poker: {
    fold: "Odustani",
    check: "Dalje",
    call: (n: number) => `Prati ${n}`,
    bet: "Uloži",
    raise: "Podigni",
    allIn: "Va-bank",
    confirmBet: (n: number) => `Uloži ${n}`,
    confirmRaise: (n: number) => `Podigni na ${n}`,
    /** Natpis iznad avatara — šta je igrač upravo uradio (bez roda). */
    did: {
      fold: "Odustaje",
      check: "Dalje",
      call: (n: number) => `Prati ${n}`,
      bet: (n: number) => `Ulaže ${n}`,
      raise: (n: number) => `Diže na ${n}`,
      allin: "Va-bank",
    },
    /** Nazivi kombinacija, od najslabije. */
    hands: {
      high_card: "Visoka karta",
      pair: "Par",
      two_pair: "Dva para",
      three_of_a_kind: "Triling",
      straight: "Kenta",
      flush: "Boja",
      full_house: "Ful",
      four_of_a_kind: "Poker",
      straight_flush: "Kenta u boji",
      royal_flush: "Rojal fleš",
    },
    // Ne „Odustani" — to je sad fold; ovo samo zatvara list.
    cancel: "Nazad",
    raiseTitle: "Ulažeš",
    raiseTo: "ukupno u ovoj ulici",
    presetMin: "Min",
    presetHalf: "½ pota",
    presetPot: "Pot",
    presetAllIn: "Va-bank",
    less: "Manje",
    more: "Više",
    waitingFor: (name: string) => `Čeka se: ${name}`,
    outOfHand: "Van ruke si do sljedećeg dijeljenja",
    nextHand: "Sljedeća ruka počinje…",
    blinds: "Blindovi",
    // Kratko, za traku gore (M1): puni podatak je u redu stanja menija.
    nextLevel: (n: number) => (n <= 1 ? "zadnja ruka nivoa" : `još ${n} ${n < 5 ? "ruke" : "ruku"}`),
    levelUp: (sb: number, bb: number) => `Blindovi rastu: ${sb}/${bb}`,
    pot: "Pot",
    mainPot: "Glavni pot",
    sidePot: (n: number) => `Pot ${n}`,
    chips: (n: number) => `${n} žetona`,
    waitingConnection: "Čeka se veza",
    noChips: "Bez žetona",
    seatEmpty: "Nije za stolom",
    place: (n: number) => `${n}.`,
    takesPot: (name: string) => `${name} uzima pot`,
    splitPot: "Podijeljen pot",
    handResult: "Rezultat ruke",
    showdownTitle: "Ko je šta imao",
    winner: "Pobjednik",
    won: (n: number) => `+${n}`,
    bustedTitle: "Bez žetona",
    bustedBody: (place: number) => `Tvoj plasman: ${place}. Možeš gledati do kraja ili sjesti za novi sto.`,
    newMatch: "Nova partija",
    watch: "Gledaj do kraja",
    leave: "Izađi",
    matchOver: "Kraj partije",
    matchOverWinner: (name: string) => `Prvo mjesto: ${name}`,
    youWon: "Prvo mjesto je tvoje",
    playAgain: "Igraj ponovo",
    rematch: "Revanš",
    waitingRematch: "Čeka se revanš",
    abandoned: "Partija je prekinuta",
    you: "Ti",
    updateRequired: "Za ovu igru ažuriraj aplikaciju.",
    lobbyHint: "Partija počinje čim se mjesta popune.",
    chipsNote: "Žetoni važe samo u ovoj partiji i nemaju nikakvu vrijednost van nje.",
  },
  /* Bela (docs/bela-spec.md, tabla `UI_Bela`). „MI" je tvoj tim, „VI" protivnici
     (kao na papiru za belu), pa rečenice o timovima idu u „mi / oni". */
  /** Oznaka igre u beta fazi (odluka 16) — na karticama i u beta prozoru. */
  beta: { tag: "BETA", aria: "u beta fazi" },
  bela: {
    phase: {
      calling: "Zvanje aduta",
      trick: (n: number) => `Štih ${n} od 8`,
      handEnd: "Kraj ruke",
      matchEnd: "Kraj partije",
    },
    trump: "ADUT",
    callerOf: (suit: string) => `Adut ${suit} je zvan sa ovog mjesta`,
    score: {
      mi: "MI",
      vi: "VI",
      live: (a: number, b: number) => `ova ruka ${a} : ${b}`,
      to: (target: number) => `do ${target}`,
      open: "Otvori tabelu",
    },
    menuLine: (target: number) => `Beta · 4 igrača · 2 na 2 · do ${target}`,
    beta: {
      title: "Bela je u beta fazi",
      body: "Igra je nova: pravila i izgled još doterujemo. Ako tokom igre nešto ne radi kako treba, javi nam — svaka prijava pomaže.",
      how: "Kad nešto ne radi kako treba, dodirni ovo dugme — stoji desno iznad tvojih karata. Isto je i u meniju: Prijavi grešku.",
      ok: "Razumijem",
      report: "Prijavi grešku",
    },
    hint: {
      lead: "Tvoj red · igraj bilo koju kartu",
      higher: "Tvoj red · moraš ići jače",
      follow: (suit: string) => `Tvoj red · odgovori na boju: ${suit}`,
      overTrump: "Tvoj red · moraš nadjačati adutom",
      trump: (suit: string) => `Tvoj red · nemaš boju, baci adut ${suit}`,
      any: "Tvoj red · nemaš ni boju ni adut",
      waiting: (name: string) => `Čeka se: ${name}`,
      offline: "Nema veze sa stolom",
    },
    call: {
      title: "Zovi adut",
      must: "Moraš zvati adut",
      mustSub: "Svi su rekli Dalje, a ti dijeliš",
      yourTurn: (s: number) => `Tvoj red · 0:${String(Math.max(0, Math.ceil(s))).padStart(2, "0")}`,
    },
    bid: { pass: "Dalje" },
    decl: {
      terca: "Terca",
      kvarta: "Kvarta",
      run: (n: number) => `${n} u nizu`,
      inSuit: (suit: string) => `u ${({ srce: "srcu", list: "listu", žir: "žiru", tikva: "tikvi" } as Record<string, string>)[suit] ?? suit}`,
      four: (what: string) => `Četiri ${what}`,
      calls: (n: number) => `Zove ${n}`,
      none: "Bez zvanja",
      say: (n: number) => `Zovi ${n}`,
      skip: "Ne zovem",
      sub: "prijavljuje se uz kartu",
      shown: (name: string) => `${name} zove`,
      shownWins: "Zvanja broje samo oni koji imaju jače",
      bela: (n: number) => `Bela! +${n}`,
    },
    outcome: {
      pass: "Prolaz",
      fail: "Pad",
      hang: "Visi",
      stiglja: "Štiglja",
      redeal: "Nova podjela",
    },
    sentence: {
      pass: (we: boolean, x: number, all: number) =>
        we ? `Zvali smo mi i prošli: ${x} od ${all}.` : `Zvali su oni i prošli: ${x} od ${all}.`,
      fail: (we: boolean, x: number, all: number) =>
        we
          ? `Zvali smo mi: ${x} od ${all}. Treba više od pola, pa sve ide njima.`
          : `Zvali su oni: ${x} od ${all}. Treba više od pola, pa sve ide nama.`,
      hang: (we: boolean, x: number, all: number) =>
        `Jednako: ${x} od ${all}. Bodovi ${we ? "našeg" : "njihovog"} tima vise do sljedeće ruke.`,
      redeal: "Niko nije zvao adut — dijeli se ponovo.",
    },
    summary: {
      hand: (n: number, suit: string | null) => (suit ? `Ruka ${n} · adut ${suit}` : `Ruka ${n}`),
      cards: "Karte",
      declarations: "Zvanja",
      bela: "Bela",
      total: "Ukupno",
      awarded: "Upisuje se",
      match: "Meč",
      next: "Sljedeća ruka →",
      waitingHost: (name: string) => `Čeka se: ${name}`,
      table: "Tabela",
    },
    tag: { fail: "pad", hang: "visi", stiglja: "štiglja", redeal: "nova podjela" },
    table: {
      title: (target: number) => `Tabela · do ${target}`,
      hand: "Ruka",
      total: "Ukupno",
      empty: "Još nema odigranih ruku.",
      note: "Pad: sve ide protivniku. Visi: bodovi tima koji je zvao čekaju sljedeću ruku.",
      close: "Zatvori",
    },
    end: {
      win: "Pobjeda",
      lose: "Poraz",
      abandoned: "Partija prekinuta",
      team: (a: string, b: string) => `${a} i ${b}`,
      hands: (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "ruka" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "ruke" : "ruku"}`,
      playAgain: "Igraj ponovo",
      rematch: "Revanš",
      home: "Na početnu",
      table: "Tabela",
      waitingHost: (name: string) => `Revanš pokreće ${name}`,
    },
    seat: {
      dealer: "D",
      waitingConnection: "Čeka se veza",
    },
    errors: {
      paused: "Partija je na pauzi.",
      generic: "Potez nije prošao. Pokušaj ponovo.",
    },
  },
  raub: {
    phase: {
      bidding: "Licitacija",
      discard: "Višak",
      going: "Idem?",
      exchange: "Zamjena",
      trick: (n: number) => `Štih ${n} od 4`,
      handEnd: "Kraj ruke",
      matchEnd: "Kraj partije",
    },
    trump: "ADUT",
    offered: "NUDI SE",
    refaChip: (n: number) => `Refa ×${n}`,
    talonCard: (n: number, max: number) => `Karta ${n} od ${max}`,
    deck: (n: number) => `Špil ${n}`,
    deckEmpty: "Špil je prazan",
    /** Odluka 20: karta s talona pripada nosiocu, ali čeka na stolu do njegove zamjene. */
    talonTaken: (name: string) => `Uzima: ${name}`,
    talonTakenMe: "Uzimaš ti",
    seven: {
      hint: (card: string) => `Na stolu je ${card} — štih nije obavezan.`,
      take: "Štih",
      takeNote: "moraš 1 štih",
    },
    bidHint: (suit: string) => `Uzmeš li ${suit}, moraš 2 štiha.`,
    /** Odluka 26: djelilac odlučuje o Raubu/Štihu prije nego vidi svoje karte. */
    blindHint: "Odluči prije nego vidiš svoje karte.",
    deadHint: (suit: string) => `Jači ${suit} je već odbijen — na ovu kartu niko ne može ništa.`,
    bidHintMoja: (seven: string, card: string) => `Imaš ${seven} — „Moja” uzima ${card}.`,
    bid: { raub: "Raub", moja: "Moja", pass: "Dalje", stih: "Štih", refa: "Refa" },
    bidNote: {
      raub: "moraš 2 štiha",
      moja: (seven: string) => `daješ ${seven}`,
    },
    swap: {
      hint: (seven: string, talon: string) => `Imaš ${seven} — zamijeniti je za ${talon} s talona?`,
      no: "Ne",
      yes: (seven: string) => `Zamijeni ${seven}`,
    },
    discard: {
      hint: "Imaš 5 karata. Odbaci jednu.",
      /** Odluka 22: nosilac Rauba/Štiha odbacuje, a karta sa stola tek onda dolazi u ruku. */
      hintClaim: "Odbaci jednu kartu — zatim uzimaš kartu sa stola.",
      button: "Odbaci",
      pick: "Izaberi kartu",
    },
    go: {
      hint: (trump: string, name: string, n: number) => `Adut ${trump} · ${name} mora ${n}`,
      hintMine: (trump: string, n: number) => `Adut ${trump} · moraš ${n}`,
      yes: "Idem",
      no: "Ne idem",
      /** Odluka 19: svi ostali su rekli „Ne idem”. */
      must: "ostali ne idu, ti moraš",
    },
    exchange: {
      hint: "Dodirni karte koje mijenjaš.",
      /** Nosilac Rauba/Štiha: prvo zamjena, pa uzima kartu sa stola i odbacuje jednu (odluka 20). */
      hintClaim: "Dodirni karte koje mijenjaš — zatim odbacuješ jednu i uzimaš kartu sa stola.",
      /** Nosilac „Moja” sa sedmicom: prvo zamjena, pa sedmica za kartu sa stola (odluka 30). */
      hintClaimSeven: "Dodirni karte koje mijenjaš — zatim daješ sedmicu za kartu sa stola.",
      empty: "Špil je prazan — zamjene nema.",
      keep: "Zadrži sve",
      button: (n: number) => `Zamijeni ${n}`,
      buttonNone: "Zamijeni",
      none: "Bez zamjene",
      count: (n: number) => `Zamjena ${n}`,
    },
    yourTurn: "Ti si na potezu",
    waitingFor: (name: string) => `Čeka se: ${name}`,
    hint: {
      lead: "Otvaraš štih — bilo koja karta",
      follow: (suit: string) => `Odgovori na boju ${suit}`,
      followBeat: (suit: string) => `Odgovori na boju ${suit} i nadjačaj`,
      trump: "Nemaš boju — baci adut",
      trumpBeat: "Nemaš boju — nadjačaj adutom",
      any: "Bilo koja karta",
    },
    declarer: {
      raub: (n: number) => `Raub · mora ${n}`,
      seven: (n: number) => `Štih · mora ${n}`,
      moja: (n: number) => `Moja · mora ${n}`,
      short: (n: number) => `Mora ${n}`,
    },
    seat: {
      dropped: "Ne ide",
      waitingConnection: "Čeka se veza",
      dealer: "D",
      tricks: (n: number) => `${n} ${n === 1 ? "štih" : n >= 2 && n <= 4 ? "štiha" : "štihova"}`,
    },
    openCard: "otvorena",
    summary: {
      title: (n: number) => `Kraj ruke ${n}`,
      refaTitle: "Refa",
      void: "Niko nije uzeo adut ni poslije zadnje okrenute karte. Ruka se poništava, a sljedeća se boduje duplo.",
      voidDealer: (name: string) => `Refa djelioca (${name}) na prvoj karti. Ruka se poništava, a sljedeća se boduje duplo.`,
      made: (name: string, t: number, r: number) => `${name}: uzeto ${t} od ${r} — obaveza ispunjena.`,
      failed: (name: string, t: number, r: number) => `${name}: uzeto ${t} od ${r} — kazna.`,
      player: "Igrač",
      tricks: "Štihovi",
      change: "Promjena",
      score: "Bodovi",
      penalty: "kazna",
      dropped: "ne ide",
      double: "×2 refa",
      pending: (n: number) => `Refe na čekanju: ${n}`,
      nextHand: "Sljedeća ruka →",
      waitingHost: (name: string) => `Čeka se: ${name}`,
      table: "Tabela",
    },
    table: {
      title: "Tabela",
      subtitle: (start: number) => `Svi kreću od ${start}. Prvi do 0 pobjeđuje. Kazne su crvene.`,
      hand: "Ruka",
      now: "Sad",
      refaRow: (n: number) => `${n} · refa`,
      doubleRow: (n: number) => `${n} · ×2`,
      pending: (n: number) => `Refe koje čekaju: ${n} · sljedeća odigrana ruka ×2`,
      open: "Otvori tabelu",
      close: "Zatvori",
      dropped: "—",
    },
    end: {
      winner: (name: string) => `Prvo mjesto: ${name}`,
      sharedWinners: "Prvo mjesto dijele",
      points: (n: number) => `${n}`,
    },
    rulesTitle: "Pravila Rauba",
    errors: {
      paused: "Sto je pauziran dok se igrač ne vrati.",
      generic: "Potez nije prošao. Pokušaj ponovo.",
    },
  },
  games: {
    zandar: {
      name: "Žandar",
      players: "2 ili 4 igrača",
      about: "Kafanska klasika: nosi karte sa stola, skupljaj poene, pazi na žandara.",
    },
    poker: {
      name: "Poker",
      players: "2–4 igrača",
      status: "Poker još nije dostupan.",
      body: "Razmišljamo o pokeru za tvoje društvo. Ostavi e-adresu i javićemo ti ako otvorimo prve stolove.",
    },
    remi: {
      name: "Remi",
      players: "2–4 igrača",
      status: "Remi još nije dostupan.",
      body: "Razmišljamo o remiju za tvoje društvo. Ostavi e-adresu i javićemo ti ako otvorimo prve stolove.",
    },
    bela: {
      name: "Bela",
      players: "4 igrača · 2 na 2",
      about: "Timska klasika sa mađaricama: zovi adut, prijavi zvanja i sa partnerom stigni do cilja.",
      status: "Bela još nije dostupna.",
      body: "Razmišljamo o beli za tvoje društvo. Ostavi e-adresu i javićemo ti ako otvorimo prve stolove.",
    },
    raub: {
      name: "Raub",
      players: "2–4 igrača",
      about: "Kafanska igra na štihove: odbrojava se do nule, ko rauba adut mora da ga i odnese.",
      status: "Raub još nije dostupan.",
      body: "Razmišljamo o raubu za tvoje društvo. Ostavi e-adresu i javićemo ti ako otvorimo prve stolove.",
    },
    tablic: {
      name: "Tablić",
      players: "2–4 igrača",
      status: "Tablić još nije dostupan.",
      body: "Razmišljamo o tabliću za tvoje društvo. Ostavi e-adresu i javićemo ti ako otvorimo prve stolove.",
    },
  },
  /* Lažna vrata (Tablić, Remi): kartica izgleda kao prava igra, a dodir otvara
     ovaj list. Iskreno odmah na vrhu: igra još ne postoji. */
  door: {
    title: (name: string) => `${name} dolazi uskoro`,
    body: (name: string) =>
      `${name} još pravimo. Ostavi e-adresu i javićemo ti čim otvorimo prve stolove.`,
    successBody: "Javićemo ti čim otvorimo prve stolove.",
  },
  teaser: {
    title: "Za stolom se ne žuri.",
    tag: "U planu?",
  },
  /* Prijava za obavještenje. Strelice (→ ←) NISU u stringovima: crtaju se kao
     dekoracija sa `aria-hidden`, inače čitač ekrana izgovori „strelica desno". */
  signup: {
    emailLabel: "E-adresa",
    emailPlaceholder: "ime@primjer.com",
    /* Tekst saglasnosti živi u shared-types uz svoj id — server upisuje id, pa
       ovaj string ne smije da se mijenja ovdje nego tamo, pod novim id-jem. */
    consent: CONSENT_TEXTS[CURRENT_CONSENT_TEXT_ID],
    privacyLink: "Politika privatnosti",
    submit: "Prijavi se",
    submitNote: "Prijavama biramo koju igru pravimo sljedeću.",
    invalidEmail: "Provjeri e-adresu i pokušaj ponovo.",
    missingConsent: "Označi saglasnost ako želiš obavještenje.",
    sending: "Šaljemo prijavu…",
    error: "Prijava nije poslata. Pokušaj ponovo.",
    successTitle: "Prijava je stigla!",
    successBody: "Javićemo ti ako otvorimo prve stolove za ovu igru.",
    // Jedna prijava za sve najavljene igre (red „Uskoro" na početnoj).
    manyTitle: (names: string[]) => `Javi mi za ${listJoin(names)}`,
    manyBody: "Ostavi e-adresu i javićemo ti kad otvorimo prve stolove.",
    manySuccessBody: "Javićemo ti kad otvorimo prve stolove.",
    backHome: "Nazad na početnu",
  },
  settings: {
    title: "Postavke",
    close: "Zatvori",
    name: "Ime za stolom",
    noName: "Još nije upisano",
    rules: "Pravila igara",
    deleteData: "Brisanje podataka",
    getApp: "Preuzmi aplikaciju",
    quickPlay: "Brza igra",
    quickPlayNote: "Igraj na početnoj kreće s ovim izborom.",
    sendFeedback: "Pošalji utisak",
  },
  /* „Pošalji utisak" (`/utisak`, tabla A2) i tihi red na početnoj (D1). */
  feedback: {
    homeAsk: "Greška ili ideja?",
    homeLink: "Piši nam",
    title: "Pošalji utisak",
    kindLabel: "Šta nam pišeš?",
    kinds: { bug: "Greška", idea: "Prijedlog", praise: "Pohvala" },
    tableTitle: "Prijavi grešku",
    tableNote: "Partija teče dok pišeš — ako istekne vrijeme, potez se odigra sam.",
    backToTable: "Nazad za sto",
    closeLabel: "Zatvori",
    textLabel: "Poruka",
    placeholders: {
      bug: "Šta se desilo, a šta je trebalo da se desi?",
      idea: "Šta da dodamo ili promijenimo?",
      praise: "Šta ti se dopalo?",
    },
    attachLabel: "Prilog (nije obavezno)",
    attachAdd: "Dodaj sliku",
    attachMore: "Dodaj još",
    attachLimit: (max: number) => `do ${max}`,
    attachRemove: (n: number) => `Ukloni sliku ${n}`,
    attachError: "Ovu sliku ne možemo pročitati. Probaj snimak ekrana.",
    emailLabel: "E-mail za odgovor (nije obavezno)",
    emailPlaceholder: "ime@primjer.com",
    note: "Uz poruku šaljemo i verziju aplikacije i telefon, da brže nađemo grešku.",
    invalidEmail: "Provjeri e-adresu ili ostavi polje prazno.",
    submit: "Pošalji",
    sending: "Šaljemo…",
    error: "Poruka nije poslata. Pokušaj ponovo.",
    doneTitle: "Hvala!",
    doneBody: "Poruka je stigla. Čitamo svaku.",
    doneBodyEmail: "Poruka je stigla. Ako treba, javićemo ti se na e-mail.",
    backHome: "Nazad na početnu",
  },
  /* Saglasnost za Meta App Events (`components/MetaConsent.tsx`). NACRT, ide uz
     pravni pregled politike privatnosti. */
  metaConsent: {
    title: "Mjerenje reklama",
    body: "Da bismo znali koje reklame dovode nove igrače, aplikacija može poslati Meti (Facebook) podatak o instalaciji i otvaranju, zajedno s reklamnim identifikatorom telefona i osnovnim podacima o uređaju. Igra radi isto i ako ne dozvoliš. Izbor možeš promijeniti u Postavkama.",
    policy: "Politika privatnosti",
    accept: "Dozvoli",
    decline: "Ne dozvoli",
    on: "Uključeno",
    off: "Isključeno",
    turnOn: "Uključi",
    turnOff: "Isključi",
  },
  /* Samo web. U APK-u se sekcija ne renderuje. Imena prodavnica su obična
     oznaka mjesta dok zvanični artwork ne stigne uz živ URL (`lib/stores.ts`). */
  stores: {
    /* Ponuda aplikacije na webu (Android): traka na početnoj i red na kraju partije. */
    barLabel: "Aplikacija",
    barTitle: "Kartaonica za Android",
    barBody: "Brže, preko cijelog ekrana, sa obavještenjima",
    barGo: "Preuzmi",
    openTitle: "Kartaonica je instalirana",
    openBody: "Otvori ovaj ekran u aplikaciji",
    openGo: "Otvori",
    rowTitle: "Igraj u aplikaciji",
    rowBody: "Brže, i javimo ti kad te zovu",
    rowGo: "Google Play",
    close: "Zatvori",
    later: "Ne sada",
  },
  /* Pravne stranice. Samo interaktivne labele i tekst poruke — proza zivi u
     samim stranicama (kao /privatnost i /uslovi), jer nosi <strong>, <ul> i
     <Link> koje ova mapa kratkih stringova ne moze da drzi. */
  legal: {
    idLabel: "Tvoj ID uređaja:",
    idLoading: "Čitam sa uređaja...",
    idMissing:
      "Na ovom uređaju nema sačuvanog ID-a — ili nikad nisi igrao u ovom pregledaču, ili su podaci već obrisani. Zahtjev možeš poslati i bez njega, samo će nam trebati više vremena da pronađemo podatke.",
    copy: "Kopiraj ID",
    copied: "Kopirano",
    mailto: "Pošalji zahtjev e-mailom",
    mailSubject: "Zahtjev za brisanje podataka — Kartaonica",
    /** Tijelo poruke kao linije — spajanje radi komponenta (nema escape-a ovdje). */
    mailBodyLines: (id: string | null): string[] => [
      "Poštovani,",
      "",
      "tražim brisanje podataka koje Kartaonica čuva o meni.",
      "",
      id ? `ID uređaja: ${id}` : "ID uređaja: (nije dostupan na mom uređaju)",
      "",
      "Hvala.",
    ],
  },
  /* Ažuriranje aplikacije sa Play-a (`components/AppUpdatePrompt.tsx`). Play-ov
     ekran (preuzimanje, obavezno ažuriranje) je na jeziku sistema — ovo je naša traka. */
  appUpdate: {
    offerTitle: "Stigla je nova verzija",
    offerBody: "Preuzima se u pozadini dok igraš; restart traje par sekundi.",
    update: "Ažuriraj",
    notNow: "Ne sada",
    readyTitle: "Nova verzija je spremna",
    readyBody: "Restartuj aplikaciju da je uključiš.",
    restart: "Restartuj",
  },
  /* Obavještenja (PRD §51). Tekst SAMIH notifikacija živi na serveru
     (`apps/server/src/push/messages.ts`), jer se šalje dok aplikacija ne radi. */
  push: {
    host: {
      title: "Javi mi kad neko pokuca",
      body: "Ako izađeš iz aplikacije dok čekaš, javićemo ti čim neko zatraži mjesto za tvojim stolom.",
    },
    guest: {
      title: "Javi mi kad me primi",
      body: "Možeš izaći iz aplikacije — javićemo ti kad host odobri ulazak.",
    },
    waiting: {
      title: "Javi mi kad partija počne",
      body: "Možeš izaći iz aplikacije — javićemo ti kad host podijeli karte.",
    },
    friends: {
      title: "Javi mi kad me neko doda ili pozove",
      body: "Zahtjev za prijateljstvo i poziv na partiju stižu i kad aplikacija nije otvorena.",
    },
    /* SPEC_PUSH_V2 A1: kraj partije. Kaže SVE što stiže, i podsjetnike. */
    match_end: {
      title: "Da ti javimo?",
      body: "Kad te prijatelj pozove ili neko pokuca na tvoj sto. Ponekad i podsjetnik na partiju, koji gasiš u Postavkama.",
    },
    /* SPEC_PUSH_V2 A4: početna, od drugog dana otvaranja. */
    home_return: {
      title: "Javi mi kad me neko pozove",
      body: "Poziv prijatelja i „neko kuca na tvoj sto“ stižu i kad aplikacija nije otvorena. Ponekad i podsjetnik, koji gasiš u Postavkama.",
    },
    /* Propušten poziv — ponuda unutar lista „Poziv je istekao". */
    invite_missed: {
      title: "Javi mi sljedeći put",
      body: "Uz obavještenja poziv stiže odmah, i kad aplikacija nije otvorena.",
    },
    missedTitle: "Poziv je istekao",
    missedBody: "Stigao ti je poziv na partiju dok aplikacija nije bila otvorena, a u međuvremenu je istekao.",
    enable: "Uključi obavještenja",
    notNow: "Ne sada",
    channelName: "Sto i pozivi",
    channelDescription: "Neko kuca na tvoj sto, ulazak je odobren, partija počinje, prijatelj te zove.",
    friendsChannelName: "Prijatelji",
    friendsChannelDescription: "Zahtjevi za prijateljstvo.",
    toggleOn: "Isključi obavještenja o stolu",
    toggleOff: "Uključi obavještenja o stolu",
    stateOn: "Obavještenja o stolu uključena",
    stateOff: "Obavještenja o stolu isključena",
    remindersChannelName: "Podsjetnici",
    remindersChannelDescription: "Ponekad, kad dugo ne svratiš: revanš, nova igra.",
    /* SPEC_PUSH_V2 A3: red „Obavještenja" u Postavkama. */
    settings: {
      title: "Obavještenja",
      table: "Sto i prijatelji",
      reminders: "Podsjetnici",
      on: "Uključena",
      off: "Isključena",
      offAtPhone: "Isključena u podešavanjima telefona",
      turnOn: "Uključi",
      turnOff: "Isključi",
      openSettings: "Otvori podešavanja",
    },
  },
  /* Donja navigacija (SPEC_IDENTITET §4). */
  nav: {
    label: "Glavna navigacija",
    play: "Igraj",
    friends: "Prijatelji",
    profile: "Profil",
    /** Broj zahtjeva na tabu Prijatelji, za čitač ekrana. */
    requests: (n: number) => `${n} ${pluralForm(n, "zahtjev", "zahtjeva", "zahtjeva")}`,
  },
  /* Profil (SPEC_IDENTITET §6.1, §6.2). */
  profile: {
    title: "Profil",
    completed: (n: number) =>
      `${n} ${pluralForm(n, "završena partija", "završene partije", "završenih partija")}`,
    guestCompleted: (n: number) =>
      `Gost · ${n} ${pluralForm(n, "završena partija", "završene partije", "završenih partija")}`,
    /** Gost bez upisanog imena — slovo i nadimak ne smiju ostati prazni. */
    guestNoName: "Gost",
    benefitsTitle: "Uz nalog:",
    benefits: {
      results: "Rezultati ostaju sačuvani",
      nickname: "Nadimak je samo tvoj",
      devices: "Isti nalog na svakom uređaju",
      friends: "Možeš dodavati prijatelje",
    },
    register: "Registruj se",
    login: "Prijavi se",
    backToPlay: "Nazad na igru",
    loading: "Učitavam profil",
    countError: "Broj partija se nije učitao.",
    retry: "Pokušaj ponovo",
    // Moj profil (P1–P8)
    nicknameRow: "Nadimak",
    avatarRow: "Avatar",
    change: "Promijeni",
    lockedUntil: (date: string) => `Opet od ${date}`,
    settings: "Postavke",
    logout: "Odjavi se",
    loadError: "Profil se nije učitao.",
    loadErrorBody: "Provjeri internet vezu i pokušaj ponovo.",
    avatarSaveFailed: "Avatar nije sačuvan. Ostaje stari.",
    changeNicknameTitle: "Promijeni nadimak",
    changeNicknameNote: "Poslije promjene, sljedeća je moguća za 30 dana.",
    save: "Sačuvaj",
    changeAvatarTitle: "Promijeni avatar",
    // O1
    logoutTitle: "Odjaviti se?",
    logoutBody:
      "Na ovom uređaju igraćeš kao gost dok se ponovo ne prijaviš. Nalog i rezultati ostaju sačuvani.",
  },
  /* Nalog: registracija, prijava, nadimak, avatar (SPEC_IDENTITET tok a/b, §6.3, §6.4). */
  account: {
    back: "Nazad",
    step: (n: number) => `Korak ${n} od 3`,
    cancel: "Odustani",
    close: "Zatvori",
    // A3 / B2
    registerSheetTitle: "Registruj se",
    registerSheetNote: "Partije odigrane kao gost prelaze na nalog.",
    loginSheetTitle: "Prijavi se",
    withGoogle: "Nastavi s Googleom",
    withEmail: "Nastavi s e-mailom",
    // A4 / R5
    registerTitle: "Registruj se e-mailom",
    email: "E-mail",
    password: "Lozinka",
    passwordHint: "Najmanje 8 znakova.",
    showPassword: "Prikaži lozinku",
    hidePassword: "Sakrij lozinku",
    createAccount: "Napravi nalog",
    /* Nalog (i e-mail) nastaje prije A5 — osnov za čuvanje je od tog trenutka jasan. */
    privacyBefore: "Pravljenjem naloga prihvataš ",
    privacyLink: "politiku privatnosti",
    privacyAfter: ".",
    haveAccount: "Već imaš nalog?",
    noAccount: "Nemaš nalog?",
    invalidEmail: "Ovo ne liči na e-mail adresu.",
    weakPassword: "Prekratka je. Najmanje 8 znakova.",
    // R1 / R4 / R7
    loginTitle: "Prijavi se e-mailom",
    forgotPassword: "Zaboravljena lozinka?",
    wrongCredentials: "E-mail ili lozinka nisu tačni.",
    // R2 / R3
    resetTitle: "Zaboravljena lozinka",
    resetBody: "Upiši e-mail naloga. Poslaćemo ti link za novu lozinku.",
    sendLink: "Pošalji link",
    checkEmailTitle: "Provjeri e-mail",
    resetSent: (email: string) => `Ako ${email} ima nalog, stići će link za novu lozinku.`,
    spamHint: "Nema ga? Pogledaj i u neželjenoj pošti.",
    sendAgain: "Pošalji ponovo",
    sendAgainIn: (s: number) => `Pošalji ponovo (${s} s)`,
    backToLogin: "Nazad na prijavu",
    // B4 / R6
    accountExistsTitle: "Ovaj nalog već postoji",
    emailExistsTitle: "Ovaj e-mail već ima nalog",
    dataLoss: (lost: string) =>
      `Ako se prijaviš, gubiš rezultate odigrane kao gost na ovom uređaju: ${lost}.`,
    // A5 / K1–K7
    nicknameTitle: "Izaberi nadimak",
    nicknameSub: "Pod ovim imenom te vide za stolom.",
    nicknameLabel: "Nadimak",
    nicknameRules: "3–16 znakova: slova, brojevi, _ i tačka. Bez razmaka.",
    checking: "Provjeravam…",
    free: "Slobodan je.",
    taken: "Zauzet je. Možda neki od ovih:",
    tooShort: "Prekratak je. Najmanje 3 znaka.",
    space: "Razmak nije dozvoljen.",
    badChar: (c: string) => `Znak ${c} nije dozvoljen.`,
    blocked: "Ovaj nadimak nije dozvoljen. Izaberi drugi.",
    fromGuestSpace: "Razmak iz imena smo zamijenili donjom crtom.",
    fromGuestCyrillic: "Ime smo prepisali latinicom.",
    terms: "Prihvatam uslove korišćenja",
    termsLink: "uslove korišćenja",
    next: "Dalje",
    // A6
    avatarTitle: "Izaberi avatar",
    avatarSub: "Vidi se za stolom, pored nadimka.",
    // Pristupačan naziv crteža. `satisfies`: novi avatar u PROFILE_AVATARS bez
    // naziva ovdje ne prolazi typecheck.
    avatarNames: {
      lisica: "Lisica",
      sova: "Sova",
      jez: "Jež",
      medvjed: "Medvjed",
      zec: "Zec",
      macka: "Mačka",
      jelen: "Jelen",
      pijetao: "Pijetao",
      zaba: "Žaba",
      ovan: "Ovan",
    } satisfies Record<ProfileAvatar, string>,
    done: "Gotovo",
    // A7 / A8
    verifyTitle: "Provjeri e-mail",
    verifySent: (email: string) => `Poslali smo ti link na ${email}. Dodirni ga da potvrdiš e-mail.`,
    ok: "U redu",
    unverified: "E-mail nije potvrđen.",
    // zajedničko
    genericError: "Nešto nije uspjelo. Pokušaj ponovo.",
    networkError: "Nema veze. Provjeri internet i pokušaj ponovo.",
    tooMany: "Previše pokušaja. Sačekaj malo pa pokušaj ponovo.",
  },
  /* Brisanje naloga — tok c (SPEC_IDENTITET C1–C6). */
  deleteAccount: {
    entry: "Obriši nalog",
    title: "Obriši nalog",
    whatGoes: "Brisanjem nestaje:",
    nicknameAndAvatar: (nickname: string) => `Nadimak ${nickname} i avatar`,
    results: (n: number) =>
      `${n} ${pluralForm(n, "završena partija", "završene partije", "završenih partija")} i svi rezultati`,
    signInEverywhere: "Prijava na svim uređajima",
    irreversible: "Ovo se ne može vratiti.",
    keepPlaying: "Igrati možeš i dalje, kao gost.",
    continue: "Nastavi",
    verifyTitle: "Potvrdi da si to ti",
    verifyPassword: (email: string) => `Upiši lozinku za ${email}.`,
    verifyGoogle: "Prijavi se ponovo istim Google nalogom.",
    wrongPassword: "Lozinka nije tačna.",
    confirm: "Potvrdi",
    finalTitle: "Obrisati nalog zauvijek?",
    finalBody: "Nalog i rezultati brišu se odmah i ne mogu se vratiti.",
    doneTitle: "Nalog je obrisan",
    doneBody: "Hvala na partijama. Igrati možeš i dalje, kao gost.",
    backHome: "Nazad na početnu",
  },
  /* Tuđi profil i kartica igrača bez naloga (T1–T5). */
  otherProfile: {
    open: (name: string) => `Profil igrača ${name}`,
    title: "Profil igrača",
    close: "Zatvori",
    loadError: "Profil se nije učitao.",
    // §6.9 Blokiraj i prijavi
    blockOrReport: "Blokiraj ili prijavi",
    block: "Blokiraj",
    report: "Prijavi nadimak ili ponašanje",
    blockConfirm: (name: string) => `Blokirati ${name}?`,
    blockBody:
      "Više vam se neće slati zahtjevi ni pozivi, a prijateljstvo se prekida. Neće dobiti obavještenje.",
    blocked: "Blokiran",
    unblock: "Odblokiraj",
    reportTitle: (name: string) => `Prijavi ${name}`,
    reasons: {
      nickname: "Uvredljiv nadimak",
      impersonation: "Lažno predstavljanje",
      harassment: "Uznemiravanje",
      other: "Drugo",
    },
    sendReport: "Pošalji prijavu",
    reportThanks: "Hvala. Pogledaćemo prijavu.",
    // F2–F6
    addFriend: "Dodaj za prijatelja",
    requestSent: "Zahtjev je poslat",
    withdraw: "Povuci zahtjev",
    wantsFriend: "Želi da budete prijatelji",
    acceptRequest: "Prihvati zahtjev",
    decline: "Odbij",
    areFriends: "Prijatelji ste",
    inviteToGame: "Pozovi na partiju",
    removeFriend: "Ukloni iz prijatelja",
    removeConfirm: (name: string) => `Ukloniti ${name} iz prijatelja?`,
    removeBody: "Neće dobiti obavještenje. Kasnije možeš ponovo poslati zahtjev.",
    remove: "Ukloni",
  },
  /* Pozivi na partiju — tok e (SPEC_IDENTITET E1–E5, F7). */
  invite: {
    open: "Pozovi",
    title: "Pozovi na partiju",
    options: "Broj igrača · igra se do",
    send: (n: number) => `Pošalji poziv (${n})`,
    fromRoom: "Pozovi iz prijatelja",
    // F5/F6 (tabla P1): „Pozovi iz prijatelja" bez prijatelja nikad ne vodi u prazno.
    linkInstead: "Pošalji pozivnicu linkom",
    emptyLink: "Do tada im pošalji link.",
    close: "Zatvori",
    pending: "Poziv poslat · čeka se odgovor",
    incomingTitle: (name: string) => `${name} te zove na partiju`,
    /** Isti red kao push poziva — tekst je u `shared-types` (PK-B2). */
    incomingBody: (game: GameId, players: number, target: number) => inviteSummary(game, players, target),
    join: "Pridruži se",
    notNow: "Ne sada",
    expiredTitle: "Poziv više ne važi",
    expiredBody: "Partija je već počela ili je soba zatvorena.",
    ok: "U redu",
  },
  /* Prijatelji (SPEC_IDENTITET §6.6). */
  friends: {
    title: "Prijatelji",
    guestTitle: "Prijatelji su za igrače s nalogom",
    guestBody: "Napravi nalog, dodaj svoje društvo i zovi ih na partiju jednim dodirom.",
    // D1
    emptyTitle: "Još nemaš prijatelja",
    emptyBody: "Dodaj ih po nadimku, ili dodirni igrača za stolom pa Dodaj za prijatelja.",
    addFriend: "Dodaj prijatelja",
    add: "Dodaj",
    // D4 / lista
    requestsTitle: (n: number) => `Zahtjevi za prijateljstvo (${n})`,
    listTitle: (n: number) => `Prijatelji (${n})`,
    accept: "Prihvati",
    decline: "Odbij",
    // D5
    accepted: (name: string) => `${name} je sada tvoj prijatelj.`,
    // D2 / D3
    addTitle: "Dodaj prijatelja",
    addSub: "Upiši nadimak igrača. Dobiće zahtjev i odlučiti da li prihvata.",
    searchLabel: "Nadimak",
    minChars: "Najmanje 3 slova.",
    searching: "Tražim…",
    noResults: "Nema igrača s tim nadimkom.",
    sent: "Zahtjev poslat",
    already: "Već ste prijatelji",
    // F8 / F9
    loading: "Učitavam prijatelje",
    loadError: "Prijatelji se nisu učitali.",
    loadErrorBody: "Provjeri internet vezu i pokušaj ponovo.",
  },
  /* „Pošalji pozivnicu" (QA P1) — tabla „Pozivnica — tekstovi", share.msg.a. */
  adminSignups: {
    title: "Prijave za nove igre",
    tokenLabel: "Admin token",
    open: "Prikaži prijave",
    opening: "Otvaram…",
    refresh: "Osvježi",
    download: "Preuzmi CSV",
    wrongToken: "Token nije prihvaćen.",
    network: "Server se ne javlja. Pokušaj ponovo.",
    empty: "Još nema prijava.",
    addresses: (n: number) => `${n} ${pluralForm(n, "adresa", "adrese", "adresa")}`,
    note: "Jedna prijava sa početne važi za sve najavljene igre, pa spisak igara ne pokazuje interes po igri.",
  },

  share: {
    title: (game: GameId) => `Pozivnica za ${GAME_NAME[game]}`,
    msg: (game: GameId, host: string, players: number, missing: number, link: string) =>
      `${host} te zove na partiju ${GAME_GENITIVE[game]} 🃏 Igramo ${lineupPhrase(game, players)}, ${missingPhrase(
        missing,
      )}. Ništa ne instaliraš, samo otvori: ${link}`,
  },
} as const;
