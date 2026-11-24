// ====================================================
// BELA — tipovi stanja i pogleda
// Spec: docs/bela-spec.md (v0.2, pravila P-1…P-17 prihvaćena, odluka 7)
// ====================================================

import type { AbandonVote, Card, PublicPlayer, Suit } from "./index";

/**
 * Pravila stola. Svako pravilo iz tabele „Pravila za potvrdu" je parametar
 * (spec, odluka 7), da se ispravka iz feedbacka igrača svodi na promjenu
 * vrijednosti. Oznake P-n su iz speca.
 */
export interface BelaRules {
  /** V1: samo 4 igrača, 2 na 2 (odluka 1). Timovi: mjesta 0 i 2 protiv 1 i 3. */
  playerCount: 4;
  /** P-16: do koliko se igra (privatni sto 1001, Quick Play 501). */
  targetScore: number;
  /** P-1: smjer igre po `seatNo` (+1 = na desno, isto kao Žandar i Raub). */
  direction: 1 | -1;
  /** P-2: zatvorenih karata po igraču (2 = 6 vidljivih + 2; 0 = svih 8 odmah). */
  talonCards: 0 | 2;
  /** P-3: kad svi kažu „Dalje", djelilac mora zvati (mus). Inače novo dijeljenje. */
  dealerMustCall: boolean;
  /** P-4: krugova zvanja aduta (spec: 1). */
  callRounds: 1 | 2;
  /** P-6: karte zvanja se pokazuju poslije prvog štiha (inače odmah pri prijavi). */
  revealDeclarationsAfterFirstTrick: boolean;
  /** P-7: zvanja boduje samo tim sa najjačim zvanjem (inače oba tima sva svoja). */
  declarationsWinnerOnly: boolean;
  /** P-8: bodovi bele (K + Q aduta kod istog igrača). */
  belaPoints: number;
  /** P-8: bela se boduje uvijek, bez poređenja zvanja. */
  belaAlwaysScores: boolean;
  /** P-9: ko otvara prvi štih. */
  firstLead: "right_of_dealer" | "caller";
  /** P-10: mora se ići jače i kad štih nosi partner. */
  mustOvertakePartner: boolean;
  /** P-11: kod pada protivnik dobija i zvanja (i belu) tima koji je zvao. */
  failGivesCallerDeclarations: boolean;
  /** P-12: jednaki bodovi — „visi" (prelazi na sljedeću ruku) ili pad. */
  tieRule: "hang" | "fail";
  /** P-13: štiglja — bonus timu koji odnese sve štihove (0 = bez bonusa). */
  stigljaBonus: number;
  /** P-14: upis bodova (1 = puni bodovi; 10 = podijeljeno sa 10, zaokruženo). */
  pointsDivisor: 1 | 10;
  /** P-15: belot (svih 8 u nizu) dobija meč. V1: ne (osam u nizu je obično zvanje od 100). */
  belotWinsMatch: boolean;
  /** P-17: oba tima pređu cilj u istoj ruci — pobjeđuje tim koji je zvao, ili tim s više bodova. */
  bothOverTarget: "caller" | "higher";
  /** Zadnji štih (spec: 10). */
  lastTrickBonus: number;
  turnTimeoutSeconds: number;
}

/**
 * - `playing`: ruka u toku (korak je u `step`)
 * - `hand_complete`: ruka bodovana (ili ponovljena bez zvanja); čeka se host
 * - `match_finished`: tim je prešao cilj
 * - `abandoned`: server prekinuo meč (glasanje, nema živog čovjeka)
 */
export type BelaPhase = "playing" | "hand_complete" | "match_finished" | "abandoned";

/**
 * Korak ruke. `calling`: zvanje aduta. `tricks`: štihovi; zvanja se prijavljuju
 * uz prvu kartu u prvom štihu (`play.declare`), a talon karte prelaze u ruku
 * odmah pri zvanju aduta — zato nema posebnih koraka za to.
 */
export type BelaStep = "calling" | "tricks";

/** Tim: 0 = mjesta 0 i 2, 1 = mjesta 1 i 3. */
export type BelaTeam = 0 | 1;

