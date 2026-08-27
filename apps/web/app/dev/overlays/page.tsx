"use client";

import { useState } from "react";
import type {
  AbandonVote,
  Card,
  GamePhase,
  HandScore,
  LastMove,
  PublicPlayer,
} from "@zandar/shared-types";
import { MoveReveal } from "@/components/overlay/MoveReveal";
import { ScorePill } from "@/components/overlay/ScorePill";
import {
  EmojiReactionRow,
  ReactionBubble,
} from "@/components/overlay/EmojiReactions";
import { PauseAbandonOverlay } from "@/components/overlay/PauseAbandonOverlay";
import { RoundEndOverlay } from "@/components/overlay/RoundEndOverlay";
import { Toast } from "@/components/overlay/Toast";

/**
 * Dev preview za overlay sloj (Lovable korak 3). Sve komponente su čiste —
 * ovdje se stanja biraju ručno, bez sata i bez servera. Nije produkcijski.
 */

const card = (suit: Card["suit"], rank: Card["rank"]): Card => ({
  id: `${suit}-${rank}`,
  suit,
  rank,
});

const players4: PublicPlayer[] = [
  { id: "me", displayName: "Ti", seatIndex: 0, isHost: true, teamId: 0, connectionStatus: "connected" },
  { id: "p1", displayName: "Marko", seatIndex: 1, isHost: false, teamId: 1, connectionStatus: "connected" },
  { id: "p2", displayName: "Jovana", seatIndex: 2, isHost: false, teamId: 0, connectionStatus: "connected" },
  { id: "p3", displayName: "Stefan", seatIndex: 3, isHost: false, teamId: 1, connectionStatus: "reconnecting" },
];

const players2: PublicPlayer[] = [
  { id: "me", displayName: "Ti", seatIndex: 0, isHost: true, connectionStatus: "connected" },
  { id: "p1", displayName: "Vesna", seatIndex: 1, isHost: false, connectionStatus: "connected" },
];

const moves: Record<string, LastMove> = {
  sweep: {
    moveId: "m1",
    playerId: "p1",
    playedCard: card("spades", "J"),
    capturedCards: [card("hearts", "4"), card("clubs", "7"), card("diamonds", "9"), card("spades", "3")],
    isAutoPlay: false,
  },
  capture: {
    moveId: "m2",
    playerId: "p1",
    playedCard: card("hearts", "A"),
    capturedCards: [card("clubs", "A")],
    isAutoPlay: false,
  },
  trail: {
    moveId: "m3",
    playerId: "p1",
    playedCard: card("diamonds", "9"),
    capturedCards: [],
    isAutoPlay: false,
  },
  auto: {
    moveId: "m4",
    playerId: "p1",
    playedCard: card("clubs", "2"),
    capturedCards: [card("hearts", "2")],
    isAutoPlay: true,
  },
};

const handScore4: HandScore = {
  handNumber: 3,
  pointsByPile: { "team-0": 3, "team-1": 1 },
  breakdown: {
    mostCards: { winnerPileId: "team-0", cardCountByPile: {}, points: 2 },
    mostClubs: { winnerPileId: "team-1", clubCountByPile: {}, points: 1 },
    twoOfClubs: { winnerPileId: "team-0", points: 1 },
    tenOfDiamonds: { winnerPileId: "team-0", points: 1 },
  },
};

const votes: Record<string, AbandonVote> = { me: "wait", p1: "end" };

