// ====================================================
// RAUB — tipovi stanja i pogleda
// Spec: docs/raub-spec.md
// ====================================================

import type { AbandonVote, Card, PublicPlayer, Suit } from "./index";

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
   */
  allowDrop: boolean;
  turnTimeoutSeconds: number;
}

/**
 * - `playing`: ruka u toku (korak je u `step`)
 * - `hand_complete`: ruka bodovana ili poništena (refa); čeka se host
 * - `match_finished`: neko je stigao do 0
 * - `abandoned`: server prekinuo meč (glasanje, nema živog čovjeka)
 */
export type RaubPhase = "playing" | "hand_complete" | "match_finished" | "abandoned";

/**
 * Korak ruke. `await_open`: djelilac bira Otvori karte / Raub naslijepo.
 * `swap_seven`: nosilac iz licitacije bira zamjenu sedmice za talon.
 * `discard_extra`: igrač sa 5 karata odbacuje jednu.
 * `going`: igrači osim nosioca biraju Idem / Ne idem.
 */
export type RaubStep =
  | "await_open"
  | "bidding"
  | "swap_seven"
  | "discard_extra"
  | "going"
  | "exchange"
  | "tricks";

/** 1 = sedmica na talonu, 2 = raub naslijepo, 3 = licitacija. */
export type RaubScenario = "seven" | "blind" | "bid";

export type RaubBid = "raub" | "pass";

/** Namjera klijenta (socket `raub:action`). */
export type RaubAction =
  | { type: "open" }
  | { type: "blind" }
  | { type: "bid"; bid: RaubBid }
  | { type: "swap_seven"; swap: boolean }
  | { type: "go"; go: boolean }
  | { type: "discard"; cardId: string }
  | { type: "exchange"; cardIds: string[] }
  | { type: "play"; cardId: string };

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
  /** Djelilac je otvorio karte (ili raubovao naslijepo, ili je sedmica). */
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
  /** Neko je već zamijenio sve 4 u ovoj ruci (dobio je 5 karata s otvorenom). */
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

/** Ponuda zamjene sedmice nosiocu (scenarij 3). */
export interface RaubSwapOffer {
  seven: Card;
  talon: Card;
}

/**
 * Ono što jedan igrač (ili bot) smije vidjeti. Nikad špil, tuđe ruke ni
 * odbačene karte. Djelilac ne dobija svoje karte dok ih ne otvori.
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
  /** Djelilac prije otvaranja: karte su tu, ali licem nadolje. */
  myCardsHidden: boolean;
  /** Moja karta s talona (zaključana). */
  lockedCardId: string | null;

  /** Samo kad je gledalac na potezu u štihu. */
  legalCardIds: string[] | null;
  /** Samo nosiocu u koraku `swap_seven`. */
  swapOffer: RaubSwapOffer | null;
  /** Najviše karata koje gledalac smije zamijeniti (ograničeno špilom i zaključanom kartom). */
  maxExchange: number;

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
