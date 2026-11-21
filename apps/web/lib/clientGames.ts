import type { GameId } from "@zandar/shared-types";

import { belaLive } from "@/lib/belaRelease";

/**
 * Igre koje OVAJ klijent zna da nacrta. Server ih traži u tijelu
 * `join-request` / `invites/:id/accept` i u `auth.games` na socketu: klijent
 * bez njih (APK 1.0–1.3) ne smije ući u poker sobu, jer bi poker stanje crtao
 * kao Žandar sto. Nova igra = red ovdje tek kad je njen ekran gotov.
 */
export const CLIENT_GAMES: readonly (GameId | string)[] = [
  "zandar",
  "poker",
  "raub",
  // Pravila Rauba v2 (odluka 13) — vidi `GAME_PROTOCOL` u shared-types.
  "raub:2",
  // Bela (docs/bela-spec.md, faza 4): server traži i "bela:1". Iza prekidača,
  // da ugašena Bela ne ulazi ni preko tuđeg linka.
  ...(belaLive ? ["bela", "bela:1"] : []),
];
