// ====================================================
// RAUB — tipovi stanja i pogleda
// Spec: docs/raub-spec.md
// ====================================================

import type { AbandonVote, Card, PublicPlayer, Rank, Suit } from "./index";

/**
 * Pravila stola. Izbori iz tabele „Gdje se izvori razilaze" su parametri
 * (spec, odluka 5), da se mogu mijenjati bez prepravljanja logike.
 */
export interface RaubRules {
  playerCount: 2 | 3 | 4;
  startScore: number;
  /** Koliko karata se okreće na talon prije refe (spec: 3, alternativa 2). */
  maxTalonFlips: 2 | 3;
  /** Ko prvi licitira u scenariju 3. */
  firstBidder: "dealer" | "right_of_dealer";
  /**
   * Smjer igre po `seatNo`: +1 = sljedeće mjesto (na ekranu desno od tebe,
   * isto kao Žandar), −1 = obrnuto.
   */
  direction: 1 | -1;
  /** Mora li igrač nadjačati kartu na stolu kad može (spec: ne). */
  mustOvertrump: boolean;
  /**
   * „Idem / Ne idem" (pagat; odluka 9): kad se odredi adut, svaki igrač osim
   * nosioca bira da li igra ruku. Ko ne ide, ne boduje se. Bez ovoga sa 4
   * igrača bodovi u prosjeku rastu i meč ne stiže do 0 (simulacija 7.11.2026).
   * Zadnji upitani mora ići ako su svi prije njega rekli „Ne idem" (odluka 19).
   */
  allowDrop: boolean;
  turnTimeoutSeconds: number;
  /**
   * Rangovi na koje se smije reći „Raub" (odluka 13: samo A, K, Q, J).
   * Opciono: stari snapshot ga nema → podrazumijevano iz `DEFAULT_RAUB_RULES`.
   */
  raubRanks?: Rank[];
  /** Sedmica na talonu: djelilac bira „Štih" ili „Dalje" (odluka 13). Bez polja = da. */
  stihOptional?: boolean;
  /** Koliko štihova mora igrač koji kaže „Moja" (odluka 13). Bez polja = 2. */
  mojaRequiredTricks?: number;
  /** „Raub" smije reći samo djelilac (odluka 15). Bez polja = da. */
  raubDealerOnly?: boolean;
  /**
   * „Raub" samo na prvoj okrenutoj karti; na drugoj i trećoj samo „Moja" ili
   * „Dalje", i djeliocu (odluka 15). Bez polja = da.
   */
  raubFirstFlipOnly?: boolean;
  /**
   * Kad djelilac smije „Raub", bira samo „Raub" ili „Dalje" — bez „Moja"
   * (odluka 16). Ostali u tom krugu i dalje smiju „Moja". Bez polja = da.
   */
  dealerRaubOrPass?: boolean;
  /**
   * „Moja" traži sedmicu boje ponuđene karte (odluka 13). Od odluke 15 ne traži:
   * bez sedmice karta ostaje na talonu. Bez polja = ne traži.
   */
  mojaNeedsSeven?: boolean;
  /**
   * Djelilac smije odmah reći „Refa" na prvoj okrenutoj karti (prije svog
   * odgovora), ali ne na drugoj ni trećoj (odluka 23). Bez polja = da.
   */
  dealerRefaFirstFlip?: boolean;
  /**
   * Djelilac odlučuje naslijepo (odluka 26): kad na prvoj okrenutoj karti smije
   * „Raub" (A, K, Q, J) ili „Štih" (7), ne vidi svoje karte dok ne odgovori
   * (Raub/Štih, Dalje ili Refa). Ostali vide svoje odmah. Bez polja = da.
   */
  dealerBlindFirstFlip?: boolean;
  /**
   * Prvi koji zamijeni sve 4 dobija 5 karata (treća otvorena) i odbacuje jednu
   * (odluka 1, igresakartama.com). Od odluke 25 isključeno: koliko daš, toliko
   * dobiješ (pagat.com). Bez polja = isključeno.
   */
  fullExchangeBonus?: boolean;
  /**
   * Refa se prenosi preko Štiha (odluka 27): ruka u kojoj je djelilac rekao
   * „Štih" boduje se ×1 i ne troši refu; refe čekaju sljedeću ruku s Raubom
   * ili Mojom. Bez polja = da.
   */
  stihSkipsRefa?: boolean;
  /**
   * Sedmica aduta uzima kartu s talona (odluka 29): kad je „Moja" rečena bez
   * sedmice i karta je ostala na talonu, svaki igrač koji igra (i nosilac) a
   * poslije svoje zamjene drži sedmicu aduta smije je dati za tu kartu; prvi u
   * redu zamjene ima prednost. Bez polja = da.
   */
  mojaTalonSeven?: boolean;
}

