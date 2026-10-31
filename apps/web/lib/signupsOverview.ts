import type { SignupListItem } from "@zandar/shared-types";

export type SignupOverviewRow = { email: string; games: string[]; firstAt: number };

/**
 * Jedan red po adresi, najnovije prvo. Prijava sa početne upisuje po red za svaku
 * najavljenu igru, pa bi spisak redova isti broj ljudi pokazao višestruko.
 */
export function groupSignups(signups: readonly SignupListItem[]): SignupOverviewRow[] {
  const rows = new Map<string, SignupOverviewRow>();
  for (const { email, game, createdAt } of signups) {
    const row = rows.get(email);
    if (!row) {
      rows.set(email, { email, games: [game], firstAt: createdAt });
      continue;
    }
    if (!row.games.includes(game)) row.games.push(game);
    row.firstAt = Math.min(row.firstAt, createdAt);
  }
  return [...rows.values()].sort((a, b) => b.firstAt - a.firstAt);
}
