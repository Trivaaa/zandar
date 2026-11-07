// ====================================================
// POKER (Texas Hold'em No-Limit) — tipovi stanja i pogleda
// Spec: docs/poker-spec.md
// ====================================================

import type { Card, PublicPlayer } from "./index";

/** Igre koje se stvarno igraju za stolom. Soba bez polja `game` je Žandar. */
export const GAME_IDS = ["zandar", "poker", "raub"] as const;
export type GameId = (typeof GAME_IDS)[number];

/** Nepoznata ili nedostajuća vrijednost = Žandar (stari klijenti, stari snapshoti). */
export function parseGameId(value: unknown): GameId {
  return value === "poker" || value === "raub" ? value : "zandar";
}

export type PokerStreet = "preflop" | "flop" | "turn" | "river";

/**
 * - `betting`: ruka u toku, neko je na potezu
 * - `hand_complete`: ruka isplaćena, čeka se sljedeća (server je pokreće)
 * - `match_finished`: ostao je jedan igrač sa žetonima
 * - `abandoned`: server prekinuo meč (npr. nema više pravih igrača)
 */
export type PokerPhase = "betting" | "hand_complete" | "match_finished" | "abandoned";

/**
 * - `active`: igra normalno
 * - `sitting_out`: bez veze; server za njega igra check/fold, blindovi se plaćaju
 * - `bankrupt`: ostao bez žetona, ima plasman
 * - `left`: napustio meč; mjesto ostaje prazno, žetoni izlaze iz igre
 */
export type PokerSeatStatus = "active" | "sitting_out" | "bankrupt" | "left";

export type PokerActionType = "fold" | "check" | "call" | "bet" | "raise" | "allin";

export type PokerHandCategory =
  | "high_card"
  | "pair"
  | "two_pair"
  | "three_of_a_kind"
  | "straight"
  | "flush"
  | "full_house"
  | "four_of_a_kind"
  | "straight_flush"
  | "royal_flush";

/**
 * Namjera klijenta. Za `bet`/`raise` je `amount` UKUPAN ulog igrača u ovoj ulici
 * („raise to"), ne dodatak. `allin` i `call` ne trebaju iznos.
 */
export interface PokerActionRequest {
  type: PokerActionType;
  amount?: number;
  clientKnownStateVersion?: number;
}

/** Posljednja akcija u ulici (prikaz iznad avatara). `amount` = ulog u ulici poslije akcije. */
export interface PokerLastAction {
  type: PokerActionType;
  amount: number;
}

/** Sjedište — SAMO server (nosi `holeCards`). Klijent dobija `PokerSeatView`. */
export interface PokerSeat {
  playerId: string;
  seatNo: number;
  stack: number;
  status: PokerSeatStatus;
  /** Dobio karte u ovoj ruci (ostaje true i poslije folda). */
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  holeCards: Card[];
  /** Uloženo u tekućoj ulici. */
  streetBet: number;
  /** Uloženo u tekućoj ruci (sve ulice). */
  totalBet: number;
  /** Dobrovoljno odigrao u ovoj ulici. Blind se ne računa. */
  hasActed: boolean;
  /** `fullRaiseCount` u trenutku zadnje akcije — za pravilo kratkog all-ina. */
  actedAtRaiseCount: number;
  lastAction: PokerLastAction | null;
  stackAtHandStart: number;
  /** Konačan plasman (1 = pobjednik), null dok je u igri. */
  place: number | null;
}

export interface PokerPot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface PokerShowdownHand {
  playerId: string;
  holeCards: Card[];
  category: PokerHandCategory;
  /** 5 karata koje čine kombinaciju (za isticanje). */
  bestCards: Card[];
}

export interface PokerAward {
  potIndex: number;
  playerId: string;
  amount: number;
}

export interface PokerHandResult {
  handNo: number;
  /** Svi ostali foldali — karte se ne otkrivaju. */
  uncontested: boolean;
  /** Zajedničke karte podijeljene bez licitacije jer su (skoro) svi all-in. */
  allInRunout: boolean;
  pots: PokerPot[];
  awards: PokerAward[];
  /** Otkrivene ruke; prazno kad je `uncontested`. */
  showdown: PokerShowdownHand[];
}

export interface PokerPlacement {
  playerId: string;
  place: number;
}

export type PokerLogType = PokerActionType | "small_blind" | "big_blind";

