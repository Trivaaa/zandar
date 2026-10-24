"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseTableTheme } from "@zandar/shared-types";

import { RulesModal } from "@/components/RulesModal";
import { HomeScreen } from "@/components/funnel/HomeScreen";
import { GameSheet } from "@/components/home/GameSheet";
import { QuickPlayNameSheet } from "@/components/home/QuickPlaySheets";
import { SignupSheet } from "@/components/home/SignupSheet";
import { TabBar } from "@/components/nav/TabBar";
import { useBackHandler } from "@/lib/backHandlers";
import { identityUi } from "@/lib/features";
import { GAMES, homeLayout, type GameConfig } from "@/lib/games";
import { setPinnedGame, useHomeHistory } from "@/lib/homePrefs";
import { isNative } from "@/lib/platform";
import { readPlayerName, savePlayerName } from "@/lib/playerName";
import { fetchMe } from "@/lib/profile";
import { readQuickPlayPrefs } from "@/lib/quickPlayPrefs";
import { sr } from "@/lib/sr";
import { startQuickPlay } from "@/lib/startQuickPlay";
import { readTableThemeRaw } from "@/lib/tableTheme";
import { track } from "@/lib/track";

// Privatnost / uslovi / o nama — na webu jedan tihi red na dnu početne (Google
// OAuth provjera traži link na politiku sa početne). Na Androidu ga nema: tamo
// su u Postavkama (Profil).
const legalSlot = (
  <>
    <Link href="/privatnost">{sr.home.privacy}</Link>
    <Link href="/uslovi">{sr.home.terms}</Link>
    <Link href="/o-nama">{sr.home.about}</Link>
  </>
);

type Sheet =
  | { kind: "name" }
  | { kind: "game"; game: GameConfig }
  | { kind: "signup" }
  | null;

export default function Home() {
  const router = useRouter();
  const history = useHomeHistory();
  const layout = useMemo(() => homeLayout(GAMES, history), [history]);
  const main = layout.main;
  // „Sada" za oznaku NOVO — jednom po prikazu početne (render mora biti čist).
  const [now] = useState(() => Date.now());

  const [sheet, setSheet] = useState<Sheet>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  // `playing` gasi dugme tek na sljedećem renderu; brz dupli tap stigne prije.
  const busy = useRef(false);
  // Šta čeka na ime: igra koju je igrač pokrenuo.
  const pending = useRef<GameConfig | null>(null);

  useBackHandler(rulesOpen, () => setRulesOpen(false));

  /**
   * Pravo za sto sa zapamćenim izborom te igre (Postavke → Brza igra; prvi put
   * 4 · 21 · Klasik). `replace`: „nazad" sa traženja vodi na početnu.
   */
  async function play(name: string, game: GameConfig) {
    if (busy.current) return;
    busy.current = true;
    setPlayError(null);
    setPlaying(true);
    const prefs = readQuickPlayPrefs(game.slug);
    const tableTheme = parseTableTheme(readTableThemeRaw(game.slug));
    try {
      router.replace(await startQuickPlay(name, prefs, tableTheme, game.slug));
    } catch {
      setPlayError(sr.quickSetup.error);
      setPlaying(false);
      busy.current = false;
    }
  }

  /**
   * Start partije (Igraj ili list igre): odmah za sto kad je ime poznato. Bez imena: nalog s nadimkom ide pod nadimkom (server ga
   * ionako stavlja za sto), inače list sa imenom — samo taj put.
   */
  async function start(game: GameConfig) {
    if (busy.current) return;
    const saved = readPlayerName();
    if (saved) return play(saved, game);
    if (identityUi) {
      setPlaying(true);
      const nickname = await fetchMe().then(
        (me) => (me.anonymous ? null : me.nickname),
        () => null,
      );
      setPlaying(false);
      if (nickname) {
        savePlayerName(nickname);
        return play(nickname, game);
      }
    }
    pending.current = game;
    setPlayError(null);
    setSheet({ kind: "name" });
  }

  const sheetOpen = sheet !== null;

  return (
    <>
      <HomeScreen
        layout={layout}
        history={history}
        now={now}
        loading={playing && !sheetOpen}
        {...(playError && !sheetOpen ? { error: playError } : {})}
        // Igraj kreće odmah, sa zapamćenim izborom — izbor (2/4, 11/21, sto) je
        // u Postavkama → Brza igra (K1, odluka vlasnika 2026-10-24; zamjenjuje
        // list izbora prije partije iz changeloga 96).
        onPlay={() => void start(main)}
        onCreate={() => router.push("/create")}
        onOpenGame={(game) => setSheet({ kind: "game", game })}
        onNotify={() => setSheet({ kind: "signup" })}
        onUpcomingViewed={() => track("upcoming_games_viewed")}
        {...(isNative ? {} : { legalSlot })}
        className={identityUi ? "screen--tabbed" : ""}
      />
      {identityUi ? <TabBar /> : null}

      {/* `Sheet` nosi svoj `.home-layer` i Android „nazad". */}
      {sheet?.kind === "name" ? (
        <QuickPlayNameSheet
          loading={playing}
          {...(playError ? { error: playError } : {})}
          onSubmit={(name) => {
            void play(name, pending.current ?? main);
          }}
          onClose={() => {
            if (!busy.current) setSheet(null);
          }}
        />
      ) : null}

      {sheet?.kind === "game" ? (
        <GameSheet
          game={sheet.game}
          pinned={history.pinned === sheet.game.slug}
          onPlay={() => {
            const game = sheet.game;
            setSheet(null);
            void start(game);
          }}
          onFriends={() => router.push("/create")}
          onRules={() => {
            setSheet(null);
            setRulesOpen(true);
          }}
          onTogglePin={() => {
            // Samo jedna zakačena: novo kačenje zamjenjuje staro. List se
            // zatvara, da igrač vidi igru gore kao glavnu karticu (H5).
            setPinnedGame(history.pinned === sheet.game.slug ? null : sheet.game.slug);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === "signup" ? <SignupSheet games={layout.upcoming} onClose={() => setSheet(null)} /> : null}

      {/* `RulesModal` dijeli igra; omotač ga diže iznad PWA trake. */}
      <div className="home-layer">
        <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      </div>
    </>
  );
}
