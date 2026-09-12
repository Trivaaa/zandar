"use client";

import { useEffect, useRef, useState } from "react";
import { isJackSweep } from "@zandar/game-core";
import type { Card, PrivateGameStateView } from "@zandar/shared-types";
import { collectCardsToSeat } from "@/lib/flyAnimation";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * useTableBeat — jedan potez kao SLIJED na stolu, a ne kao panel preko njega.
 *
 * Ranije se potez pričao overlay-em koji je iskakao u ISTOM React commit-u u
 * kojem je karta slijetala, na sredini kutije stola — pa se slijetanje nikad
 * nije vidjelo, a kupljenje nije ni imalo animaciju: server odigranu kartu vodi
 * pravo iz ruke u pile, tako da ona nikad nije u `state.table`, a pokupljene su
 * već nestale kad snapshot stigne.
 *
 * Zato klijent kratko ZADRŽAVA sto kakav je bio prije poteza:
 *
 *   land (260ms)  odigrana karta sleti IZNAD zadržanog stola, iz pravca igrača
 *   hold (280ms)  odigrana + pokupljene nose sjaj — vidi se ŠTA se kupi
 *   collect       sve odleti u pile kupca, sto se slegne na `state.table`
 *
 * Trail ne zadržava ništa — karta je već u `state.table` i postojeći
 * `table-land` je crta. Sat mu ipak radi, jer nosi natpis uz sjedište.
 *
 * Mreža se preslaže TAČNO JEDNOM, u trenutku kad karte odlete. Odigrana karta
 * namjerno ne ulazi u mrežu (pluta iznad nje): `tableGrid()` mijenja broj
 * kolona na granicama 2→3 i 9→10, pa bi `n → n+1` usred beat-a smanjio sve
 * karte i vratio ih na kraju.
 */

/** Mora pratiti `--t-card-play` u globals.css (slijetanje karte). */
const LAND_MS = 260;
/** Koliko karta stoji osvijetljena prije nego krene u pile. */
const HOLD_MS = 280;
/** Rep natpisa kad leta nema (reduced-motion, trail, sjedište van DOM-a). */
const TAIL_MS = 240;

export type BeatPhase = "idle" | "land" | "hold" | "collect";
export type BeatKind = "capture" | "trail";

export type BeatMoment = {
  kind: BeatKind;
  byMe: boolean;
  jackSweep: boolean;
};

export type TableBeatHandlers = {
  /** Karta je dodirnula sto. */
  onLand?: (m: BeatMoment) => void;
  /** Karte kreću u pile (samo kupljenje). */
  onCollect?: (m: BeatMoment) => void;
};

export type TableBeat = {
  phase: BeatPhase;
  kind: BeatKind | null;
  /** Šta sto treba da crta SADA — zadržani raspored dok kupljenje traje. */
  cards: Card[];
  /** Odigrana karta koja pluta iznad stola. Samo kupljenje, samo do collect-a. */
  playedCard: Card | null;
  /** Karte na stolu koje odlaze — nose sjaj i sidro `data-collect-card`. */
  takenIds: string[];
  /** Ko je odigrao: meta leta i mjesto natpisa. */
  seatId: string | null;
  byMe: boolean;
  jackSweep: boolean;
  isAutoPlay: boolean;
};

type Beat = {
  moveId: string;
  kind: BeatKind;
  seatId: string;
  byMe: boolean;
  jackSweep: boolean;
  isAutoPlay: boolean;
  playedCard: Card;
  takenIds: string[];
  heldTable: Card[];
  /** Da li se sto zaista zadržava (kupljenje uz uključen pokret). */
  hold: boolean;
};

/**
 * Čista odluka: šta je ovaj potez i šta beat treba da drži. Bez DOM-a i bez
 * tajmera, da se može pročitati (i mijenjati) bez pokretanja partije.
 *
 * `hold` se računa OVDJE, a ne pri renderu: `prefersReducedMotion()` čita
 * `matchMedia`, pa bi na serveru i klijentu dao različit sto = hydration
 * mismatch. Beat se pravi tek u efektu, dakle uvijek na klijentu.
 */
export function decideBeat(prevTable: Card[], next: PrivateGameStateView): Beat | null {
  const move = next.lastMove;
  if (!move || next.phase !== "playing") return null;

  const kind: BeatKind = move.capturedCards.length > 0 ? "capture" : "trail";
  return {
    moveId: move.moveId,
    kind,
    seatId: move.playerId,
    byMe: move.playerId === next.myPlayerId,
    jackSweep:
      kind === "capture" && isJackSweep(prevTable.length, next.table.length),
    isAutoPlay: move.isAutoPlay,
    playedCard: move.playedCard,
    takenIds: move.capturedCards.map((c) => c.id),
    heldTable: prevTable,
    hold: kind === "capture" && !prefersReducedMotion(),
  };
}

type Tracked = {
  /** `stateVersion` na koji je ovo stanje već odgovorilo. */
  version: number;
  /** Sto iz snapshota koji je nosio `version` — ulaz za SLJEDEĆU odluku. */
  prevTable: Card[];
  /** Potpis tog stola po sadržaju (vidi sinhronizaciju pri renderu). */
  prevSig: string;
  beat: Beat | null;
  phase: BeatPhase;
  /**
   * Zadnji `moveId` koji je dobio beat. Monotono: `moveId` je `clientMoveId` i
   * nikad se ne ponavlja, pa se NE resetuje. Da se resetuje, povratak iz pauze
   * (novi `stateVersion`, isti `lastMove`) bi ponovo pustio davno odigran potez.
   */
  handled: string | null;
};

