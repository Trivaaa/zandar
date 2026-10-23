"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FeedbackToggles } from "@/components/FeedbackToggles";
import { RulesModal } from "@/components/RulesModal";
import { HomeScreen } from "@/components/funnel/HomeScreen";
import { QuickPlayNameSheet, QuickPlaySettingsSheet } from "@/components/home/QuickPlaySheets";
import { SettingsSheet } from "@/components/home/SettingsSheet";
import { TabBar } from "@/components/nav/TabBar";
import { useBackHandler } from "@/lib/backHandlers";
import { identityUi } from "@/lib/features";
import { isNative } from "@/lib/platform";
import { readPlayerName, savePlayerName, usePlayerName } from "@/lib/playerName";
import { fetchMe } from "@/lib/profile";
import { saveQuickPlayPrefs, useQuickPlayPrefs } from "@/lib/quickPlayPrefs";
import { namePath } from "@/lib/routes";
import { sr } from "@/lib/sr";
import { startQuickPlay } from "@/lib/startQuickPlay";
import { saveTableTheme, useTableTheme } from "@/lib/tableTheme";
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
  const prefs = useQuickPlayPrefs();
  const tableTheme = useTableTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [sheet, setSheet] = useState<"name" | "setup" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  // `playing` gasi dugme tek na sljedećem renderu; brz dupli tap stigne prije.
  const busy = useRef(false);

  /** Pravo za sto sa zapamćenim izborom. `replace`: „nazad" sa traženja vodi na početnu. */
  async function play(name: string) {
    if (busy.current) return;
    busy.current = true;
    setPlayError(null);
    setPlaying(true);
    try {
      router.replace(await startQuickPlay(name, prefs, tableTheme));
    } catch {
      setPlayError(sr.quickSetup.error);
      setPlaying(false);
      busy.current = false;
    }
  }

  /**
   * „Igraj Žandar": jedan dodir kad je ime poznato. Bez imena: nalog s
   * nadimkom ide pod nadimkom (server ga ionako stavlja za sto), inače list
   * sa imenom — samo taj put.
   */
  async function onPlay() {
    const saved = readPlayerName();
    if (saved) return play(saved);
    if (identityUi) {
      setPlaying(true);
      const nickname = await fetchMe().then(
        (me) => (me.anonymous ? null : me.nickname),
        () => null,
      );
      setPlaying(false);
      if (nickname) {
        savePlayerName(nickname);
        return play(nickname);
      }
    }
    setPlayError(null);
    setSheet("name");
  }
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
        onPlay={() => void onPlay()}
        playSummary={sr.quickSetup.summary(prefs.playerCount, prefs.targetScore, sr.tableTheme.names[tableTheme])}
        onPlaySettings={() => setSheet("setup")}
        onFriends={() => router.push("/create")}
        onOpenSettings={() => setSettingsOpen(true)}
        settingsButtonRef={settingsButton}
        loading={playing && sheet === null}
        {...(playError && sheet === null ? { error: playError } : {})}
        showStores={!isNative}
        onUpcomingViewed={() => track("upcoming_games_viewed")}
        {...(isNative ? {} : { legalSlot })}
        className={identityUi ? "screen--tabbed" : ""}
      />
      {identityUi ? <TabBar /> : null}

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

      {/* `Sheet` nosi svoj `.home-layer` i Android „nazad". */}
      {sheet === "name" ? (
        <QuickPlayNameSheet
          loading={playing}
          {...(playError ? { error: playError } : {})}
          onSubmit={(name) => void play(name)}
          onClose={() => {
            if (!busy.current) setSheet(null);
          }}
        />
      ) : null}
      {sheet === "setup" ? (
        <QuickPlaySettingsSheet
          prefs={prefs}
          tableTheme={tableTheme}
          onSave={(next, theme) => {
            saveQuickPlayPrefs(next);
            saveTableTheme(theme);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </>
  );
}
