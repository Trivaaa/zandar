"use client";

import { useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import type { GameId } from "@zandar/shared-types";

import { getSocket } from "@/lib/socket";
import { isNative } from "@/lib/platform";
import { sr } from "@/lib/sr";
import { track } from "@/lib/track";
import {
  TABLE_LOAD_STUCK_MS,
  stuckHint,
  tableLoadStuckReport,
  type TableWaitPhase,
} from "@/lib/tableLoadWatch";

/** Sobe za koje je zaglavljenost već javljena u ovoj posjeti — jedna prijava po sobi. */
const reported = new Set<string>();

type WatchRoom = { status: string; isPublic?: boolean } | null;

/**
 * Prati ekran koji čeka prvo stanje stola. Poslije roka (po fazi, vidi
 * `TABLE_LOAD_STUCK_MS`) šalje Sentry `table_load_stuck` i PostHog
 * `table_load_stuck` (obje platforme), i vraća `true` — tad web nudi izlaz.
 * Rok teče od ulaska u fazu; kad stanje stigne (`phase` = null), sve se gasi.
 */
export function useTableLoadStuck(args: {
  roomId: string;
  game: GameId;
  phase: TableWaitPhase | null;
  room: WatchRoom;
  subscribeError: string | null;
}): boolean {
  const { roomId, game, phase, room, subscribeError } = args;
  // Zadnje vrijednosti za prijavu: promjena sobe ili greške ne restartuje rok.
  const latest = useRef({ game, room, subscribeError });
  useEffect(() => {
    latest.current = { game, room, subscribeError };
  });
  // Faza za koju je rok istekao; `stuck` se izvodi u renderu (bez setState u efektu).
  const [stuckKey, setStuckKey] = useState<string | null>(null);
  const key = phase ? `${roomId}:${phase}` : null;

  useEffect(() => {
    if (!phase || !key) return;
    const shownAt = Date.now();
    const timer = setTimeout(() => {
      setStuckKey(key);
      if (reported.has(roomId)) return;
      reported.add(roomId);
      const { game: g, room: r, subscribeError: err } = latest.current;
      const report = tableLoadStuckReport({
        roomId,
        game: g,
        phase,
        room: r,
        socketConnected: getSocket().connected,
        subscribeError: err,
        msOnScreen: Date.now() - shownAt,
      });
      try {
        Sentry.captureMessage("table_load_stuck", {
          level: "warning",
          tags: {
            game: report.game,
            phase: report.phase,
            room_status: report.room_status,
            is_public: String(report.is_public),
            socket_connected: String(report.socket_connected),
            subscribe_error: report.subscribe_error ?? "none",
          },
          extra: { roomId, msOnScreen: report.ms_on_screen },
        });
      } catch {
        // praćenje nikad ne smije da obori ekran
      }
      track("table_load_stuck", report);
    }, TABLE_LOAD_STUCK_MS[phase]);
    return () => clearTimeout(timer);
  }, [roomId, phase, key]);

  return key !== null && stuckKey === key;
}

/**
 * Poruka i izlaz kad sto ne stiže. Samo web (UI rad je samo za web; aplikacija
 * dobija samo praćenje). `floating` = preko ekrana „Miješamo špil".
 */
export function TableLoadStuckActions(props: {
  subscribeError: string | null;
  onRetry: () => void;
  onHome: () => void;
  floating?: boolean;
}) {
  const { subscribeError, onRetry, onHome, floating } = props;
  if (isNative) return null;
  const refresh = stuckHint(subscribeError) === "refresh";
  return (
    <div
      role="alert"
      className={
        floating
          ? "fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
          : "contents"
      }
    >
      <div
        className={
          floating
            ? "flex flex-col items-center gap-3 text-center max-w-sm rounded-token-lg bg-surface-raised border border-white/15 shadow-xl p-4 text-white"
            : "flex flex-col items-center gap-3 text-center"
        }
      >
        <p className="text-sm text-muted">{refresh ? sr.tableLoad.stuckRefresh : sr.tableLoad.stuckRetry}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={refresh ? () => window.location.reload() : onRetry}
            className="px-4 py-2 whitespace-nowrap rounded-token-md bg-surface-raised border border-white/15"
          >
            {refresh ? sr.tableLoad.refresh : sr.tableLoad.retry}
          </button>
          <button type="button" onClick={onHome} className="px-4 py-2 whitespace-nowrap rounded-token-md border border-white/15">
            {sr.tableLoad.home}
          </button>
        </div>
      </div>
    </div>
  );
}
