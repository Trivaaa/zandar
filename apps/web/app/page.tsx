"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseGameId, parseTableTheme, type TableTheme, type UpcomingGameSlug } from "@zandar/shared-types";

import { RulesModal } from "@/components/RulesModal";
import { HomeScreen } from "@/components/funnel/HomeScreen";
import { GameSheet } from "@/components/home/GameSheet";
import { QuickPlayNameSheet, QuickPlaySettingsSheet } from "@/components/home/QuickPlaySheets";
import { ComingSoonSheet } from "@/components/home/ComingSoonSheet";
import { SignupSheet } from "@/components/home/SignupSheet";
import { FriendsGameSheet } from "@/components/home/web/FriendsGameSheet";
import { WebHome } from "@/components/home/web/WebHome";
import { useBelaBetaGate } from "@/components/bela/BelaBetaGate";
import { readBelaBetaSeen } from "@/lib/belaBeta";
import { WebNameSheet } from "@/components/home/web/WebNameSheet";
import { TabBar } from "@/components/nav/TabBar";
import { AppUpdatePrompt } from "@/components/AppUpdatePrompt";
import { PushPrompt } from "@/components/push/PushPrompt";
import { ResumeBar } from "@/components/home/ResumeBar";
import { ResumeSheet } from "@/components/home/ResumeSheet";
import { claimTable, leaveTable, markTableSeen, useActiveTable } from "@/lib/activeTable";
import { blocksNewTable } from "@/lib/resumeView";
import { roomPath } from "@/lib/routes";
import { useBackHandler } from "@/lib/backHandlers";
import { identityUi } from "@/lib/features";
import { GAMES, gameBadge, homeLayout, webHomeOrder, type GameConfig, type GameSlug } from "@/lib/games";
import { setPinnedGame, useHomeHistory } from "@/lib/homePrefs";
import { isNative } from "@/lib/platform";
import { readPlayerName, savePlayerName } from "@/lib/playerName";
import { fetchMe } from "@/lib/profile";
import {
  parseQuickPlayPrefs,
  readQuickPlayPrefs,
  readQuickPlayPrefsRaw,
  saveQuickPlayPrefs,
  useQuickPlayPrefs,
  type QuickPlayPrefs,
} from "@/lib/quickPlayPrefs";
import { sr } from "@/lib/sr";
import { startQuickPlay } from "@/lib/startQuickPlay";
import { readTableThemeRaw, saveTableTheme, useTableTheme } from "@/lib/tableTheme";
import { track } from "@/lib/track";
import { HOME_GAME_PARAM } from "@/lib/push";
import { PROFILE_START_PARAM } from "@/lib/routes";
import { useQueryParam } from "@/lib/useQuery";
import { guestName, webCreatePath, webQuickPlayChoice } from "@/lib/webHome";

/**
 * Zapamćen izbor igre, ili `null` kad ga igrač nikad nije postavio (D10):
 * web početna tada ostaje na stalnom izboru i nasumičnom stolu.
 */
function savedChoice(game: GameSlug): { prefs: QuickPlayPrefs | null; tableTheme: TableTheme | null } {
  const prefs = readQuickPlayPrefsRaw(game);
  const theme = readTableThemeRaw(game);
  return {
    prefs: prefs ? parseQuickPlayPrefs(prefs) : null,
    tableTheme: theme ? parseTableTheme(theme) : null,
  };
}

/** Nova soba za igru; Žandar ostaje na staroj adresi (linkovi, APK). */
const createPath = (game: GameSlug) => (game === "zandar" ? "/create" : `/create?game=${game}`);

type Sheet =
  // `guest`: „Gost NN" za web list (I5), izvučen jednom pri otvaranju.
  | { kind: "name"; game: GameConfig; guest: string }
  | { kind: "setup"; game: GameConfig }
  | { kind: "game"; game: GameConfig }
  | { kind: "signup" }
  // Samo web (W4): izbor igre za „Igraj s prijateljima".
  | { kind: "friends" }
  // „Već igraš X" (V5): novi sto dok partija traje — šta je igrač htio.
  | { kind: "resume"; next: NewTable }
  | { kind: "door"; game: UpcomingGameSlug }
  | null;