/** Potpis stola po SADRŽAJU — referenca ne valja, vidi sinhronizaciju ispod. */
function sigOf(table: Card[]): string {
  return table.map((c) => c.id).join(",");
}

/** Čista tranzicija: šta beat postaje kad stigne novi snapshot. */
function advance(t: Tracked, state: PrivateGameStateView): Tracked {
  const version = state.stateVersion;
  const prevTable = state.table;
  const prevSig = sigOf(state.table);

  // Kraj ruke, pauza ili prekid usred beat-a: prekini, snap na stvarni sto.
  if (state.phase !== "playing") {
    return { version, prevTable, prevSig, beat: null, phase: "idle", handled: t.handled };
  }

  const next = decideBeat(t.prevTable, state);
  if (!next || next.moveId === t.handled) {
    return { ...t, version, prevTable, prevSig };
  }
  return { version, prevTable, prevSig, beat: next, phase: "land", handled: next.moveId };
}

export function useTableBeat(
  state: PrivateGameStateView,
  handlers: TableBeatHandlers = {},
): TableBeat {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const [tracked, setTracked] = useState<Tracked>(() => ({
    version: state.stateVersion,
    prevTable: state.table,
    prevSig: sigOf(state.table),
    beat: null,
    phase: "idle",
    handled: null,
  }));

  const tableSig = sigOf(state.table);

  /*
   * Odluka se donosi PRI RENDERU, ne u efektu ("Adjusting state when a prop
   * changes"): React odmah ponovi render bez crtanja, pa sto nikad ne bljesne u
   * međustanju. Efekt bi ovdje značio jedan naslikan frejm sa novim stolom prije
   * nego što ga beat zadrži — tačno ono što se popravlja.
   *
   * Prvi render nikad ne ulazi ovdje (`version` je inicijalizovan iz istog
   * snapshota), pa `decideBeat` — a s njim i `prefersReducedMotion()` — nikad ne
   * radi na serveru. Da radi, sto bi se razlikovao server/klijent = hydration
   * mismatch.
   */
  if (tracked.version !== state.stateVersion) {
    setTracked((t) => (t.version === state.stateVersion ? t : advance(t, state)));
  } else if (tracked.beat === null && tracked.prevSig !== tableSig) {
    /*
     * Isti `stateVersion`, drugi sto. U partiji se to ne dešava — server podigne
     * verziju na svaku izmjenu — ali se dešava svuda gdje state nije došao sa
     * servera: u `/dev/game` URL parametri stignu tek poslije hidracije, pa bi
     * beat zadržao sto iz SSR snapshota i "vratio" karte kojih nikad nije bilo.
     *
     * Poređenje ide po SADRŽAJU, ne po referenci: `/dev/game` pravi novi objekat
     * pri svakom renderu, pa bi referenca petljala u beskonačnost. Guard na
     * `beat === null` znači da se tlo pod beat-om u toku nikad ne pomjera.
     */
    setTracked((t) => ({ ...t, prevTable: state.table, prevSig: tableSig }));
  }

  const beat = tracked.beat;
  const phase = tracked.phase;

  // Sat. Novi potez usred beat-a pravi novi `beat` objekat → cleanup poništi
  // stare tajmere, a duhovi u letu se sami čiste.
  useEffect(() => {
    if (!beat) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const reduced = prefersReducedMotion();
    const landMs = reduced ? 0 : LAND_MS;
    const holdMs = reduced ? 0 : HOLD_MS;

    // Tajmer koji je preživio smjenu poteza ne smije da pomjeri novi beat.
    const to = (p: BeatPhase) =>
      setTracked((t) => (t.beat === beat ? { ...t, phase: p } : t));
    const end = () =>
      setTracked((t) => (t.beat === beat ? { ...t, beat: null, phase: "idle" } : t));

    handlersRef.current.onLand?.({
      kind: beat.kind,
      byMe: beat.byMe,
      jackSweep: beat.jackSweep,
    });

    timers.push(setTimeout(() => to("hold"), landMs));

    if (beat.kind === "trail") {
      timers.push(setTimeout(end, landMs + holdMs + TAIL_MS));
    } else {
      timers.push(
        setTimeout(() => {
          // Mjeri PA sakrij: duhovi kreću sa pozicija pravih karata, a promjenu
          // faze (koja ih skida sa stola) React primijeni tek poslije.
          const container = document.querySelector<HTMLElement>("[data-table-drop]");
          const flyMs = collectCardsToSeat(container, beat.seatId);
          handlersRef.current.onCollect?.({
            kind: beat.kind,
            byMe: beat.byMe,
            jackSweep: beat.jackSweep,
          });
          to("collect");
          timers.push(setTimeout(end, flyMs > 0 ? flyMs : TAIL_MS));
        }, landMs + holdMs),
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [beat]);

  const holding = beat !== null && beat.hold && phase !== "idle" && phase !== "collect";

  return {
    phase,
    kind: beat?.kind ?? null,
    cards: holding ? beat.heldTable : state.table,
    playedCard: holding ? beat.playedCard : null,
    takenIds: holding ? beat.takenIds : [],
    seatId: phase === "idle" ? null : (beat?.seatId ?? null),
    byMe: beat?.byMe ?? false,
    jackSweep: beat?.jackSweep ?? false,
    isAutoPlay: beat?.isAutoPlay ?? false,
  };
}
