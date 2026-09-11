"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { GamePhase, PrivateGameStateView } from "@zandar/shared-types";
import { GameScreen } from "@/components/GameScreen";

/**
 * Dev preview za GameScreen. Mock state; prebacuj fazu i broj karata na stolu.
 * onPlayCard je no-op. Nije produkcijski (/dev/* je 404 u produkciji).
 *
 * Stanje se moze zadati i iz URL-a:
 *   /dev/game?cards=9&players=4&phase=playing&chooser=1&name=Aleksandra
 *
 * To NIJE ukras: headless Chrome (`--screenshot`) ne moze da klikne dugmad, pa
 * bi bez URL-a svaki snimak bio isto pocetno stanje — a raspored se lomi bas u
 * rubnim kombinacijama (12 karata, 2P, dugo ime).
 *
 * Citanje ide kroz `useSyncExternalStore` (isti obrazac kao `FeedbackToggles`),
 * a ne kroz `useSearchParams` (trazio bi Suspense granicu na `output: "export"`)
 * ni kroz `useEffect` + `setState` (kaskadni render). URL je OSNOVA, dugmad su
 * sloj preko nje — pa nema ni stanja koje treba sinhronizovati.
 */

const card = (suit: "clubs" | "diamonds" | "hearts" | "spades", rank: string) => ({
  id: `${suit}-${rank}`,
  suit,
  rank: rank as never,
});

/**
 * Realan gornji rep stola. Force-capture drzi sto oko 4-8 karata, a 12 je rijedak
 * rep (dugi niz Q/K, koje ne ulaze u zbirove) — pojas play-zone mora da ih primi
 * bez diranja sjedista i ruke.
 */
const TABLE_POOL = [
  card("diamonds", "7"),
  card("spades", "3"),
  card("hearts", "4"),
  card("spades", "A"),
  card("clubs", "K"),
  card("diamonds", "Q"),
  card("hearts", "K"),
  card("clubs", "Q"),
  card("spades", "K"),
  card("hearts", "Q"),
  card("diamonds", "8"),
  card("clubs", "6"),
];

type Opts = {
  phase: GamePhase;
  turnDeadline: number;
  tableCount: number;
  playerCount: 2 | 3 | 4;
  longName: string | null;
  turn: "me" | "partner" | "left" | "right";
};

/**
 * Roster za dati broj igraca. 4P nosi `teamId`, 2P i 3P ga NEMAJU — bez toga bi
 * `pilesOf`/`pileIdOf` u dvojcu i dalje racunali po timovima, pa preview ne bi
 * pokazivao ono sto server salje.
 */
function rosterFor(playerCount: 2 | 3 | 4, longName: string | null) {
  // `name=...` mijenja ime SVIM igracima: najgori slucaj za bocni cip je dugo
  // ime na bocnom sjedistu, ne na tvom (tvoje nema pojas koji ga ogranicava).
  const names = longName
    ? [longName, longName, longName, longName]
    : ["Ti", "Marko", "Jovana", "Stefan"];
  return Array.from({ length: playerCount }, (_, i) => ({
    id: i === 0 ? "me" : `p${i}`,
    displayName: names[i]!,
    seatIndex: i,
    isHost: i === 0,
    ...(playerCount === 4 ? { teamId: i % 2 } : {}),
    connectionStatus: "connected" as const,
  }));
}

