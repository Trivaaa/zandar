import type { GameId } from "@zandar/shared-types";

import { pokerLive } from "@/lib/pokerRelease";
import { raubLive } from "@/lib/raubRelease";
import { belaLive } from "@/lib/belaRelease";

/**
 * Igre koje se u OVOM buildu mogu izabrati za sto (`/create`, „Pozovi na
 * partiju"): Žandar uvijek, ostale iza svojih prekidača izdanja. Jedno mjesto,
 * da se izbor igre ne razide između ekrana.
 */
export function tableGames(flags: { poker: boolean; raub: boolean; bela?: boolean }): GameId[] {
  return [
    "zandar",
    ...(flags.poker ? (["poker"] as const) : []),
    ...(flags.raub ? (["raub"] as const) : []),
    ...(flags.bela ? (["bela"] as const) : []),
  ];
}

export const TABLE_GAMES: readonly GameId[] = tableGames({ poker: pokerLive, raub: raubLive, bela: belaLive });

/** Vrijednost iz URL-a / memorije → igra koja se smije izabrati, inače Žandar. */
export function pickTableGame(raw: unknown, games: readonly GameId[] = TABLE_GAMES): GameId {
  return games.find((g) => g === raw) ?? "zandar";
}

/** Igre bez izbora cilja (11/21) i timova: sto za 2–4, kreće sam kad se popuni. */
export const isSeatGame = (game: GameId | undefined) => game === "poker" || game === "raub";

/**
 * Igre čiji sto vodi server (`game` u sobi): kreće sam kad se popuni, bez
 * dugmeta Start i bez Žandar podešavanja. Bela je tu, ali NIJE `isSeatGame`:
 * uvijek 4 igrača i ima svoj cilj (501/701/1001).
 */
export const isServerTableGame = (game: GameId | undefined) => isSeatGame(game) || game === "bela";

/**
 * Raub: od koliko se kreće (odluke 34–35). Privatni sto na webu bira 11 ili
 * 21; podrazumijevano je 21, kao i u brzoj igri.
 */
export const RAUB_TARGETS = [11, 21] as const;
export const RAUB_DEFAULT_TARGET = 21;

/** Bela: ciljevi privatnog stola (spec P-16); Quick Play je uvijek 501. */
export const BELA_TARGETS = [501, 701, 1001] as const;
export const BELA_DEFAULT_TARGET = 1001;
