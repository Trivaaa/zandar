import type { PublicPlayer } from "@zandar/shared-types";
import { sr } from "@/lib/sr";

export type Pile = { id: string; label: string; sub?: string };

/** Presentation read only: 4P sends teamId, so rows are teams; otherwise rows
 *  are players. No rules decision is made here. Single source for this fact —
 *  every component that needs pile rows imports it from here. */
export function pilesOf(players: PublicPlayer[]): Pile[] {
  const seated = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  const teamed = seated.some((p) => p.teamId !== undefined);
  if (!teamed) {
    return seated.map((p) => ({ id: p.id, label: p.displayName }));
  }
  const names = (team: number) =>
    seated
      .filter((p) => p.teamId === team)
      .map((p) => p.displayName)
      .join(" i ");
  return [
    { id: "team-0", label: sr.score.teamA, sub: names(0) },
    { id: "team-1", label: sr.score.teamB, sub: names(1) },
  ];
}
