"use client";

import { useSyncExternalStore } from "react";

import { ShuffleScreen } from "@/components/funnel/ShuffleScreen";
import { parseQuickPlayPrefs, readQuickPlayPrefsRaw } from "@/lib/quickPlayPrefs";
import { hasIntro } from "@/lib/shuffleView";
import { useQueryParam } from "@/lib/useQuery";

const subscribeNothing = () => () => {};

/**
 * Dok se kod stola još učitava (spora mreža): igrač koji upravo kreće za novi
 * sto već vidi miješanje — isti ekran koji `RoomScreen` nastavlja, bez
 * međukoraka „Učitavanje...". Ostali (link, povratak) vide tihi tekst.
 */
export function RoomFallback() {
  const roomId = useQueryParam("id");
  const intro = useSyncExternalStore(subscribeNothing, () => (roomId ? hasIntro(roomId) : false), () => false);
  const prefsRaw = useSyncExternalStore(subscribeNothing, () => readQuickPlayPrefsRaw(), () => null);
  if (intro) {
    return (
      <ShuffleScreen
        kicker={null}
        players={[]}
        myPlayerId={null}
        playerCount={parseQuickPlayPrefs(prefsRaw).playerCount}
        exiting={false}
      />
    );
  }
  return (
    <main className="min-h-screen bg-felt text-white flex items-center justify-center">
      <p className="text-muted">Učitavanje...</p>
    </main>
  );
}
