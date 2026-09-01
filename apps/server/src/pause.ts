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
