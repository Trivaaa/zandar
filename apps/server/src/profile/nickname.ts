import { failsNicknameFilter } from "@zandar/game-core";
import {
  checkNickname,
  NICKNAME_MAX_LENGTH,
  type NicknameProblem,
} from "@zandar/shared-types";

import type { ProfileStore } from "./store";

/**
 * Odluka o nadimku za formu (K1–K7) i za upis. Oblik provjerava
 * `checkNickname` (isti kod kao forma), riječi `failsNicknameFilter`
 * (blocklista generatora imena, PRD §39), zauzetost skladište.
 */
export type NicknameVerdict =
  | { status: "invalid"; problem: NicknameProblem; char?: string }
  /** K6 — bez objašnjenja šta je sporno. */
  | { status: "blocked" }
  | { status: "taken"; suggestions: string[] }
  | { status: "free" | "own"; nickname: string; key: string };

/** Koliko kandidata najviše provjeravamo za tri prijedloga (K3). */
const SUGGESTION_ATTEMPTS = 12;
const SUGGESTION_COUNT = 3;

export async function evaluateNickname(
  raw: unknown,
  uid: string,
  store: ProfileStore,
  opts: { now?: number; rng?: () => number } = {},
): Promise<NicknameVerdict> {
  const now = opts.now ?? Date.now();
  const check = checkNickname(raw);
  if (!check.ok) {
    return { status: "invalid", problem: check.problem, ...(check.char !== undefined && { char: check.char }) };
  }
  if (failsNicknameFilter(check.nickname)) return { status: "blocked" };
  const availability = await store.nicknameAvailability(check.key, uid, now);
  if (availability === "taken") {
    return {
      status: "taken",
      suggestions: await suggestNicknames(check.nickname, uid, store, now, opts.rng ?? Math.random),
    };
  }
  return { status: availability, nickname: check.nickname, key: check.key };
}

/**
 * Tri slobodna prijedloga za zauzet nadimak (K3: „Marko_7", „Marko.21",
 * „Marko77"). Osnova se skraćuje da sufiks stane u 16 znakova.
 */
export async function suggestNicknames(
  base: string,
  uid: string,
  store: ProfileStore,
  now: number,
  rng: () => number,
): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < SUGGESTION_ATTEMPTS && out.length < SUGGESTION_COUNT; i++) {
    const n = 1 + Math.floor(rng() * (i < 6 ? 99 : 999));
    const sep = ["_", ".", ""][i % 3] ?? "_";
    const suffix = `${sep}${n}`;
    const candidate = `${base.slice(0, NICKNAME_MAX_LENGTH - suffix.length)}${suffix}`;
    const check = checkNickname(candidate);
    if (!check.ok || seen.has(check.key) || failsNicknameFilter(check.nickname)) continue;
    seen.add(check.key);
    if ((await store.nicknameAvailability(check.key, uid, now)) === "free") out.push(check.nickname);
  }
  return out;
}