export interface PokerLogItem {
  handNo: number;
  street: PokerStreet;
  playerId: string;
  type: PokerLogType;
  /** Žetoni dodati ovom akcijom. */
  amount: number;
}

/** Cijelo stanje meča — SAMO server (špil i tuđe karte). */
export interface PokerGameState {
  game: "poker";
  roomId: string;
  matchId: string;
  phase: PokerPhase;
  stateVersion: number;

  startStack: number;
  handsPerLevel: number;
  /** Neskalirana tabela [small, big] za startStack 100; skalira se faktorom startStack/100. */
  blindLevels: Array<[number, number]>;

  handNo: number;
  blindLevel: number;
  smallBlind: number;
  bigBlind: number;
  buttonSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;

  /** Poredani po `seatNo` (redoslijed za stolom, u smjeru igre). */
  seats: PokerSeat[];
  street: PokerStreet;
  board: Card[];
  deck: Card[];

  currentPlayerId: string | null;
  /** Najveći ulog u tekućoj ulici koji treba izjednačiti. */
  currentBet: number;
  /** Zadnje puno povećanje u ulici (minimalni raise). */
  minRaise: number;
  /** Broj punih povećanja u ulici — otvara li kratki all-in ponovo betovanje. */
  fullRaiseCount: number;

  actionLog: PokerLogItem[];
  lastHandResult: PokerHandResult | null;
  placements: PokerPlacement[];
  /** Žetoni igrača koji su napustili meč (za invarijantu zbira žetona). */
  chipsRemoved: number;
}

/** Šta igrač na potezu smije. Iznosi `minTo`/`maxTo` su „raise to" u ulici. */
export interface PokerLegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  /** Žetoni koje call dodaje (može biti manje od razlike = all-in call). */
  callAmount: number;
  canBet: boolean;
  canRaise: boolean;
  minTo: number;
  /** All-in iznos (ulog u ulici + stack). */
  maxTo: number;
}

export interface PokerSeatView {
  playerId: string;
  seatNo: number;
  stack: number;
  status: PokerSeatStatus;
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  streetBet: number;
  totalBet: number;
  lastAction: PokerLastAction | null;
  /** Drži karte licem nadolje (u ruci, nije foldao). */
  hasCards: boolean;
  place: number | null;
}

/** Ono što jedan igrač (ili bot) smije vidjeti. Nikad špil, nikad tuđe karte prije showdowna. */
export interface PokerPlayerView {
  game: "poker";
  roomId: string;
  matchId: string;
  phase: PokerPhase;
  stateVersion: number;
  startStack: number;
  handNo: number;
  blindLevel: number;
  smallBlind: number;
  bigBlind: number;
  /** Koliko ruku (uključujući tekuću) do promjene nivoa. */
  handsUntilNextLevel: number;
  nextSmallBlind: number;
  nextBigBlind: number;
  buttonSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  street: PokerStreet;
  board: Card[];
  currentPlayerId: string | null;
  currentBet: number;
  minRaise: number;
  /** Zbir svih uloga u tekućoj ruci. */
  potTotal: number;
  seats: PokerSeatView[];
  myPlayerId: string;
  myCards: Card[];
  /** Samo kad je gledalac na potezu. */
  legal: PokerLegalActions | null;
  lastHandResult: PokerHandResult | null;
  placements: PokerPlacement[];
}

/**
 * Ono što server šalje kroz `game:state` za poker sobu: pogled + javni igrači
 * (imena, avatari; whitelist `toPublicPlayer`, bez `isBot`) + rok poteza.
 * Klijent razlikuje payload po `game: "poker"`.
 */
export interface PokerGamePayload extends PokerPlayerView {
  players: PublicPlayer[];
  /** Kraj roka poteza (epoch ms) — i za bota, da tajmer izgleda isto za sve. */
  turnDeadline?: number;
}

/**
 * Klijent javlja koje igre zna da prikaže (REST tijelo `games`, socket
 * `auth.games`). Stari klijent (APK 1.0–1.3) ne šalje ništa → zna samo Žandar,
 * pa ne smije ući u poker sobu (inače bi crtao Žandar sto sa poker stanjem).
 */
export function clientSupportsGame(games: unknown, game: GameId): boolean {
  if (game === "zandar") return true;
  return Array.isArray(games) && games.includes(game);
}
