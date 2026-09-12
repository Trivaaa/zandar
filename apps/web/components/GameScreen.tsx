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
import { TurnBanner } from "@/components/felt/TurnBanner";
import { GameMenuSheet } from "@/components/overlay/GameMenuSheet";
import { ReactionFab } from "@/components/ReactionFab";
import { PauseAbandonOverlay } from "@/components/overlay/PauseAbandonOverlay";
import { RoundEndOverlay } from "@/components/overlay/RoundEndOverlay";
import { Toast } from "@/components/overlay/Toast";
import { RulesModal } from "@/components/RulesModal";
import { MoveRevealLive } from "@/components/overlay/MoveRevealLive";
import { DeckPile } from "@/components/felt/DeckPile";
import { FeedbackToggles } from "@/components/FeedbackToggles";
import { FeltHeader } from "@/components/felt/FeltHeader";
import { arrangeSeats } from "@/lib/seating";
import { sr } from "@/lib/sr";
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
  /** Podnaslov u zaglavlju: javni sto vs prijateljska partija. */
  /**
   * Početno izabrana karta u ruci. Postoji zbog `/dev/game`: traka izbora se
   * pojavi tek kad je karta izabrana, a headless snimak ne može da tapne —
   * bez ovoga se stanje sa trakom ne bi moglo ni izmjeriti. U produkciji je
   * `undefined` i ekran kreće bez selekcije, kao i do sad.
   */
  initialSelectedCardId?: string;
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
  initialSelectedCardId,
}: GameScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedCardId ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  // Meni i razrada rezultata su prezentacijski; otvorenost drži ekran.
  const [menuOpen, setMenuOpen] = useState(false);
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
        : "absolute inset-x-0 z-50 flex justify-center p-3 top-[calc(var(--safe-top)+var(--stage-header-h))]";

  const turnDeadline = isPlaying ? state.turnDeadline : undefined;
  // Sat živi ovdje; TurnBanner/TurnPill su čista prezentacija (primaju sekunde, ne rok).
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

  // Uputstvo igraču ima JEDAN kanal — traku iznad ruke. Ranije su ove tri
  // rečenice rasle unutar play-zone, pa je izbor karte u ruci mijenjao visinu
  // stola: force-capture objašnjenje je bilo 103 znaka u ~109px širokoj kutiji
  // (~9 prelomljenih redova) i preklapalo se sa samom trakom.
  const instruction =
    tableOptions.length > 1
      ? sr.table.chooseCapture
      : forceCaptureBlocked
        ? sr.table.mustCapture
        : canTrail
          ? sr.table.trailHint
          : sr.turn.you;
  // Ton je "must" SAMO za odbijanje trailu. "Izaberi koje karte kupiš" je
  // ponuda, ne prekršaj — narandžasto bi od nje napravilo upozorenje.
  const instructionTone = instruction === sr.table.mustCapture ? "must" : "turn";

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
      /* `felt-stage` nosi CIJELI vertikalni budžet ekrana kao varijable (vidi
         felt.css). Svako apsolutno dijete ispod čita `--stage-*` / `--table-*`
         umjesto da nosi svoj px — zato se trake ne mogu razići kad se doda još
         jedan sloj. `data-*` biraju varijantu: 3P nema partnera, 2P nema bočnih.

         Pozadina (sukno + nacrtani obod stola) je slika i živi u `felt.css`.
         Ranije su ovdje stajala dva inline `radial-gradient`-a — inline stil
         pobjeđuje svaki `@layer`, pa bi slika iz CSS-a bila nevidljiva dok god
         su tu. */
      className="felt-stage relative h-full w-full max-w-[600px] overflow-hidden bg-felt md:shadow-2xl md:ring-1 md:ring-black/40"
      data-partner={seats.partner ? "true" : "false"}
      data-sides={seats.oppL || seats.oppR ? "true" : "false"}
    >
      <FeltHeader
        roundLabel={sr.header.round(state.handNumber)}
        onMenu={() => setMenuOpen(true)}
        rightSlot={<FeedbackToggles />}
      />

      {/* Partner / jedini protivnik — gore-centar, ispod zaglavlja.

          Nije više PRISLONJEN uz zaglavlje: lepeza poleđina viri iznad avatara,
          a ona je apsolutna i ne širi kutiju sjedišta — pa bez ovog razmaka
          karte ulaze u traku, pod čip "Runda N". `--stage-partner-lift` je ista
          vrijednost koju `--table-top` dodaje stolu, deklarisana jednom u
          `felt.css`. Na 3P je 0 — tamo ovog sjedišta nema. */}
      {seats.partner && (
        <PlayerSeat
          player={seats.partner}
          isActive={state.currentPlayerId === seats.partner.id}
          secondsRemaining={showTimer ? turnSeconds : 0}
          totalSeconds={TURN_TOTAL_SECONDS}
          cardCount={state.handCounts[seats.partner.id] ?? 0}
          orientation="top"
          reaction={seatReaction(seats.partner.id)}
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "calc(var(--safe-top) + var(--stage-header-h) + var(--stage-partner-lift))",
          }}
        />
      )}
      {/* Protivnici sa strane — u visini sredine stola, kao na referenci.
          Uvučeni su 0.25rem od ivice (`left-1` / `right-1`), a `.seat--left` /
          `.seat--right` su za isto toliko uži, pa desna ivica sjedišta ostaje
          na granici `--seat-gutter` — čip i karta se i dalje ne mogu sudariti
          ni na jednoj širini ekrana. Sto ne plaća ništa za to uvlačenje. */}
      {seats.oppL && (
        <PlayerSeat
          player={seats.oppL}
          isActive={state.currentPlayerId === seats.oppL.id}
          secondsRemaining={showTimer ? turnSeconds : 0}
          totalSeconds={TURN_TOTAL_SECONDS}
          cardCount={state.handCounts[seats.oppL.id] ?? 0}
          orientation="left"
          reaction={seatReaction(seats.oppL.id)}
          className="absolute left-1 -translate-y-1/2 pl-safe-left"
          style={{ top: "var(--table-mid)" }}
        />
      )}
      {seats.oppR && (
        <PlayerSeat
          player={seats.oppR}
          isActive={state.currentPlayerId === seats.oppR.id}
          secondsRemaining={showTimer ? turnSeconds : 0}
          totalSeconds={TURN_TOTAL_SECONDS}
          cardCount={state.handCounts[seats.oppR.id] ?? 0}
          orientation="right"
          reaction={seatReaction(seats.oppR.id)}
          className="absolute right-1 -translate-y-1/2 pr-safe-right"
          style={{ top: "var(--table-mid)" }}
        />
      )}

      {/* Kutija stola — odigrane karte, kupljenje i trail.

          Granice dolaze iz `--table-top` / `--table-bottom`, a širina je puna
          minus dva bočna pojasa (`--seat-gutter`), tačno onoliko koliko sjedišta
          zauzimaju. Sudar karte i čipa je time spriječen GEOMETRIJOM; ranije se
          sprječavao pomjeranjem sjedišta gore, što je sto svelo na jednu kartu
          po redu na 360px.

          Kutija ima i `top` i `bottom`: `.table__drop` je query container sa
          `contain: size`, pa mu visina MORA doći odozgo. Ako iko na ovom putu
          dobije `auto` visinu, sve karte padnu na minimum. */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
        style={{
          top: "var(--table-top)",
          bottom: "var(--table-bottom)",
          width: "calc(100% - 2 * var(--seat-gutter))",
        }}
      >
        <div data-table-drop className="relative h-full w-full">
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

      {/* Ti — jedna traka iznad ruke: rečenica, broj i linija koja se prazni.
          PlayerSeat namjerno nema "bottom" orijentaciju: tvoj potez se čita
          iz trake nad rukom, ne iz čipa. Dok karte padaju (showTimer=false)
          traka je gola rečenica — nema roka da se odbrojava. */}
      {isPlaying && myTurn && (
        <div
          className="absolute left-0 right-0 px-3 z-20 flex flex-col items-center pointer-events-none"
          style={{ bottom: "var(--stage-hand-top)" }}
        >
          <TurnBanner
            isYou
            text={instruction}
            tone={instructionTone}
            {...(showTimer
              ? { secondsRemaining: turnSeconds, totalSeconds: TURN_TOTAL_SECONDS }
              : {})}
          />
        </div>
      )}
      {/* Tvoje sjedište — avatar sa čipom ime/rezultat, kao i ostali.
          Ranije ga uopšte nije bilo: sto je imao tri igrača i prazno dno.
          Reakcija ide kroz sjedište (ne kao zaseban mjehur), pa je emoji uz
          tebe na isti način kao uz svakoga drugog. */}
      {seats.me && (
        <PlayerSeat
          player={seats.me}
          isYou
          isActive={myTurn}
          cardCount={0}
          orientation="bottom"
          reaction={seatReaction(seats.me.id)}
          className="absolute left-1/2 -translate-x-1/2 z-20"
          style={{ bottom: "var(--stage-banner-top)" }}
        />
      )}

      {/* Ruka — lepeza na dnu.
          `data-seat-id` NAMJERNO nije ovdje: nosi ga tvoje sjedište iznad.
          Dva ista sidra su značila da `collectToPile` (querySelector, jednina)
          bira po redoslijedu u DOM-u, a `dealFromDeck` (querySelectorAll) tebi
          dijeli dvaput. Ne vraćati ga. */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pb-safe-bottom z-20">
        <PlayerHand
          cards={state.myHand}
          selectedCardId={selectedId}
          disabledCardIds={
            myTurn && !busy ? [] : state.myHand.map((card) => card.id)
          }
          onSelect={handleSelect}
        />
      </div>

      {/* Rezultat vise nije pilula u cosku — presao je u meni (hamburger).
          Gornji desni cosak je po referenci zvuk, a broj po igracu sad stoji
          ispod imena na svakom sjedistu. */}

      {/* Špil — stanjuje se kako runde idu; sidro za deal animaciju. Lijevi
          pojas u visini tvog sjedišta: donji lijevi ugao je sad tvoje sjedište,
          a ne prazan felt. */}
      {isPlaying && (
        <DeckPile
          remaining={state.deckCount}
          size="xs"
          className="deck--bare absolute left-2 pl-safe-left"
          style={{ bottom: "var(--stage-banner-top)" }}
        />
      )}

      {/* Move reveal — šta je zadnji potez uradio (ko/koja karta/šta pokupio) */}
      {isPlaying && <MoveRevealLive state={state} />}

      {/* Ugao sa "? Pravila" i preklopkama je rasformiran: pravila su u meniju,
          preklopke su u zaglavlju (desni slot = "zvuk" iz reference). Time je
          nestao i cijeli razlog za `pointer-events` gimnastiku oko njih. */}

      {/* Meni stola. Scrim i pozicioniranje daje ekran, komponenta samo
          sadržaj — isti dogovor kao kod pauze i kraja ruke. */}
      {menuOpen && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setMenuOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
            <GameMenuSheet
              players={state.players}
              matchScore={state.matchScore}
              targetScore={state.targetScore}
              handScores={lastHandScore ? [lastHandScore] : []}
              scoreExpanded={scoreOpen}
              onToggleScore={() => setScoreOpen((v) => !v)}
              onRules={() => {
                setMenuOpen(false);
                setRulesOpen(true);
              }}
              {...(onLeave ? { onLeave } : {})}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        </div>
      )}

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
        className="absolute left-1/2 -translate-x-1/2 z-50 max-w-[90vw]"
        style={{ bottom: "var(--stage-banner-top)" }}
      />

      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
    </div>
  );
}