/** Namjera klijenta (socket `bela:action`, faza 3). */
export type BelaAction =
  /** Zvanje aduta: boja ili `null` = „Dalje". */
  | { type: "call"; suit: Suit | null }
  /**
   * Bačena karta. `declare` važi samo za prvu kartu igrača u prvom štihu:
   * prijavljuje sva prepoznata zvanja (bez polja = da, zvanje se ne gubi).
   */
  | { type: "play"; cardId: string; declare?: boolean };

export type BelaActionType = BelaAction["type"];

export type BelaActionRequest = BelaAction & { clientKnownStateVersion?: number };

export type BelaDeclarationKind = "sequence" | "four";

/** Jedno zvanje (niz ili četiri iste). Bela (K + Q aduta) nije ovdje, vidi `belaBy`. */
export interface BelaDeclaration {
  kind: BelaDeclarationKind;
  points: number;
  /** Karte zvanja (za niz redom od najniže). */
  cards: Card[];
}

export interface BelaPlayerDeclarations {
  playerId: string;
  declarations: BelaDeclaration[];
}

export interface BelaTrickPlay {
  playerId: string;
  card: Card;
}

export interface BelaTrick {
  leaderId: string;
  plays: BelaTrickPlay[];
  /** `null` dok štih nije pun. */
  winnerId: string | null;
}

/** Sjedište — SAMO server (nosi ruku i talon). */
export interface BelaSeat {
  playerId: string;
  /** Isto što i `seatIndex` u sobi — raspored za stolom se ne miješa. */
  seatNo: number;
  team: BelaTeam;
  hand: Card[];
  /** Zatvorene karte (P-2) do zvanja aduta. */
  talon: Card[];
  /** Odgovor u zvanju aduta u tekućem krugu: boja, „pass", ili `null` prije odgovora. */
  call: Suit | "pass" | null;
  /** Prijavljena zvanja (uz prvu kartu); `null` dok igrač nije bacio prvu kartu. */
  declared: BelaDeclaration[] | null;
}

/** Bodovi jednog tima u ruci (pregled ruke). */
export interface BelaTeamHand {
  team: BelaTeam;
  tricks: number;
  /** Bodovi karata + zadnji štih + štiglja. */
  cardPoints: number;
  declarationPoints: number;
  belaPoints: number;
  /** Šta se upisuje (po P-11/P-12/P-14, sa „visi" iz prošle ruke). */
  awarded: number;
  scoreBefore: number;
  scoreAfter: number;
}

export type BelaHandOutcome = "pass" | "fail" | "hang" | "redeal";

export interface BelaHandResult {
  dealNo: number;
  dealerId: string;
  trumpSuit: Suit | null;
  callerId: string | null;
  callerTeam: BelaTeam | null;
  /** Djelilac je zvao jer su svi rekli „Dalje" (mus). */
  forced: boolean;
  outcome: BelaHandOutcome;
  /** Tim koji je odnio svih 8 štihova. */
  stiglja: BelaTeam | null;
  /** Prazno kod `redeal`. */
  teams: BelaTeamHand[];
  /** Ko je zvao belu. */
  belaBy: string | null;
  /** Zvanja koja su se bodovala (javna). */
  declarations: BelaPlayerDeclarations[];
  /** Bodovi koji „vise" POSLIJE ove ruke (P-12). */
  hangingAfter: number;
}

export interface BelaPlacement {
  playerId: string;
  team: BelaTeam;
  /** 1 = pobjednički tim, 2 = drugi. */
  place: 1 | 2;
  score: number;
}

/** Prekid meča — ista pauza i glasanje kao Žandar i Raub. */
export interface BelaInterruption {
  kind: "paused" | "vote";
  startedAt: number;
  endsAt: number;
  votes?: Record<string, AbandonVote>;
}

/** Cijelo stanje meča — SAMO server (špil, tuđe ruke, talon). */
export interface BelaGameState {
  game: "bela";
  roomId: string;
  matchId: string;
  phase: BelaPhase;
  stateVersion: number;
  rules: BelaRules;

  dealNo: number;
  dealerId: string;
  /** Poredani po `seatNo`. */
  seats: BelaSeat[];
  step: BelaStep | null;
  currentPlayerId: string | null;
  /** Krug zvanja aduta (1..callRounds). */
  callRound: number;

