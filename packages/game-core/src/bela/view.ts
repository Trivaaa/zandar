import type { BelaAction, BelaGameState, BelaPlayerDeclarations, BelaPlayerView, Card, Suit } from "@zandar/shared-types";
import { belaCardPoints, belaCheapestCard } from "./cards";
import { declarationTotal, findBelaDeclarations } from "./declarations";
import { BELA_SUITS, belaCallableSuits, belaLegalCards, belaLivePoints, belaMustCall } from "./match";

/** Pokazana zvanja (P-6). Prije odluke o bodovanju vidi se samo uz `revealDeclarationsAfterFirstTrick: false`. */
function shownDeclarations(state: BelaGameState): BelaPlayerDeclarations[] {
  if (state.scoredDeclarations) return structuredClone(state.scoredDeclarations);
  if (state.rules.revealDeclarationsAfterFirstTrick) return [];
  return state.seats
    .filter((s) => s.declared && s.declared.length > 0)
    .map((s) => ({ playerId: s.playerId, declarations: structuredClone(s.declared!) }));
}

/**
 * Pogled jednog igrača (i bota — bot odlučuje SAMO iz ovoga). Nikad špil,
 * tuđe ruke ni zatvoreni talon (ni vlastiti, P-2).
 */
export function getBelaView(state: BelaGameState, viewerId: string): BelaPlayerView {
  const me = state.seats.find((s) => s.playerId === viewerId);
  const myTurn = state.phase === "playing" && state.currentPlayerId === viewerId;
  const canDeclare = !!me && state.phase === "playing" && state.step === "tricks" && state.tricks.length === 1 && me.declared === null;

  return {
    game: "bela",
    roomId: state.roomId,
    matchId: state.matchId,
    phase: state.phase,
    stateVersion: state.stateVersion,
    rules: { ...state.rules },
    dealNo: state.dealNo,
    dealerId: state.dealerId,
    step: state.step,
    currentPlayerId: state.currentPlayerId,
    callRound: state.callRound,
    seats: state.seats.map((s) => ({
      playerId: s.playerId,
      seatNo: s.seatNo,
      team: s.team,
      handCount: s.hand.length,
      talonCount: s.talon.length,
      call: s.call,
      declaredPoints: s.declared ? declarationTotal(s.declared) : null,
    })),
    trumpSuit: state.trumpSuit,
    callerId: state.callerId,
    forced: state.forced,
    tricks: structuredClone(state.tricks),
    belaBy: state.belaBy,
    shownDeclarations: shownDeclarations(state),
    livePoints: belaLivePoints(state),
    scores: [state.scores[0], state.scores[1]],
    hanging: state.hanging,
    myPlayerId: viewerId,
    myTeam: me ? me.team : null,
    myCards: me ? me.hand.map((c) => ({ ...c })) : [],
    myDeclarations: canDeclare ? findBelaDeclarations(me!.hand) : [],
    legalCardIds: myTurn && state.step === "tricks" ? belaLegalCards(state, viewerId).map((c) => c.id) : null,
    callOptions:
      myTurn && state.step === "calling"
        ? { suits: belaCallableSuits(state, viewerId), canPass: !belaMustCall(state, viewerId) }
        : null,
    lastHand: state.lastHand,
    history: [...state.history],
    placements: state.placements.map((p) => ({ ...p })),
  };
}

/** Boja s najviše bodova kad bi bila adut (za mus kad istekne rok). */
export function belaStrongestSuit(cards: readonly Card[], suits: readonly Suit[] = BELA_SUITS): Suit {
  let best = suits[0]!;
  let bestPts = -1;
  for (const suit of suits) {
    const pts = cards.filter((c) => c.suit === suit).reduce((s, c) => s + belaCardPoints(c, suit), 0);
    if (pts > bestPts) {
      best = suit;
      bestPts = pts;
    }
  }
  return best;
}

/**
 * Šta server odigra kad igraču istekne rok (spec, „Edge caseovi"): „Dalje";
 * kod musa boja s najviše bodova; u štihu najjeftinija dozvoljena karta, uz
 * prijavu zvanja (zvanje se ne gubi zbog sporosti). `null` kad nije na potezu.
 */
export function getBelaAutoAction(state: BelaGameState, playerId: string): BelaAction | null {
  if (state.phase !== "playing" || state.currentPlayerId !== playerId) return null;
  const seat = state.seats.find((s) => s.playerId === playerId);
  if (!seat) return null;
  if (state.step === "calling") {
    return { type: "call", suit: belaMustCall(state, playerId) ? belaStrongestSuit(seat.hand) : null };
  }
  if (state.step === "tricks") {
    const card = belaCheapestCard(belaLegalCards(state, playerId), state.trumpSuit);
    return { type: "play", cardId: card.id, declare: true };
  }
  return null;
}
