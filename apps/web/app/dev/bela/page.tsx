"use client";

import { useMemo, useState } from "react";
import {
  applyBelaAction,
  createBelaMatch,
  createBelaRules,
  createSeededRandom,
  getBelaView,
  selectBelaBotAction,
  startBelaHand,
} from "@zandar/game-core";
import { parseTableTheme, type BelaGamePayload, type BelaGameState, type PublicPlayer } from "@zandar/shared-types";

import { BelaScreen } from "@/components/bela/BelaScreen";
import { useQueryParam } from "@/lib/useQuery";

/**
 * Dev pregled Bela stola — stanja sa table „UI · Bela" (B1–B12) bez servera.
 * /dev/* je 404 u produkciji.
 *
 * Stanja NISU ručno pisana: pravi motor (game-core) i bot vode meč iz zadatog
 * sjemena dok ne stignu do traženog koraka. Ti si uvijek `p0` (dolje), partner
 * `p2` (gore), timovi po redu ulaska (odluka 15).
 *
 *   /dev/bela?s=deal     B1 · zvanje aduta, drugi su na potezu (6 karata)
 *   /dev/bela?s=call     B2 · zvanje aduta, ti na potezu
 *   /dev/bela?s=must     B3 · mus: ti dijeliš, svi su rekli Dalje
 *   /dev/bela?s=talon    B4 · adut zvan, 8 karata u ruci
 *   /dev/bela?s=decl     B5 · prvi štih, ti na potezu sa zvanjem
 *   /dev/bela?s=trick    B6 · štih, moraš odgovoriti (zatamnjene karte)
 *   /dev/bela?s=show     B7 · pokazana zvanja poslije prvog štiha
 *   /dev/bela?s=bela     B8 · „Bela! +20" na stolu
 *   /dev/bela?s=handEnd  B9 · kraj ruke (&fail=1 → pad)
 *   /dev/bela?s=table    B10 · tabela
 *   /dev/bela?s=end      B11 · kraj meča (&quick=0 → Revanš)
 *   /dev/bela?s=pause | vote  prekid veze
 *   &table=wood|cloth · &seed=N
 *
 * URL je osnova (headless Chrome ne klikće); akcije samo pišu u konzolu.
 */

const NAMES = ["Ti", "Ivan", "Tamara", "Mirza"];
const ME = "p0";

function players(away?: string): PublicPlayer[] {
  return NAMES.map((name, i) => ({
    id: `p${i}`,
    displayName: name,
    seatIndex: i,
    teamId: i % 2,
    isHost: i === 0,
    connectionStatus: `p${i}` === away ? "reconnecting" : "connected",
    avatar: (["sova", null, "lisica", null] as const)[i] ?? null,
    profileId: null,
  })) as PublicPlayer[];
}

type Pred = (s: BelaGameState) => boolean;

const myTurn = (step: BelaGameState["step"]): Pred => (s) =>
  s.phase === "playing" && s.step === step && s.currentPlayerId === ME;
const doneTricks = (s: BelaGameState) => s.tricks.filter((t) => t.winnerId !== null).length;

const SCENARIOS: Record<string, Pred> = {
  deal: (s) => s.phase === "playing" && s.step === "calling" && s.currentPlayerId !== ME && s.seats.every((x) => x.call === null),
  call: (s) => myTurn("calling")(s) && getBelaView(s, ME).callOptions?.canPass === true,
  must: (s) => myTurn("calling")(s) && getBelaView(s, ME).callOptions?.canPass === false,
  talon: (s) => s.phase === "playing" && s.step === "tricks" && s.tricks.length === 1 && s.tricks[0]!.plays.length === 0,
  decl: (s) => {
    if (!myTurn("tricks")(s) || s.tricks.length !== 1) return false;
    const v = getBelaView(s, ME);
    return v.myDeclarations.length > 0 && (v.legalCardIds?.length ?? 0) < v.myCards.length;
  },
  // B6: rana ruka, dvije karte na stolu, smiješ samo jednu (zatamnjene ostale).
  trick: (s) => {
    if (!myTurn("tricks")(s) || (s.tricks.at(-1)?.plays.length ?? 0) < 2) return false;
    const v = getBelaView(s, ME);
    return v.myCards.length >= 7 && (v.legalCardIds?.length ?? 0) === 1;
  },
  show: (s) =>
    s.phase === "playing" &&
    doneTricks(s) === 1 &&
    (s.tricks[1]?.plays.length ?? 0) === 0 &&
    getBelaView(s, ME).shownDeclarations.some((p) => p.declarations.length > 0),
  bela: (s) => {
    if (s.phase !== "playing" || !s.belaBy || !s.trumpSuit) return false;
    const t = s.tricks.at(-1);
    return !!t && t.winnerId === null && t.plays.some((p) => p.playerId === s.belaBy && p.card.suit === s.trumpSuit && (p.card.rank === "K" || p.card.rank === "Q"));
  },
  handEnd: (s) => s.phase === "hand_complete" && s.lastHand?.outcome === "pass",
  fail: (s) => s.phase === "hand_complete" && s.lastHand?.outcome === "fail",
  table: (s) => s.phase === "hand_complete" && s.history.length >= 5,
  end: (s) => s.phase === "match_finished",
};

