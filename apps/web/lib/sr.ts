// Serbo-Croatian (ijekavica), sentence case, plain verbs.
// Single source for every visible string. No component hardcodes copy.

import { CONSENT_TEXTS, CURRENT_CONSENT_TEXT_ID } from "@zandar/shared-types";

export const sr = {
  // Zaglavlje stola. "Runda" je ono sto igrac broji za stolom; u kodu je to
  // `handNumber` (dijeljenje). Ne mijenjati jedno bez drugog.
  header: {
    round: (n: number) => `Runda ${n}`,
    menu: "Meni",
  },
  menu: {
    title: "Meni",
    rules: "Pravila igre",
    score: "Rezultat",
    leave: "Izađi na početnu",
    close: "Zatvori",
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
    connected: "Na vezi",
    reconnecting: "Ponovno povezivanje",
    abandoned: "Napustio igru",
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
  create: {
    title: "Nova soba",
    name: "Ime za stolom",
    namePlaceholder: "Kako da te zovemo?",
    players: "Broj igrača",
    target: "Ciljni broj poena",
    submit: "Napravi sobu",
    submitting: "Kreiranje...",
  },
  lobby: {
    title: (id: string) => `Soba ${id}`,
    meta: (n: number, of: number, pts: number) => `${n} / ${of} igrača · ${pts} poena`,
    invite: "Pozovi prijatelje:",
    copy: "Kopiraj",
    copied: "✓ Kopirano",
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
    start: "Pokreni igru",
    starting: "Pokretanje...",
    needMore: (n: number) => `Čeka se još ${n} igrača`,
    waitingHost: "Čeka se da host pokrene igru...",
  },
  join: {
    /* „Hej, {host} te poziva na partiju Žandara" — ime hosta crta ekran između. */
    inviteLead: "Hej,",
    inviteTail: "te poziva na partiju Žandara",
    inviteNoHost: "Čeka te partija Žandara",
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
    game: "Žandar",
    tagline: "Imaš vremena za jednu?",
    play: "Igraj Žandar",
    playLoading: "Tražim sto...",
    playNote: "Zaigraj s drugima. Pokaži šta znaš.",
    friends: "Igraj s prijateljima",
    friendsNote: "Vaše društvo. Vaš sto.",
    privacy: "Privatnost",
    terms: "Uslovi korišćenja",
    about: "O nama",
  },
  matching: {
    preparing: "Pripremamo sto...",
    seating: "Igrači sjedaju...",
    ready: "Sto je popunjen",
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
    unknownPlayer: "Igrač",
    body: "Igra je pauzirana dok se igrač ne vrati. Sačekaj ili pokreni glasanje o prekidu.",
    seconds: (n: number) => `${n} s`,
    keepWaiting: "Sačekaj još",
    voteTitle: "Glasanje o prekidu",
    voteBody: "Igrač se ne vraća. Odluči hoćeš li čekati dalje ili prekinuti partiju.",
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
  /* Sekcija budućih igara na home-u. Kartica je ulaz u prijavu, ne u igru —
     otud „U planu?" i zvono, a ne play ikona ili katanac. */
  upcoming: {
    title: "Šta ćemo sljedeće igrati?",
    body: "Još nisu dostupne. Želiš obavještenje?",
    tag: "U planu?",
    cardLabel: (game: string) => `Obavještenje za ${game}`,
  },
  /* Po igri. Ključ je slug iz `@zandar/shared-types` — nova igra = novi blok.
     Velika slova daje CSS (text-transform) — citac ekrana ume da speluje
     naslov napisan velikim slovima, slovo po slovo. */
  games: {
    poker: {
      name: "Poker",
      status: "Poker još nije dostupan.",
      body: "Razmišljamo o pokeru za tvoje društvo. Ostavi e-adresu i javićemo ti ako otvorimo prve stolove.",
    },
    remi: {
      name: "Remi",
      status: "Remi još nije dostupan.",
      body: "Razmišljamo o remiju za tvoje društvo. Ostavi e-adresu i javićemo ti ako otvorimo prve stolove.",
    },
    bela: {
      name: "Bela",
      status: "Bela još nije dostupna.",
      body: "Razmišljamo o beli za tvoje društvo. Ostavi e-adresu i javićemo ti ako otvorimo prve stolove.",
    },
    raub: {
      name: "Raub",
      status: "Raub još nije dostupan.",
      body: "Razmišljamo o raubu za tvoje društvo. Ostavi e-adresu i javićemo ti ako otvorimo prve stolove.",
    },
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
    missingConsent: "Označi saglasnost ako želiš obavještenje o ovoj igri.",
    sending: "Šaljemo prijavu…",
    error: "Prijava nije poslata. Pokušaj ponovo.",
    successTitle: "Prijava je stigla!",
    successBody: "Javićemo ti ako otvorimo prve stolove za ovu igru.",
    backToGame: "Nazad na Žandar",
  },
  settings: {
    title: "Postavke",
    close: "Zatvori",
    name: "Ime za stolom",
    noName: "Još nije upisano",
    rules: "Kako se igra?",
    deleteData: "Brisanje podataka",
  },
  /* Samo web. U APK-u se sekcija ne renderuje. Imena prodavnica su obična
     oznaka mjesta dok zvanični artwork ne stigne uz živ URL (`lib/stores.ts`). */
  stores: {
    title: "Kartaonica na telefonu",
    unavailable: "Još nije dostupno",
    "app-store": "App Store",
    "google-play": "Google Play",
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
    enable: "Uključi obavještenja",
    notNow: "Ne sada",
    channelName: "Sto i pozivi",
    channelDescription: "Neko kuca na tvoj sto, ulazak je odobren, partija počinje.",
    toggleOn: "Isključi obavještenja o stolu",
    toggleOff: "Uključi obavještenja o stolu",
    stateOn: "Obavještenja o stolu uključena",
    stateOff: "Obavještenja o stolu isključena",
  },
} as const;
