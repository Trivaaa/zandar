"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseTableTheme, type TableTheme } from "@zandar/shared-types";

import { AppOfferBar } from "@/components/AppOffer";
import { RulesModal } from "@/components/RulesModal";
import { HomeScreen } from "@/components/funnel/HomeScreen";
import { GameSheet } from "@/components/home/GameSheet";
import { QuickPlayNameSheet, QuickPlaySettingsSheet } from "@/components/home/QuickPlaySheets";
import { SignupSheet } from "@/components/home/SignupSheet";
import { TabBar } from "@/components/nav/TabBar";
import { useBackHandler } from "@/lib/backHandlers";
import { identityUi } from "@/lib/features";
import { GAMES, gameBadge, homeLayout, type GameConfig, type GameSlug } from "@/lib/games";
import { setPinnedGame, useHomeHistory } from "@/lib/homePrefs";
import { isNative } from "@/lib/platform";
import { readPlayerName, savePlayerName, usePlayerName } from "@/lib/playerName";
import { fetchMe } from "@/lib/profile";
import { readQuickPlayPrefs, saveQuickPlayPrefs, useQuickPlayPrefs, type QuickPlayPrefs } from "@/lib/quickPlayPrefs";
import { sr } from "@/lib/sr";
import { startQuickPlay } from "@/lib/startQuickPlay";
import { readTableThemeRaw, saveTableTheme, useTableTheme } from "@/lib/tableTheme";
import { track } from "@/lib/track";

/** Nova soba za igru; Žandar ostaje na staroj adresi (linkovi, APK). */
const createPath = (game: GameSlug) => (game === "zandar" ? "/create" : `/create?game=${game}`);

type Sheet =
  | { kind: "name" }
  | { kind: "setup"; game: GameConfig }
  | { kind: "game"; game: GameConfig }
  | { kind: "signup" }
  | null;

/** Izbor stola za start; bez njega važi zapamćen izbor te igre. */
type Choice = { prefs: QuickPlayPrefs; tableTheme: TableTheme };