function mockState({
  phase,
  turnDeadline,
  tableCount,
  playerCount,
  longName,
  turn,
}: Opts): PrivateGameStateView & {
  turnDeadline?: number;
} {
  const players = rosterFor(playerCount, longName);
  return {
    roomId: "dev",
    matchId: "dev",
    phase,
    players,
    table: TABLE_POOL.slice(0, tableCount),
    currentPlayerId:
      turn === "me"
        ? "me"
        : turn === "right"
          ? "p1"
          : turn === "partner"
            ? (players[2]?.id ?? "me")
            : (players[3]?.id ?? players[1]?.id ?? "me"),
    dealerPlayerId: "p3",
    deckCount: 28,
    handCounts: Object.fromEntries(players.map((p, i) => [p.id, 4 - (i % 2)])),
    capturedCounts: { "team-0": 6, "team-1": 4 },
    matchScore:
      playerCount === 4
        ? { "team-0": 14, "team-1": 9 }
        : Object.fromEntries(players.map((p, i) => [p.id, 21 - i * 3])),
    targetScore: 21,
    stateVersion: 1,
    handNumber: 3,
    handScores: [
      {
        handNumber: 3,
        pointsByPile: { "team-0": 3, "team-1": 2 },
        breakdown: {
          mostCards: { winnerPileId: "team-0", cardCountByPile: {}, points: 2 },
          mostClubs: { winnerPileId: "team-1", clubCountByPile: {}, points: 1 },
          twoOfClubs: { winnerPileId: "team-0", points: 1 },
          tenOfDiamonds: { winnerPileId: "team-1", points: 1 },
        },
      },
    ],
    myPlayerId: "me",
    myHand: [card("clubs", "7"), card("spades", "J"), card("hearts", "A"), card("diamonds", "9")],
    // Da se move-reveal panel uopste moze pogledati u pregledniku.
    lastMove: {
      moveId: "dev-move",
      playerId: "p1",
      playedCard: card("hearts", "9"),
      capturedCards: [card("clubs", "4"), card("spades", "5")],
      isAutoPlay: false,
    },
    turnDeadline,
  };
}

const PHASES: GamePhase[] = ["playing", "hand_finished", "match_finished", "abandoned"];
const TABLE_COUNTS = [0, 4, 8, 12];
const noop = async () => {};

type UrlOpts = {
  phase: GamePhase;
  tableCount: number;
  playerCount: 2 | 3 | 4;
  longName: string | null;
  chooser: boolean;
  /**
   * Ko je na potezu. Podrazumijevano si to TI — i upravo je to propustilo bug:
   * pilula tudjeg sjedista se tad nikad ne crta, pa se na uredjaju vidjelo da
   * partnerova pilula ulazi u zaglavlje, a ni jedan headless snimak to nije
   * mogao uhvatiti.
   */
  turn: "me" | "partner" | "left" | "right";
  /** `measure=1`: ispisi rect-ove i sakrij kontrolnu traku (ona pokriva sto). */
  measure: boolean;
};

function parseParams(search: string): UrlOpts {
  const q = new URLSearchParams(search);
  const cards = q.get("cards");
  const players = q.get("players");
  const phase = q.get("phase");
  return {
    phase: phase && (PHASES as string[]).includes(phase) ? (phase as GamePhase) : "playing",
    tableCount:
      cards === null ? 4 : Math.max(0, Math.min(TABLE_POOL.length, Number(cards) || 0)),
    playerCount: players === "2" ? 2 : players === "3" ? 3 : 4,
    longName: q.get("name"),
    chooser: q.get("chooser") === "1",
    turn: (["me", "partner", "left", "right"] as const).includes(
      (q.get("turn") ?? "me") as never,
    )
      ? ((q.get("turn") ?? "me") as UrlOpts["turn"])
      : "me",
    measure: q.get("measure") === "1",
  };
}

/** URL se ne mijenja bez reload-a, pa je pretplata prazna. */
const subscribeToNothing = () => () => {};

/**
 * Mjerna traka (`?measure=1`). Headless snimak pokazuje DA nesto ne valja, ali
 * ne i KOJI element je krive sirine — a raspored se drzi na tome da se pojas
 * stola i bocni cip dodiruju tacno. Ispisuje rect-ove u DOM, pa ih `--dump-dom`
 * pokupi bez CDP-a.
 */
