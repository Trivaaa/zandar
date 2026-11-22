"use client";

import { useMemo, useState } from "react";
import type { ActiveTable, UpcomingGameSlug } from "@zandar/shared-types";

import { HomeScreen } from "@/components/funnel/HomeScreen";
import { ComingSoonSheet } from "@/components/home/ComingSoonSheet";
import { GameSheet } from "@/components/home/GameSheet";
import { ResumeBar } from "@/components/home/ResumeBar";
import { ResumeSheet } from "@/components/home/ResumeSheet";
import { TabBar } from "@/components/nav/TabBar";
import { FriendsGameSheet } from "@/components/home/web/FriendsGameSheet";
import { WebHome } from "@/components/home/web/WebHome";
import { WebNameSheet } from "@/components/home/web/WebNameSheet";
import { GAMES, gameBadge, homeLayout, type GameConfig, type GameSlug, type HomeHistory } from "@/lib/games";
import { sr } from "@/lib/sr";
import { useQueryParam } from "@/lib/useQuery";

/**
 * Harness za početnu preko CIJELOG viewporta (pregib se mjeri ovdje, ne u
 * okviru `/dev/funnel`). Konfiguracija se bira u URL-u, bez izmjene `GAMES`:
 *   ?live=1|2|3|4 koliko igara je živo (Žandar, pa Poker, pa Raub, pa Bela) — H1/H2/H3
 *   &pin=poker    zakačena igra — H5
 *   &last=poker   zadnja igrana igra (bez nje niko nije igrao ništa)
 *   &err=1        greška traženja stola (stoji na mjestu mete)
 *   &web=1        web početna (tabla „Početna za web"); &app=1 traka aplikacije,
 *                 &app=open traka „Otvori", &friends=1 otvoren list W4,
 *                 &name=1|busy|err list „Ime za stolom" (I1 / I4 / greška
 *                 servera); Igraj na kartici otvara isti list za tu igru
 *   &resume=…     traka „Vrati se za sto" (tabla `UI_VratiSe`): zandar (V1, na
 *                 potezu), poker (V2), raub (V3, bez tebe), duel (2P), lobby,
 *                 pause, done (V6); &sheet=1 list „Već igraš" (V5)
 *   &door=tablic|remi  list lažnih vrata („dolazi uskoro"); dodir na Igraj
 *                 Tablića ili Remija otvara isti list
 * Dodir na red igre otvara pravi list igre (H4); Zakači/Otkači mijenja glavnu.
 */
const NOW = Date.parse("2026-10-23");

const TABLE: ActiveTable = {
  roomId: "dev",
  game: "zandar",
  matchId: "m1",
  phase: "playing",
  myTurn: true,
  waitingForMe: false,
  state: { kind: "score", mine: 7, theirs: 5, team: true },
};

/** Stanja trake sa table (V1–V6), iz istog tipa koji šalje server. */
const RESUME: Record<string, ActiveTable> = {
  zandar: TABLE,
  duel: { ...TABLE, myTurn: false, state: { kind: "score", mine: 7, theirs: 5, team: false, opponentName: "Marko" } },
  poker: { ...TABLE, game: "poker", state: { kind: "chips", stack: 140 } },
  raub: { ...TABLE, game: "raub", myTurn: false, state: { kind: "toZero", score: 9 } },
  lobby: { ...TABLE, phase: "lobby", matchId: "", myTurn: false, state: { kind: "seats", taken: 3, total: 4 } },
  pause: { ...TABLE, myTurn: false, waitingForMe: true },
  done: { ...TABLE, phase: "finished", myTurn: false, result: { kind: "score", won: true, mine: 11, theirs: 8 } },
};

