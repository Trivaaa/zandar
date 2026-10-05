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
import { namePath, quickPlaySetupPath } from "@/lib/routes";
import { sr } from "@/lib/sr";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
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

  return (
    <>
      <HomeScreen
        /* Ime, veličina stola i cilj se biraju na `/igraj` — zasebna ruta, pa
           Android „nazad" tamo radi sam od sebe (na `/` gasi aplikaciju). */
        onPlay={() => router.push(quickPlaySetupPath)}
        onFriends={() => router.push("/create")}
        onOpenSettings={() => setSettingsOpen(true)}
        settingsButtonRef={settingsButton}
        loading={false}
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
                feedbackSlot={<FeedbackToggles showPush />}
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
