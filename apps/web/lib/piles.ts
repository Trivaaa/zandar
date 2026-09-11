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

/**
 * Koji kljuc `matchScore`-a / `capturedCounts`-a pripada ovom igracu.
 *
 * Isto pravilo koje `pilesOf` koristi za redove, samo obrnuto: 4P je po timu,
 * 2P i 3P po igracu. Jedno mjesto, da se sjediste i razrada rezultata ne mogu
 * razici. U 4P ti i partner pokazujete ISTI broj — to i jeste rezultat u timskoj
 * igri, a ne greska u prikazu.
 */
export function pileIdOf(player: PublicPlayer, players: PublicPlayer[]): string {
  const teamed = players.some((p) => p.teamId !== undefined);
  return teamed && player.teamId !== undefined ? `team-${player.teamId}` : player.id;
}