function Measure() {
  const [rows, setRows] = useState<string[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      const pick: [string, Element | null][] = [
        ["stage", document.querySelector(".felt-stage")],
        ["header", document.querySelector(".felt-header")],
        ["chip", document.querySelector(".felt-header__chip")],
        ["topPill", document.querySelector(".seat--top .pill")],
        ["band", document.querySelector("[data-table-drop]")],
        ["drop", document.querySelector(".table__drop")],
        ["cards", document.querySelector(".table__cards")],
        ["card1", document.querySelector(".table__slot .card")],
        ["seatL", document.querySelector(".seat--left")],
        ["seatR", document.querySelector(".seat--right")],
        ["seatTop", document.querySelector(".seat--top")],
        ["seatMe", document.querySelector(".seat--bottom")],
        ["hand", document.querySelector(".hand")],
        ["deck", document.querySelector(".deck")],
        ["banner", document.querySelector(".banner")],
        ["chooser", document.querySelector(".table__chooser")],
        ["selCard", document.querySelector('.hand__slot[data-selected="true"] .card')],
        ["selFace", document.querySelector('.hand__slot[data-selected="true"] .card-face')],
      ];
      setRows(
        pick.map(([k, el]) => {
          if (!el) return `${k}: MISSING`;
          const r = el.getBoundingClientRect();
          return `${k}: x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)}`;
        }),
      );
    }, 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <pre data-measure className="fixed bottom-0 left-0 right-0 z-[70] bg-black/95 text-[9px] leading-[1.15] text-white p-1">
      {rows.join(String.fromCharCode(10))}
    </pre>
  );
}

export default function DevGamePage() {
  const search = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.search,
    () => "", // server: default stanje, bez hydration mismatch-a
  );
  const url = useMemo(() => parseParams(search), [search]);

  // Dugmad su sloj PREKO URL-a: dok nisi ni jedno pritisnuo, vazi URL.
  const [phaseOverride, setPhaseOverride] = useState<GamePhase | null>(null);
  const [tableOverride, setTableOverride] = useState<number | null>(null);
  const [playersOverride, setPlayersOverride] = useState<2 | 3 | 4 | null>(null);

  const phase = phaseOverride ?? url.phase;
  const tableCount = tableOverride ?? url.tableCount;
  const playerCount = playersOverride ?? url.playerCount;

  const [deadline] = useState(() => Date.now() + 25_000);

  // U /dev/frame-u je stranica u iframe-u i kontrolna traka bi pokrila bocno
  // sjediste — bas ono sto se na tim snimcima provjerava.
  const framed = useSyncExternalStore(
    subscribeToNothing,
    () => window.self !== window.top,
    () => false,
  );

  return (
    <div className="relative">
      <GameScreen
        /* `initialSelectedCardId` cita se samo pri montiranju, a URL stigne tek
           poslije hidracije (server snapshot je prazan string) — bez `key`-a bi
           `chooser=1` uvijek zatekao vec inicijalizovano stanje bez selekcije. */
        key={url.chooser ? "chooser" : "plain"}
        state={mockState({
          phase,
          turnDeadline: deadline,
          tableCount,
          playerCount,
          longName: url.longName,
          turn: url.turn,
        })}
        {...(url.chooser ? { initialSelectedCardId: "clubs-7" } : {})}
        onPlayCard={noop}
        onNextHand={noop}
        onRematch={noop}
        onReact={noop}
        onLeave={() => setPhaseOverride("playing")}
        activeReactions={[]}
      />
      {url.measure ? <Measure /> : null}
      <div
        className={`fixed top-1/2 left-2 -translate-y-1/2 z-[60] flex-col gap-1 ${
          url.measure || framed ? "hidden" : "flex"
        }`}
      >
        {PHASES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPhaseOverride(p)}
            className={`px-2 py-1 rounded-token-sm text-[10px] font-bold transition-colors ${
              phase === p
                ? "bg-accent text-accent-contrast"
                : "bg-surface-raised/90 text-muted active:bg-surface"
            }`}
          >
            {p}
          </button>
        ))}
        <span className="mt-2 text-[10px] text-muted">igrači</span>
        {([2, 3, 4] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPlayersOverride(n)}
            className={`px-2 py-1 rounded-token-sm text-[10px] font-bold transition-colors ${
              playerCount === n
                ? "bg-accent text-accent-contrast"
                : "bg-surface-raised/90 text-muted active:bg-surface"
            }`}
          >
            {n}P
          </button>
        ))}
        <span className="mt-2 text-[10px] text-muted">sto</span>
        {TABLE_COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setTableOverride(n)}
            className={`px-2 py-1 rounded-token-sm text-[10px] font-bold transition-colors ${
              tableCount === n
                ? "bg-accent text-accent-contrast"
                : "bg-surface-raised/90 text-muted active:bg-surface"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
