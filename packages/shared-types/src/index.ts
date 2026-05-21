// Tipovi dijeljeni između web, server i game-core

// ====================================================
// CARDS
// ====================================================

/**
 * Znak karte. 4 standardna znaka iz špila.
 */
export type Suit = "clubs" | "diamonds" | "hearts" | "spades";

/**
 * Rang karte. A (kec), 2-10, J (žandar), Q (kraljica), K (kralj).
 */
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

/**
 * Jedna karta iz špila.
 * id je jedinstven kroz cio špil, format "{suit}-{rank}", npr. "clubs-2", "hearts-A".
 */
export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

// ====================================================
// PLAYER
// ====================================================

/**
 * Status konekcije igrača.
 */
export type ConnectionStatus = "connected" | "reconnecting" | "abandoned";

/**
 * Javni prikaz igrača (bez internih polja kao što su consecutiveAutoPlays).
 */
export type PublicPlayer = {
  id: string;
  displayName: string;
  seatIndex: number;
  isHost: boolean;
  teamId?: number;
  connectionStatus: "connected" | "reconnecting" | "abandoned";
};

/**
 * Igrač u partiji.
 * U 4P modu, teamId je 0 ili 1 (sjedista 0+2 su tim A, 1+3 su tim B).
 * U 2P i 3P modu, teamId je undefined.
 */
export type Player = {
  id: string;
  displayName: string;
  seatIndex: number;
  teamId?: number;
  connectionStatus: ConnectionStatus;
  isHost: boolean;
  consecutiveAutoPlays: number;
};

// ====================================================
// GAME PHASES
// ====================================================

/**
 * Faza partije. State machine prolazi kroz ove faze.
 */
export type GamePhase =
  | "waiting"
  | "lobby_with_pending"
  | "dealing"
  | "playing"
  | "paused_for_reconnect"
  | "abandon_vote"
  | "scoring"
  | "hand_finished"
  | "match_finished"
  | "abandoned";

// ====================================================
// REACTIONS
// ====================================================

/**
 * 8 fiksnih reakcija koje igrači mogu slati tokom partije.
 */
export type ReactionType =
  | "laugh"
  | "wow"
  | "fire"
  | "clap"
  | "cry"
  | "angry"
  | "thinking"
  | "respect";

/**
 * Jedna reakcija koju je igrač poslao.
 */
export type ReactionEvent = {
  reactionId: string;
  playerId: string;
  type: ReactionType;
  timestamp: number;
};

// ====================================================
// JOIN REQUESTS
// ====================================================

/**
 * Zahtjev za ulazak u sobu (čeka host approval).
 * Istice nakon 2 minute ako host ne reaguje.
 */
export type JoinRequest = {
  requestId: string;
  displayName: string;
  requestedAt: number;
  expiresAt: number;
};

// ====================================================
// MOVE HISTORY
// ====================================================

/**
 * Jedan zapis u istoriji poteza partije.
 * Koristi se za game log i rekonstrukciju state-a.
 * capturedCards je prazan niz ako je trail (karta ostala na stolu).
 */
export type MoveHistoryItem = {
  moveId: string;
  handNumber: number;
  playerId: string;
  playedCard: Card;
  capturedCards: Card[];
  isAutoPlay: boolean;
  timestamp: number;
};

// ====================================================
// SCORING
// ====================================================

/**
 * Bodovi za jednu ruku.
 * pointsByPile mapira playerId (u 2P/3P) ili "team-N" (u 4P) na poene.
 * Ukupno može biti najviše 5 poena po ruci.
 */
export type HandScore = {
  handNumber: number;
  pointsByPile: Record<string, number>;
  breakdown: {
    mostCards?: {
      winnerPileId?: string;
      cardCountByPile: Record<string, number>;
      points: 2;
    };
    mostClubs?: {
      winnerPileId?: string;
      clubCountByPile: Record<string, number>;
      points: 1;
    };
    twoOfClubs?: {
      winnerPileId?: string;
      points: 1;
    };
    tenOfDiamonds?: {
      winnerPileId?: string;
      points: 1;
    };
  };
};

// ====================================================
// RULES CONFIGURATION
// ====================================================

/**
 * Sta se desi sa J koji izadje medju pocetne 4 karte na stolu.
 */
export type JackOnInitialBehavior =
  | "award_to_cutter"
  | "replace_without_award"
  | "allow_on_table";

