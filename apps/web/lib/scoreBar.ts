import type { ScoringCard } from "@zandar/game-core";
import type { HandScore, PublicPlayer } from "@zandar/shared-types";
import { breakdownRows, type BreakdownRow } from "@/lib/handBreakdown";
import { pileIdOf } from "@/lib/piles";
import { sr } from "@/lib/sr";

/**
 * Traka rezultata na stolu — sve odluke o prikazu, bez Reacta i bez sata.
 *
 * Boje i natpisi su iz ugla igrača („Mi" je uvijek team-a), a ne po `teamId`.
 * Pravila se ovdje ne odlučuju: ko vodi u kartama i ko drži malu i veliku računa
 * server (`liveHand` = `calculateHandScore`).
 */

/** `none` = bez boje tima (3P); CSS tad uzima akcent. */
export type BarTone = "a" | "b" | "none";

export type BarSide = { pileId: string; label: string; tone: BarTone };

/** Koliko blizu cilja traka prestaje da piše „do 21" i piše „fali N". */
const NEAR_POINTS = 5;

export function barSides(players: PublicPlayer[], myPlayerId: string): BarSide[] {
  const me = players.find((p) => p.id === myPlayerId);
  if (players.some((p) => p.teamId !== undefined)) {
    const mine = me ? pileIdOf(me, players) : "team-0";
    return [
      { pileId: mine, label: sr.score.we, tone: "a" },
      { pileId: mine === "team-0" ? "team-1" : "team-0", label: sr.score.they, tone: "b" },
    ];
  }
  const others = players
    .filter((p) => p.id !== myPlayerId)
    .sort((a, b) => a.seatIndex - b.seatIndex);
  const twoPlayers = others.length === 1;
  return [
    { pileId: myPlayerId, label: sr.score.you, tone: twoPlayers ? "a" : "none" },
    ...others.map((p): BarSide => ({
      pileId: p.id,
      label: p.displayName,
      tone: twoPlayers ? "b" : "none",
    })),
  ];
}

const SCORING_KEYS: readonly ScoringCard[] = ["twoOfClubs", "tenOfDiamonds"];

