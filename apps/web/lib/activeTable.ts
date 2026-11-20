"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACTIVE_TABLE_MAX_SESSIONS,
  type ActiveTable,
  type ActiveTableClaim,
  type ActiveTableResponse,
} from "@zandar/shared-types";

import { authHeaders } from "@/lib/auth";
import { resolveApiBase } from "@/lib/platform";
import { dismissKey, isHidden } from "@/lib/resumeView";
import { clearSession, listSessions, saveSession } from "@/lib/session";

/**
 * „Vrati se za sto" (tabla `UI_VratiSe`, QA 10-24 P2) — za kojim stolom igrač
 * sjedi, po serveru: ključevi sa ovog uređaja + provjeren nalog (drugi uređaj).
 */

const API_BASE = resolveApiBase();

/** Dok je početna vidljiva: dovoljno često da „NA POTEZU SI" ne kasni mnogo. */
export const RESUME_POLL_MS = 15_000;

const DISMISSED_KEY = "zandar:resume:dismissed";
const DISMISSED_MAX = 20;

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

/**
 * Završena partija koju je igrač vidio (za stolom) ili zatvorio (X / Rezultat
 * na V6) više ne dobija traku. Per-uređaj udobnost; prazno skladište = traka
 * se pokaže još jednom, ništa gore.
 */
export function markTableSeen(t: Pick<ActiveTable, "roomId" | "matchId">): void {
  try {
    const list = [...readDismissed()].filter((k) => k !== dismissKey(t));
    list.push(dismissKey(t));
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(list.slice(-DISMISSED_MAX)));
  } catch {
    // Blokirano skladište — traka se samo ne pamti zatvorena.
  }
}

export async function fetchActiveTable(): Promise<ActiveTableResponse> {
  const sessions = listSessions().slice(0, ACTIVE_TABLE_MAX_SESSIONS);
  const res = await fetch(`${API_BASE}/api/me/table`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ sessions }),
  });
  if (!res.ok) throw new Error(`active_table_${res.status}`);
  const body = (await res.json()) as ActiveTableResponse;
  // Sobe kojih više nema: ključ samo smeta (QA P14 — gomilaju se zauvijek).
  for (const roomId of body.gone ?? []) clearSession(roomId);
  return body;
}

/** Sjedište prelazi na ovaj uređaj (isti nalog); ključ se čuva kao i svaki drugi. */
export async function claimTable(roomId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/me/table/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ roomId }),
  });
  if (!res.ok) throw new Error(`claim_${res.status}`);
  saveSession((await res.json()) as ActiveTableClaim);
}

/**
 * „Napusti partiju i igraj …" (V5): isto što i „Napusti partiju" za stolom.
 * Bez ključa na ovom uređaju (drugi uređaj) prvo ga preuzme.
 */
export async function leaveTable(roomId: string, claim: boolean): Promise<void> {
  if (claim) await claimTable(roomId);
  const session = listSessions().find((s) => s.roomId === roomId);
  if (!session) throw new Error("no_session");
  const res = await fetch(`${API_BASE}/api/rooms/${encodeURIComponent(roomId)}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: session.playerId, sessionToken: session.sessionToken }),
  });
  // 404: soba je u međuvremenu obrisana — sjedišta ionako više nema.
  if (!res.ok && res.status !== 404) throw new Error(`leave_${res.status}`);
  clearSession(roomId);
}

export type ActiveTableHook = {
  /** `null` dok se ne zna, ili kad stola nema (prvi render je uvijek bez trake). */
  table: ActiveTable | null;
  claim: boolean;
  /** Zatvori traku završene partije (V6). */
  dismiss: () => void;
  refresh: () => void;
};

/**
 * Traka na početnoj. Pita na ulazu, na povratak u prvi plan i svakih
 * `RESUME_POLL_MS` dok je stranica vidljiva. Greška mreže = traka ostaje
 * kakva je bila (ne treperi).
 */
export function useActiveTable(enabled = true): ActiveTableHook {
  const [state, setState] = useState<{ table: ActiveTable | null; claim: boolean }>({ table: null, claim: false });
  const inflight = useRef(false);

  const refresh = useCallback(() => {
    if (!enabled || inflight.current) return;
    inflight.current = true;
    fetchActiveTable()
      .then((res) => {
        const table = res.table && !isHidden(res.table, readDismissed()) ? res.table : null;
        setState({ table, claim: table ? res.claim === true : false });
      })
      .catch(() => {})
      .finally(() => {
        inflight.current = false;
      });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, RESUME_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", refresh);
    };
  }, [enabled, refresh]);

  const shown = state.table;
  const dismiss = useCallback(() => {
    if (shown) markTableSeen(shown);
    setState({ table: null, claim: false });
  }, [shown]);

  return { table: state.table, claim: state.claim, dismiss, refresh };
}
