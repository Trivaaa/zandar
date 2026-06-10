"use client";

/**
 * Haptički feedback (PRD §50.3) preko Web Vibration API-ja.
 *
 * Platformsko ograničenje: `navigator.vibrate` radi na Android Chrome; iOS Safari
 * ga NE podržava → graceful no-op (provjera `"vibrate" in navigator`). Nikad ne
 * oslanjaj kritičnu informaciju samo na vibraciju. Poštuje korisničku postavku.
 */

import { getHaptics } from "./settings";

/** Orijentacioni patterni (ms). Broj = jedan puls; niz = vibracija/pauza/vibracija. */
export const HAPTIC = {
  turn: 15,
  capture: [10, 30, 10],
  error: [40, 30, 40],
} as const;

/** Da li uređaj uopšte podržava vibraciju (npr. false na iOS Safari). */
export function hapticsSupported(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/** Vibrira ako je uređaj podržava i korisnik nije isključio. Inače no-op. */
export function vibrate(pattern: number | readonly number[]): void {
  if (!hapticsSupported()) return;
  if (!getHaptics()) return;
  try {
    // `HAPTIC` patterni su `as const` (readonly) — Vibration API traži mutable.
    navigator.vibrate(pattern as number | number[]);
  } catch {
    // ignoriši — vibracija je dekorativna
  }
}
