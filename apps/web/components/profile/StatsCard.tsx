"use client";

import { useEffect, useRef, useState } from "react";

import type { GameId, PlayerStats, SharedStats } from "@zandar/shared-types";

import { CardsIcon, CheckIcon, FlameIcon, RetryIcon, TableIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet/Sheet";
import { dayMonth } from "@/lib/dates";
import { sr } from "@/lib/sr";
import { gameStatsView, statsGames, totalOf, type GameStatsView } from "@/lib/statsView";
import { track } from "@/lib/track";

/**
 * S1 · kartica „Statistika" na profilu (SPEC_STATISTIKA v0.2 §8.1, tabla
 * `UI_Statistika`). Jedna velika brojka: pobjede % u izabranoj igri. Ispod
 * 5 završenih krug je u segmentima, bez procenta. Isti ekran za web i
 * aplikaciju (O1).
 *
 * `variant="other"` (v0.3): ista kartica na tuđem profilu, samo za čitanje —
 * bez dugmeta „Igraj" (bez partija se ne crta), „Završava" samo kad ga server
 * dozvoli (`showCompletes`, od 10 započetih partija vlasnika).
 */

export type StatsCardState =
  | { status: "ready"; stats: PlayerStats | SharedStats | undefined }
  | { status: "loading" }
  | { status: "error"; onRetry: () => void };

const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

export function StatsCard({
  state,
  order,
  fallbackGame = "zandar",
  onPlay,
  variant = "own",
}: {
  state: StatsCardState;
  /** Redoslijed igara na početnoj — za nerješeno (isto partija). */
  order: readonly GameId[];
  /** Igra za dugme „Igraj" kad nema partija (zadnja izabrana). */
  fallbackGame?: GameId;
  onPlay?: (game: GameId) => void;
  variant?: "own" | "other";
}) {
  const other = variant === "other";
  const [picked, setPicked] = useState<GameId | null>(null);
  const [howOpen, setHowOpen] = useState(false);

  const stats = state.status === "ready" ? state.stats : undefined;
  const games = statsGames(stats, order);
  const game = picked && games.includes(picked) ? picked : (games[0] ?? null);
  const viewed = useRef<GameId | null>(null);

  useEffect(() => {
    if (state.status !== "ready" || !game || !stats || viewed.current === game) return;
    if (viewed.current === null) {
      track("stats_viewed", { game, source: other ? "other_profile" : "profile", matches: totalOf(stats.byGame[game]!) });
    }
    viewed.current = game;
  }, [state.status, game, stats, other]);

  if (state.status === "loading") {
    return (
      <section className="stats stats--skeleton" aria-label={sr.stats.loading} aria-busy="true">
        <span className="stats__sk stats__sk--title" />
        <span className="stats__main">
          <span className="stats__sk stats__sk--ring" />
          <span className="stats__sk-lines">
            <span className="stats__sk" />
            <span className="stats__sk" />
            <span className="stats__sk" />
          </span>
        </span>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="stats" aria-labelledby="stats-title">
        <h2 id="stats-title" className="stats__title">
          {sr.stats.title}
        </h2>
        <p className="stats__text">{sr.stats.loadError}</p>
        <button type="button" className="stats__retry" onClick={state.onRetry}>
          <RetryIcon className="stats__btn-icon" />
          {sr.stats.retry}
        </button>
      </section>
    );
  }

  const how = howOpen ? <HowSheet onClose={() => setHowOpen(false)} /> : null;

  if (!game || !stats) {
    if (other) return null;
    return (
      <section className="stats" aria-labelledby="stats-title">
        <h2 id="stats-title" className="stats__title">
          {sr.stats.title}
        </h2>
        <div className="stats__main">
          <span className="stats__ring stats__ring--empty" aria-hidden="true">
            <svg viewBox="0 0 100 100">
              <circle className="stats__track stats__track--dashed" cx="50" cy="50" r={RING_R} />
            </svg>
            <span className="stats__ring-in">
              <CardsIcon className="stats__empty-icon" />
            </span>
          </span>
          <p className="stats__text">{sr.stats.empty}</p>
        </div>
        <button type="button" className="home__cta stats__play" onClick={() => onPlay?.(fallbackGame)}>
          <span>{sr.stats.play(sr.games[fallbackGame].name)}</span>
        </button>
      </section>
    );
  }

  const v = gameStatsView(game, stats.byGame[game]!);
  const showCompletes = !("showCompletes" in stats) || stats.showCompletes;
  const name = sr.games[game].name;

  return (
    <section className="stats" data-tint={game} aria-labelledby="stats-title">
      <h2 id="stats-title" className="stats__title">
        {games.length > 1 ? sr.stats.title : sr.stats.titleOne(name)}
      </h2>
      {games.length > 1 ? (
        <div className="stats__chips" role="group" aria-label={sr.stats.pickGame}>
          {games.map((g) => (
            <button
              key={g}
              type="button"
              className="stats__chip"
              data-tint={g}
              aria-pressed={g === game}
              onClick={() => {
                if (g === game) return;
                track("stats_game_switched", { from: game, to: g });
                setPicked(g);
              }}
            >
              {sr.games[g].name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="stats__main" key={game}>
        <StatsRing v={v} />
        <ul className="stats__list">
          <li>
            <span>{sr.stats.winsLosses(v.won, v.lost)}</span>
          </li>
          {v.tableSize !== null ? (
            <li className="stats__context">
              <TableIcon className="stats__li-icon" />
              <span>{sr.stats.table(v.tableSize)}</span>
            </li>
          ) : null}
          {v.bestStreak >= 2 ? (
            <li>
              <FlameIcon className="stats__li-icon" />
              <span>{sr.stats.streak(v.streak, v.bestStreak)}</span>
            </li>
          ) : null}
          {v.percent === null ? (
            <li className="stats__muted">{sr.stats.percentFrom}</li>
          ) : null}
          {v.completes !== null && showCompletes ? (
            <li>
              <CheckIcon className="stats__li-icon" />
              <span>{sr.stats.completes(v.completes)}</span>
            </li>
          ) : null}
        </ul>
      </div>
      <div className="stats__foot">
        <span>{stats.since !== null ? sr.stats.since(dayMonth(stats.since)) : null}</span>
        <button type="button" className="stats__how" onClick={() => setHowOpen(true)}>
          {sr.stats.how}
        </button>
      </div>
      {how}
    </section>
  );
}

/** Krug: puni luk od procenta, ili segmenti po partiji ispod praga („3 od 4"). */
function StatsRing({ v }: { v: GameStatsView }) {
  const segments = v.percent === null && v.finished > 0 ? v.finished : 0;
  const gap = 6;
  const seg = segments > 0 ? RING_C / segments - gap : 0;
  return (
    <span className="stats__ring" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        {segments > 0 ? (
          <>
            <circle className="stats__track" cx="50" cy="50" r={RING_R} strokeDasharray={`${seg} ${gap}`} />
            <circle
              className="stats__arc stats__arc--seg"
              cx="50"
              cy="50"
              r={RING_R}
              strokeDasharray={`${Array.from({ length: v.won }, () => `${seg} ${gap}`).join(" ")} ${RING_C}`}
            />
          </>
        ) : (
          <>
            <circle className="stats__track" cx="50" cy="50" r={RING_R} />
            {v.share > 0 ? (
              <circle className="stats__arc" cx="50" cy="50" r={RING_R} strokeDasharray={`${v.share * RING_C} ${RING_C}`} />
            ) : null}
          </>
        )}
      </svg>
      <span className="stats__ring-in">
        <b className={v.percent !== null ? "stats__big" : "stats__big stats__big--words"}>{v.percent !== null ? `${v.percent} %` : sr.stats.ofTotal(v.won, v.finished)}</b>
        <small className="stats__big-label">{v.percent !== null ? sr.stats.wins : sr.stats.winsLabel(v.won)}</small>
      </span>
    </span>
  );
}

/** S6 · „Kako se broji". */
function HowSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={sr.stats.howTitle} closeLabel={sr.stats.howOk} onClose={onClose}>
      <ul className="stats-how">
        {sr.stats.howRules.map((rule) => (
          <li key={rule}>
            <CheckIcon className="stats-how__icon" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