/** Radnja koja pravi novi sto; list „Već igraš X" je zadrži do odluke. */
type NewTable =
  | { kind: "play"; game: GameConfig }
  // „Igraj" iz lista igre na Profilu: izbor je već postavljen, pravo za sto.
  | { kind: "start"; game: GameConfig }
  | { kind: "create"; game: GameConfig }
  | { kind: "friends" };

/**
 * Izbor stola za start; bez njega važi zapamćen izbor te igre. `remember: false`
 * (web početna): izbor nije igračev, pa se ne pamti kao zadnji.
 */
type Choice = { prefs: QuickPlayPrefs; tableTheme: TableTheme; remember?: false };

export default function Home() {
  const router = useRouter();
  // Bela beta: prozor PRIJE stola, jer server pokreće partiju čim igrač sjedne.
  const belaBeta = useBelaBetaGate();
  const storedHistory = useHomeHistory();
  // Podsjetnik (SPEC_PUSH_V2 B6) otvara početnu sa svojom igrom na vrhu —
  // samo za ovaj prikaz, zakačena igra se ne mijenja.
  const focus = useQueryParam(HOME_GAME_PARAM);
  const history = useMemo(() => {
    const game = GAMES.find((g) => g.slug === focus && g.status === "live");
    return game ? { ...storedHistory, pinned: game.slug } : storedHistory;
  }, [storedHistory, focus]);
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

  // „Vrati se za sto" (QA 10-24 P2): za kojim stolom igrač sjedi, po serveru.
  const active = useActiveTable();

  // Profil → list igre → „Igraj" (SPEC_PROFIL_POSTAVKE §5): `/?igra=X&kreni=1`.
  // Jednom po učitavanju; adresa se odmah čisti, da „nazad" ne krene ponovo.
  const startParam = useQueryParam(PROFILE_START_PARAM);
  const startedFromProfile = useRef(false);
  useEffect(() => {
    if (startParam !== "1" || startedFromProfile.current) return;
    const game = GAMES.find((g) => g.slug === focus && g.status === "live");
    if (!game) return;
    startedFromProfile.current = true;
    router.replace(`/?${HOME_GAME_PARAM}=${game.slug}`);
    newTable({ kind: "start", game });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- samo na dolazak sa Profila
  }, [startParam, focus]);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  async function resumeTable(place: "bar" | "sheet") {
    const t = active.table;
    if (!t) return;
    track("table_resume_click", {
      game: t.game,
      phase: t.phase,
      my_turn: t.myTurn,
      place,
      other_device: active.claim,
    });
    // Završena partija: viđena je čim igrač ode na sto (V6 „Rezultat").
    if (t.phase === "finished") markTableSeen(t);
    try {
      if (active.claim) await claimTable(t.roomId);
      router.push(roomPath(t.roomId));
    } catch {
      // Sjedište se u međuvremenu ispraznilo — traka se osvježi i nestane.
      active.refresh();
    }
  }

  /** Novi sto: dok partija traje prvo pitaj (V5); inače odmah. */
  function newTable(next: NewTable) {
    if (blocksNewTable(active.table)) {
      setLeaveError(null);
      setSheet({ kind: "resume", next });
      return;
    }
    runNewTable(next);
  }

  function runNewTable(next: NewTable) {
    if (next.kind === "play") playGameNow(next.game);
    else if (next.kind === "start") void start(next.game);
    else if (next.kind === "create") router.push(createPath(next.game.slug));
    else setSheet({ kind: "friends" });
  }

  async function leaveAndContinue(next: NewTable) {
    const t = active.table;
    if (!t || leaving) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      await leaveTable(t.roomId, active.claim);
      active.dismiss();
      setSheet(null);
      runNewTable(next);
    } catch {
      setLeaveError(sr.homeResume.sheet.error);
    } finally {
      setLeaving(false);
    }
  }

  /** Pravo za sto. `replace`: „nazad" sa traženja vodi na početnu, ne opet ovdje. */
  async function play(name: string, game: GameConfig, choice?: Choice, saveName = true) {
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
      router.replace(
        await startQuickPlay(name, chosen.prefs, chosen.tableTheme, game.slug, {
          remember: chosen.remember !== false,
          saveName,
        }),
      );
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
    if (game.slug === "bela" && !readBelaBetaSeen()) {
      belaBeta.gate("bela", () => void start(game, choice));
      return;
    }
    const saved = readPlayerName();
    if (saved) return play(saved, game, choice);
    if (identityUi) {
      // Provjera naloga traje ~1 s: kartica odmah kaže „Tražim sto…" i drugi
      // dodir se ne broji (QA 2026-11-07 PK-B5). `play` ponovo zaključa.
      busy.current = true;
      setPlayError(null);
      setPlaying(true);
      setPlayingSlug(game.slug);
      const nickname = await fetchMe().then(
        (me) => (me.anonymous ? null : me.nickname),
        () => null,
      );
      busy.current = false;
      setPlaying(false);
      if (nickname) {
        savePlayerName(nickname);
        return play(nickname, game, choice);
      }
    }
    pending.current = choice ? { game, choice } : { game };
    setPlayError(null);
    setSheet({ kind: "name", game, guest: guestName() });
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
    if (openDoor(game, "play")) return;
    newTable({ kind: "play", game });
  }

  /**
   * Lažna vrata (Tablić, Remi): igra izgleda kao prava, ali dodir samo otvara
   * „dolazi uskoro" sa prijavom. `true` = dodir je pripao vratima.
   */
  function openDoor(game: GameConfig, action: "play" | "create"): boolean {
    if (game.status !== "door" || game.slug === "zandar") return false;
    track("fake_door_tapped", { game: game.slug, action });
    setSheet({ kind: "door", game: game.slug });
    return true;
  }

  function createGame(game: GameConfig) {
    if (openDoor(game, "create")) return;
    newTable({ kind: "create", game });
  }

  function doorSeen(game: GameConfig) {
    if (game.status === "door" && game.slug !== "zandar") track("fake_door_viewed", { game: game.slug });
  }

  function playGameNow(game: GameConfig) {
    // Web (tabla „Početna za web"): svaka igra pravo za sto, bez lista — Žandar
    // 4 igrača do 11, izgled stola nasumičan. Aplikacija ostaje kakva jeste.
    if (!isNative) void start(game, webQuickPlayChoice(Math.random, game.slug, savedChoice(game.slug)));
    else if (game.slug === "poker" || game.slug === "raub" || game.slug === "bela") void start(game);
    else setSheet({ kind: "setup", game });
  }

  // Lažna vrata stoje poslije živih igara, kao još dvije igre. Web: novi
  // igrač dobija stalan redoslijed (`WEB_FIRST_VISIT_ORDER`); aplikacija ne.
  const homeGames = isNative ? [layout.main, ...layout.more, ...layout.doors] : webHomeOrder(layout, history);
  const homeItems = homeGames.map((game) => ({
    game,
    badge: gameBadge(game, storedHistory, now),
  }));
  const listItems = listMode ? homeItems : [];

  const setupName = sr.games[setupGame.slug].name;
  const sheetOpen = sheet !== null;

  const resumeBar = active.table ? (
    <ResumeBar table={active.table} onResume={() => void resumeTable("bar")} onDismiss={active.dismiss} />
  ) : null;

  return (
    <>
      {isNative ? (
        <HomeScreen
          layout={layout}
          history={storedHistory}
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
          onCreate={() => newTable({ kind: "create", game: main })}
          onOpenGame={(game) => setSheet({ kind: "game", game })}
          onNotify={(game) => {
            track("upcoming_game_tapped", { game: game.slug });
            setSheet({ kind: "signup" });
          }}
          onUpcomingViewed={() => track("upcoming_games_viewed")}
          onFeedback={() => router.push("/utisak")}
          className={identityUi ? "screen--tabbed" : ""}
          resumeSlot={resumeBar}
          {...(listMode
            ? {
                list: {
                  items: listItems,
                  loadingSlug: (playing || playError) && !sheetOpen ? playingSlug : null,
                  onPlay: playGame,
                  onCreate: createGame,
                  onSeen: doorSeen,
                },
              }
            : {})}
        />
      ) : (
        <WebHome
          items={homeItems}
          loadingSlug={(playing || playError) && !sheetOpen ? playingSlug : null}
          {...(playError && !sheetOpen ? { error: playError } : {})}
          onPlay={playGame}
          onSeen={doorSeen}
          onFriends={() => newTable({ kind: "friends" })}
          resumeSlot={resumeBar}
          onFeedback={() => router.push("/utisak")}
          showNav={identityUi}
          className={identityUi ? "screen--tabbed" : ""}
        />
      )}
      {identityUi ? <TabBar {...(isNative ? {} : { className: "tabbar--web-home" })} /> : null}
      {/* Samo ovdje: instalacija restartuje aplikaciju, pa nikad za stolom ni dok se traži sto. */}
      {isNative ? <AppUpdatePrompt hidden={playing || sheetOpen} /> : null}
      {/* SPEC_PUSH_V2 A4: ko se vrati drugi dan, jednom dobija ponudu obavještenja. */}
      {isNative && !playing && !sheetOpen ? (
        <PushPrompt context="home_return" onceKey="home_return" minOpenDays={2} className="pushprompt--home" />
      ) : null}

      {/* `Sheet` nosi svoj `.home-layer` i Android „nazad". */}
      {sheet?.kind === "name" && isNative ? (
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

      {/* Web (tabla „Ime za stolom — web"): kuda igrač ide, dugme nikad sivo, i „Gost NN". */}
      {sheet?.kind === "name" && !isNative ? (
        <WebNameSheet
          game={sheet.game}
          loading={playing}
          {...(playError ? { error: playError } : {})}
          guestName={sheet.guest}
          onSubmit={(name) => {
            const next = pending.current ?? { game: sheet.game };
            void play(name, next.game, next.choice);
          }}
          onGuest={() => {
            const next = pending.current ?? { game: sheet.game };
            // Ime gosta važi samo za ovaj sto — sljedeći „Igraj" opet pita.
            void play(sheet.guest, next.game, next.choice, false);
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
          pinned={storedHistory.pinned === sheet.game.slug}
          onPlay={() => {
            const game = sheet.game;
            setSheet(null);
            if (blocksNewTable(active.table)) newTable({ kind: "play", game });
            else void start(game);
          }}
          onFriends={() => newTable({ kind: "create", game: sheet.game })}
          onRules={() => {
            const game = sheet.game.slug;
            setSheet(null);
            setRulesFor(game);
          }}
          onTogglePin={() => {
            // Samo jedna zakačena: novo kačenje zamjenjuje staro. List se
            // zatvara, da igrač vidi igru gore kao glavnu karticu (H5).
            setPinnedGame(storedHistory.pinned === sheet.game.slug ? null : sheet.game.slug);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === "friends" ? (
        <FriendsGameSheet
          games={[layout.main, ...layout.more]}
          onPick={(game) => router.push(webCreatePath(game.slug))}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet?.kind === "resume" && active.table ? (
        <ResumeSheet
          table={active.table}
          next={sheet.next.kind === "friends" ? null : parseGameId(sheet.next.game.slug)}
          leaving={leaving}
          error={leaveError}
          onResume={() => {
            setSheet(null);
            void resumeTable("sheet");
          }}
          onLeave={() => void leaveAndContinue(sheet.next)}
          onClose={() => {
            if (!leaving) setSheet(null);
          }}
        />
      ) : null}

      {sheet?.kind === "signup" ? <SignupSheet games={layout.upcoming} onClose={() => setSheet(null)} /> : null}

      {sheet?.kind === "door" ? (
        <ComingSoonSheet
          game={sheet.game}
          onSignedUp={() => track("fake_door_signup", { game: sheet.game })}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {/* `RulesModal` dijeli igra; omotač ga diže iznad PWA trake. */}
      <div className="home-layer">
        <RulesModal
          isOpen={rulesOpen}
          game={rulesFor === "poker" || rulesFor === "raub" || rulesFor === "bela" ? rulesFor : "zandar"}
          onClose={() => setRulesFor(null)}
        />
      </div>

      {belaBeta.element}
    </>
  );
}
