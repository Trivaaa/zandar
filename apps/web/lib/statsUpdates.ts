"use client";

import { useEffect, useState } from "react";

import type { GameId, StatsUpdatePayload } from "@zandar/shared-types";

import { getSocket } from "@/lib/socket";

/**
 * `stats:update` (F1 S3): server ga šalje socketu igrača za stolom poslije
 * upisa ishoda. Može stići prije nego što se završni ekran nacrta (animacija
 * kraja), pa jedan slušalac od ulaska u sobu čuva zadnji događaj, a red na
 * kraju partije ga čita. Stariji server ga ne šalje — tada reda nema.
 */

/** Koliko dugo poslije kraja red čeka događaj prije nego odustane (spec P0-4). */
export const STATS_WAIT_MS = 3000;
/** Događaj stariji od ovoga ne pripada ovom kraju partije. */
const FRESH_MS = 60_000;

type Received = { payload: StatsUpdatePayload; at: number };

let started = false;
let latest: Received | null = null;
const listeners = new Set<() => void>();

function isPayload(raw: unknown): raw is StatsUpdatePayload {
  const p = raw as Partial<StatsUpdatePayload> | null;
  return (
    typeof p === "object" &&
    p !== null &&
    typeof p.matchId === "string" &&
    typeof p.game === "string" &&
    (p.outcome === "win" || p.outcome === "loss" || p.outcome === "abandon") &&
    typeof p.after === "object" &&
    p.after !== null
  );
}

/** Jednom po aplikaciji; poziva se pri ulasku u sobu (RoomScreen). */
export function listenStatsUpdates(): void {
  if (started) return;
  started = true;
  getSocket().on("stats:update", (raw: unknown) => {
    if (!isPayload(raw)) return;
    latest = { payload: raw, at: Date.now() };
    listeners.forEach((l) => l());
  });
}

function freshFor(game: GameId): StatsUpdatePayload | null {
  return latest && latest.payload.game === game && Date.now() - latest.at < FRESH_MS ? latest.payload : null;
}

/**
 * Ishod za završni ekran igre `game`: `undefined` dok se čeka (do 3 s),
 * `null` kad nije stigao, inače događaj. Bez praznog mjesta i spinera — dok
 * se čeka, red se ne crta.
 */
export function useMatchEndStats(game: GameId): StatsUpdatePayload | null | undefined {
  const [state, setState] = useState<StatsUpdatePayload | null | undefined>(() => freshFor(game) ?? undefined);

  useEffect(() => {
    listenStatsUpdates();
    if (state !== undefined) return; // stigao, ili je rok od 3 s prošao
    const mountedAt = Date.now();
    const onUpdate = () => {
      const p = freshFor(game);
      if (p && latest && latest.at >= mountedAt - FRESH_MS) setState(p);
    };
    listeners.add(onUpdate);
    const timer = setTimeout(() => setState((s) => (s === undefined ? null : s)), STATS_WAIT_MS);
    return () => {
      listeners.delete(onUpdate);
      clearTimeout(timer);
    };
  }, [game, state]);

  return state;
}
