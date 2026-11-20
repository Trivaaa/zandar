import type { GameId } from "./poker";

/**
 * „Vrati se za sto" na početnoj (tabla `UI_VratiSe`, QA 10-24 P2): sto za
 * kojim igrač sjedi, kako ga vidi SAMO on. Server ga sastavlja iz sobe, pa
 * nosi tek ono što traka pokazuje — bez tuđih ruku, bez `isBot`, bez ključeva.
 */
export type ActiveTablePhase = "lobby" | "playing" | "finished";

/** Stanje desno na traci — po igri. */
export type ActiveTableState =
  /** Žandar: moj tim/ja prema najjačem protivniku. `opponentName` samo kad je protivnik jedan (2P). */
  | { kind: "score"; mine: number; theirs: number; team: boolean; opponentName?: string }
  /** Poker: moji žetoni. */
  | { kind: "chips"; stack: number }
  /** Raub: bodovi do 0 (broji se nadolje). */
  | { kind: "toZero"; score: number }
  /** Lobi: zauzeta mjesta od ukupno. */
  | { kind: "seats"; taken: number; total: number };

/** Ishod završene partije (V6). Žandar nosi rezultat, Poker i Raub plasman. */
export type ActiveTableResult =
  | { kind: "score"; won: boolean; mine: number; theirs: number }
  | { kind: "place"; won: boolean; place: number };

export interface ActiveTable {
  roomId: string;
  game: GameId;
  /**
   * Partija za tim stolom — revanš u istoj sobi je nova partija, pa i nova
   * traka poslije „PARTIJA ZAVRŠENA". Prazno u lobiju.
   */
  matchId: string;
  phase: ActiveTablePhase;
  /** Igrač je na potezu („NA POTEZU SI"). */
  myTurn: boolean;
  /** Sto stoji i čeka baš njega (Žandar pauza / glasanje zbog odsustva). */
  waitingForMe: boolean;
  state: ActiveTableState;
  /** Samo kad je `phase === "finished"`. */
  result?: ActiveTableResult;
}

/** Ključ sjedišta koji klijent čuva po sobi (`zandar:session:<roomId>`). */
export interface ActiveTableSession {
  roomId: string;
  playerId: string;
  sessionToken: string;
}

export interface ActiveTableResponse {
  table: ActiveTable | null;
  /**
   * Sjedište je nađeno po nalogu, a ovaj uređaj nema njegov ključ (drugi
   * uređaj): „Vrati se" prvo traži ključ (`/api/me/table/claim`).
   */
  claim?: boolean;
  /** Sobe iz poslatih ključeva koje više ne postoje — klijent ih briše. */
  gone?: string[];
}

export interface ActiveTableClaim {
  roomId: string;
  playerId: string;
  sessionToken: string;
}

/** Najviše ključeva po zahtjevu — stari se gomilaju u localStorage (QA P14). */
export const ACTIVE_TABLE_MAX_SESSIONS = 40;
