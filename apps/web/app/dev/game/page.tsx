"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { GamePhase, HandScore, PrivateGameStateView } from "@zandar/shared-types";
import { GameScreen } from "@/components/GameScreen";

/**
 * Dev preview za GameScreen. Mock state; prebacuj fazu i broj karata na stolu.
 * onPlayCard je no-op. Nije produkcijski (/dev/* je 404 u produkciji).
 *
 * Stanje se moze zadati i iz URL-a:
 *   /dev/game?cards=9&players=4&phase=playing&chooser=1&name=Aleksandra
 *   /dev/game?move=capture&turn=left   → pa `window.__devMove()` pusti potez
 *   /dev/game?move=redeal              → zadnja karta runde: potez + dijeljenje
 *   /dev/game?phase=hand_finished&tie=1 → razrada ruke, nerijeseno na kartama
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

/**
 * Vrsta poteza koji `move=` pusta. Beat (`useTableBeat`) se NE moze pogledati
 * na statickom mock-u: pali ga tek promjena `stateVersion` sa novim `moveId`,
 * pa preview mora da odigra pravi prelaz iz stanja PRIJE poteza u stanje
 * POSLIJE njega — isto kako dolazi sa servera.
 */
const MOVES = ["capture", "trail", "sweep", "auto", "redeal"] as const;
type MoveKind = (typeof MOVES)[number];

/**
 * `redeal` je kupljenje ZADNJOM kartom u ruci: server u istom snapshotu vodi i
 * potez i novo dijeljenje, pa se tek tu vidi da li dijeljenje ceka da se potez
 * odigra. Prije poteza svi drze po jednu kartu, poslije po `REDEAL_PER_SEAT`.
 */
const REDEAL_PER_SEAT = 4;

/** Karte koje NISU ni u `TABLE_POOL` ni u ruci — da se id-evi ne sudare. */
const PLAYED = card("hearts", "10");
const PLAYED_JACK = card("clubs", "J");

/** Tvoja ruka. `redeal` je krati na jednu kartu prije poteza. */
const HAND = [
  card("clubs", "7"),
  card("spades", "J"),
  card("hearts", "A"),
  card("diamonds", "9"),
];

type Opts = {
  phase: GamePhase;
  turnDeadline: number;
  tableCount: number;
  playerCount: 2 | 3 | 4;
  longName: string | null;
  turn: "me" | "partner" | "left" | "right";
  /** Karata u ruci SVAKOG igraca. Lepeza poledjina se puni do 8. */
  oppHand: number | null;
  move: MoveKind | null;
  /** Da li je `move` vec pusten (`window.__devMove()`). */
  moved: boolean;
  /** `tie=1`: nerijeseno na "najvise karata" — kategorija ne ide nikome. */
  tie: boolean;
  /**
   * `fresh=1`: pocetak ruke — nijedno kupljenje jos nije zabiljezeno, pa
   * `useGameEvents` sintetizuje `deal` na prvom snapshotu. Bez ovoga se
   * pocetno dijeljenje (jedino koje puni i STO) ne moze ni snimiti.
   */
  fresh: boolean;
};

/**
 * Razrada ruke sa PRAVIM brojevima po pilu.
 *
 * Fixture je ranije imao prazne count mape (`cardCountByPile: {}`), pa bi novi
 * prikaz na njemu crtao nule i izgledao kao da radi — mjerenje na takvom
 * fixture-u ne dokazuje nista. Ista klasa greske kao `caption: w=68 h=67`
 * procitan kao prolaz (v3.9.1).
 *
 * Pobjednici i `pointsByPile` se IZVODE iz brojeva, istim pravilom koje
 * `calculateHandScore` koristi (jedan maksimum = pobjednik, izjednacenje =
 * niko). Zato tvrdnja "zbir kategorija == zbir poena" stvarno testira prikaz,
 * a ne fixture koji joj je podesen.
 *
 * Zbirovi prate spil: 52 karte, 13 trefova.
 */
