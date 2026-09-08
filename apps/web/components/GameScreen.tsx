"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCaptureOptions, type GameEvent } from "@zandar/game-core";
import type {
  AbandonVote,
  Card as CardType,
  CaptureOption,
  PrivateGameStateView,
  ReactionType,
} from "@zandar/shared-types";
import { PlayerSeat } from "@/components/felt/PlayerSeat";
import { TableSurface, type LandFrom } from "@/components/felt/TableSurface";
import { PlayerHand } from "@/components/felt/PlayerHand";
import { TurnPill } from "@/components/felt/TurnPill";
import { TurnBanner } from "@/components/felt/TurnBanner";
import { ScorePill } from "@/components/overlay/ScorePill";
import { ReactionFab } from "@/components/ReactionFab";
import { PauseAbandonOverlay } from "@/components/overlay/PauseAbandonOverlay";
import { RoundEndOverlay } from "@/components/overlay/RoundEndOverlay";
import { Toast } from "@/components/overlay/Toast";
import { RulesModal } from "@/components/RulesModal";
import { MoveRevealLive } from "@/components/overlay/MoveRevealLive";
import { DeckPile } from "@/components/felt/DeckPile";
import { FeedbackToggles } from "@/components/FeedbackToggles";
import { arrangeSeats } from "@/lib/seating";
import { ReactionBubble } from "@/components/overlay/EmojiReactions";
import { vibrate, HAPTIC } from "@/lib/haptics";
import { playSfx } from "@/lib/sound";
import { useGameEvents } from "@/lib/useGameEvents";
import { dealFromDeck } from "@/lib/flyAnimation";
import { useCountdown } from "@/lib/useCountdown";
import type { ActiveReaction } from "@/lib/reactions";

/**
 * GameScreen — pozicijski live game ekran (DS Faza B integracija).
 *
 * Spaja sve B-komponente sa public game state-om: pozicijski sto (TableSeats +
 * GameTable), TableArea (capture/trail), HandArea (fluid tap), TurnTimer na
 * aktivnom, ScorePill, ReactionFab, PauseAbandonOverlay (uklj. abandoned ekran).
 * Bot-agnostičan — koristi samo PublicPlayer/PrivateGameStateView.
 */

/** Pun turn-timeout (= rulesConfig.turnTimeoutSeconds) — za ratio pilule. */
const TURN_TOTAL_SECONDS = 30;

type GameStateWithDeadline = PrivateGameStateView & { turnDeadline?: number };

type GameScreenProps = {
  state: GameStateWithDeadline;
  onPlayCard: (
    cardId: string,
    selectedCaptureCardIds: string[],
  ) => Promise<void>;
  onNextHand: () => Promise<void>;
  onRematch: () => Promise<void>;
  onReact: (type: string) => Promise<void>;
  onLeave?: () => void;
  /** Napusti ovaj sto i nađi novi (Quick Play sa novim igračima). */
  onFindNewTable?: () => void;
  /** "Sačekaj još" tokom pauze — resetuje rok na serveru. */
  onWaitMore?: () => Promise<void>;
  /** Glas u glasanju o prekidu partije. */
  onAbandonVote?: (vote: AbandonVote) => Promise<void>;
  activeReactions: ActiveReaction[];
};

