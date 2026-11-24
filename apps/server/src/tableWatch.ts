/**
 * Sobe u kojima `room:subscribe` prođe (`ok: true`), a klijent ipak ne dobije
 * `game:state` — pa visi na „Učitavanje stola" (prijava 18.11.2026, poker).
 * Ovo samo prepoznaje stanje radi loga; ništa ne popravlja.
 *
 * Modul je čist (bez io/fastify), da se testira bez servera.
 */

/** Javni poker/Raub/Bela sto puni se do 2 s; duže od ovoga u `waiting` je sumnjivo. */
export const PUBLIC_WAITING_WARN_MS = 10_000;

type WatchedRoom = {
  game?: string;
  status: string;
  isPublic?: boolean;
  createdAt: number;
  poker?: unknown;
  raub?: unknown;
  bela?: unknown;
};

/**
 * Razlog zašto pretplatnik neće dobiti stanje stola, ili `null` kad je sve u redu.
 * Žandar nije ovdje: njegovo stanje (`gameState`) se šalje drugim putem.
 */
export function silentTableReason(room: WatchedRoom, now = Date.now()): string | null {
  const game = room.game;
  if (game !== "poker" && game !== "raub" && game !== "bela") return null;
  const state = game === "poker" ? room.poker : game === "raub" ? room.raub : room.bela;
  if (room.status === "playing" && !state) return `${game} soba je playing bez stanja stola`;
  if (room.isPublic && room.status === "waiting" && now - room.createdAt > PUBLIC_WAITING_WARN_MS) {
    return `javni ${game} sto čeka duže od ${PUBLIC_WAITING_WARN_MS / 1000} s`;
  }
  return null;
}
