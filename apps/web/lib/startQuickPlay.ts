import type { TableTheme } from "@zandar/shared-types";

import { quickPlay } from "@/lib/api";
import type { GameSlug } from "@/lib/games";
import { markGamePlayed } from "@/lib/homePrefs";
import { normalizePlayerName, savePlayerName } from "@/lib/playerName";
import { saveQuickPlayPrefs, type QuickPlayPrefs } from "@/lib/quickPlayPrefs";
import { roomPath } from "@/lib/routes";
import { saveSession } from "@/lib/session";
import { markIntro } from "@/lib/shuffleView";
import { saveTableTheme } from "@/lib/tableTheme";

/**
 * Jedan put do javnog stola — „Igraj Žandar" na početnoj.
 *
 * Ime i izbor se pamte PRIJE zahtjeva, pa mrežna greška ne briše ono što je
 * igrač upisao i izabrao. Tek USPJEH igru upisuje kao zadnju igranu (glavna
 * kartica početne, nestaje NOVO). Poker šalje `game`; veličinu i cilj server za njega ignoriše. Vraća putanju stola (uvod „Miješamo špil" je na njemu); navigaciju radi
 * pozivalac (`replace`, da „nazad" sa traženja vodi na početnu).
 */
export async function startQuickPlay(
  name: string,
  prefs: QuickPlayPrefs,
  tableTheme: TableTheme,
  game: GameSlug = "zandar",
  {
    remember = true,
    saveName = true,
  }: {
    remember?: boolean;
    /** `false`: ime važi samo za ovaj sto („Gost NN" na webu, I5) — sljedeći „Igraj" opet pita. */
    saveName?: boolean;
  } = {},
): Promise<string> {
  const displayName = normalizePlayerName(name);
  if (saveName) savePlayerName(displayName);
  // Web početna ide za sto sa stalnim izborom i nasumičnim stolom: to nije
  // igračev izbor, pa ne smije postati „zadnji" (`/create`, Brza igra).
  if (remember) {
    saveQuickPlayPrefs(prefs, game);
    saveTableTheme(tableTheme, game);
  }
  const res = await quickPlay(
    {
      displayName,
      ...prefs,
      tableTheme,
      // Poker i Raub šalju `game`; veličinu i cilj server za njih ignoriše (uvijek 4).
      ...(game === "poker" || game === "raub" ? { game } : {}),
    },
    saveName ? {} : { guest: true },
  );
  markGamePlayed(game);
  saveSession({
    roomId: res.roomId,
    playerId: res.playerId,
    sessionToken: res.playerSessionToken,
  });
  markIntro(res.roomId);
  return roomPath(res.roomId);
}
