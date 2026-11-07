"use client";

import { useMemo, useState } from "react";
import {
  applyRaubAction,
  createRaubMatch,
  createRaubRules,
  createSeededRandom,
  getRaubView,
  selectRaubBotAction,
  startRaubHand,
} from "@zandar/game-core";
import { parseTableTheme, type PublicPlayer, type RaubGamePayload, type RaubGameState } from "@zandar/shared-types";

import { RaubScreen } from "@/components/raub/RaubScreen";
import { useQueryParam } from "@/lib/useQuery";

/**
 * Dev pregled Raub stola — stanja sa table „UI · Raub — kompletan UI" bez
 * servera. /dev/* je 404 u produkciji.
 *
 * Stanja NISU ručno pisana: pravi motor (game-core) i bot vode meč iz zadatog
 * sjemena dok ne stignu do traženog koraka, pa je svako stanje moguće u igri.
 * Ti si uvijek `p0` (dolje).
 *
 *   /dev/raub?s=open&n=4      4 · djelilac prije otvaranja (n = 2 | 3 | 4)
 *   /dev/raub?s=bid           5 · licitacija, ti na potezu
 *   /dev/raub?s=bid2          6 · druga karta na talonu, čeka se drugi
 *   /dev/raub?s=discard       7 · višak (5 karata, karta s talona zaključana)
 *   /dev/raub?s=going         Idem / Ne idem
 *   /dev/raub?s=exchange      8 · zamjena, ti na potezu
 *   /dev/raub?s=exchangeOpen  8 · neko je zamijenio sve 4 (otvorena karta)
 *   /dev/raub?s=trick         9 · štih, moraš odgovoriti (zatamnjene karte)
 *   /dev/raub?s=declarer      10 · ti si nosilac
 *   /dev/raub?s=handEnd       11 · kraj ruke ×2 (poslije refe)
 *   /dev/raub?s=refa          12 · refa
 *   /dev/raub?s=table         13 · tabela rezultata
 *   /dev/raub?s=end           14 · kraj partije (&quick=0 → Revanš)
 *   /dev/raub?s=pause | vote  prekid veze (pauza / glasanje)
 *   /dev/raub?table=wood|cloth · &seed=N
 *
 * URL je osnova (headless Chrome ne klikće); akcije samo pišu u konzolu.
 */

const NAMES = ["Zvonko", "Marko", "Milica.K", "Goga"];
const ME = "p0";

function players(n: number, away?: string): PublicPlayer[] {
  return NAMES.slice(0, n).map((name, i) => ({
    id: `p${i}`,
    displayName: name,
    seatIndex: i,
    isHost: i === 0,
    connectionStatus: `p${i}` === away ? "reconnecting" : "connected",
    avatar: (["sova", null, "lisica", null] as const)[i] ?? null,
    profileId: null,
  })) as PublicPlayer[];
}

type Pred = (s: RaubGameState) => boolean;

const onMyTurn = (step: RaubGameState["step"]): Pred => (s) =>
  s.phase === "playing" && s.step === step && s.currentPlayerId === ME;

const SCENARIOS: Record<string, Pred> = {
  open: onMyTurn("await_open"),
  bid: (s) => onMyTurn("bidding")(s) && s.talonFlips === 1,
  bid2: (s) => s.phase === "playing" && s.step === "bidding" && s.talonFlips === 2 && s.currentPlayerId !== ME,
  discard: onMyTurn("discard_extra"),
  going: onMyTurn("going"),
  exchange: onMyTurn("exchange"),
  exchangeOpen: (s) => onMyTurn("exchange")(s) && s.openCard !== null && s.openCard.playerId !== ME,
  trick: (s) => {
    if (!onMyTurn("tricks")(s)) return false;
    const plays = s.tricks.at(-1)?.plays.length ?? 0;
    const hand = s.seats.find((x) => x.playerId === ME)!.hand.length;
    const legal = getRaubView(s, ME).legalCardIds?.length ?? hand;
    return plays > 0 && legal < hand;
  },
  declarer: (s) => onMyTurn("tricks")(s) && s.declarerId === ME,
  handEnd: (s) => s.phase === "hand_complete" && !s.lastHand!.void && s.lastHand!.multiplier === 2,
  refa: (s) => s.phase === "hand_complete" && s.lastHand!.void,
  table: (s) => s.phase === "hand_complete" && s.history.length >= 7,
  end: (s) => s.phase === "match_finished",
};

/** Bot vodi sve (i tebe) dok `pred` ne važi; nova ruka kreće sama. */
function drive(n: number, seed: number, pred: Pred): RaubGameState {
  const rng = createSeededRandom(seed);
  let s = createRaubMatch({
    roomId: "dev",
    matchId: "dev",
    playerIds: NAMES.slice(0, n).map((_, i) => `p${i}`),
    rules: createRaubRules(n as 2 | 3 | 4),
    rng,
  });
  for (let i = 0; i < 6000; i++) {
    if (pred(s)) return s;
    if (s.phase === "match_finished") break;
    if (s.phase === "hand_complete") {
      s = startRaubHand(s, rng);
      continue;
    }
    const pid = s.currentPlayerId!;
    s = applyRaubAction(s, pid, selectRaubBotAction(getRaubView(s, pid), undefined, rng));
  }
  return s;
}

function scenario(name: string, n: number, seed: number, now: number): RaubGamePayload {
  const key = name === "pause" || name === "vote" ? "bid" : name;
  const pred = SCENARIOS[key] ?? SCENARIOS.bid!;
  let s: RaubGameState | null = null;
  // Isto sjeme daje isto stanje; ako ga nema, sljedeće sjeme.
  for (let k = 0; k < 40 && !s; k++) {
    const candidate = drive(n, seed + k, pred);
    if (pred(candidate)) s = candidate;
  }
  s ??= drive(n, seed, () => false);
  const away = name === "pause" || name === "vote" ? `p${Math.min(2, n - 1)}` : undefined;
  return {
    ...getRaubView(s, ME),
    players: players(n, away),
    interruption:
      name === "pause"
        ? { kind: "paused", startedAt: now - 30_000, endsAt: now + 90_000 }
        : name === "vote"
          ? { kind: "vote", startedAt: now, endsAt: now + 60_000, votes: {} }
          : null,
    ...(s.phase === "playing" && !away ? { turnDeadline: now + 11_000 } : {}),
  };
}

export default function RaubDevPage() {
  const s = useQueryParam("s") ?? "bid";
  const n = Math.max(2, Math.min(4, Number(useQueryParam("n") ?? 4) || 4));
  const seed = Number(useQueryParam("seed") ?? 1) || 1;
  const quick = useQueryParam("quick") !== "0";
  const table = parseTableTheme(useQueryParam("table"));
  // Rok poteza od trenutka otvaranja stranice (render mora biti čist).
  const [now] = useState(() => Date.now());
  const view = useMemo(() => scenario(s, n, seed, now), [s, n, seed, now]);
  const log = (label: string) => async (...args: unknown[]) => console.info(`[raub dev] ${label}`, ...args);
  return (
    <RaubScreen
      key={`${s}-${n}-${seed}`}
      state={view}
      tableTheme={table}
      isQuickPlay={quick}
      onAction={log("action")}
      onNextHand={log("nextHand")}
      onRematch={log("rematch")}
      onNewTable={log("newTable")}
      onReact={log("react")}
      onLeave={() => console.info("[raub dev] leave")}
      onWaitMore={log("waitMore")}
      onAbandonVote={log("vote")}
      activeReactions={[]}
      initialTableOpen={s === "table"}
    />
  );
}
