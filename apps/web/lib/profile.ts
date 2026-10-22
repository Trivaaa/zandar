"use client";

import { useCallback, useEffect, useState } from "react";

import type { ProfileAvatar } from "@zandar/shared-types";

import { authHeaders } from "@/lib/auth";
import { resolveApiBase } from "@/lib/platform";

/** Odgovor `GET /api/me` (apps/server/src/profile/routes.ts). */
export type Me = {
  uid: string;
  /** `true` = gost (anonimni Firebase nalog). */
  anonymous: boolean;
  completedMatches: number;
  nickname: string | null;
  avatar: ProfileAvatar | null;
  /** Kad se nadimak smije opet mijenjati; `null` = odmah. */
  nicknameChangeAllowedAt: number | null;
};

const API_BASE = resolveApiBase();

/** Baca kad nema prijave (Firebase nedostupan) ili server ne odgovori. */
export async function fetchMe(): Promise<Me> {
  const res = await authed("/api/me");
  if (!res.ok) throw new Error(`me_${res.status}`);
  return (await res.json()) as Me;
}

async function authed(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = await authHeaders();
  if (!headers.Authorization) throw new Error("no_token");
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
}

/** Odgovor `GET /api/nicknames/check` (K1–K7). */
export type NicknameVerdict =
  | { status: "invalid"; problem: "too_short" | "too_long" | "invalid_chars"; char?: string }
  | { status: "blocked" }
  | { status: "taken"; suggestions: string[] }
  | { status: "free" | "own"; nickname: string };

export async function checkNicknameRemote(n: string, signal?: AbortSignal): Promise<NicknameVerdict> {
  const res = await authed(`/api/nicknames/check?n=${encodeURIComponent(n)}`, signal ? { signal } : {});
  if (!res.ok) throw new Error(`check_${res.status}`);
  return (await res.json()) as NicknameVerdict;
}

export type SaveNicknameResult =
  | { ok: true; me: Me }
  | { ok: false; code: "taken"; suggestions: string[] }
  | { ok: false; code: "locked"; allowedAt: number }
  | { ok: false; code: "invalid" | "blocked" | "error" };

export async function saveNickname(nickname: string): Promise<SaveNicknameResult> {
  const res = await authed("/api/me/nickname", { method: "PUT", body: JSON.stringify({ nickname }) });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) return { ok: true, me: body as unknown as Me };
  if (res.status === 409) {
    return { ok: false, code: "taken", suggestions: (body.suggestions as string[] | undefined) ?? [] };
  }
  if (res.status === 423) return { ok: false, code: "locked", allowedAt: Number(body.allowedAt) };
  if (body.code === "blocked") return { ok: false, code: "blocked" };
  if (body.code === "invalid") return { ok: false, code: "invalid" };
  return { ok: false, code: "error" };
}

/**
 * T6: posle prijave na postojeći nalog — obriši gosta koji je ostao na ovom
 * uređaju. Token je GOSTOV (zapamćen prije prijave), ne trenutni. Ne baca:
 * ako ne uspije, gost ostaje siroče, a igrač to ne treba da vidi.
 */
export async function abandonGuest(guestToken: string): Promise<void> {
  await fetch(`${API_BASE}/api/me/abandon`, {
    method: "POST",
    headers: { Authorization: `Bearer ${guestToken}` },
  }).catch(() => undefined);
}

export async function saveAvatar(avatar: ProfileAvatar): Promise<Me> {
  const res = await authed("/api/me/avatar", { method: "PUT", body: JSON.stringify({ avatar }) });
  if (!res.ok) throw new Error(`avatar_${res.status}`);
  return (await res.json()) as Me;
}

export type MeState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; me: Me };

/** Profil za ekran — učitavanje, greška (sa ponovnim pokušajem) ili podaci. */
export function useMe(): MeState & { retry: () => void } {
  const [state, setState] = useState<MeState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then(
      (me) => {
        if (!cancelled) setState({ status: "ready", me });
      },
      () => {
        if (!cancelled) setState({ status: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
