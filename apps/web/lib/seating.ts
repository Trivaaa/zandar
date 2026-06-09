import type { PublicPlayer } from "@zandar/shared-types";

/**
 * Pozicijski raspored sjedišta oko stola (DS §1.1, B2).
 *
 * Ti si UVIJEK dole (`hand`). Ostali se raspoređuju relativno u odnosu na tebe
 * po `seatIndex`-u, koji je clockwise red poteza. "Relativni offset" (rel) je
 * koliko si mjesta clockwise udaljen od mene:
 *
 *   rel 0 = ja (dole)
 *   rel 1 = prvi poslije mene (clockwise → DESNA strana ekrana)
 *   rel n-1 = posljednji prije mene (LIJEVA strana)
 *
 * Mapiranje rel → grid area po broju igrača:
 *
 *   2P: rel1 → partner (jedini protivnik, gore-centar)
 *   3P: rel1 → oppR, rel2 → oppL (gornji uglovi)
 *   4P: rel1 → oppR, rel2 → partner (preko stola), rel3 → oppL
 *
 * U 4P partner je rel2 (preko stola) — poklapa se sa team konvencijom iz
 * shared-types (sjedišta 0+2 = tim A, 1+3 = tim B; partner je seatIndex ±2).
 */

export type PlayerCount = 2 | 3 | 4;

export type SeatArrangement = {
  playerCount: PlayerCount;
  me?: PublicPlayer;
  /** 2P: jedini protivnik · 4P: partner preko stola. undefined ako prazno. */
  partner?: PublicPlayer;
  oppL?: PublicPlayer;
  oppR?: PublicPlayer;
};

function clampCount(n: number): PlayerCount {
  if (n <= 2) return 2;
  if (n >= 4) return 4;
  return 3;
}

export function arrangeSeats(
  players: PublicPlayer[],
  myPlayerId: string,
): SeatArrangement {
  const n = players.length;
  const playerCount = clampCount(n);

  const me = players.find((p) => p.id === myPlayerId);
  const mySeat = me?.seatIndex ?? 0;

  // Indeksiraj po relativnom (clockwise) offsetu od mene.
  const byRel = new Map<number, PublicPlayer>();
  for (const p of players) {
    const rel = (((p.seatIndex - mySeat) % n) + n) % n;
    byRel.set(rel, p);
  }

  const arr: SeatArrangement = { playerCount, me };

  if (playerCount === 2) {
    arr.partner = byRel.get(1); // jedini protivnik gore-centar
  } else if (playerCount === 3) {
    arr.oppR = byRel.get(1);
    arr.oppL = byRel.get(2);
  } else {
    arr.oppR = byRel.get(1);
    arr.partner = byRel.get(2); // preko stola
    arr.oppL = byRel.get(3);
  }

  return arr;
}
