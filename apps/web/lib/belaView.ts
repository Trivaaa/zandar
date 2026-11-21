import type {
  BelaDeclaration,
  BelaGamePayload,
  BelaHandResult,
  BelaPlayerView,
  BelaSeatView,
  BelaTeam,
  Card,
  GamePhase,
  Rank,
  Suit,
} from "@zandar/shared-types";

import { HU_SUIT_NAME, huRankLabel, type CardDeck } from "@/lib/hungarianDeck";
import { SUIT_SYMBOL, cardLabel } from "@/lib/raubView";
import { sr } from "@/lib/sr";

/**
 * Bela — prikaz (docs/bela-spec.md, tabla `UI_Bela`). Čiste funkcije iz
 * pogleda koji šalje server; ekran ne odlučuje ništa o pravilima (HARD RULE 1).
 * Tekst nosi boju kao ♠♥♦♣ (jedan izvor stringova, lako testiranje), a ekran
 * je mijenja ikonicom mađarice (`withSuits`).
 */

export type { Dir } from "@/lib/raubView";

/** Jačina u adutu i van aduta (spec, tabela „Vrijednost i jačina karata"). */
const TRUMP_ORDER: readonly Rank[] = ["J", "9", "A", "10", "K", "Q", "8", "7"];
const PLAIN_ORDER: readonly Rank[] = ["A", "10", "K", "Q", "J", "9", "8", "7"];
/** Redoslijed boja u ruci: naizmjenično crvena i „tamna", da se boje ne stope. */
const SUIT_ORDER: readonly Suit[] = ["hearts", "clubs", "diamonds", "spades"];

/**
 * Ruka sortirana po boji: adut prvi (po jačini aduta), pa ostale boje
 * naizmjenično, svaka po jačini van aduta. Prije zvanja aduta samo po boji.
 */
export function sortBelaHand(cards: readonly Card[], trump: Suit | null): Card[] {
  const suits = trump ? [trump, ...SUIT_ORDER.filter((s) => s !== trump)] : [...SUIT_ORDER];
  const rankIdx = (c: Card) => (c.suit === trump ? TRUMP_ORDER : PLAIN_ORDER).indexOf(c.rank);
  return [...cards].sort((a, b) => suits.indexOf(a.suit) - suits.indexOf(b.suit) || rankIdx(a) - rankIdx(b));
}

/**
 * Ruka u dva reda (odluka 8): gornji red dobija kartu više kad je broj neparan
 * (7 = 4 + 3). Sa 4 ili manje karata sve stane u jedan red.
 */
export function belaHandRows<T>(cards: readonly T[]): [T[], T[]] {
  if (cards.length <= 4) return [[], [...cards]];
  const back = Math.ceil(cards.length / 2);
  return [cards.slice(0, back), cards.slice(back)];
}

/** Naš tim : njihov tim (rezultat meča i uživo). Gledalac bez tima vidi tim 0 kao „naš". */
export function teamPair(pair: readonly [number, number], myTeam: BelaTeam | null): [number, number] {
  const mine: BelaTeam = myTeam ?? 0;
  return [pair[mine], pair[mine === 0 ? 1 : 0]];
}

export function belaOverlayPhase(p: Pick<BelaGamePayload, "phase" | "interruption">): GamePhase | null {
  if (p.phase === "abandoned") return "abandoned";
  if (p.interruption?.kind === "paused") return "paused_for_reconnect";
  if (p.interruption?.kind === "vote") return "abandon_vote";
  return null;
}

/** Natpis faze u zaglavlju. */
export function belaPhaseLabel(v: Pick<BelaPlayerView, "phase" | "step" | "tricks">): string {
  if (v.phase === "match_finished" || v.phase === "abandoned") return sr.bela.phase.matchEnd;
  if (v.phase === "hand_complete") return sr.bela.phase.handEnd;
  if (v.step === "calling") return sr.bela.phase.calling;
  const open = v.tricks.findIndex((t) => t.winnerId === null);
  const n = open >= 0 ? open + 1 : Math.min(8, v.tricks.length + 1);
  return sr.bela.phase.trick(n);
}

const suitText = (s: Suit) => `${HU_SUIT_NAME[s]} ${SUIT_SYMBOL[s]}`;

