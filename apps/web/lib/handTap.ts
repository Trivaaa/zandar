import { getCaptureOptions } from "@zandar/game-core";
import type { Card } from "@zandar/shared-types";

/**
 * Šta znači dodir na kartu u ruci (QA P6).
 *
 * Kad protivnik odigra, snapshot odmah kaže da sam ja na potezu, a sto još
 * ~1 s animira njegov potez (`useTableBeat`). Ranije se svaki dodir u tom
 * prozoru bacao, pa se u ~30 % poteza prvi dodir „gubio" dok sat već teče.
 *
 * Izbor karte ne zavisi od stola, pa se prihvata uvijek. Drugi dodir dok sto
 * još animira računa se nad PRAVIM `state.table` (ne nad zadržanim crtežom):
 * kad je ishod jednoznačan, potez ide serveru ODMAH, a prikaz čeka svoj red
 * iza tuđeg beat-a (`useTableBeat`). Ranije je i slanje čekalo kraj animacije,
 * pa je dodir kasnio i do ~1 s plus put do servera. U RED (`queue`) ide samo
 * dodir kojem treba izbor grupe — taj izbor traži miran sto.
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
  /** PRAVI sto (`state.table`), ne ono što beat trenutno crta. */
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
  const tap = playOrChoose(card, table);
  if (tableBusy && tap.kind === "choose") return { kind: "queue", cardId: card.id };
  return tap;
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

/**
 * Gdje je karta spuštena prevlačenjem: na konkretnu grupu kupljenja
 * (`optionId`) ili bilo gdje na sto.
 */
export type DropTarget = { kind: "table" } | { kind: "option"; optionId: string };

export type HandDropInput = Omit<HandTapInput, "selectedId"> & { target: DropTarget };

/**
 * Prevlačenje je drugi tap izgovoren pokretom: ista pravila kao `decideHandTap`
 * kad je karta već podignuta. Jedina razlika je grupa kupljenja — ako je
 * karta spuštena tačno na nju, to je izbor te grupe. Sto u animaciji crta
 * stari raspored, pa se tada i prevlačenje stavlja u RED (bez izbora grupe).
 * Ni ovdje klijent ne odlučuje o legalnosti (HARD RULE 1).
 */
export function decideHandDrop(input: HandDropInput): HandTap {
  const { card, target, myTurn, busy, tableBusy, table } = input;
  if (!myTurn || busy) return { kind: "ignore" };
  if (tableBusy) return { kind: "queue", cardId: card.id };
  if (target.kind === "option") {
    const option = getCaptureOptions(card, table).find((o) => o.optionId === target.optionId);
    if (option) return { kind: "play", cardId: card.id, captureIds: option.cardIds };
  }
  return playOrChoose(card, table);
}