/** Osigurano u ovom dijeljenju: po +1 za malu i veliku, bez karata još u redu za vijest. */
export function bonusByPile(
  hand: HandScore | undefined,
  hidden: readonly ScoringCard[] = [],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!hand) return out;
  for (const key of SCORING_KEYS) {
    const pile = hand.breakdown[key]?.winnerPileId;
    if (pile !== undefined && !hidden.includes(key)) out[pile] = (out[pile] ?? 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Red vijesti: uvijek jedna, nikad dvije istovremeno.
// ---------------------------------------------------------------------------

export type CardNews = {
  kind: "card";
  card: ScoringCard;
  tone: BarTone;
  ours: boolean;
  title: string;
  sub: string;
};

export type HandEndNews = {
  kind: "handEnd";
  title: string;
  sub: string;
  parts: { pileId: string; label: string; points: number; tone: BarTone }[];
  /** Zbir ruke: traka ga ne računa u ukupni broj dok vijest ne kaže kraj. */
  hand: HandScore;
  /** `liveHand` prije zadnjeg poteza — +N koji je traka do tad pokazivala. */
  before: HandScore | undefined;
};

export type ScoreNewsItem = CardNews | HandEndNews;
export type ScoreNews = ScoreNewsItem & { id: number };

export function cardNews(
  card: ScoringCard,
  winnerPileId: string,
  moverId: string,
  players: PublicPlayer[],
  myPlayerId: string,
): CardNews {
  const sides = barSides(players, myPlayerId);
  const side = sides.find((s) => s.pileId === winnerPileId) ?? sides[0]!;
  const ours = side.pileId === sides[0]!.pileId;
  const small = card === "twoOfClubs";
  const teamed = players.some((p) => p.teamId !== undefined);
  const title = teamed
    ? ours
      ? small ? sr.score.newsOursSmall : sr.score.newsOursBig
      : small ? sr.score.newsTheirsSmall : sr.score.newsTheirsBig
    : ours
      ? small ? sr.score.newsYoursSmall : sr.score.newsYoursBig
      : small ? sr.score.newsOtherSmall(side.label) : sr.score.newsOtherBig(side.label);
  const mover =
    moverId === myPlayerId
      ? sr.score.you
      : (players.find((p) => p.id === moverId)?.displayName ?? side.label);
  return { kind: "card", card, tone: side.tone, ours, title, sub: sr.score.newsSub(mover) };
}

export function handEndNews(
  hand: HandScore,
  players: PublicPlayer[],
  myPlayerId: string,
  before: HandScore | undefined,
): HandEndNews {
  return {
    kind: "handEnd",
    title: sr.score.newsHandEnd,
    sub: sr.score.newsHandEndSub,
    parts: barSides(players, myPlayerId)
      .map((s) => ({ ...s, points: hand.pointsByPile[s.pileId] ?? 0 }))
      .filter((p) => p.points > 0),
    hand,
    before,
  };
}

export type NewsQueue = {
  current: ScoreNews | null;
  /** Vijest se upravo vraća na rezultat: +1 i novi brojevi se već vide. */
  settled: boolean;
  waiting: ScoreNews[];
  nextId: number;
};

export const EMPTY_QUEUE: NewsQueue = { current: null, settled: false, waiting: [], nextId: 1 };

export function enqueueNews(q: NewsQueue, items: readonly ScoreNewsItem[]): NewsQueue {
  const added = items.map((item, i) => ({ ...item, id: q.nextId + i }));
  return { ...q, waiting: [...q.waiting, ...added], nextId: q.nextId + items.length };
}

export function startNextNews(q: NewsQueue): NewsQueue {
  const [next, ...waiting] = q.waiting;
  return next ? { ...q, current: next, settled: false, waiting } : q;
}

export function settleNews(q: NewsQueue): NewsQueue {
  return { ...q, settled: true };
}

export function finishNews(q: NewsQueue): NewsQueue {
  return { ...q, current: null, settled: false };
}

function unsettled(q: NewsQueue): ScoreNews[] {
  return q.current && !q.settled ? [q.current, ...q.waiting] : q.waiting;
}

/** Karte čija vijest još nije prošla: njihov +1 se ne vidi prije nje. */
export function hiddenCards(q: NewsQueue): ScoringCard[] {
  return unsettled(q).flatMap((n) => (n.kind === "card" ? [n.card] : []));
}

/** Vijest o kraju dok još nije rekla svoje: traka crta stanje prije zadnjeg poteza. */
export function frozenHandEnd(q: NewsQueue): HandEndNews | null {
  return unsettled(q).find((n): n is ScoreNews & HandEndNews => n.kind === "handEnd") ?? null;
}

/** `RoundEndOverlay` čeka dok vijest o kraju ne ode sa trake. */
export function handEndPending(q: NewsQueue): boolean {
  return q.current?.kind === "handEnd" || q.waiting.some((n) => n.kind === "handEnd");
}

// ---------------------------------------------------------------------------
// Šta traka crta
// ---------------------------------------------------------------------------

export type BarSideView = BarSide & { score: number; bonus: number; lead: boolean };

export type BarView = {
  sides: BarSideView[];
  round: string;
  /** „do 21" ili „fali N". */
  target: string;
  near: boolean;
  aria: string;
};

export function barView(input: {
  players: PublicPlayer[];
  myPlayerId: string;
  playing: boolean;
  matchScore: Record<string, number>;
  targetScore: number;
  handNumber: number;
  liveHand: HandScore | undefined;
  queue: NewsQueue;
}): BarView {
  const frozen = frozenHandEnd(input.queue);
  const hidden = hiddenCards(input.queue);
  // +N postoji samo dok ruka traje: poslije kraja je već u ukupnom broju.
  const bonus = frozen
    ? bonusByPile(frozen.before, hidden)
    : input.playing
      ? bonusByPile(input.liveHand, hidden)
      : {};
  const scoreOf = (pileId: string) =>
    (input.matchScore[pileId] ?? 0) - (frozen?.hand.pointsByPile[pileId] ?? 0);

  const sides = barSides(input.players, input.myPlayerId);
  const scores = sides.map((s) => scoreOf(s.pileId));
  const top = Math.max(...scores);
  const soleLeader = scores.filter((n) => n === top).length === 1;
  const missing = input.targetScore - top;
  const near = missing > 0 && missing <= NEAR_POINTS;

  return {
    sides: sides.map((s, i) => ({
      ...s,
      score: scores[i]!,
      bonus: bonus[s.pileId] ?? 0,
      lead: soleLeader && scores[i] === top,
    })),
    round: sr.score.barRound(input.handNumber),
    target: near ? sr.score.barNear(missing) : sr.score.barTarget(input.targetScore),
    near,
    aria: sr.score.barAria(sides.map((s, i) => `${s.label} ${scores[i]}`).join(", ")),
  };
}

// ---------------------------------------------------------------------------
// Panel detalja
// ---------------------------------------------------------------------------

/** Isti spisak kao na kraju ruke; bez `liveHand`-a (stariji server) redovi su crtice. */
const NO_HAND: HandScore = {
  handNumber: 0,
  pointsByPile: {},
  breakdown: {
    mostCards: { cardCountByPile: {}, points: 2 },
    mostClubs: { clubCountByPile: {}, points: 1 },
    tenOfDiamonds: { points: 1 },
    twoOfClubs: { points: 1 },
  },
};

export type DetailCell = { pileId: string; text: string; tone: BarTone; won: boolean };
export type DetailRow = {
  key: BreakdownRow["key"];
  label: string;
  points: string;
  cells: DetailCell[];
};

export function detailRows(hand: HandScore | undefined, sides: readonly BarSide[]): DetailRow[] {
  return breakdownRows(hand ?? NO_HAND).map((row) => ({
    key: row.key,
    label: row.label,
    points: sr.score.points(row.points),
    cells: sides.map((s) => {
      const won = row.winnerPileId === s.pileId;
      const text = row.countByPile
        ? hand
          ? String(row.countByPile[s.pileId] ?? 0)
          : "—"
        : won
          ? "+1"
          : "—";
      return { pileId: s.pileId, text, tone: s.tone, won };
    }),
  }));
}