/** Ime boje sa velikim slovom i znakom — „Srce ♥". */
export const suitTitle = (s: Suit) => {
  const n = HU_SUIT_NAME[s];
  return `${n.charAt(0).toUpperCase()}${n.slice(1)}`;
};

/**
 * Traka iznad ruke dok si na redu u štihu: da si na redu i zašto su neke
 * karte zatamnjene. Razlog se izvodi iz `legalCardIds` koje je dao server —
 * ekran ne računa pravila, samo ih imenuje.
 */
export function belaPlayHint(
  v: Pick<BelaPlayerView, "tricks" | "myCards" | "trumpSuit" | "legalCardIds">,
  deck: CardDeck = "hungarian",
): string {
  const legal = new Set(v.legalCardIds ?? []);
  const trick = v.tricks.at(-1);
  const open = trick && trick.winnerId === null && trick.plays.length > 0 ? trick : null;
  const only = legal.size === 1 ? v.myCards.find((c) => legal.has(c.id)) : undefined;
  const tail = only ? `: ${cardLabel(only, deck)}` : "";
  if (!open) return sr.bela.hint.lead;
  const lead = open.plays[0]!.card.suit;
  const ofLead = v.myCards.filter((c) => c.suit === lead);
  if (ofLead.length > 0) {
    return legal.size < ofLead.length ? `${sr.bela.hint.higher}${tail}` : sr.bela.hint.follow(suitText(lead));
  }
  const trumps = v.trumpSuit ? v.myCards.filter((c) => c.suit === v.trumpSuit) : [];
  if (trumps.length > 0 && v.trumpSuit) {
    return legal.size < trumps.length ? `${sr.bela.hint.overTrump}${tail}` : sr.bela.hint.trump(suitText(v.trumpSuit));
  }
  return sr.bela.hint.any;
}

const RANK_PLURAL: Partial<Record<Rank, string>> = { J: "U", Q: "O", K: "kralja", A: "asa", "10": "desetke", "9": "devetke" };

/** Jedno zvanje riječima: „Terca u žiru · 20", „Četiri U · 200". */
export function declarationLabel(d: BelaDeclaration): string {
  if (d.kind === "four") {
    const r = d.cards[0]!.rank;
    const what = RANK_PLURAL[r] ?? huRankLabel(r);
    return `${sr.bela.decl.four(what)} · ${d.points}`;
  }
  const suit = HU_SUIT_NAME[d.cards[0]!.suit];
  const n = d.cards.length;
  const name = n === 3 ? sr.bela.decl.terca : n === 4 ? sr.bela.decl.kvarta : sr.bela.decl.run(n);
  return `${name} ${sr.bela.decl.inSuit(suit)} · ${d.points}`;
}

/** Sva moja zvanja u jednom redu i ukupan zbir (traka uz prvu kartu). */
export function declarationsLine(decls: readonly BelaDeclaration[]): { label: string; points: number } | null {
  if (decls.length === 0) return null;
  const points = decls.reduce((s, d) => s + d.points, 0);
  return { label: decls.map(declarationLabel).join(" + "), points };
}

/**
 * Natpis iznad avatara: odgovor u zvanju aduta („Dalje", „Srce ♥") ili
 * prijava zvanja u prvom štihu („Zove 50"). Ostalo vrijeme ništa.
 */
export function belaSeatCaption(
  v: Pick<BelaPlayerView, "phase" | "step" | "tricks">,
  seat: Pick<BelaSeatView, "call" | "declaredPoints">,
): string | null {
  if (v.phase !== "playing") return null;
  if (v.step === "calling") {
    if (seat.call === "pass") return sr.bela.bid.pass;
    if (seat.call) return `${suitTitle(seat.call)} ${SUIT_SYMBOL[seat.call]}`;
    return null;
  }
  // Prijava se vidi dok traje prvi štih, pa nestaje.
  const firstOpen = v.tricks.length === 1 && v.tricks[0]!.winnerId === null;
  if (firstOpen && seat.declaredPoints !== null) {
    return seat.declaredPoints > 0 ? sr.bela.decl.calls(seat.declaredPoints) : sr.bela.decl.none;
  }
  return null;
}

// ---- Kraj ruke -------------------------------------------------------------

export type BelaOutcomeTone = "good" | "bad" | "neutral";

