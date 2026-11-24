/**
 * Praćenje ekrana koji čekaju prvo stanje stola (`game:state`) — „Miješamo
 * špil" (uvod brze igre) i „Učitavanje stola…" (povratak u partiju, javni sto).
 *
 * Kad stanje nikad ne stigne (odbijena pretplata, soba bez stanja na serveru,
 * socket se ne poveže), igrač je ranije visio bez kraja, a Sentry nije vidio
 * ništa jer nema izuzetka (prijava 18.11.2026, poker; changelog 224).
 *
 * Čist modul: odluke i oblik prijave, bez Reacta, Sentryja i PostHoga.
 */
import type { AnalyticsEvents, GameId } from "@zandar/shared-types";

/** Koji ekran čeka stanje stola. */
export type TableWaitPhase = "shuffle" | "loading";

/**
 * Koliko ekran smije stajati prije nego se javi (i na webu ponudi izlaz).
 * Uvod normalno traje ~4 s (igrači sjedaju ~3 s + S2), pa mu treba duži rok;
 * „Učitavanje stola" normalno traje djelić sekunde.
 */
export const TABLE_LOAD_STUCK_MS: Record<TableWaitPhase, number> = {
  shuffle: 12_000,
  loading: 8_000,
};

/**
 * Koji ekran čeka stanje, ili `null` kad igrač ne čeka sto (lobi, sto je tu,
 * nema sesije). Ogledalo grananja u `RoomScreen`-u.
 */
export function tableWaitPhase(args: {
  showIntro: boolean;
  hasSession: boolean;
  hasTableState: boolean;
  room: { status: string; isPublic?: boolean } | null;
}): TableWaitPhase | null {
  const { showIntro, hasSession, hasTableState, room } = args;
  if (!hasSession || hasTableState) return null;
  if (showIntro) return "shuffle";
  if (!room) return null;
  if (room.status === "playing" || room.status === "finished" || room.isPublic) return "loading";
  return null;
}

/** Šta piše igraču kad sto ne stiže; `refresh` = jedini izlaz je osvježavanje. */
export function stuckHint(subscribeError: string | null): "refresh" | "retry" {
  return subscribeError === "UPDATE_REQUIRED" ? "refresh" : "retry";
}

export type TableLoadStuckReport = AnalyticsEvents["table_load_stuck"];

/** Svojstva za PostHog `table_load_stuck` (isti podaci idu i u Sentry tagove). */
export function tableLoadStuckReport(args: {
  roomId: string;
  game: GameId;
  phase: TableWaitPhase;
  room: { status: string; isPublic?: boolean } | null;
  socketConnected: boolean;
  subscribeError: string | null;
  msOnScreen: number;
}): TableLoadStuckReport {
  const { roomId, game, phase, room, socketConnected, subscribeError, msOnScreen } = args;
  return {
    room_id: roomId,
    game,
    phase,
    room_status: room?.status ?? "unknown",
    is_public: room?.isPublic ?? false,
    socket_connected: socketConnected,
    ...(subscribeError ? { subscribe_error: subscribeError } : {}),
    ms_on_screen: msOnScreen,
  };
}
