"use client";

import { useState, type ReactNode } from "react";

import { GuestCard } from "@/components/profile/GuestCard";
import { OtherProfileSheet } from "@/components/profile/OtherProfileSheet";

type Tapped = { name: string; profileId: string | null; anchor: DOMRect };

/**
 * Dodir na igrača za stolom ili u sobi (T1–T3): nalog → tuđi profil (list),
 * svako bez naloga → mali oblačić sa slovom i nadimkom. Odluka je SAMO po
 * `profileId` — gost i bot su `null` i izgledaju isto (G3, HARD RULE 3).
 */
export function usePlayerInfo(): {
  open: (player: { displayName: string; profileId?: string | null }, anchor: DOMRect) => void;
  layer: ReactNode;
} {
  const [tapped, setTapped] = useState<Tapped | null>(null);
  const close = () => setTapped(null);

  let layer: ReactNode = null;
  if (tapped?.profileId) {
    layer = <OtherProfileSheet profileId={tapped.profileId} onClose={close} />;
  } else if (tapped) {
    layer = <GuestCard name={tapped.name} anchor={tapped.anchor} onClose={close} />;
  }

  return {
    open: (player, anchor) =>
      setTapped({ name: player.displayName, profileId: player.profileId ?? null, anchor }),
    layer,
  };
}
