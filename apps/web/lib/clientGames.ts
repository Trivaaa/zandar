import type { GameId } from "@zandar/shared-types";

/**
 * Igre koje OVAJ klijent zna da nacrta. Server ih traži u tijelu
 * `join-request` / `invites/:id/accept` i u `auth.games` na socketu: klijent
 * bez njih (APK 1.0–1.3) ne smije ući u poker sobu, jer bi poker stanje crtao
 * kao Žandar sto. Nova igra = red ovdje tek kad je njen ekran gotov.
 */
export const CLIENT_GAMES: readonly GameId[] = ["zandar", "poker", "raub"];
