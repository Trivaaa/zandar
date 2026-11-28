"use client";

import { EMPTY_GAME_STATS, type GameStats, type PlayerStats, type SharedStats } from "@zandar/shared-types";

import { MatchStatsLineView } from "@/components/MatchStatsRow";
import { Avatar } from "@/components/profile/Avatar";
import { StatsCard, type StatsCardState } from "@/components/profile/StatsCard";
import { Sheet } from "@/components/sheet/Sheet";
import { useQueryParam } from "@/lib/useQuery";

/**
 * Dev pregled statistike (tabla UI_Statistika, SPEC_STATISTIKA S1/S3/S6) —
 * prave komponente, bez servera i naloga. /dev/* je 404 u produkciji.
 *
 *   /dev/stats?s=full      S1 više igara (Raub 34 %, kontekst stola, niz)
 *   /dev/stats?s=small     S1 malo partija („3 od 4", segmenti)
 *   /dev/stats?s=poker     S1 poker za stolom od 4 (23 %)
 *   /dev/stats?s=empty     S1 bez partija (Igraj)
 *   /dev/stats?s=loading   S1 skelet
 *   /dev/stats?s=error     S1 greška
 *   /dev/stats?s=end       S3 svi redovi na kraju partije
 *   /dev/stats?s=other     S4 tuđi profil (prijatelj / privatni sto), Završava vidljivo
 *   /dev/stats?s=other-new S4 tuđi profil, manje od 10 započetih (bez Završava)
 */
const g = (x: Partial<GameStats>): GameStats => ({ ...EMPTY_GAME_STATS, ...x });

const FULL: PlayerStats = {
  v: 1,
  since: Date.UTC(2026, 11, 1),
  byGame: {
    raub: g({ won: 14, lost: 27, abandoned: 3, streak: 3, bestStreak: 5, tables: { "3": 30, "4": 11 } }),
    bela: g({ won: 7, lost: 7 }),
    zandar: g({ won: 2, lost: 1 }),
  },
};
const SMALL: PlayerStats = { v: 1, since: Date.UTC(2026, 11, 1), byGame: { bela: g({ won: 3, lost: 1, streak: 2, bestStreak: 2 }) } };
const POKER: PlayerStats = {
  v: 1,
  since: Date.UTC(2026, 11, 1),
  byGame: { poker: g({ won: 8, lost: 27, abandoned: 4, tables: { "4": 33, "3": 2 } }), raub: g({ won: 1, lost: 2 }) },
};

const ORDER = ["raub", "bela", "poker", "zandar"] as const;

const shared = (stats: PlayerStats, showCompletes: boolean): SharedStats => ({
  v: 1,
  since: stats.since,
  showCompletes,
  byGame: Object.fromEntries(
    Object.entries(stats.byGame).map(([k, g]) => {
      const { lastAt: _drop, ...rest } = g!;
      return [k, { ...rest, abandoned: showCompletes ? rest.abandoned : 0 }];
    }),
  ),
});

export default function DevStatsPage() {
  const s = useQueryParam("s") ?? "full";
  const state: StatsCardState =
    s === "loading"
      ? { status: "loading" }
      : s === "error"
        ? { status: "error", onRetry: () => undefined }
        : { status: "ready", stats: s === "small" ? SMALL : s === "poker" ? POKER : s === "empty" ? undefined : FULL };

  if (s === "other" || s === "other-new") {
    return (
      <main className="screen profile" style={{ padding: "1rem" }}>
        <Sheet title="Profil igrača" closeLabel="Zatvori" onClose={() => undefined}>
          <div className="other-profile">
            <Avatar id="medvjed" size={64} />
            <span className="profile__hero-name">Jasmin</span>
            <span className="profile__meta">63 završene partije</span>
            <div className="other-profile__stats">
              <StatsCard
                variant="other"
                state={{ status: "ready", stats: s === "other" ? shared(FULL, true) : shared(SMALL, false) }}
                order={[]}
              />
            </div>
          </div>
        </Sheet>
      </main>
    );
  }

  return (
    <main className="screen profile" style={{ padding: "1rem" }}>
      <div className="profile__col">
        {s === "end" ? (
          <div className="roundend" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem" }}>
            <MatchStatsLineView line={{ kind: "win", won: 1 }} />
            <MatchStatsLineView line={{ kind: "streak", won: 15, streak: 3 }} />
            <MatchStatsLineView line={{ kind: "record", streak: 6 }} />
            <MatchStatsLineView line={{ kind: "loss", match: 42, percent: 33 }} />
            <MatchStatsLineView line={{ kind: "loss", match: 4, percent: null }} />
          </div>
        ) : (
          <StatsCard state={state} order={ORDER} fallbackGame="raub" onPlay={() => undefined} />
        )}
      </div>
    </main>
  );
}
