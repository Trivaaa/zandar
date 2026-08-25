// Serbo-Croatian (ijekavica), sentence case, plain verbs.
// Single source for every visible string. No component hardcodes copy.

export const sr = {
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
    chooseCapture: "Izaberi koje karte kupiš",
    trailHint: "Tapni sto da spustiš kartu",
    blockedTitle: "Moraš kupiti karte",
    blockedBody: "Sa ovom kartom postoji kupovina, pa ne možeš ostaviti kartu na stolu. Izaberi jednu od označenih grupa.",
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
} as const;
