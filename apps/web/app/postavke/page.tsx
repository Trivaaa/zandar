"use client";

import { SettingsScreen } from "@/components/settings/SettingsScreen";

/**
 * `/postavke` — Postavke kao poseban ekran (SPEC_PROFIL_POSTAVKE §4, A3).
 * Zasebna ruta, ne sheet: Android „nazad" vraća na Profil (`router.back()`),
 * a ruta je statička, pa prolazi i APK export.
 */
export default function SettingsPage() {
  return <SettingsScreen />;
}