function mockHandScore(playerCount: 2 | 3 | 4, tie: boolean): HandScore {
  const ids =
    playerCount === 4
      ? ["team-0", "team-1"]
      : Array.from({ length: playerCount }, (_, i) => (i === 0 ? "me" : `p${i}`));

  const cardSplit = tie
    ? { 2: [26, 26], 3: [19, 19, 14] }[ids.length]!
    : { 2: [32, 20], 3: [20, 18, 14] }[ids.length]!;
  const clubSplit = { 2: [6, 7], 3: [4, 6, 3] }[ids.length]!;

  const cardCountByPile: Record<string, number> = {};
  const clubCountByPile: Record<string, number> = {};
  ids.forEach((id, i) => {
    cardCountByPile[id] = cardSplit[i]!;
    clubCountByPile[id] = clubSplit[i]!;
  });

  const single = (by: Record<string, number>) => {
    const entries = Object.entries(by);
    const max = Math.max(...entries.map(([, n]) => n));
    const top = entries.filter(([, n]) => n === max);
    return top.length === 1 ? top[0]![0] : undefined;
  };

  const mostCards = single(cardCountByPile);
  const mostClubs = single(clubCountByPile);
  const tenOfDiamonds = ids[0]!;
  const twoOfClubs = ids[ids.length - 1]!;

  const pointsByPile: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  if (mostCards !== undefined) pointsByPile[mostCards]! += 2;
  if (mostClubs !== undefined) pointsByPile[mostClubs]! += 1;
  pointsByPile[tenOfDiamonds]! += 1;
  pointsByPile[twoOfClubs]! += 1;

  return {
    handNumber: 3,
    pointsByPile,
    breakdown: {
      mostCards: { winnerPileId: mostCards, cardCountByPile, points: 2 },
      mostClubs: { winnerPileId: mostClubs, clubCountByPile, points: 1 },
      tenOfDiamonds: { winnerPileId: tenOfDiamonds, points: 1 },
      twoOfClubs: { winnerPileId: twoOfClubs, points: 1 },
    },
  };
}

