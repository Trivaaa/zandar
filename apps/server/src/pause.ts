import type { GameState, AbandonVote } from "@zandar/shared-types";

/**
 * Čiste odluke za prekid partije (PRD v2 §32). Bez timera, bez socket-a, bez
 * mutacija — stanje unutra, odluka napolje. Ovdje živi sve što se može pročitati
 * i provjeriti bez pokretanja servera.
 *
 * Botovi su imuni (PRD §41.3): nemaju socket pa se ne diskonektuju, ali nijedna
 * odluka ispod se ne oslanja na to — sve broji LJUDE eksplicitno, nikad
 * `players.length`.
 */

type PlayerLike = {
  id: string;
  isBot?: boolean;
  connectionStatus: "connected" | "reconnecting" | "abandoned";
};

/** Igrači koji nisu botovi. */
export function humansAtTable<T extends PlayerLike>(players: T[]): T[] {
  return players.filter((p) => !p.isBot);
}

/** Ljudi koji su trenutno na vezi (glasači i oni koje pauza čeka da se vrate). */
export function connectedHumans<T extends PlayerLike>(players: T[]): T[] {
  return humansAtTable(players).filter(
    (p) => p.connectionStatus === "connected",
  );
}

/**
 * Šta poslije isteka grace perioda.
 *
 * Sto pun botova se raspušta BEZ glasanja (PRD v3.1, odluka #5): nema koga
 * pitati, a pauza koju niko ne vidi je samo odgođeno brisanje sobe.
 */
export function nextPhaseAfterGrace(
  gs: Pick<GameState, "players">,
): "paused_for_reconnect" | "abandoned" {
  return connectedHumans(gs.players).length > 0
    ? "paused_for_reconnect"
    : "abandoned";
}

/**
 * Ishod glasanja o prekidu.
 *
 * "extend" — bilo ko hoće da čeka. Jedan glas za čekanje pobjeđuje sve ostale:
 *   partija se prekida samo ako NIKO ne želi da nastavi.
 * "end"    — svi koji mogu da glasaju su glasali za prekid.
 * "pending" — još se čeka.
 */
export function resolveVote(
  votes: Record<string, AbandonVote> | undefined,
  voterIds: string[],
): "extend" | "end" | "pending" {
  const cast = votes ?? {};
  if (voterIds.some((id) => cast[id] === "wait")) return "extend";
  if (voterIds.length > 0 && voterIds.every((id) => cast[id] === "end")) {
    return "end";
  }
  return "pending";
}

/** Istek glasanja bez ijednog "čekaj" znači prekid (PRD §32.4 default). */
export function resolveVoteTimeout(
  votes: Record<string, AbandonVote> | undefined,
  voterIds: string[],
): "extend" | "end" {
  return resolveVote(votes, voterIds) === "extend" ? "extend" : "end";
}

/** Ima li još koga da se čeka (neko je otpao a nije se vratio). */
export function hasReconnectingHuman(
  gs: Pick<GameState, "players">,
): boolean {
  return humansAtTable(gs.players).some(
    (p) => p.connectionStatus === "reconnecting",
  );
}

/**
 * Šta poslije namjernog izlaska (QA B1 — „Napusti partiju"). Igrač koji izlazi
 * je već označen (`reconnecting` + `left`), pa `connectedHumans` broji samo one
 * koji ostaju. Za razliku od pukle veze nema grace perioda: ostali odmah dobiju
 * pauzu i glasanje.
 *
 * - `pause`               — partija teče → pauza za ostale.
 * - `next_hand_then_pause` — ruka je gotova, a sljedeću pokreće samo host; ako je
 *                            otišao host, sto bi zaglavio na rezultatu. A
 *                            `resumeFromPause` vraća u `playing`, pa pauza mora
 *                            krenuti iz nove ruke.
 * - `mark_only`           — sto već stoji (pauza/glasanje) → samo javi stolu.
 * - `abandon`             — nema više nijednog čovjeka za stolom.
 * - `ignore`              — partija ne traje (lobi, kraj meča, raspušten sto).
 */
export type LeaveOutcome =
  | "pause"
  | "next_hand_then_pause"
  | "mark_only"
  | "abandon"
  | "ignore";

export function afterLeave(
  gs: Pick<GameState, "phase" | "players">,
): LeaveOutcome {
  const live =
    gs.phase === "playing" ||
    gs.phase === "hand_finished" ||
    gs.phase === "paused_for_reconnect" ||
    gs.phase === "abandon_vote";
  if (!live) return "ignore";
  if (nextPhaseAfterGrace(gs) === "abandoned") return "abandon";
  if (gs.phase === "playing") return "pause";
  if (gs.phase === "hand_finished") return "next_hand_then_pause";
  return "mark_only";
}