export default function DevHomePage() {
  const live = Number(useQueryParam("live") ?? "1");
  const pinParam = useQueryParam("pin");
  // Kačenje iz lista igre radi i ovdje (lokalno stanje, bez localStorage-a).
  const [pinOverride, setPinOverride] = useState<string | null | undefined>(undefined);
  const pin = pinOverride === undefined ? pinParam : pinOverride;
  const [open, setOpen] = useState<GameConfig | null>(null);
  const last = useQueryParam("last");
  const err = useQueryParam("err") === "1";
  const web = useQueryParam("web") === "1";
  const app = useQueryParam("app");
  const friendsParam = useQueryParam("friends") === "1";
  const [friends, setFriends] = useState<boolean | null>(null);
  const friendsOpen = friends ?? friendsParam;
  const nameParam = useQueryParam("name");
  // undefined = po URL-u, null = zatvoren, igra = otvoren dodirom na Igraj.
  const [nameGame, setNameGame] = useState<GameConfig | null | undefined>(undefined);
  const resumeParam = useQueryParam("resume");
  const [resumeHidden, setResumeHidden] = useState(false);
  const resume = resumeParam && !resumeHidden ? (RESUME[resumeParam] ?? null) : null;
  const sheetParam = useQueryParam("sheet") === "1";
  const doorParam = useQueryParam("door");
  // undefined = po URL-u, null = zatvoren, slug = otvoren dodirom.
  const [doorPick, setDoorPick] = useState<UpcomingGameSlug | null | undefined>(undefined);
  const doorOpen =
    doorPick === undefined ? (doorParam === "tablic" || doorParam === "remi" ? doorParam : null) : doorPick;
  const doorSheet = doorOpen ? (
    <ComingSoonSheet game={doorOpen} onSignedUp={() => undefined} onClose={() => setDoorPick(null)} />
  ) : null;
  /** Dodir na igru: vrata otvaraju list, ostalo radi šta je i radilo. */
  const tap = (game: GameConfig, other: () => void) => {
    if (game.status === "door" && game.slug !== "zandar") setDoorPick(game.slug);
    else other();
  };
  const [sheetClosed, setSheetClosed] = useState(false);
  const resumeBar = resume ? (
    <ResumeBar table={resume} onResume={() => undefined} onDismiss={() => setResumeHidden(true)} />
  ) : null;
  const resumeSheet =
    resume && sheetParam && !sheetClosed ? (
      <ResumeSheet
        table={resume}
        next="poker"
        leaving={false}
        onResume={() => setSheetClosed(true)}
        onLeave={() => setSheetClosed(true)}
        onClose={() => setSheetClosed(true)}
      />
    ) : null;

  const { layout, history } = useMemo(() => {
    const order: GameSlug[] = ["zandar", "poker", "raub", "bela"];
    const games: GameConfig[] = GAMES.map((g) =>
      g.status === "door"
        ? g
        : order.indexOf(g.slug) < live
        ? { ...g, status: "live", releasedAt: g.releasedAt ?? "2026-10-20" }
        : { ...g, status: "upcoming", releasedAt: null },
    );
    const h: HomeHistory = {
      pinned: games.some((g) => g.slug === pin && g.status === "live") ? (pin as GameSlug) : null,
      played: last && games.some((g) => g.slug === last) ? { [last]: NOW - 1 } : {},
    };
    return { layout: homeLayout(games, h), history: h };
  }, [live, pin, last]);

  if (web) {
    const games = [layout.main, ...layout.more];
    const cards = [...games, ...layout.doors];
    // Ručno otvoren list (dodir na Igraj) ima prednost nad `&name=`.
    const nameFor = nameGame === null ? null : (nameGame ?? (nameParam ? layout.main : null));
    return (
      <>
        <WebHome
          items={cards.map((game) => ({ game, badge: gameBadge(game, history, NOW) }))}
          loadingSlug={err ? layout.main.slug : null}
          {...(err ? { error: sr.quickSetup.error } : {})}
          onPlay={(game) => tap(game, () => setNameGame(game))}
          onFriends={() => setFriends(true)}
          onFeedback={() => undefined}
          showNav
          {...(app ? { appPreview: { installed: app === "open" } } : {})}
          resumeSlot={resumeBar}
          className="screen--tabbed"
        />
        <TabBar className="tabbar--web-home" />
        {resumeSheet}
        {doorSheet}
        {friendsOpen ? (
          <FriendsGameSheet games={games} onPick={() => setFriends(false)} onClose={() => setFriends(false)} />
        ) : null}
        {nameFor ? (
          <WebNameSheet
            game={nameFor}
            loading={nameParam === "busy"}
            {...(nameParam === "err" ? { error: sr.quickSetup.error } : {})}
            guestName="Gost 27"
            onSubmit={() => setNameGame(null)}
            onGuest={() => setNameGame(null)}
            onClose={() => setNameGame(null)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <HomeScreen
        layout={layout}
        history={history}
        now={NOW}
        loading={false}
        {...(err ? { error: sr.quickSetup.error } : {})}
        onPlay={() => undefined}
        onCreate={() => undefined}
        onOpenGame={setOpen}
        onNotify={() => undefined}
        className="screen--tabbed"
        resumeSlot={resumeBar}
        {...(layout.more.length > 0
          ? {
              list: {
                items: [layout.main, ...layout.more, ...layout.doors].map((game) => ({
                  game,
                  badge: gameBadge(game, history, NOW),
                })),
                loadingSlug: err ? layout.main.slug : null,
                onPlay: (game: GameConfig) => tap(game, () => undefined),
                onCreate: (game: GameConfig) => tap(game, () => undefined),
              },
            }
          : {})}
      />
      <TabBar />
      {resumeSheet}
      {doorSheet}
      {open ? (
        <GameSheet
          game={open}
          pinned={history.pinned === open.slug}
          onPlay={() => setOpen(null)}
          onFriends={() => setOpen(null)}
          onRules={() => setOpen(null)}
          onTogglePin={() => {
            setPinOverride(history.pinned === open.slug ? null : open.slug);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}
