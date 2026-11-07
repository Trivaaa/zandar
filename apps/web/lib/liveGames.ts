import type { GameId } from "@zandar/shared-types";

import { pokerLive } from "@/lib/pokerRelease";
import { raubLive } from "@/lib/raubRelease";

/**
 * Igre koje se u OVOM buildu mogu izabrati za sto (`/create`, „Pozovi na
 * partiju"): Žandar uvijek, ostale iza svojih prekidača izdanja. Jedno mjesto,
 * da se izbor igre ne razide između ekrana.
 */
export function tableGames(flags: { poker: boolean; raub: boolean }): GameId[] {
  return ["zandar", ...(flags.poker ? (["poker"] as const) : []), ...(flags.raub ? (["raub"] as const) : [])];
}

export const TABLE_GAMES: readonly GameId[] = tableGames({ poker: pokerLive, raub: raubLive });

/** Vrijednost iz URL-a / memorije → igra koja se smije izabrati, inače Žandar. */
export function pickTableGame(raw: unknown, games: readonly GameId[] = TABLE_GAMES): GameId {
  return games.find((g) => g === raw) ?? "zandar";
}

/** Igre bez izbora cilja (11/21) i timova: sto za 2–4, kreće sam kad se popuni. */
export const isSeatGame = (game: GameId | undefined) => game === "poker" || game === "raub";