/** Natpis ishoda ruke iz ugla gledaoca (pad tima koji je zvao je za njih „Pad"). */
export function belaOutcome(result: BelaHandResult, myTeam: BelaTeam | null): { label: string; tone: BelaOutcomeTone } {
  const mineCalled = result.callerTeam !== null && result.callerTeam === (myTeam ?? 0);
  if (result.outcome === "redeal") return { label: sr.bela.outcome.redeal, tone: "neutral" };
  if (result.stiglja !== null) {
    return { label: sr.bela.outcome.stiglja, tone: result.stiglja === (myTeam ?? 0) ? "good" : "bad" };
  }
  if (result.outcome === "hang") return { label: sr.bela.outcome.hang, tone: "neutral" };
  if (result.outcome === "fail") return { label: sr.bela.outcome.fail, tone: mineCalled ? "bad" : "good" };
  return { label: sr.bela.outcome.pass, tone: mineCalled ? "good" : "bad" };
}

/** Jedna rečenica ispod naslova pregleda ruke (tabla B9). */
export function belaOutcomeSentence(result: BelaHandResult, myTeam: BelaTeam | null): string {
  if (result.outcome === "redeal") return sr.bela.sentence.redeal;
  const mine: BelaTeam = myTeam ?? 0;
  const caller = result.teams.find((t) => t.team === result.callerTeam);
  const other = result.teams.find((t) => t.team !== result.callerTeam);
  const total = (t: typeof caller) => (t ? t.cardPoints + t.declarationPoints + t.belaPoints : 0);
  const callerTotal = total(caller);
  const all = callerTotal + total(other);
  const we = result.callerTeam === mine;
  if (result.outcome === "fail") return sr.bela.sentence.fail(we, callerTotal, all);
  if (result.outcome === "hang") return sr.bela.sentence.hang(we, callerTotal, all);
  return sr.bela.sentence.pass(we, callerTotal, all);
}

export type BelaHandRow = { label: string; mine: string; theirs: string; kind?: "sum" | "award" };

const pts = (n: number) => (n === 0 ? "—" : String(n));

/** Tabela pregleda ruke: odakle su bodovi i šta se upisuje (tabla B9). */
export function belaHandTable(result: BelaHandResult, myTeam: BelaTeam | null): BelaHandRow[] {
  const mine: BelaTeam = myTeam ?? 0;
  const m = result.teams.find((t) => t.team === mine);
  const o = result.teams.find((t) => t.team !== mine);
  if (!m || !o) return [];
  const sum = (t: typeof m) => t.cardPoints + t.declarationPoints + t.belaPoints;
  return [
    { label: sr.bela.summary.cards, mine: pts(m.cardPoints), theirs: pts(o.cardPoints) },
    { label: sr.bela.summary.declarations, mine: pts(m.declarationPoints), theirs: pts(o.declarationPoints) },
    { label: sr.bela.summary.bela, mine: pts(m.belaPoints), theirs: pts(o.belaPoints) },
    { label: sr.bela.summary.total, mine: String(sum(m)), theirs: String(sum(o)), kind: "sum" },
    { label: sr.bela.summary.awarded, mine: String(m.awarded), theirs: String(o.awarded), kind: "award" },
  ];
}

export type BelaTableRow = { dealNo: number; mine: number; theirs: number; tag: string | null };

/** Tabela meča (B10): ruka po red, šta je koji tim upisao, oznaka pad/visi/štiglja. */
export function belaScoreTable(history: readonly BelaHandResult[], myTeam: BelaTeam | null): BelaTableRow[] {
  const mine: BelaTeam = myTeam ?? 0;
  return history.map((h) => {
    const m = h.teams.find((t) => t.team === mine)?.awarded ?? 0;
    const o = h.teams.find((t) => t.team !== mine)?.awarded ?? 0;
    const tag =
      h.outcome === "redeal"
        ? sr.bela.tag.redeal
        : h.stiglja !== null
          ? sr.bela.tag.stiglja
          : h.outcome === "fail"
            ? sr.bela.tag.fail
            : h.outcome === "hang"
              ? sr.bela.tag.hang
              : null;
    return { dealNo: h.dealNo, mine: m, theirs: o, tag };
  });
}

/** Koliko je koji tim blizu cilja (traka u tabeli), 0–100. */
export const progressPercent = (score: number, target: number) =>
  Math.max(0, Math.min(100, Math.round((score / Math.max(1, target)) * 100)));