/**
 * Vrijednost asa pri hvatanju.
 * MVP default: 1 (fiksno).
 */
export type AceValue = 1 | 11 | "player_choice";

/**
 * Konfiguracija pravila za jednu partiju.
 * Sve varijante Zandara se opisuju kombinacijom ovih opcija.
 */
export type RulesConfig = {
  targetScore: number;
  playerCount: 2 | 3 | 4;
  initialTableCards: number;
  cardsPerDeal: number;
  jackOnInitialTableBehavior: JackOnInitialBehavior;
  aceValue: AceValue;
  allowMultipleDisjointCaptures: boolean;
  forceCapture: boolean;
  teamPlay: boolean;
  turnTimeoutSeconds: number;
  reconnectGracePeriodSeconds: number;
  pauseMaxDurationSeconds: number;
  consecutiveAutoPlaysForAbandon: number;
};
// ====================================================
// ABANDON VOTE
// ====================================================

/**
 * Glas u abandon vote-u kada se neko ne vrati u partiju.
 */
export type AbandonVote = "wait" | "end";

// ====================================================
// GAME STATE (authoritative server state)
// ====================================================

/**
 * Kompletan state partije. Server ga čuva i mijenja kroz poteze.
 * Klijent nikada ne dobija ovaj objekat direktno — samo filtriranu verziju.
 *
 * Napomene o ključevima:
 * - U 2P i 3P modu, hands/captured/matchScore koriste playerId kao ključ.
 * - U 4P modu, captured/matchScore koriste "team-0" ili "team-1" kao ključ.
 *   hands i dalje koriste playerId (svaki igrač ima svoju ruku).
 */
export type GameState = {
  roomId: string;
  matchId: string;
  phase: GamePhase;
  players: Player[];
  pendingJoinRequests: JoinRequest[];
  reactions: ReactionEvent[];
  dealerPlayerId: string;
  currentPlayerId: string;
  deck: Card[];
  table: Card[];
  hands: Record<string, Card[]>;
  captured: Record<string, Card[]>;
  lastCapturePlayerId?: string;
  handNumber: number;
  handScores: HandScore[];
  matchScore: Record<string, number>;
  targetScore: number;
  moveHistory: MoveHistoryItem[];
  rulesConfig: RulesConfig;
  stateVersion: number;
  pauseStartedAt?: number;
  abandonVotes?: Record<string, AbandonVote>;
};
// ====================================================
// CAPTURE & MOVES
// ====================================================

/**
 * Razlog zasto je odredjena capture opcija validna.
 */
export type CaptureReason = "rank_match" | "sum_match" | "jack_clear";

/**
 * Jedna validna opcija za hvatanje karata sa stola.
 * Ako odigrana karta ima vise opcija, igrac bira jednu.
 */
export type CaptureOption = {
  optionId: string;
  cardIds: string[];
  reason: CaptureReason;
};

/**
 * Reprezentuje sta igrac moze da uradi sa odredjenom kartom iz ruke.
 * Ako captureOptions je prazan, jedina opcija je trail.
 */
export type PossibleMove = {
  playedCardId: string;
  type: "capture" | "trail";
  captureOptions: CaptureOption[];
};
// ====================================================
// MOVE REQUEST
// ====================================================

/**
 * Zahtjev koji klijent salje serveru za odigravanje karte.
 * Server validira zahtjev kroz applyMove() i broadcast-uje novi state.
 */
export type PlayCardRequest = {
  roomId: string;
  playerId: string;
  cardId: string;
  /** IDs karata sa stola koje igrac zeli da kupi. Prazan niz = trail. */
  selectedCaptureCardIds: string[];
  /** Jedinstveni ID poteza (za idempotency - sprijeci duplikate). */
  clientMoveId: string;
  /** Verzija state-a koju klijent zna. Ako se razlikuje od server-a, potez se odbija. */
  clientKnownStateVersion: number;
};
export type PrivateGameStateView = {
  roomId: string;
  matchId: string;
  phase: GamePhase;
  players: PublicPlayer[];
  table: Card[];
  currentPlayerId: string;
  dealerPlayerId: string;
  deckCount: number;
  handCounts: Record<string, number>;
  capturedCounts: Record<string, number>;
  matchScore: Record<string, number>;
  targetScore: number;
  stateVersion: number;
  handNumber: number;
  handScores: HandScore[];
  myPlayerId: string;
  myHand: Card[];
};