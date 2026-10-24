import type { Player, PublicPlayer } from "@zandar/shared-types";

/**
 * Jedino mjesto gdje `Player` postaje `PublicPlayer` (whitelist, ne brisanje
 * polja) — `isBot`, `botProfile`, `guestId`, `uid`, `platform` nikad ne
 * prolaze (HARD RULE 3).
 *
 * Bot i gost moraju izgledati ISTO: `avatar` i `profileId` su `null` za svakog
 * igrača bez naloga, a bot ih ne dobija ni kad bi ih nekim slučajem nosio.
 */
export function toPublicPlayer(p: Player): PublicPlayer {
  const account = !p.isBot && typeof p.profileId === "string";
  return {
    id: p.id,
    displayName: p.displayName,
    seatIndex: p.seatIndex,
    isHost: p.isHost,
    teamId: p.teamId,
    connectionStatus: p.connectionStatus,
    avatar: account ? (p.avatar ?? null) : null,
    profileId: account ? (p.profileId as string) : null,
    // Bot nikad ne izlazi, pa ključ ne razlikuje bota od čovjeka.
    ...(p.left === true ? { left: true } : {}),
  };
}
