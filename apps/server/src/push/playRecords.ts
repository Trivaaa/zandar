import type { GameId } from "@zandar/shared-types";

import type { Capture } from "../analytics";
import type { PlayInput } from "./devices";

/**
 * Kraj meča → statistika igranja po uređaju (SPEC_PUSH_V2 B2). Čista funkcija:
 * isti `match_ended` događaji koje server šalje u PostHog (jedan po čovjeku,
 * `distinctId` = guestId) se preko sjedišta (`room.pushIds`) vežu za uređaj.
 *
 * Bot nema `guestId` ni uređaj, pa ga nema ni ovdje. Isti uređaj na dva
 * sjedišta (test sa jednog telefona) dobija jedan upis.
 */
export function playRecordsFromCaptures(
  room: {
    players: readonly { id: string; guestId?: string | undefined }[];
    pushIds?: Readonly<Record<string, string>> | undefined;
  },
  captures: readonly Capture<"match_ended">[],
  game: GameId,
  timing: { startedAt?: number | undefined; endedAt: number },
): { idHash: string; input: PlayInput }[] {
  if (!room.pushIds) return [];
  const out = new Map<string, PlayInput>();
  for (const c of captures) {
    const player = room.players.find((p) => p.guestId === c.distinctId);
    const idHash = player ? room.pushIds[player.id] : undefined;
    if (!idHash || out.has(idHash)) continue;
    const { is_winner: winner, end_reason: reason } = c.properties;
    out.set(idHash, {
      game,
      result: winner === true ? "won" : winner === false ? "lost" : "other",
      completed: reason === "completed",
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
    });
  }
  return [...out].map(([idHash, input]) => ({ idHash, input }));
}
