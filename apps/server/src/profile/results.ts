import type { ProfileStore } from "./store";

type PlayerLike = { isBot?: boolean; uid?: string };

/**
 * Ko dobija završenu partiju (SPEC_IDENTITET §3): ljudi sa Firebase `uid`-om.
 * Bot se nikad ne broji; čovjek bez `uid`-a (stari klijent, Firebase
 * nedostupan) ostaje bez zapisa — partija mu se ne može pripisati.
 */
export function completedMatchUids(players: readonly PlayerLike[]): string[] {
  const uids = players
    .filter((p) => !p.isBot && typeof p.uid === "string" && p.uid.length > 0)
    .map((p) => p.uid as string);
  return [...new Set(uids)];
}

/**
 * Upis rezultata poslije završene partije. Nikad ne baca i ne čeka se:
 * Firestore nedostupan ne smije zaustaviti kraj partije ni srušiti proces
 * (neuhvaćeno odbijanje). Dupli poziv za istu partiju je bezopasan — store
 * je idempotentan po (`matchId`, `uid`).
 */
export function recordCompletedMatch(
  store: ProfileStore,
  matchId: string,
  players: readonly PlayerLike[],
  log: (msg: string) => void = console.error,
): Promise<void> {
  const uids = completedMatchUids(players);
  return Promise.all(
    uids.map((uid) =>
      store.recordCompletedMatch(matchId, uid).catch((err: unknown) => {
        log(`[profile] rezultat nije upisan (${matchId}): ${String(err).slice(0, 300)}`);
      }),
    ),
  ).then(() => undefined);
}
