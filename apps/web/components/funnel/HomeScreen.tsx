"use client";

import type { ReactNode, Ref } from "react";

import { HomeHero } from "@/components/home/HomeHero";
import { StoreRow } from "@/components/home/StoreRow";
import { UpcomingGames } from "@/components/home/UpcomingGames";

export type HomeScreenProps = {
  onPlay: () => void;
  onFriends: () => void;
  onOpenSettings: () => void;
  /** Host vraća fokus na zupčanik kad se postavke zatvore. */
  settingsButtonRef?: Ref<HTMLButtonElement> | undefined;
  loading: boolean;
  error?: string | undefined;
  /** Web da, APK ne — odluku donosi host (`!isNative`), da preview može oboje. */
  showStores: boolean;
  /** Prikaz sekcije budućih igara (analitika). Zove se jednom po prikazu. */
  onUpcomingViewed?: (() => void) | undefined;
  /** Privatnost / uslovi / o nama — host ih montira, Play ih traži. */
  legalSlot?: ReactNode;
  className?: string | undefined;
};

/**
 * Prvi ekran. Prezentacija: bez skladišta i bez rutiranja (osim deklarativnih
 * linkova ka teaser stranicama). Glavna radnja je jedna i glasna; privatna soba
 * je vidljiva ali tiša; buduće igre i prodavnice su ispod pregiba.
 *
 * Ime više NIJE ovdje — traži se na `/ime` tek kad je igrač izabrao radnju.
 */
export function HomeScreen({
  onPlay,
  onFriends,
  onOpenSettings,
  settingsButtonRef,
  loading,
  error,
  showStores,
  onUpcomingViewed,
  legalSlot,
  className = "",
}: HomeScreenProps) {
  return (
    <main className={`screen home ${className}`}>
      <HomeHero
        onPlay={onPlay}
        onFriends={onFriends}
        onOpenSettings={onOpenSettings}
        settingsButtonRef={settingsButtonRef}
        loading={loading}
        error={error}
      />
      <UpcomingGames onViewed={onUpcomingViewed} />
      {showStores ? <StoreRow /> : null}
      <footer className="home__legal">{legalSlot}</footer>
    </main>
  );
}