  /** Ostatak špila (poslije dijeljenja prazan; polje zbog invarijante 32 karte). */
  deck: Card[];
  trumpSuit: Suit | null;
  callerId: string | null;
  forced: boolean;

  tricks: BelaTrick[];
  /** Ko drži K i Q aduta (određuje se pri zvanju aduta); `null` ako niko. */
  belaHolderId: string | null;
  /** Ko je zvao belu (bacio drugu od te dvije karte). */
  belaBy: string | null;
  /** Zvanja koja se boduju (poslije poređenja, P-7); `null` dok nije odlučeno. */
  scoredDeclarations: BelaPlayerDeclarations[] | null;

  /** Ukupni bodovi timova, indeks = tim. */
  scores: [number, number];
  /** Bodovi koji „vise" (P-12) i idu pobjedniku sljedeće ruke. */
  hanging: number;

  lastHand: BelaHandResult | null;
  history: BelaHandResult[];
  placements: BelaPlacement[];
  interruption?: BelaInterruption | null;
}

export interface BelaSeatView {
  playerId: string;
  seatNo: number;
  team: BelaTeam;
  handCount: number;
  /** Zatvorene karte ispred igrača (poleđine). */
  talonCount: number;
  call: Suit | "pass" | null;
  /** Koliko bodova je igrač prijavio (broj je javan čim baci prvu kartu). */
  declaredPoints: number | null;
}

export interface BelaCallOptions {
  suits: Suit[];
  /** `false` kad djelilac mora zvati (mus). */
  canPass: boolean;
}

/** Ono što jedan igrač (ili bot) smije vidjeti. Nikad špil, tuđe ruke ni talon. */
export interface BelaPlayerView {
  game: "bela";
  roomId: string;
  matchId: string;
  phase: BelaPhase;
  stateVersion: number;
  rules: BelaRules;
  dealNo: number;
  dealerId: string;
  step: BelaStep | null;
  currentPlayerId: string | null;
  callRound: number;
  seats: BelaSeatView[];

  trumpSuit: Suit | null;
  callerId: string | null;
  forced: boolean;
  tricks: BelaTrick[];
  belaBy: string | null;
  /** Pokazana zvanja (P-6: poslije prvog štiha, samo ona koja se boduju). */
  shownDeclarations: BelaPlayerDeclarations[];
  /** Bodovi karata iz završenih štihova u ovoj ruci, uživo (javno). */
  livePoints: [number, number];
  scores: [number, number];
  hanging: number;

  myPlayerId: string;
  myTeam: BelaTeam | null;
  /** Samo vidljive karte; talon je zatvoren i za vlasnika (P-2). */
  myCards: Card[];
  /** Zvanja koja motor prepoznaje u mojoj ruci — dok ih još mogu prijaviti. */
  myDeclarations: BelaDeclaration[];
  /**
   * Gledalac još može prijaviti zvanja (prvi štih, prije svoje prve karte) —
   * bez obzira na to ko je na potezu, da se izbor vidi unaprijed. Opciono:
   * stariji server ga ne šalje.
   */
  canDeclare?: boolean;
  /**
   * Bela gledaoca (P-8, boduje se sama): `holding` = drži K i Q aduta i još
   * nije bacio oba, `scored` = bacio drugu kartu para. Samo za vlasnika —
   * tuđi `belaHolderId` nikad ne izlazi. Opciono: stariji server ga ne šalje.
   */
  myBela?: "holding" | "scored" | null;
  /** Samo kad je gledalac na potezu u štihu. */
  legalCardIds: string[] | null;
  /** Samo kad je gledalac na potezu u zvanju aduta. */
  callOptions: BelaCallOptions | null;

  lastHand: BelaHandResult | null;
  history: BelaHandResult[];
  placements: BelaPlacement[];
}

/** `game:state` za Bela sobu (faza 3): pogled + javni igrači + rok poteza. */
export interface BelaGamePayload extends BelaPlayerView {
  players: PublicPlayer[];
  interruption?: BelaInterruption | null;
  turnDeadline?: number;
}
