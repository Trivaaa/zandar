import { quickPlay } from "@/lib/api";
import { normalizePlayerName, savePlayerName } from "@/lib/playerName";
import { matchingPath } from "@/lib/routes";
import { saveSession } from "@/lib/session";

/**
 * Jedan put do javnog stola — dijele ga home (kad je ime sačuvano) i `/ime`.
 *
 * Isti redoslijed kao ranije na home-u: ime se pamti PRIJE zahtjeva, pa
 * mrežna greška ne briše ono što je igrač upisao. Vraća putanju matching
 * ekrana; navigaciju radi pozivalac (home gura, `/ime` zamjenjuje sebe).
 */
export async function startQuickPlay(name: string): Promise<string> {
  const displayName = normalizePlayerName(name);
  savePlayerName(displayName);
  const res = await quickPlay({ displayName });
  saveSession({
    roomId: res.roomId,
    playerId: res.playerId,
    sessionToken: res.playerSessionToken,
  });
  return matchingPath(res.roomId);
}