/**
 * - `playing`: ruka u toku (korak je u `step`)
 * - `hand_complete`: ruka bodovana ili poništena (refa); čeka se host
 * - `match_finished`: neko je stigao do 0
 * - `abandoned`: server prekinuo meč (glasanje, nema živog čovjeka)
 */
export type RaubPhase = "playing" | "hand_complete" | "match_finished" | "abandoned";

/**
 * Korak ruke. `seven_choice`: sedmica je na talonu, djelilac bira Štih / Dalje.
 * `await_open`: SAMO stari snapshot (raub naslijepo je uklonjen, odluka 13) —
 * hidracija ga prevodi u `bidding`, motor ga više ne pravi.
 * `swap_seven`: nosilac iz licitacije bira zamjenu sedmice za talon.
 * `discard_extra`: igrač sa 5 karata odbacuje jednu.
 * `going`: igrači osim nosioca biraju Idem / Ne idem.
 */
export type RaubStep =
  | "seven_choice"
  | "await_open"
  | "bidding"
  | "swap_seven"
  | "discard_extra"
  | "going"
  | "exchange"
  | "tricks";

/**
 * `seven` = Štih na sedmicu (mora 1), `bid` = Raub (mora 2), `moja` = sedmica
 * te boje zamijenjena za kartu sa talona (mora 2). `blind` (raub naslijepo)
 * je uklonjen (odluka 13) i ostaje samo u istoriji starih mečeva.
 */
export type RaubScenario = "seven" | "blind" | "bid" | "moja";

export type RaubBid = "raub" | "moja" | "pass";

/** Namjera klijenta (socket `raub:action`). */
export type RaubAction =
  | { type: "stih"; take: boolean }
  | { type: "bid"; bid: RaubBid }
  | { type: "swap_seven"; swap: boolean }
  | { type: "go"; go: boolean }
  | { type: "discard"; cardId: string }
  | { type: "exchange"; cardIds: string[] }
  | { type: "play"; cardId: string }
  /** Djelilac poništava ruku na prvoj okrenutoj karti (odluka 23). */
  | { type: "refa" };

export type RaubActionType = RaubAction["type"];

export type RaubActionRequest = RaubAction & { clientKnownStateVersion?: number };

export interface RaubTrickPlay {
  playerId: string;
  card: Card;
}

export interface RaubTrick {
  leaderId: string;
  plays: RaubTrickPlay[];
  /** `null` dok štih nije pun. */
  winnerId: string | null;
}

/** Sjedište — SAMO server (nosi ruku). */
export interface RaubSeat {
  playerId: string;
  /** Isto što i `seatIndex` u sobi — raspored za stolom se ne miješa. */
  seatNo: number;
  score: number;
  hand: Card[];
  /** Štihovi u tekućoj ruci. */
  tricks: number;
  /** Zadnji odgovor u tekućem krugu licitacije; `null` prije odgovora. */
  bid: RaubBid | null;
  /** Koliko karata je zamijenio u ovoj ruci; `null` dok nije na redu. */
  exchanged: number | null;
  /** Idem (true) / Ne idem (false); `null` dok ne odgovori. Nosilac uvijek ide. */
  going: boolean | null;
  /** Konačan plasman (1 = pobjednik); `null` dok meč traje. */
  place: number | null;
}

/** Red pregleda ruke i tabele rezultata. */
export interface RaubHandRow {
  playerId: string;
  tricks: number;
  /** Promjena bodova (već pomnožena sa ×2 refe). */
  delta: number;
  /** Kazna (nosilac nije ispunio obavezu ili igrač bez štiha). */
  penalty: boolean;
  /** Rekao „Ne idem" — ne boduje se u ovoj ruci. */
  dropped: boolean;
  scoreBefore: number;
  scoreAfter: number;
}