export function GameScreen({
  state,
  onPlayCard,
  onNextHand,
  onRematch,
  onReact,
  onLeave,
  onFindNewTable,
  onWaitMore,
  onAbandonVote,
  activeReactions,
}: GameScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  // ScorePill je prezentacijski; otvorenost i backdrop drži ekran.
  const [scoreOpen, setScoreOpen] = useState(false);

  useEffect(() => {
    if (!error) return;
    vibrate(HAPTIC.error); // haptika na nevažeću akciju (§50.3)
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  // Feedback sloj (§50.6): jedinstvena detekcija događaja pokreće capture-flash i
  // haptiku (a u Fazi 2 i zvuk). Capture-flash je keyed overlay u play-zoni.
  const [flash, setFlash] = useState<{ key: number; sweep: boolean }>({
    key: 0,
    sweep: false,
  });
  // Dok traje deal animacija: sakrij timer pa ga pokaži čim karte "slegnu" →
  // jasan slijed na startu (podijeljeno → čiji je red / koliko vremena).
  const [dealing, setDealing] = useState(false);
  const dealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (dealTimerRef.current) clearTimeout(dealTimerRef.current);
    },
    [],
  );
  const handleGameEvent = useCallback((event: GameEvent) => {
    switch (event.type) {
      case "capture":
        // J-sweep dobija jači flash (§50.5); običan capture standardni.
        // "Collect" let karata radi MoveReveal (karte iz reveala → pile).
        setFlash((f) => ({ key: f.key + 1, sweep: event.jackSweep }));
        playSfx(event.jackSweep ? "sweep" : "capture");
        if (event.byMe) vibrate(HAPTIC.capture); // haptika samo za MOJE kupljenje
        break;
      case "trail":
        playSfx("place");
        break;
      case "deal": {
        playSfx("deal");
        const durMs = dealFromDeck(); // poleđine lete iz špila ka igračima + na sto
        if (durMs > 0) {
          setDealing(true);
          if (dealTimerRef.current) clearTimeout(dealTimerRef.current);
          dealTimerRef.current = setTimeout(() => setDealing(false), durMs);
        }
        break;
      }
      case "yourTurn":
        playSfx("turn");
        vibrate(HAPTIC.turn);
        break;
      case "matchEnd":
        playSfx(event.iWon ? "win" : "lose");
        break;
      // handEnd → bez zvuka (matchEnd nosi rezultat)
    }
  }, []);
  useGameEvents(state, handleGameEvent);

  const me = state.players.find((p) => p.id === state.myPlayerId);
  const isHost = me?.isHost ?? false;
  const isPlaying = state.phase === "playing";
  const myTurn = isPlaying && state.currentPlayerId === state.myPlayerId;
  const isHandOver = state.phase === "hand_finished";
  const isMatchOver = state.phase === "match_finished";

  const selectedCard = myTurn
    ? (state.myHand.find((c) => c.id === selectedId) ?? null)
    : null;

  const interrupted =
    state.phase === "paused_for_reconnect" ||
    state.phase === "abandon_vote" ||
    state.phase === "abandoned";
  const reactionsDisabled = interrupted;
  const pauseFrame =
    state.phase === "abandoned"
      ? "absolute inset-0 z-50"
      : state.phase === "abandon_vote"
        ? "absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        : "absolute inset-x-0 top-0 z-50 flex justify-center p-3 pt-safe-top";

  const turnDeadline = isPlaying ? state.turnDeadline : undefined;
  // Sat živi ovdje; TurnPill je čista prezentacija (prima sekunde, ne rok).
  const turnSeconds = useCountdown(turnDeadline, TURN_TOTAL_SECONDS);

  // Pauza/glasanje: server šalje apsolutni rok, sat je isti kao za potez.
  // `totalMs` je nominalno trajanje faze — kod produženja od 5 min traka samo
  // stoji puna dok ne padne ispod (PauseAbandonOverlay klampuje fill na 1).
  const pauseTotalMs = state.phase === "abandon_vote" ? 60_000 : 120_000;
  const pauseSeconds = useCountdown(state.pauseEndsAt, pauseTotalMs / 1000);
  const waiting = state.players.find((p) => p.connectionStatus !== "connected");

  async function play(cardId: string, captureIds: string[]) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onPlayCard(cardId, captureIds);
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Greška");
    } finally {
      setBusy(false);
    }
  }

  function handleCapture(option: CaptureOption) {
    if (selectedCard) void play(selectedCard.id, option.cardIds);
  }
  function handleTrail() {
    if (selectedCard) void play(selectedCard.id, []);
  }
  // Prvi tap: selekcija/lift. Drugi tap iste karte: izvrši ako je jednoznačno
  // (trail bez capture-a / jedan capture). Više opcija → tapni grupu na stolu.
  function handleSelect(card: CardType) {
    if (!myTurn || busy) return;
    if (selectedId === card.id) {
      const opts = getCaptureOptions(card, state.table);
      if (opts.length === 0) return void play(card.id, []);
      if (opts.length === 1) return void play(card.id, opts[0]!.cardIds);
      return; // multi-capture: izbor grupe je na stolu
    }
    setSelectedId(card.id);
  }

  async function runAction(fn: () => Promise<void>) {
    setPendingAction(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Greška");
    } finally {
      setPendingAction(false);
    }
  }

  const lastHandScore =
    state.handScores.length > 0
      ? state.handScores[state.handScores.length - 1]
      : null;
  const matchWinner = isMatchOver
    ? (Object.entries(state.matchScore).sort(([, a], [, b]) => b - a)[0]?.[0] ??
      null)
    : null;

  // TableSurface je prezentacijska — opcije računa roditelj, kroz game-core.
  const tableOptions: CaptureOption[] = selectedCard
    ? getCaptureOptions(selectedCard, state.table)
    : [];
  const canTrail = !!selectedCard && tableOptions.length === 0;
  // Force-capture: kad kupljenje postoji, trail je odbijen — igrač MORA dobiti
  // objašnjenje, inače tapne sto i ništa se ne desi bez razloga.
  // canTrail i forceCaptureBlocked su dvije polovine iste odluke.
  const forceCaptureBlocked = !!selectedCard && tableOptions.length > 0;

  // Pozicijski raspored: ti dole, partner gore, protivnici lijevo/desno.
  const seats = arrangeSeats(state.players, state.myPlayerId);

  // Dok karte "padaju" ne prikazuj odbrojavanje — jasan slijed na startu.
  const showTimer = !dealing && turnDeadline != null;

  // Sa kojeg sjedišta je zadnja karta sletjela na sto. Smjer je RELATIVAN na
  // tebe (ti si uvijek dole), isto kao raspored sjedišta.
  function landDirection(playerId: string | undefined): LandFrom {
    if (!playerId) return "bottom";
    if (playerId === seats.oppL?.id) return "left";
    if (playerId === seats.oppR?.id) return "right";
    if (playerId === seats.partner?.id) return "top";
    return "bottom";
  }

  // Karta koja je upravo spuštena i JOŠ je na stolu (trail). Kod kupljenja je
  // odigrana karta odmah sa stola, pa nema šta da sleti — `landingCardIds`
  // ostaje prazan i animacija se ne pali.
  const justPlayed = state.lastMove?.playedCard;
  const landingCardIds =
    justPlayed && state.table.some((c) => c.id === justPlayed.id)
      ? [justPlayed.id]
      : [];
  const landFrom = landDirection(state.lastMove?.playerId);

  // Najnovija aktivna reakcija za dato sjedište → emoji uz tog igrača.
  function seatReaction(playerId: string) {
    const r = [...activeReactions].reverse().find((x) => x.playerId === playerId);
    return r ? (
      <ReactionBubble type={r.type as ReactionType} visible />
    ) : undefined;
  }

  return (
    // Outer surround: na desktopu felt-stage se centrira, ostatak je tamna
    // podloga. Na mobilu (stage = w-full) izgleda identično kao prije.
    <div className="h-[100dvh] w-full bg-surface flex justify-center">
    <div
      className="relative h-full w-full max-w-[600px] overflow-hidden bg-felt md:shadow-2xl md:ring-1 md:ring-black/40"
      style={{
        backgroundImage:
          "radial-gradient(120% 90% at 50% 28%, rgba(255,255,255,0.06), transparent 55%), radial-gradient(140% 130% at 50% 125%, rgba(0,0,0,0.45), transparent 60%)",
      }}
    >
      {/* Partner / jedini protivnik — gore-centar */}
      {seats.partner && (
        <PlayerSeat
          player={seats.partner}
          isActive={state.currentPlayerId === seats.partner.id}
          secondsRemaining={showTimer ? turnSeconds : 0}
          totalSeconds={TURN_TOTAL_SECONDS}
          cardCount={state.handCounts[seats.partner.id] ?? 0}
          orientation="top"
          reaction={seatReaction(seats.partner.id)}
          className="absolute top-3 left-1/2 -translate-x-1/2 mt-safe-top"
        />
      )}
      {/* Protivnik lijevo */}
      {seats.oppL && (
        <PlayerSeat
          player={seats.oppL}
          isActive={state.currentPlayerId === seats.oppL.id}
          secondsRemaining={showTimer ? turnSeconds : 0}
          totalSeconds={TURN_TOTAL_SECONDS}
          cardCount={state.handCounts[seats.oppL.id] ?? 0}
          orientation="left"
          reaction={seatReaction(seats.oppL.id)}
          className="absolute top-[42%] left-1 -translate-y-1/2"
        />
      )}
      {/* Protivnik desno */}
      {seats.oppR && (
        <PlayerSeat
          player={seats.oppR}
          isActive={state.currentPlayerId === seats.oppR.id}
          secondsRemaining={showTimer ? turnSeconds : 0}
          totalSeconds={TURN_TOTAL_SECONDS}
          cardCount={state.handCounts[seats.oppR.id] ?? 0}
          orientation="right"
          reaction={seatReaction(seats.oppR.id)}
          className="absolute top-[42%] right-1 -translate-y-1/2"
        />
      )}

      {/* Centralna play-zona — odigrane karte + capture/trail.
          Desktop (md): šira da se karte ne gomilaju u usku kolonu. */}
      {/* Sirina je 100% minus zljebovi bocnih sjedista (2 × 5.5rem + zrak),
          ne procenat: procenat se lomi cim se viewport suzi (zoom, uzi
          telefon) pa sjedista udju u sto. */}
      <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-13rem)] min-w-[9rem] max-w-[230px] md:max-w-[380px] z-10">
        <div
          data-table-drop
          className="relative rounded-token-lg border border-white/10 bg-white/[0.03] shadow-[inset_0_0_40px_rgba(0,0,0,0.35)] px-3 py-2 min-h-[120px]"
        >
          <TableSurface
            cards={state.table}
            captureOptions={tableOptions}
            onSelectOption={handleCapture}
            canTrail={canTrail}
            onTrail={handleTrail}
            forceCaptureBlocked={forceCaptureBlocked}
            landFrom={landFrom}
            landingCardIds={landingCardIds}
          />
          {flash.key > 0 && (
            <span
              key={flash.key}
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-token-lg ${
                flash.sweep ? "animate-jack-sweep" : "animate-capture-flash"
              }`}
            />
          )}
        </div>
      </div>

      {/* Ti — banner + samostalna pilula iznad ruke.
          PlayerSeat namjerno nema "bottom" orijentaciju: tvoj potez se čita
          iz pilule nad rukom, ne iz čipa. */}
      {isPlaying && myTurn && (
        <div className="absolute bottom-[150px] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
          <TurnBanner isYou />
          {showTimer && (
            <TurnPill
              isYou
              secondsRemaining={turnSeconds}
              totalSeconds={TURN_TOTAL_SECONDS}
            />
          )}
        </div>
      )}
      {seats.me && seatReaction(seats.me.id) && (
        <div className="absolute bottom-[196px] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          {seatReaction(seats.me.id)}
        </div>
      )}

      {/* Ruka — lepeza na dnu */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 pb-safe-bottom z-20"
        data-seat-id={state.myPlayerId}
      >
        <PlayerHand
          cards={state.myHand}
          selectedCardId={selectedId}
          disabledCardIds={
            myTurn && !busy ? [] : state.myHand.map((card) => card.id)
          }
          onSelect={handleSelect}
        />
      </div>

      {/* Overlay: rezultat. Backdrop i `expanded` drži ekran — ScorePill je
          čista prezentacija i namjerno ne hvata tapove preko felta.
          Razrada dobija SAMO zadnju ruku: meč ide do 21, sve ruke su zid. */}
      {scoreOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setScoreOpen(false)}
          aria-hidden
        />
      )}
      <ScorePill
        players={state.players}
        matchScore={state.matchScore}
        targetScore={state.targetScore}
        handScores={lastHandScore ? [lastHandScore] : []}
        expanded={scoreOpen}
        onToggle={() => setScoreOpen((v) => !v)}
        className="scorepill--compact absolute top-0 right-0 z-40 m-2 mt-safe-top mr-safe-right max-w-[68%]"
      />

      {/* Špil — stanjuje se kako runde idu; sidro za deal animaciju. Pozicija tweakable. */}
      {isPlaying && (
        <DeckPile
          remaining={state.deckCount}
          size="xs"
          className="deck--bare absolute bottom-[132px] left-2"
        />
      )}

      {/* Move reveal — šta je zadnji potez uradio (ko/koja karta/šta pokupio) */}
      {isPlaying && <MoveRevealLive state={state} />}

      {/* Overlay: rules (gornji lijevi) */}
      <button
        type="button"
        onClick={() => setRulesOpen(true)}
        className="absolute top-0 left-0 z-40 m-2 mt-safe-top ml-safe-left rounded-token-md bg-surface-raised/95 border border-white/10 min-h-12 px-3 flex items-center text-sm font-bold text-muted active:bg-surface"
      >
        ? Pravila
      </button>

      {/* Overlay: zvuk/vibracija (ispod Pravila) — §50.4 */}
      <FeedbackToggles className="absolute top-9 left-0 z-40 m-2 ml-safe-left" />

      {/* Overlay: reactions */}
      <ReactionFab onReact={onReact} disabled={reactionsDisabled} />

      {/* Reakcije se sad prikazuju uz svako sjedište (seatReaction) — vidi gore. */}

      {/* Pause / abandon */}
      {/* Pauza je baner na vrhu, glasanje je modal nad scrimom, prekid je pun
          ekran — komponenta crta sadržaj, ekran bira gdje sjedi. */}
      {interrupted && (
        <div className={pauseFrame}>
          <PauseAbandonOverlay
            phase={state.phase}
            players={state.players}
            waitingForName={waiting?.displayName}
            myPlayerId={state.myPlayerId}
            {...(state.pauseEndsAt !== undefined
              ? { remainingMs: pauseSeconds * 1000, totalMs: pauseTotalMs }
              : {})}
            {...(state.abandonVotes ? { abandonVotes: state.abandonVotes } : {})}
            {...(onWaitMore ? { onWait: () => void runAction(onWaitMore) } : {})}
            {...(onAbandonVote
              ? { onVote: (v: AbandonVote) => void runAction(() => onAbandonVote(v)) }
              : {})}
            onLeave={onLeave}
          />
        </div>
      )}

      {/* Kraj ruke / kraj meča. Ekran daje scrim i okvir, komponenta sadržaj —
          isto kao kod pauze. */}
      {(isHandOver || isMatchOver) && lastHandScore && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <RoundEndOverlay
            phase={isMatchOver ? "match_finished" : "hand_finished"}
            players={state.players}
            handScore={lastHandScore}
            matchScore={state.matchScore}
            targetScore={state.targetScore}
            {...(matchWinner ? { winnerPileId: matchWinner } : {})}
            isHost={isHost}
            pending={pendingAction}
            onNextHand={() => void runAction(onNextHand)}
            onRematch={() => void runAction(onRematch)}
            {...(onFindNewTable ? { onFindNewTable } : {})}
            {...(onLeave ? { onLeave } : {})}
          />
        </div>
      )}

      {/* Greška na potez — iznad ruke, roditelj drži i tajmer gašenja (4s). */}
      <Toast
        message={error ?? ""}
        visible={error != null}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-[90vw]"
      />

      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
    </div>
  );
}
