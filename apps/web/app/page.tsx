"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FeedbackToggles } from "@/components/FeedbackToggles";
import { RulesModal } from "@/components/RulesModal";
import { HomeScreen } from "@/components/funnel/HomeScreen";
import { SettingsSheet } from "@/components/home/SettingsSheet";
import { useBackHandler } from "@/lib/backHandlers";
import { isNative } from "@/lib/platform";
import { usePlayerName } from "@/lib/playerName";
import { namePath } from "@/lib/routes";
import { sr } from "@/lib/sr";
import { startQuickPlay } from "@/lib/startQuickPlay";
import { track } from "@/lib/track";

// Privatnost / uslovi / o nama. Na webu žive u footeru home-a (Play traži
// javni URL); na Androidu suptilno u Postavkama, kao zadnja sekcija — footer
// bi na malom ekranu bio treći red sitnog teksta ispod dvije glavne radnje,
// a na telefonu do njega niko i ne dolazi bez skrolanja.
const legalSlot = (
  <>
    <Link href="/privatnost">{sr.home.privacy}</Link>
    <Link href="/uslovi">{sr.home.terms}</Link>
    <Link href="/o-nama">{sr.home.about}</Link>
  </>
);

export default function Home() {
  const router = useRouter();
  const playerName = usePlayerName();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  // `loading` gasi dugme tek na sljedećem renderu; brz dupli tap stigne prije.
  const starting = useRef(false);
  // Fokus se vraća na ZUPČANIK, ne na `document.activeElement` zapamćen pri
  // otvaranju: Safari (i programski klik) ne fokusira dugme na tap, pa bi
  // zapamćen bio `body` i fokus bi se izgubio.
  const settingsButton = useRef<HTMLButtonElement>(null);

  function closeSettings() {
    setSettingsOpen(false);
    settingsButton.current?.focus();
  }

  useBackHandler(settingsOpen, closeSettings);
  useBackHandler(rulesOpen, () => setRulesOpen(false));

  async function handlePlay() {
    if (starting.current) return;
    // Bez sačuvanog imena ime se traži TEK sad, na zasebnoj ruti — tamo Android
    // „nazad" radi sam od sebe (na `/` gasi aplikaciju).
    if (!playerName) {
      router.push(namePath("quickplay"));
      return;
    }
    starting.current = true;
    setError(null);
    setLoading(true);
    try {
      router.push(await startQuickPlay(playerName));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
      setLoading(false);
      starting.current = false;
    }
  }

  return (
    <>
      <HomeScreen
        onPlay={() => void handlePlay()}
        onFriends={() => router.push("/create")}
        onOpenSettings={() => setSettingsOpen(true)}
        settingsButtonRef={settingsButton}
        loading={loading}
        {...(error ? { error } : {})}
        showStores={!isNative}
        onUpcomingViewed={() => track("upcoming_games_viewed")}
        {...(isNative ? {} : { legalSlot })}
      />

      {/* Slojevi preko home-a. Omotač pravi stacking context IZNAD PWA banera
          (`PwaManager`, z-60): na home-u baner stoji dole, tačno gdje je sheet, i
          prekrivao je „Zatvori". `RulesModal` se ne dira — dijeli ga igra. */}
      <div className="home-layer">
        {settingsOpen ? (
          <div className="sheet-scrim" onClick={closeSettings}>
            <div className="sheet-scrim__inner" onClick={(e) => e.stopPropagation()}>
              <SettingsSheet
                playerName={playerName}
                onChangeName={() => {
                  setSettingsOpen(false);
                  router.push(namePath("home"));
                }}
                onRules={() => {
                  setSettingsOpen(false);
                  setRulesOpen(true);
                }}
                onClose={closeSettings}
                feedbackSlot={<FeedbackToggles />}
                {...(isNative ? { legalSlot } : {})}
              />
            </div>
          </div>
        ) : null}

        <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      </div>
    </>
  );
}