export interface RaubHandResult {
  dealNo: number;
  dealerId: string;
  /** Refa: niko nije uzeo adut, ruka se ne boduje. */
  void: boolean;
  trumpSuit: Suit | null;
  scenario: RaubScenario | null;
  declarerId: string | null;
  requiredTricks: number;
  multiplier: 1 | 2;
  /** Prazno kad je `void`. */
  rows: RaubHandRow[];
  /** Refe koje čekaju POSLIJE ove ruke. */
  pendingRefasAfter: number;
  /** Refu je odmah zvao djelilac (odluka 23); bez polja = niko nije uzeo adut. */
  refaBy?: string | null;
}

export interface RaubPlacement {
  playerId: string;
  place: number;
  score: number;
}

/** Karta koju su svi vidjeli kod prve zamjene sve 4. */
export interface RaubOpenCard {
  playerId: string;
  card: Card;
}

/**
 * Prekid meča (odluka 3: ista pauza i glasanje kao Žandar, PRD v2 §32).
 * Rokovi su apsolutni (epoch ms), pa prekid preživi restart servera.
 */
export interface RaubInterruption {
  kind: "paused" | "vote";
  startedAt: number;
  endsAt: number;
  /** Samo za `vote`. */
  votes?: Record<string, AbandonVote>;
}

/** Cijelo stanje meča — SAMO server (špil, tuđe ruke, odbačene karte). */
export interface RaubGameState {
  game: "raub";
  roomId: string;
  matchId: string;
  phase: RaubPhase;
  stateVersion: number;
  rules: RaubRules;

  dealNo: number;
  dealerId: string;
  /** Poredani po `seatNo`. */
  seats: RaubSeat[];
  step: RaubStep | null;
  currentPlayerId: string | null;

  deck: Card[];
  /** Okrenute karte na stolu, redom; zadnja je ponuđena. Uzeta karta se izbacuje. */
  talon: Card[];
  /** Koliko karata je okrenuto u ovoj ruci (1..maxTalonFlips). */
  talonFlips: number;
  /** Ko je uzeo kartu s talona (djelilac ili nosilac zamjenom sedmice). */
  talonTakenBy: string | null;
  /** Karta s talona u ruci — ne smije se odbaciti. */
  lockedCardId: string | null;
  /**
   * Nasljeđe rauba naslijepo (djelilac je otvorio karte). Od odluke 13 uvijek
   * `true` u novim rukama; ostaje zbog oblika snapshota.
   */
  dealerOpened: boolean;

  trumpSuit: Suit | null;
  scenario: RaubScenario | null;
  declarerId: string | null;
  requiredTricks: number;
  multiplier: 1 | 2;
  pendingRefas: number;

  /** Red zamjene (od nosioca, u smjeru igre); `null` prije zamjene. */
  exchangeOrder: string[] | null;
  exchangeIndex: number;
  /**
   * Neko je već zamijenio sve 4 u ovoj ruci (dobio je 5 karata s otvorenom).
   * Postavlja se samo uz `rules.fullExchangeBonus` (od odluke 25 isključeno).
   */
  fullExchangeUsed: boolean;
  openCard: RaubOpenCard | null;
  /** Odbačene karte — van igre do kraja ruke, nikad se ne šalju klijentu. */
  discarded: Card[];

  tricks: RaubTrick[];

  lastHand: RaubHandResult | null;
  history: RaubHandResult[];
  placements: RaubPlacement[];
  /**
   * Prekid (pauza ili glasanje) — vodi ga server, motor ga ne dira. Opciono:
   * `null`/bez polja = sto teče.
   */
  interruption?: RaubInterruption | null;
}

export interface RaubSeatView {
  playerId: string;
  seatNo: number;
  score: number;
  tricks: number;
  bid: RaubBid | null;
  exchanged: number | null;
  going: boolean | null;
  /** Broj karata u ruci (poleđine kod protivnika). */
  handCount: number;
  place: number | null;
}

