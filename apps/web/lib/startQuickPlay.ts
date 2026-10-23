import type { TableTheme } from "@zandar/shared-types";

import { quickPlay } from "@/lib/api";
import { normalizePlayerName, savePlayerName } from "@/lib/playerName";
import { saveQuickPlayPrefs, type QuickPlayPrefs } from "@/lib/quickPlayPrefs";
import { matchingPath } from "@/lib/routes";
import { saveSession } from "@/lib/session";
import { saveTableTheme } from "@/lib/tableTheme";

/**
 * Jedan put do javnog stola — „Igraj Žandar" na početnoj.
 *
 * Ime i izbor se pamte PRIJE zahtjeva, pa mrežna greška ne briše ono što je
 * igrač upisao i izabrao. Vraća putanju matching ekrana; navigaciju radi
 * pozivalac (`replace`, da „nazad" sa traženja vodi na početnu).
 */
export async function startQuickPlay(
  name: string,
  prefs: QuickPlayPrefs,
  tableTheme: TableTheme,
): Promise<string> {
  const displayName = normalizePlayerName(name);
  savePlayerName(displayName);
  saveQuickPlayPrefs(prefs);
  saveTableTheme(tableTheme);
  const res = await quickPlay({ displayName, ...prefs, tableTheme });
  saveSession({
    roomId: res.roomId,
    playerId: res.playerId,
    sessionToken: res.playerSessionToken,
  });
  return matchingPath(res.roomId);
}