export default function Home() {
  const router = useRouter();
  const history = useHomeHistory();
  const layout = useMemo(() => homeLayout(GAMES, history), [history]);
  const main = layout.main;
  // Više živih igara → lista kartica (tabla „Lista"); jedna → sto K1.
  const listMode = layout.more.length > 0;
  const [sheet, setSheet] = useState<Sheet>(null);
  // Izbor stola (2/4 · 11/21 · podloga) pripada igri čiji je list otvoren.
  const setupGame = sheet?.kind === "setup" ? sheet.game : main;
  const prefs = useQuickPlayPrefs(setupGame.slug);
  const tableTheme = useTableTheme(setupGame.slug);
  // „Sada" za oznaku NOVO — jednom po prikazu početne (render mora biti čist).
  const [now] = useState(() => Date.now());
  const playerName = usePlayerName();

  const [rulesFor, setRulesFor] = useState<GameSlug | null>(null);
  const rulesOpen = rulesFor !== null;
  const [playing, setPlaying] = useState(false);
  // Za koju igru se traži sto (lista pokazuje „Tražim sto..." na toj kartici).
  const [playingSlug, setPlayingSlug] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  // `playing` gasi dugme tek na sljedećem renderu; brz dupli tap stigne prije.
  const busy = useRef(false);
  // Šta čeka na ime: igra i (opciono) izbor iz lista podešavanja.
  const pending = useRef<{ game: GameConfig; choice?: Choice } | null>(null);

  useBackHandler(rulesOpen, () => setRulesFor(null));

  /** Pravo za sto. `replace`: „nazad" sa traženja vodi na početnu, ne opet ovdje. */
  async function play(name: string, game: GameConfig, choice?: Choice) {
    if (busy.current) return;
    busy.current = true;
    setPlayError(null);
    setPlaying(true);
    setPlayingSlug(game.slug);
    const chosen = choice ?? {
      prefs: readQuickPlayPrefs(game.slug),
      tableTheme: parseTableTheme(readTableThemeRaw(game.slug)),
    };
    try {
      router.replace(await startQuickPlay(name, chosen.prefs, chosen.tableTheme, game.slug));
    } catch {
      setPlayError(sr.quickSetup.error);
      setPlaying(false);
      busy.current = false;
    }
  }

  /**
   * Start partije (iz lista podešavanja ili lista igre): odmah za sto kad je
   * ime poznato. Bez imena: nalog s nadimkom ide pod nadimkom (server ga
   * ionako stavlja za sto), inače list sa imenom — samo taj put.
   */
  async function start(game: GameConfig, choice?: Choice) {
    if (busy.current) return;
    const saved = readPlayerName();
    if (saved) return play(saved, game, choice);
    if (identityUi) {
      setPlaying(true);
      const nickname = await fetchMe().then(
        (me) => (me.anonymous ? null : me.nickname),
        () => null,
      );
      setPlaying(false);
      if (nickname) {
        savePlayerName(nickname);
        return play(nickname, game, choice);
      }
    }
    pending.current = choice ? { game, choice } : { game };
    setPlayError(null);
    setSheet({ kind: "name" });
  }

  function saveChoice(choice: Choice) {
    saveQuickPlayPrefs(choice.prefs, setupGame.slug);
    saveTableTheme(choice.tableTheme, setupGame.slug);
  }

  /**
   * Igraj za igru. Poker i Raub: jedan dodir (poker odluka 3, 6.11.2026; Raub
   * Quick Play je uvijek 4 bez izbora cilja). Žandar: izbor 2/4 · 11/21 · sto
   * sa zadnjim označenim (odluka #96).
   */
  function playGame(game: GameConfig) {
    if (game.slug === "poker" || game.slug === "raub") void start(game);
    else setSheet({ kind: "setup", game });
  }

  const listItems = listMode
    ? [layout.main, ...layout.more].map((game) => ({ game, badge: gameBadge(game, history, now) }))
    : [];

  const setupName = sr.games[setupGame.slug].name;
  const sheetOpen = sheet !== null;

  return (
    <>
      <HomeScreen
        layout={layout}
        history={history}
        now={now}
        loading={playing && !sheetOpen}
        {...(playError && !sheetOpen ? { error: playError } : {})}
        // Igraj prvo pokazuje izbor (2 ili 4 igrača, do 11 ili 21, sto) sa
        // zadnjim izborom označenim; „Igraj" u listu kreće za sto. Odluka
        // vlasnika (#96, potvrđena 2026-10-24 poslije K1). Isti izbor se
        // mijenja i u Postavke → Brza igra.
        // Poker: jedan dodir, bez izbora (odluka 3, 6.11.2026) — sto je uvijek
        // za 4, a izgled stola je zadnji zapamćen.
        onPlay={() => playGame(main)}
        onCreate={() => router.push(createPath(main.slug))}
        onOpenGame={(game) => setSheet({ kind: "game", game })}
        onNotify={(game) => {
          track("upcoming_game_tapped", { game: game.slug });
          setSheet({ kind: "signup" });
        }}
        onUpcomingViewed={() => track("upcoming_games_viewed")}
        onFeedback={() => router.push("/utisak")}
        {...(isNative ? {} : { topSlot: <AppOfferBar /> })}
        className={identityUi ? "screen--tabbed" : ""}
        {...(listMode
          ? {
              list: {
                items: listItems,
                loadingSlug: (playing || playError) && !sheetOpen ? playingSlug : null,
                onPlay: playGame,
                onCreate: (game: GameConfig) => router.push(createPath(game.slug)),
                greetingName: playerName,
              },
            }
          : {})}
      />
      {identityUi ? <TabBar /> : null}

      {/* `Sheet` nosi svoj `.home-layer` i Android „nazad". */}
      {sheet?.kind === "name" ? (
        <QuickPlayNameSheet
          loading={playing}
          {...(playError ? { error: playError } : {})}
          onSubmit={(name) => {
            const next = pending.current ?? { game: main };
            void play(name, next.game, next.choice);
          }}
          onClose={() => {
            if (!busy.current) setSheet(null);
          }}
        />
      ) : null}

      {sheet?.kind === "setup" ? (
        <QuickPlaySettingsSheet
          gameName={setupName}
          prefs={prefs}
          tableTheme={tableTheme}
          onPlay={(nextPrefs, theme) => {
            const choice = { prefs: nextPrefs, tableTheme: theme };
            saveChoice(choice);
            setSheet(null);
            void start(setupGame, choice);
          }}
          onSave={(nextPrefs, theme) => {
            saveChoice({ prefs: nextPrefs, tableTheme: theme });
            setSheet(null);
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
          onFriends={() => router.push(createPath(sheet.game.slug))}
          onRules={() => {
            const game = sheet.game.slug;
            setSheet(null);
            setRulesFor(game);
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
        <RulesModal
          isOpen={rulesOpen}
          game={rulesFor === "poker" || rulesFor === "raub" ? rulesFor : "zandar"}
          onClose={() => setRulesFor(null)}
        />
      </div>
    </>
  );
}