/** Bot vodi sve (i tebe) dok `pred` ne važi; nova ruka kreće sama. */
function drive(seed: number, pred: Pred, target: number): BelaGameState {
  const rng = createSeededRandom(seed);
  let s = createBelaMatch({
    roomId: "dev",
    matchId: "dev",
    playerIds: NAMES.map((_, i) => `p${i}`),
    rules: createBelaRules({ targetScore: target }),
    rng,
  });
  for (let i = 0; i < 4000; i++) {
    if (pred(s)) return s;
    if (s.phase === "match_finished") break;
    if (s.phase === "hand_complete") {
      s = startBelaHand(s, rng);
      continue;
    }
    const pid = s.currentPlayerId!;
    s = applyBelaAction(s, pid, selectBelaBotAction(getBelaView(s, pid), undefined, rng));
  }
  return s;
}

function scenario(name: string, seed: number, now: number, target: number): BelaGamePayload {
  const key = name === "pause" || name === "vote" ? "trick" : name;
  const pred = SCENARIOS[key] ?? SCENARIOS.call!;
  let s: BelaGameState | null = null;
  for (let k = 0; k < 60 && !s; k++) {
    const candidate = drive(seed + k, pred, target);
    if (pred(candidate)) s = candidate;
  }
  s ??= drive(seed, () => false, target);
  const away = name === "pause" || name === "vote" ? "p3" : undefined;
  return {
    ...getBelaView(s, ME),
    players: players(away),
    interruption:
      name === "pause"
        ? { kind: "paused", startedAt: now - 30_000, endsAt: now + 90_000 }
        : name === "vote"
          ? { kind: "vote", startedAt: now, endsAt: now + 60_000, votes: {} }
          : null,
    ...(s.phase === "playing" && !away ? { turnDeadline: now + 18_000 } : {}),
  };
}

export default function BelaDevPage() {
  const raw = useQueryParam("s") ?? "call";
  const failParam = useQueryParam("fail");
  const s = raw === "handEnd" && failParam === "1" ? "fail" : raw;
  const seed = Number(useQueryParam("seed") ?? 1) || 1;
  const quick = useQueryParam("quick") !== "0";
  const table = parseTableTheme(useQueryParam("table"));
  // Tabela i kraj: kraći meč, da se do njih stigne brzo.
  const target = s === "end" || s === "table" ? 1001 : 501;
  const [now] = useState(() => Date.now());
  const view = useMemo(() => scenario(s, seed, now, target), [s, seed, now, target]);
  const log = (label: string) => async (...args: unknown[]) => console.info(`[bela dev] ${label}`, ...args);
  return (
    <BelaScreen
      key={`${s}-${seed}`}
      state={view}
      tableTheme={table}
      isQuickPlay={quick}
      onAction={log("action")}
      onNextHand={log("nextHand")}
      onRematch={log("rematch")}
      onNewTable={log("newTable")}
      onReact={log("react")}
      onLeave={() => console.info("[bela dev] leave")}
      onWaitMore={log("waitMore")}
      onAbandonVote={log("vote")}
      activeReactions={[]}
      initialTableOpen={s === "table"}
    />
  );
}