/** Ko je na potezu za dati `turn` — isto pravilo i za mock i za `move=`. */
function turnSeatId(turn: Opts["turn"], players: { id: string }[]): string {
  if (turn === "me") return "me";
  if (turn === "right") return "p1";
  if (turn === "partner") return players[2]?.id ?? "me";
  return players[3]?.id ?? players[1]?.id ?? "me";
}

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
  oppHand,
  move,
  moved,
  tie,
  fresh,
}: Opts): PrivateGameStateView & {
  turnDeadline?: number;
} {
  const players = rosterFor(playerCount, longName);
  const mover = turnSeatId(turn, players);
  const baseTable = TABLE_POOL.slice(0, tableCount);

  // Bez `move=`: staticno stanje kao i ranije. Sa `move=`: prvo stanje PRIJE
  // poteza, pa `window.__devMove()` prebaci na stanje POSLIJE — tek taj prelaz
  // (novi `stateVersion` + novi `moveId`) pusti beat.
  const played = move === "sweep" ? PLAYED_JACK : PLAYED;
  const taken =
    move === "sweep" ? baseTable : move === "trail" ? [] : baseTable.slice(0, 2);
  const after = move === "trail" ? [...baseTable, played] : baseTable.slice(taken.length);
  const live = move !== null && moved;

  // `redeal`: prije poteza JEDINO igrac na potezu ima kartu (ostali su vec
  // odigrali svoje), poslije poteza su sve ruke pune — tacno onaj snapshot na
  // kojem se beat poteza i dijeljenje preklapaju. Da svi drze po kartu, porast
  // po igracu bi bio 3 umjesto 4 i animacija bi dijelila manje nego server.
  const redealPre = move === "redeal" && !live;
  const myHand = HAND.slice(
    0,
    redealPre ? (mover === "me" ? 1 : 0) : REDEAL_PER_SEAT,
  );

  return {
    roomId: "dev",
    matchId: "dev",
    phase,
    players,
    table: live ? after : baseTable,
    currentPlayerId: live ? "me" : mover,
    dealerPlayerId: "p3",
    deckCount: redealPre ? 28 : 28 - (move === "redeal" ? REDEAL_PER_SEAT * players.length : 0),
    handCounts: Object.fromEntries(
      players.map((p, i) => [
        p.id,
        move === "redeal"
          ? (redealPre ? (p.id === mover ? 1 : 0) : REDEAL_PER_SEAT)
          : (oppHand ?? 4 - (i % 2)),
      ]),
    ),
    capturedCounts: fresh ? { "team-0": 0, "team-1": 0 } : { "team-0": 6, "team-1": 4 },
    matchScore:
      playerCount === 4
        ? { "team-0": 14, "team-1": 9 }
        : Object.fromEntries(players.map((p, i) => [p.id, 21 - i * 3])),
    targetScore: 21,
    stateVersion: live ? 2 : 1,
    handNumber: 3,
    handScores: [mockHandScore(playerCount, tie)],
    myPlayerId: "me",
    myHand,
    // Prije `__devMove()` nema poteza — kao svjeza soba. Inace bi beat na
    // prvom snapshotu vidio "zatecen" potez koji se nikad nije desio.
    ...(live
      ? {
          lastMove: {
            moveId: "dev-m2",
            playerId: mover,
            playedCard: played,
            capturedCards: taken,
            isAutoPlay: move === "auto",
          },
        }
      : {}),
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
  /**
   * `hand=8`: koliko karata svako drzi. Podrazumijevani mock daje 3-4, a lepeza
   * poledjina je najsira na 8 — sto je i jedini slucaj u kojem moze da izadje
   * van pojasa bocnog sjedista. Bez ovog parametra se najgori slucaj ne moze
   * ni snimiti, isti razlog zbog kojeg postoji `turn`.
   */
  oppHand: number | null;
  /** `measure=1`: ispisi rect-ove i sakrij kontrolnu traku (ona pokriva sto). */
  measure: boolean;
  /**
   * `move=capture|trail|sweep|auto`: pripremi potez te vrste. Pusta ga tek
   * `window.__devMove()` (ili dugme "potez"), pa mjerac sam bira TRENUTAK u
   * kojem snima fazu beat-a — land i hold traju 260 i 280ms.
   */
  move: MoveKind | null;
  /** `tie=1`: nerijeseno na "najvise karata" — razrada tad crta "niko" i `—`. */
  tie: boolean;
  /** `fresh=1`: pocetak ruke → sintetizovano dijeljenje na montiranju. */
  fresh: boolean;
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
    oppHand: q.get("hand") === null ? null : Math.max(0, Math.min(8, Number(q.get("hand")) || 0)),
    measure: q.get("measure") === "1",
    move: (MOVES as readonly string[]).includes(q.get("move") ?? "")
      ? (q.get("move") as MoveKind)
      : null,
    tie: q.get("tie") === "1",
    fresh: q.get("fresh") === "1",
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
/**
 * `background-position-y` u px. Chrome vraca used vrijednost kao "50%",
 * "-4px" ili "calc(100% + 75.2px)" — a procenat u tom
 * svojstvu znaci (kutija - slika), ne kutiju — otud oba argumenta.
 */
function bgOffsetY(value: string, box: number, img: number): number {
  let pct = 0;
  let px = 0;
  let sign = 1;
  for (const tok of value.replace(/[(),]|calc/g, " ").trim().split(/\s+/)) {
    if (tok === "+") sign = 1;
    else if (tok === "-") sign = -1;
    else if (tok.endsWith("%")) {
      pct += sign * Number.parseFloat(tok);
      sign = 1;
    } else if (tok.endsWith("px")) {
      px += sign * Number.parseFloat(tok);
      sign = 1;
    }
  }
  return (pct / 100) * (box - img) + px;
}

/**
 * Obod stola je NASLIKAN u pozadini — nema rect, a cijeli raspored se drzi na
 * tome da prolazi kroz sredinu avatara gornjeg i tvog sjedista. Racuna se iz
 * used `background-size`/`background-position` i izmjerenih udjela oboda na
 * slici (isti brojevi kao `--bg-rim-*` u `felt.css`; ako se slika promijeni,
 * mijenjaju se na oba mjesta). Bez ovoga se poravnanje provjerava okom — a tako
 * je promasaj i nastao.
 */
const RIM_TOP_FRACTION = 0.1398;
const RIM_BOTTOM_FRACTION = 0.6094;

function rimRow(): string {
  const stage = document.querySelector(".felt-stage");
  if (!stage) return "rim: MISSING";
  const box = stage.getBoundingClientRect();
  const cs = getComputedStyle(stage);
  const bgH = Number.parseFloat(cs.backgroundSize.split(" ")[1] ?? "");
  if (!Number.isFinite(bgH)) return `rim: NEPARSABILNO (${cs.backgroundSize})`;
  const imgTop = box.y + bgOffsetY(cs.backgroundPositionY, box.height, bgH);
  const top = imgTop + RIM_TOP_FRACTION * bgH;
  const bottom = imgTop + RIM_BOTTOM_FRACTION * bgH;
  const center = (sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.y + r.height / 2;
  };
  const cTop = center(".seat--top .seat__avatar");
  const cMe = center(".seat--bottom .seat__avatar");
  const d = (rim: number, c: number | null) => (c === null ? "n/a" : `${(rim - c).toFixed(1)}`);
  return (
    `rim: top=${top.toFixed(1)} bottom=${bottom.toFixed(1)} bgH=${bgH.toFixed(1)} ` +
    `| dTop=${d(top, cTop)} dMe=${d(bottom, cMe)}`
  );
}

function Measure() {
  const [rows, setRows] = useState<string[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      const pick: [string, Element | null][] = [
        ["stage", document.querySelector(".felt-stage")],
        ["header", document.querySelector(".felt-header")],
        ["chip", document.querySelector(".felt-header__chip")],
        ["topPill", document.querySelector(".seat--top .seat__meta")],
        ["band", document.querySelector("[data-table-drop]")],
        ["drop", document.querySelector(".table__drop")],
        ["cards", document.querySelector(".table__cards")],
        ["card1", document.querySelector(".table__slot .card")],
        ["seatL", document.querySelector(".seat--left")],
        ["seatR", document.querySelector(".seat--right")],
        ["seatTop", document.querySelector(".seat--top")],
        /* Lepeza poledjina: otkad viri IZNAD avatara, dvije stvari se vise ne
           vide okom nego samo brojem — da li gornja ulazi u zaglavlje i da li
           bocnu odsijeca overflow-hidden pozornice. */
        ["fanTop", document.querySelector(".seat--top .seat__fan")],
        ["fanL", document.querySelector(".seat--left .seat__fan")],
        ["fanR", document.querySelector(".seat--right .seat__fan")],
        ["seatMe", document.querySelector(".seat--bottom")],
        /* Avatari: kroz njihovu sredinu prolazi naslikani obod stola, pa se bez
           njihovih rect-ova red `rim` ispod ne moze provjeriti. */
        ["avTop", document.querySelector(".seat--top .seat__avatar")],
        ["avMe", document.querySelector(".seat--bottom .seat__avatar")],
        /* Beat: plutajuca odigrana karta i natpis uz sjediste su jedina dva
           nova potrosaca prostora nad stolom — i jedina koja se ne vide na
           statickom snimku bez `move=`. */
        ["played", document.querySelector(".table__played")],
        ["caption", document.querySelector(".seat__caption")],
        ["hand", document.querySelector(".hand")],
        ["deck", document.querySelector(".deck")],
        ["banner", document.querySelector(".banner")],
        ["chooser", document.querySelector(".table__chooser")],
        ["selCard", document.querySelector('.hand__slot[data-selected="true"] .card')],
        ["selFace", document.querySelector('.hand__slot[data-selected="true"] .card-face')],
      ];
      setRows([
        ...pick.map(([k, el]) => {
          if (!el) return `${k}: MISSING`;
          const r = el.getBoundingClientRect();
          return `${k}: x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)}`;
        }),
        rimRow(),
      ]);
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

  // `move=` priprema potez; pusta ga tek ovo. Mjerac zove `window.__devMove()`
  // pa snima posle zeljenog broja ms — inace bi faza beat-a bila lutrija.
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    if (!url.move) return;
    const w = window as unknown as { __devMove?: () => void };
    w.__devMove = () => setMoved(true);
    return () => {
      delete w.__devMove;
    };
  }, [url.move]);

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
           `chooser=1` uvijek zatekao vec inicijalizovano stanje bez selekcije.
           `fresh` je u kljucu iz istog razloga, samo jos strozeg: sintetizovani
           `deal` se javlja SAMO na prvom snapshotu koji komponenta vidi, a to je
           hidracijski (bez URL-a). Bez remounta se pocetno dijeljenje ne bi
           pustilo nikad. */
        key={`${url.chooser ? "chooser" : "plain"}-${url.fresh ? "fresh" : "std"}`}
        state={mockState({
          phase,
          turnDeadline: deadline,
          tableCount,
          playerCount,
          longName: url.longName,
          turn: url.turn,
          oppHand: url.oppHand,
          move: url.move,
          moved,
          tie: url.tie,
          fresh: url.fresh,
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
        {url.move ? (
          <button
            type="button"
            onClick={() => setMoved(true)}
            className="mt-2 px-2 py-1 rounded-token-sm text-[10px] font-bold bg-accent text-accent-contrast"
          >
            potez ▶
          </button>
        ) : null}
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
