"use client";

/**
 * Korisničke postavke feedback sloja (PRD §50.4): zvuk i vibracija.
 *
 * Bez context/store-a — modul + localStorage + `useSyncExternalStore` (isti
 * minimalistički stil kao zapamćeno ime na home-u). Default je ON; vrijednost
 * "0" u localStorage znači isključeno. Mijenja se trivijalno preko preklopki.
 */

import { useSyncExternalStore } from "react";

export type SettingKey = "sound" | "haptics";

const STORAGE_KEYS: Record<SettingKey, string> = {
  sound: "zandar:sound",
  haptics: "zandar:haptics",
};

const listeners = new Set<() => void>();

// In-memory cache da `getSound()/getHaptics()` (koje engine-i čitaju u trenutku
// događaja) budu sinhroni i jeftini.
let cache: Record<SettingKey, boolean> = { sound: true, haptics: true };

function readFromStorage(key: SettingKey): boolean {
  if (typeof window === "undefined") return true; // SSR → default ON
  return window.localStorage.getItem(STORAGE_KEYS[key]) !== "0";
}

function refresh(): void {
  cache = { sound: readFromStorage("sound"), haptics: readFromStorage("haptics") };
}

function emit(): void {
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  refresh();
  // Cross-tab: druga kartica promijenila postavku.
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEYS.sound || e.key === STORAGE_KEYS.haptics) {
      refresh();
      emit();
    }
  });
}

/** Sinhroni getteri za engine-e (zvuk/haptika) — čitaju se u trenutku događaja. */
export function getSound(): boolean {
  return cache.sound;
}
export function getHaptics(): boolean {
  return cache.haptics;
}

export function setSetting(key: SettingKey, value: boolean): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEYS[key], value ? "1" : "0");
  }
  refresh();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * React hook za preklopke. Vraća [vrijednost, setter]. Live-sync preko svih
 * komponenti (home + igra) i kartica.
 */
export function useSetting(key: SettingKey): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => cache[key],
    () => true, // server snapshot: default ON
  );
  return [value, (v: boolean) => setSetting(key, v)];
}