export interface RaubBidOptions {
  /** Karta na talonu je A, K, Q ili J. */
  raub: boolean;
  /** Gledalac drži sedmicu boje karte na talonu. */
  moja: boolean;
}

/** Ponuda zamjene sedmice nosiocu (scenarij 3). */
export interface RaubSwapOffer {
  seven: Card;
  talon: Card;
}

/**
 * Ono što jedan igrač (ili bot) smije vidjeti. Nikad špil, tuđe ruke ni
 * odbačene karte.
 */
export interface RaubPlayerView {
  game: "raub";
  roomId: string;
  matchId: string;
  phase: RaubPhase;
  stateVersion: number;
  rules: RaubRules;
  dealNo: number;
  dealerId: string;
  step: RaubStep | null;
  currentPlayerId: string | null;
  seats: RaubSeatView[];

  talon: Card[];
  talonFlips: number;
  talonTakenBy: string | null;
  /**
   * Karta koju je igrač uzeo s talona (sedmica, raub naslijepo, zamjena
   * sedmice). Bila je okrenuta pa je javna; do štihova ostaje na stolu, inače
   * se sedmica iz scenarija 1 nikad ne bi vidjela (uzima se pri dijeljenju).
   */
  takenTalonCard: Card | null;
  /**
   * Karta na vrhu talona pripada nosiocu (`talonTakenBy`), ali je još na stolu:
   * Raub i Štih je uzimaju tek poslije svoje zamjene (odluka 20). Opciono:
   * stari server ga ne šalje.
   */
  claimedTalon?: boolean;
  deckCount: number;
  /** Boja ponuđena u licitaciji (prije nego je adut određen). */
  offeredSuit: Suit | null;
  trumpSuit: Suit | null;
  scenario: RaubScenario | null;
  declarerId: string | null;
  requiredTricks: number;
  multiplier: 1 | 2;
  pendingRefas: number;
  fullExchangeUsed: boolean;
  openCard: RaubOpenCard | null;
  /** Ko je sljedeći na redu za zamjenu poslije tekućeg (za „Špil je prazan"). */
  exchangeOrder: string[] | null;
  tricks: RaubTrick[];

  myPlayerId: string;
  myCards: Card[];
  /** Uvijek `false` od odluke 13 (nema više rauba naslijepo); polje ostaje za stare klijente. */
  myCardsHidden: boolean;
  /** Moja karta s talona (zaključana). */
  lockedCardId: string | null;

  /** Samo kad je gledalac na potezu u štihu. */
  legalCardIds: string[] | null;
  /**
   * Šta gledalac smije reći u licitaciji; samo kad je na potezu u `bidding`.
   * Server je sudija — UI samo crta dugmad koja su ovdje dozvoljena.
   */
  bidOptions: RaubBidOptions | null;
  /** Samo nosiocu u koraku `swap_seven`. */
  swapOffer: RaubSwapOffer | null;
  /** Najviše karata koje gledalac smije zamijeniti (ograničeno špilom i zaključanom kartom). */
  maxExchange: number;
  /**
   * Gledalac je na potezu u `going` i mora reći „Idem" — svi ostali osim nosioca
   * su rekli „Ne idem" (odluka 19). Opciono: stari server ga ne šalje.
   */
  mustGo?: boolean;
  /**
   * Gledalac je djelilac na potezu na prvoj okrenutoj karti i smije reći
   * „Refa" (odluka 23). Opciono: stari server ga ne šalje.
   */
  canRefa?: boolean;

  lastHand: RaubHandResult | null;
  history: RaubHandResult[];
  placements: RaubPlacement[];
}

/**
 * Ono što server šalje kroz `game:state` za Raub sobu: pogled + javni igrači
 * (whitelist `toPublicPlayer`, bez `isBot`) + rok poteza. Klijent razlikuje
 * payload po `game: "raub"`.
 */
export interface RaubGamePayload extends RaubPlayerView {
  players: PublicPlayer[];
  /** Pauza ili glasanje; bez polja = sto teče. */
  interruption?: RaubInterruption | null;
  /** Kraj roka poteza (epoch ms) — i za bota, da tajmer izgleda isto za sve. */
  turnDeadline?: number;
}
