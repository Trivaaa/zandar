import { getCaptureOptions } from "@zandar/game-core";
import type { Card } from "@zandar/shared-types";

/**
 * Šta znači dodir na kartu u ruci (QA P6).
 *
 * Kad protivnik odigra, snapshot odmah kaže da sam ja na potezu, a sto još
 * ~1 s animira njegov potez (`useTableBeat`). Ranije se svaki dodir u tom
 * prozoru bacao, pa se u ~30 % poteza prvi dodir „gubio" dok sat već teče.
 *
 * Izbor karte ne zavisi od stola, pa se prihvata uvijek. Izvršenje zavisi:
 * sto u animaciji crta ZADRŽANI raspored, a opcije se računaju po novom
 * `state.table` — zato drugi dodir tada ide u RED i izvršava se kad se sto
 * smiri (`resolveQueuedPlay`), i to samo kad je ishod jednoznačan.
 *
 * Klijent ni ovdje ne odlučuje o legalnosti: `play` samo predlaže potez koji
 * server provjerava (HARD RULE 1).
 */
export type HandTap =
  | { kind: "ignore" }
  | { kind: "select"; cardId: string }
  | { kind: "queue"; cardId: string }
  | { kind: "play"; cardId: string; captureIds: string[] }
  | { kind: "choose" };

export type HandTapInput = {
  card: Card;
  selectedId: string | null;
  myTurn: boolean;
  /** Potez je poslat, čeka se server. */
  busy: boolean;
  /** Sto još animira prethodni potez. */
  tableBusy: boolean;
  table: Card[];
};

/** Ishod jednoznačno odigrane karte nad datim stolom. */
function playOrChoose(card: Card, table: Card[]): HandTap {
  const opts = getCaptureOptions(card, table);
  if (opts.length === 0) return { kind: "play", cardId: card.id, captureIds: [] };
  if (opts.length === 1) return { kind: "play", cardId: card.id, captureIds: opts[0]!.cardIds };
  return { kind: "choose" }; // više kupljenja: izbor grupe je na stolu
}

/** Prvi dodir podiže kartu, drugi dodir iste karte je igra. */
export function decideHandTap(input: HandTapInput): HandTap {
  const { card, selectedId, myTurn, busy, tableBusy, table } = input;
  if (!myTurn || busy) return { kind: "ignore" };
  if (selectedId !== card.id) return { kind: "select", cardId: card.id };
  if (tableBusy) return { kind: "queue", cardId: card.id };
  return playOrChoose(card, table);
}

export type QueuedPlay =
  | { kind: "play"; cardId: string; captureIds: string[] }
  | { kind: "choose" }
  | { kind: "drop" };

/** Izvršenje zapamćenog dodira kad se sto smiri — nad PRAVIM stolom. */
export function resolveQueuedPlay(cardId: string, hand: Card[], table: Card[]): QueuedPlay {
  const card = hand.find((c) => c.id === cardId);
  if (!card) return { kind: "drop" };
  const tap = playOrChoose(card, table);
  return tap.kind === "play" ? tap : { kind: "choose" };
}
