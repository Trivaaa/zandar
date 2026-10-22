"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Parametar iz URL-a. `useSearchParams` bi u statičkom exportu (APK) tražio
 * `<Suspense>` oko cijele stranice; ovdje je render na serveru `null`, a u
 * pregledaču prava vrijednost — ekran ne smije donositi nepovratne odluke
 * dok je `null`.
 */
export function useQueryParam(name: string): string | null {
  return useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

/** Putanja sa parametrima (bez praznih). */
export function withQuery(path: string, params: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
