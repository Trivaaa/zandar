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
  const headers = await authHeaders();
  if (!headers.Authorization) throw new Error("no_token");
  const res = await fetch(`${API_BASE}/api/me`, { headers });
  if (!res.ok) throw new Error(`me_${res.status}`);
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
