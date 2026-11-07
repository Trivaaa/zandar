import type {
  Card,
  RaubAction,
  RaubGameState,
  RaubPlayerView,
  RaubSwapOffer,
} from "@zandar/shared-types";
import { isSeven, raubRankValue, weakestCard } from "./cards";
import { raubLegalCards, raubMaxExchange } from "./match";

/**
 * Pogled jednog igrača (i bota — bot odlučuje SAMO iz ovoga). Nikad špil,
 * tuđe ruke ni odbačene karte; djelilac ne vidi svoje karte prije odluke
 * (spec: „Raub naslijepo" je prije nego pogleda karte).
 */
/** Uzeta talon karta dok je još u ruci onoga ko ju je uzeo, prije štihova. */
function takenTalonCard(state: RaubGameState): Card | null {
  if (state.phase !== "playing" || state.step === "tricks") return null;
  if (!state.talonTakenBy || !state.lockedCardId) return null;
  const card = state.seats
    .find((s) => s.playerId === state.talonTakenBy)
    ?.hand.find((c) => c.id === state.lockedCardId);
  return card ? { ...card } : null;
}

export function getRaubView(state: RaubGameState, viewerId: string): RaubPlayerView {
  const me = state.seats.find((s) => s.playerId === viewerId);
  const myTurn = state.phase === "playing" && state.currentPlayerId === viewerId;
  const hidden = !!me && viewerId === state.dealerId && !state.dealerOpened && state.phase === "playing";

  let swapOffer: RaubSwapOffer | null = null;
  if (myTurn && state.step === "swap_seven" && me) {
    const seven = me.hand.find((c) => isSeven(c) && c.suit === state.trumpSuit);
    const talon = state.talon.at(-1);
    if (seven && talon) swapOffer = { seven, talon };
  }

  return {
    game: "raub",
    roomId: state.roomId,
    matchId: state.matchId,
    phase: state.phase,
    stateVersion: state.stateVersion,
    rules: { ...state.rules },
    dealNo: state.dealNo,
    dealerId: state.dealerId,
    step: state.step,
    currentPlayerId: state.currentPlayerId,
    seats: state.seats.map((s) => ({
      playerId: s.playerId,
      seatNo: s.seatNo,
      score: s.score,
      tricks: s.tricks,
      bid: s.bid,
      exchanged: s.exchanged,
      going: s.going,
      handCount: s.hand.length,
      place: s.place,
    })),
    talon: state.talon.map((c) => ({ ...c })),
    talonFlips: state.talonFlips,
    talonTakenBy: state.talonTakenBy,
    takenTalonCard: takenTalonCard(state),
    deckCount: state.deck.length,
    offeredSuit:
      state.phase === "playing" && state.trumpSuit === null ? (state.talon.at(-1)?.suit ?? null) : null,
    trumpSuit: state.trumpSuit,
    scenario: state.scenario,
    declarerId: state.declarerId,
    requiredTricks: state.requiredTricks,
    multiplier: state.multiplier,
    pendingRefas: state.pendingRefas,
    fullExchangeUsed: state.fullExchangeUsed,
    openCard: state.openCard ? { playerId: state.openCard.playerId, card: { ...state.openCard.card } } : null,
    exchangeOrder: state.exchangeOrder ? [...state.exchangeOrder] : null,
    tricks: structuredClone(state.tricks),
    myPlayerId: viewerId,
    myCards: me && !hidden ? me.hand.map((c) => ({ ...c })) : [],
    myCardsHidden: hidden,
    lockedCardId:
      me && me.hand.some((c) => c.id === state.lockedCardId) ? state.lockedCardId : null,
    legalCardIds:
      myTurn && state.step === "tricks" ? raubLegalCards(state, viewerId).map((c) => c.id) : null,
    swapOffer,
    maxExchange: myTurn && state.step === "exchange" ? raubMaxExchange(state, viewerId) : 0,
    // Upisani redovi istorije se ne mijenjaju (vidi `clone` u match.ts).
    lastHand: state.lastHand,
    history: [...state.history],
    placements: state.placements.map((p) => ({ ...p })),
  };
}

/**
 * Šta server odigra kad igraču istekne rok (spec, „Edge caseovi"): najsigurnija
 * dozvoljena akcija. `null` kad igrač nije na potezu.
 */
export function getRaubAutoAction(state: RaubGameState, playerId: string): RaubAction | null {
  if (state.phase !== "playing" || state.currentPlayerId !== playerId) return null;
  const seat = state.seats.find((s) => s.playerId === playerId);
  if (!seat) return null;
  switch (state.step) {
    case "await_open":
      return { type: "open" };
    case "bidding":
      return { type: "bid", bid: "pass" };
    case "swap_seven":
      return { type: "swap_seven", swap: false };
    case "going":
      // Najsigurnije: ne ide, pa se ne boduje (nema kazne).
      return { type: "go", go: false };
    case "exchange":
      return { type: "exchange", cardIds: [] };
    case "discard_extra": {
      // Najslabija karta koja nije adut i nije s talona (ni otvorena).
      const blocked = new Set<string>();
      if (state.lockedCardId) blocked.add(state.lockedCardId);
      if (state.openCard?.playerId === playerId) blocked.add(state.openCard.card.id);
      const pool = seat.hand.filter((c) => !blocked.has(c.id));
      return { type: "discard", cardId: weakestCard(pool, state.trumpSuit).id };
    }
    case "tricks": {
      const legal = raubLegalCards(state, playerId);
      const lowest = [...legal].sort(
        (a, b) =>
          Number(a.suit === state.trumpSuit) - Number(b.suit === state.trumpSuit) ||
          raubRankValue(a) - raubRankValue(b) ||
          a.id.localeCompare(b.id),
      )[0]!;
      return { type: "play", cardId: lowest.id };
    }
    default:
      return null;
  }
}