/** Duga imena — tjeraju unutrašnji skrol panela na 360×800. */
const players4Long: PublicPlayer[] = [
  { id: "me", displayName: "Aleksandar Đorđević", seatIndex: 0, isHost: true, teamId: 0, connectionStatus: "connected" },
  { id: "p1", displayName: "Konstantin Milovanović", seatIndex: 1, isHost: false, teamId: 1, connectionStatus: "connected" },
  { id: "p2", displayName: "Radmila Hadžiabdić", seatIndex: 2, isHost: false, teamId: 0, connectionStatus: "connected" },
  { id: "p3", displayName: "Svjetlana Vukašinović", seatIndex: 3, isHost: false, teamId: 1, connectionStatus: "connected" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-token-md px-2.5 py-1 text-sm ${
        on ? "bg-accent text-accent-contrast font-bold" : "bg-surface-raised text-muted"
      }`}
    >
      {children}
    </button>
  );
}

export default function DevOverlaysPage() {
  const [moveKey, setMoveKey] = useState<keyof typeof moves>("sweep");
  const [revealPhase, setRevealPhase] = useState<"read" | "collect">("read");
  const [four, setFour] = useState(true);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [reactDisabled, setReactDisabled] = useState(false);
  const [sent, setSent] = useState<string>("—");
  const [phase, setPhase] = useState<GamePhase>("paused_for_reconnect");
  const [remaining, setRemaining] = useState(72_000);
  const [endMatch, setEndMatch] = useState(false);
  const [endHost, setEndHost] = useState(true);
  const [endPending, setEndPending] = useState(false);
  const [longNames, setLongNames] = useState(false);
  const [toastOn, setToastOn] = useState(true);

  const players = four ? players4 : players2;

  return (
    <div className="min-h-dvh bg-surface p-4 space-y-8 text-white">
      <h1 className="text-xl font-bold">Overlay sloj — port (Lovable korak 3)</h1>

      <section className="space-y-3">
        <h2 className="font-bold">MoveReveal</h2>
        <Row label="potez">
          {(Object.keys(moves) as (keyof typeof moves)[]).map((k) => (
            <Toggle key={k} on={moveKey === k} onClick={() => setMoveKey(k)}>
              {k}
            </Toggle>
          ))}
        </Row>
        <Row label="faza">
          {(["read", "collect"] as const).map((p) => (
            <Toggle key={p} on={revealPhase === p} onClick={() => setRevealPhase(p)}>
              {p}
            </Toggle>
          ))}
        </Row>
        <div className="rounded-token-lg bg-felt p-6 flex justify-center">
          <MoveReveal
            key={`${moveKey}-${revealPhase}`}
            move={moves[moveKey]!}
            playerName="Marko"
            visible
            phase={revealPhase}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">ScorePill</h2>
        <Row label="sto">
          <Toggle on={four} onClick={() => setFour(true)}>4P (timovi)</Toggle>
          <Toggle on={!four} onClick={() => setFour(false)}>2P (igrači)</Toggle>
        </Row>
        <div className="rounded-token-lg bg-felt p-6 flex justify-center">
          <ScorePill
            players={players}
            matchScore={four ? { "team-0": 14, "team-1": 9 } : { me: 11, p1: 7 }}
            targetScore={21}
            handScores={[handScore4]}
            expanded={scoreOpen}
            onToggle={() => setScoreOpen((v) => !v)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Reakcije</h2>
        <Row label="stanje">
          <Toggle on={!reactDisabled} onClick={() => setReactDisabled(false)}>aktivno</Toggle>
          <Toggle on={reactDisabled} onClick={() => setReactDisabled(true)}>disabled</Toggle>
          <span className="text-sm text-muted">poslato: {sent}</span>
        </Row>
        <div className="rounded-token-lg bg-felt p-6 flex flex-wrap items-end justify-center gap-6">
          <EmojiReactionRow onSend={(t) => setSent(t)} disabled={reactDisabled} />
          <ReactionBubble type="fire" visible />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Pauza / prekid</h2>
        <Row label="faza">
          {(["paused_for_reconnect", "abandon_vote", "abandoned", "playing"] as GamePhase[]).map(
            (p) => (
              <Toggle key={p} on={phase === p} onClick={() => setPhase(p)}>
                {p}
              </Toggle>
            ),
          )}
        </Row>
        <Row label="preostalo">
          {[120_000, 72_000, 12_000].map((ms) => (
            <Toggle key={ms} on={remaining === ms} onClick={() => setRemaining(ms)}>
              {ms / 1000}s
            </Toggle>
          ))}
        </Row>
        <div className="rounded-token-lg bg-felt p-6 flex justify-center min-h-[12rem]">
          <PauseAbandonOverlay
            phase={phase}
            players={players}
            waitingForName="Stefan"
            remainingMs={remaining}
            abandonVotes={votes}
            myPlayerId="me"
            onWait={() => setSent("sačekaj")}
            onVote={(v) => setSent(`glas: ${v}`)}
            onLeave={() => setSent("izlaz")}
          />
        </div>
        {phase === "playing" && (
          <p className="text-sm text-muted">
            Ostalih sedam faza renderuje null — ovo je namjerno prazno.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Kraj ruke / kraj meča</h2>
        <Row label="faza">
          <Toggle on={!endMatch} onClick={() => setEndMatch(false)}>hand_finished</Toggle>
          <Toggle on={endMatch} onClick={() => setEndMatch(true)}>match_finished</Toggle>
        </Row>
        <Row label="uloga">
          <Toggle on={endHost} onClick={() => setEndHost(true)}>host</Toggle>
          <Toggle on={!endHost} onClick={() => setEndHost(false)}>nije host</Toggle>
        </Row>
        <Row label="akcija u toku">
          <Toggle on={!endPending} onClick={() => setEndPending(false)}>mirno</Toggle>
          <Toggle on={endPending} onClick={() => setEndPending(true)}>pending</Toggle>
        </Row>
        <Row label="imena">
          <Toggle on={!longNames} onClick={() => setLongNames(false)}>kratka</Toggle>
          <Toggle on={longNames} onClick={() => setLongNames(true)}>duga (skrol)</Toggle>
        </Row>
        {/* 360×800 okvir — ista visina na kojoj se panel mora sam skrolovati. */}
        <div className="mx-auto w-[360px] h-[800px] max-w-full rounded-token-lg bg-felt relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
            <RoundEndOverlay
              phase={endMatch ? "match_finished" : "hand_finished"}
              players={longNames ? players4Long : players4}
              handScore={handScore4}
              matchScore={{ "team-0": 21, "team-1": 13 }}
              targetScore={21}
              winnerPileId="team-0"
              isHost={endHost}
              pending={endPending}
              onNextHand={() => setSent("sljedeća ruka")}
              onRematch={() => setSent("revanš")}
              onFindNewTable={() => setSent("novi sto")}
              onLeave={() => setSent("izlaz")}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Toast</h2>
        <Row label="stanje">
          <Toggle on={toastOn} onClick={() => setToastOn(true)}>vidljiv</Toggle>
          <Toggle on={!toastOn} onClick={() => setToastOn(false)}>skriven</Toggle>
        </Row>
        <div className="rounded-token-lg bg-felt p-6 flex justify-center min-h-[5rem]">
          <Toast
            message="Ne možeš spustiti kartu — postoji kupovina."
            visible={toastOn}
          />
        </div>
      </section>
    </div>
  );
}
