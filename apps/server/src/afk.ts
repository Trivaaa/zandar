import type { MatchEndReason } from "@zandar/shared-types";

/**
 * Da li je čovjek stvarno igrao partiju (odluka vlasnika 27.11.2026).
 *
 * Kad igraču istekne sat poteza, server igra umjesto njega (Žandar
 * `handleTurnTimeout`, poker/Raub/Bela `autoAct`). Ko ostane za stolom a ne
 * igra, tako „završi" partiju do kraja. Ovdje se broje ručni i automatski
 * potezi po igraču; partija se računa kao odigrana samo ako je igrač sam
 * odigrao bar `minManualShare` svojih poteza — inače je za njega napuštena
 * (`end_reason: abandoned`, `afk: true`).
 *
 * Brojači žive na sobi (`LobbyRoom.moveCounts`), ne na `Player`-u: ne idu
 * klijentu i preživljavaju restart kroz isti snapshot. Soba hidrirana iz
 * starog snapshota nema brojače — tada se ne zna, i ništa se ne mijenja.
 */

export type MoveCount = { manual: number; auto: number };

export type MoveCounts = {
  matchId: string;
  byPlayer: Record<string, MoveCount>;
};

export type AfkConfig = {
  /** Najmanji udio ručnih poteza da se partija računa kao odigrana. */
  minManualShare: number;
  /** Rok za „Sljedeća ruka" — poslije toga je partija napuštena (`stalled`). */
  nextHandIdleMs: number;
};

function envMs(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export const AFK_CONFIG: AfkConfig = {
  minManualShare: 0.5,
  nextHandIdleMs: envMs("NEXT_HAND_IDLE_MS", 10 * 60_000),
};

/**
 * Rok za „Sljedeća ruka" važi samo kad čovjek igra sam protiv botova
 * (odluka vlasnika 27.11.2026). Čim za stolom sjede dva čovjeka, sljedeću
 * ruku kontroliše host, bez roka — zaglavljen sto tada zatvara samo sweeper.
 */
export function stallApplies(players: readonly { isBot?: boolean | undefined }[]): boolean {
  return players.filter((p) => !p.isBot).length === 1;
}

type RoomWithCounts ={ moveCounts?: MoveCounts | undefined };

/** Upiši jedan potez čovjeka. Novi `matchId` (revanš, nova partija) briše stare brojače. */
export function countMove(
  room: RoomWithCounts,
  matchId: string,
  playerId: string,
  kind: "manual" | "auto",
): void {
  if (!room.moveCounts || room.moveCounts.matchId !== matchId) {
    room.moveCounts = { matchId, byPlayer: {} };
  }
  const c = (room.moveCounts.byPlayer[playerId] ??= { manual: 0, auto: 0 });
  c[kind] += 1;
}

/** Brojači za dati meč, ili `undefined` (stari snapshot, drugi meč). */
export function countsFor(
  room: RoomWithCounts,
  matchId: string,
): Record<string, MoveCount> | undefined {
  return room.moveCounts?.matchId === matchId ? room.moveCounts.byPlayer : undefined;
}

/** Igrač je većinu svojih poteza prepustio serveru. Bez brojača: ne zna se → `false`. */
export function isAfk(count: MoveCount | undefined, cfg: AfkConfig = AFK_CONFIG): boolean {
  if (!count) return false;
  const total = count.manual + count.auto;
  if (total < 1) return false;
  return count.manual / total < cfg.minManualShare;
}

/**
 * Razlog kraja za jednog igrača. Meč koji se završio je za igrača koji je
 * sam izašao ili nije igrao (AFK) napušten; prekinut meč ostaje prekinut.
 */
export function ownEndReason(
  reason: MatchEndReason,
  p: { left?: boolean | undefined },
  count: MoveCount | undefined,
  cfg: AfkConfig = AFK_CONFIG,
): { reason: MatchEndReason; left: boolean; afk: boolean } {
  const left = p.left === true;
  if (reason !== "completed") return { reason, left, afk: false };
  if (left) return { reason: "abandoned", left, afk: false };
  const afk = isAfk(count, cfg);
  return { reason: afk ? "abandoned" : "completed", left, afk };
}
