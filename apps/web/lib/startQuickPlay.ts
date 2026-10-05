import { quickPlay } from "@/lib/api";
import { normalizePlayerName, savePlayerName } from "@/lib/playerName";
import { saveQuickPlayPrefs, type QuickPlayPrefs } from "@/lib/quickPlayPrefs";
import { matchingPath } from "@/lib/routes";
import { saveSession } from "@/lib/session";

/**
 * Jedan put do javnog stola, sa ekrana `/igraj`.
 *
 * Ime i izbor se pamte PRIJE zahtjeva, pa mrežna greška ne briše ono što je
 * igrač upisao i izabrao. Vraća putanju matching ekrana; navigaciju radi
 * pozivalac (`/igraj` zamjenjuje sebe).
 */
export async function startQuickPlay(name: string, prefs: QuickPlayPrefs): Promise<string> {
  const displayName = normalizePlayerName(name);
  savePlayerName(displayName);
  saveQuickPlayPrefs(prefs);
  const res = await quickPlay({ displayName, ...prefs });
  saveSession({
    roomId: res.roomId,
    playerId: res.playerId,
    sessionToken: res.playerSessionToken,
  });
  return matchingPath(res.roomId);
}
