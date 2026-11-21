import { describe, expect, it } from "vitest";
import type { BelaGameState, Card, Rank, Suit } from "@zandar/shared-types";
import { createBelaDeck } from "./cards";
import { createBelaRules } from "./config";
import { DEFAULT_BELA_BOT_CONFIG, belaBotThinkMs, selectBelaBotAction } from "./bot";
import { applyBelaAction, createBelaMatch, startBelaHand } from "./match";
import { simulateBelaMatches } from "./simulate";
import { getBelaView } from "./view";

const c = (suit: Suit, rank: Rank): Card => ({ id: `${suit}-${rank}`, suit, rank });
const H = (r: Rank) => c("hearts", r);
const S = (r: Rank) => c("spades", r);
const D = (r: Rank) => c("diamonds", r);
const C = (r: Rank) => c("clubs", r);

const IDS = ["a", "b", "c", "d"] as const;
const NO_NOISE = { ...DEFAULT_BELA_BOT_CONFIG, noiseP: 0, blunderP: 0 };
const never = () => 0.99;

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Stanje u zvanju gdje je `a` na potezu sa zadatih 6 karata. */
function callingWith(hand: Card[]): BelaGameState {
  const s = structuredClone(
    createBelaMatch({ roomId: "r", matchId: "m", playerIds: IDS, rules: createBelaRules(), rng: makeLcg(1), dealerId: "d" }),
  );
  s.seats[0]!.hand = hand;
  return s;
}

/** Stanje usred štiha (adut herc) sa zadatim rukama. */
function trickWith(hands: Record<string, Card[]>, plays: [string, Card][], callerId = "a"): BelaGameState {
  let s = createBelaMatch({ roomId: "r", matchId: "m", playerIds: IDS, rules: createBelaRules(), rng: makeLcg(1), dealerId: "d" });
  s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
  s = structuredClone(s);
  s.callerId = callerId;
  // Ostatak špila „nestaje" (već odigran u ranijim štihovima) da bot ne broji neviđene karte.
  const used = new Set([...Object.values(hands).flat(), ...plays.map((p) => p[1])].map((x) => x.id));
  const gone = createBelaDeck().filter((x) => !used.has(x.id));
  for (const seat of s.seats) seat.hand = hands[seat.playerId] ?? [];
  s.tricks = [];
  for (let i = 0; i + 4 <= gone.length; i += 4) {
    s.tricks.push({ leaderId: "a", plays: IDS.map((id, k) => ({ playerId: id, card: gone[i + k]! })), winnerId: "a" });
  }
  s.tricks.push({ leaderId: plays[0]?.[0] ?? "a", plays: plays.map(([playerId, card]) => ({ playerId, card })), winnerId: null });
  const last = plays.at(-1)?.[0];
  s.currentPlayerId = last ? IDS[(IDS.indexOf(last as (typeof IDS)[number]) + 1) % 4]! : "a";
  return s;
}

describe("bela bot", () => {
  it("zove adut sa jakom rukom (U, IX, A iste boje)", () => {
    const s = callingWith([H("J"), H("9"), H("A"), S("7"), D("8"), C("7")]);
    expect(selectBelaBotAction(getBelaView(s, "a"), NO_NOISE, never)).toEqual({ type: "call", suit: "hearts" });
  });

  it("kaže „Dalje” sa slabom rukom", () => {
    const s = callingWith([H("7"), S("8"), D("9"), C("Q"), S("K"), D("7")]);
    expect(selectBelaBotAction(getBelaView(s, "a"), NO_NOISE, never)).toEqual({ type: "call", suit: null });
  });

  it("kod musa uvijek zove najjaču boju", () => {
    let s = createBelaMatch({ roomId: "r", matchId: "m", playerIds: IDS, rules: createBelaRules(), rng: makeLcg(1), dealerId: "d" });
    for (const id of ["a", "b", "c"]) s = applyBelaAction(s, id, { type: "call", suit: null });
    s = structuredClone(s);
    s.seats[3]!.hand = [C("J"), C("9"), S("7"), D("7"), H("8"), S("8")];
    expect(selectBelaBotAction(getBelaView(s, "d"), NO_NOISE, never)).toEqual({ type: "call", suit: "clubs" });
  });

  it("maže partneru: zadnji na redu, partner nosi → najviše bodova van aduta", () => {
    const s2 = trickWith({ d: [S("A"), S("7")] }, [["a", D("7")], ["b", D("A")], ["c", D("8")]]);
    // Nosi b (partner od d), d je zadnji i nema karo ni adut → maže pikovog asa.
    expect(selectBelaBotAction(getBelaView(s2, "d"), NO_NOISE, never)).toEqual({ type: "play", cardId: S("A").id, declare: true });
  });

  it("protivnik nosi, a ne može se uzeti → najjeftinija karta", () => {
    const s = trickWith({ d: [S("A"), S("7")] }, [["a", D("7")], ["b", D("8")], ["c", D("A")]]);
    expect(selectBelaBotAction(getBelaView(s, "d"), NO_NOISE, never)).toEqual({ type: "play", cardId: S("7").id, declare: true });
  });

  it("tim koji je zvao vuče adute najjačim adutom", () => {
    const s = trickWith({ a: [H("J"), H("7"), S("A")], b: [H("8")] }, [], "a");
    expect(selectBelaBotAction(getBelaView(s, "a"), NO_NOISE, never)).toEqual({ type: "play", cardId: H("J").id, declare: true });
  });

  it("uvijek bira dozvoljenu kartu (nasumična stanja)", () => {
    const rng = makeLcg(11);
    for (let seed = 1; seed <= 40; seed++) {
      let s = createBelaMatch({ roomId: "r", matchId: "m", playerIds: IDS, rules: createBelaRules(), rng: makeLcg(seed) });
      while (s.phase === "playing") {
        const v = getBelaView(s, s.currentPlayerId!);
        const a = selectBelaBotAction(v, DEFAULT_BELA_BOT_CONFIG, rng);
        if (a.type === "play") expect(v.legalCardIds).toContain(a.cardId);
        s = applyBelaAction(s, s.currentPlayerId!, a);
      }
      if (s.phase === "hand_complete") s = startBelaHand(s, rng);
    }
  });

  it("vrijeme odluke 2,5–7 s", () => {
    expect(belaBotThinkMs(DEFAULT_BELA_BOT_CONFIG, () => 0)).toBe(2500);
    expect(belaBotThinkMs(DEFAULT_BELA_BOT_CONFIG, () => 0.999999)).toBe(7000);
  });

  it("simulacija: 200 mečeva do 501 bez greške", () => {
    const r = simulateBelaMatches({ matches: 200, seed: 3, rules: { targetScore: 501 } });
    expect(r.cardErrors).toBe(0);
    expect(r.trickErrors).toBe(0);
    expect(r.pointErrors).toBe(0);
    expect(r.illegalActions).toBe(0);
    expect(r.stuck).toBe(0);
  });
});
