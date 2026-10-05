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
 *
 * ZADNJI POTEZ RUKE ima nastavak. Server ga šalje u istom snapshotu u kojem
 * faza izlazi iz "playing" i sto je već prazan — preostale karte su otišle
 * onome ko je zadnji kupio (`finishHand`). Ranije se beat tu prekidao, pa se
 * to pravilo vidjelo samo u rezultatu. Sad beat odigra potez do kraja, pa:
 *
 *   rest          ostatak stola zasvijetli, natpis uz sjedište PRIMAOCA
 *   restCollect   ostatak odleti njemu; tek onda ekran smije pokazati rezultat
 */

/** Mora pratiti `--t-card-play` u globals.css (slijetanje karte). */
const LAND_MS = 260;
/** Koliko karta stoji osvijetljena prije nego krene u pile. */
const HOLD_MS = 280;
/** Rep beat-a kad leta nema (reduced-motion, trail, sjedište van DOM-a). */
const TAIL_MS = 240;
/** Koliko ostatak stola stoji osvijetljen prije nego krene primaocu. */
const REST_HOLD_MS = 750;
/** Mir poslije zadnjeg leta, prije nego što rezultat ruke prekrije sto. */
const FINAL_TAIL_MS = 350;
/**
 * Koliko natpis stoji. VLASTITI sat — namjerno NIJE vezan za trajanje beat-a:
 * beat je gotov za ~780ms (trail) do ~1.2s (kupljenje), a to je prekratko da se
 * rečenica pročita. Natpis zato nadživi karte.
 *
 * Trajanje PRIKAZA, ne pokreta, pa ostaje isto i pod `prefers-reduced-motion`
 * (to je pravilo iza `--d-*` prefiksa). Namjerno bez CSS tokena: sat je ovdje,
 * a `--d-reveal-hold` je bio upravo token koji se tiho razišao sa JS-om i umro
 * bez ijednog korisnika.
 */
const CAPTION_MS = 1700;
/** Zadnji dio vijeka: natpis se gasi umjesto da nestane rezom. */
const CAPTION_FADE_MS = 200;

export type BeatPhase = "idle" | "land" | "hold" | "collect" | "rest" | "restCollect";
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

/**
 * Natpis uz sjedište. Zaseban od beat-a jer ga i nadživi — sve što mu treba
 * nosi sam, da se ne čita iz beat-a koji je u tom trenutku već `null`.
 */
export type SeatCaptionInfo = {
  moveId: string;
  seatId: string;
  /** `rest`: ovom sjedištu na kraju ruke ide ostatak stola. */
  kind: BeatKind | "rest";
  jackSweep: boolean;
  isAutoPlay: boolean;
  /** Zadnjih `CAPTION_FADE_MS`: gasi se. */
  leaving: boolean;
};

export type TableBeat = {
  phase: BeatPhase;
  /** Šta sto treba da crta SADA — zadržani raspored dok kupljenje traje. */
  cards: Card[];
  /** Odigrana karta koja pluta iznad stola. Samo kupljenje, samo do collect-a. */
  playedCard: Card | null;
  /** Karte na stolu koje odlaze — nose sjaj i sidro `data-collect-card`. */
  takenIds: string[];
  /** Ko je odigrao — meta leta karata. Prati BEAT, ne natpis. */
  seatId: string | null;
  /** Natpis ima vlastiti vijek; `null` kad je istekao. */
  caption: SeatCaptionInfo | null;
  /**
   * Zadnji potez ruke se još odigrava. Dok je `true`, ekran NE smije pokazati
   * rezultat ruke — inače prekrije upravo let koji pokazuje kome ide ostatak.
   */
  finishing: boolean;
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
  /** Ovim potezom je ruka završena (snapshot je već van "playing"). */
  final: boolean;
  /** Ostatak stola na kraju ruke i kome ide; `null` kad ostatka nema. */
  rest: { seatId: string; byMe: boolean; cards: Card[] } | null;
};

function isHandEnd(phase: PrivateGameStateView["phase"]): boolean {
  return phase === "hand_finished" || phase === "match_finished";
}

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
  const final = isHandEnd(next.phase);
  if (!move || (next.phase !== "playing" && !final)) return null;
  // Kraj ruke bez pokreta: nema šta da se odigra, rezultat ide odmah.
  if (final && prefersReducedMotion()) return null;

  const kind: BeatKind = move.capturedCards.length > 0 ? "capture" : "trail";
  const takenIds = move.capturedCards.map((c) => c.id);

  // Na kraju ruke `next.table` je već prazan (ostatak je otišao u pile), pa se
  // sto poslije poteza izvodi: zatečeni sto, plus spuštena karta kod traila,
  // minus pokupljene.
  const heldTable = final && kind === "trail" ? [...prevTable, move.playedCard] : prevTable;
  const restCards = final ? heldTable.filter((c) => !takenIds.includes(c.id)) : [];
  // Isto pravilo kao `finishHand`: zadnji koji je kupio, inače djelitelj.
  const restSeat =
    kind === "capture"
      ? move.playerId
      : (next.lastCapturePlayerId ?? next.dealerPlayerId);

  return {
    moveId: move.moveId,
    kind,
    seatId: move.playerId,
    byMe: move.playerId === next.myPlayerId,
    jackSweep:
      kind === "capture" &&
      isJackSweep(prevTable.length, final ? restCards.length : next.table.length),
    isAutoPlay: move.isAutoPlay,
    playedCard: move.playedCard,
    takenIds,
    heldTable,
    hold: (kind === "capture" || final) && !prefersReducedMotion(),
    final,
    rest:
      restCards.length > 0
        ? { seatId: restSeat, byMe: restSeat === next.myPlayerId, cards: restCards }
        : null,
  };
}

type Tracked = {
  /** `stateVersion` na koji je ovo stanje već odgovorilo. */
  version: number;
  /** Sto iz snapshota koji je nosio `version` — ulaz za SLJEDEĆU odluku. */
  prevTable: Card[];
  /** Potpis tog stola po sadržaju (vidi sinhronizaciju pri renderu). */
  prevSig: string;
  /** Faza partije iz tog snapshota — kraj ruke se odigrava samo IZ "playing". */
  prevGamePhase: PrivateGameStateView["phase"];
  beat: Beat | null;
  phase: BeatPhase;
  /** Natpis; postavlja ga `advance`, gasi ga VLASTITI tajmer, ne kraj beat-a. */
  caption: SeatCaptionInfo | null;
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
  const prevGamePhase = state.phase;
  const cut: Tracked = {
    version, prevTable, prevSig, prevGamePhase,
    beat: null, phase: "idle", caption: null, handled: t.handled,
  };

  // Kraj ruke se odigrava samo kad je stigao IZ igre (ne na reconnect pravo u
  // rezultat), ili kad se njegov beat već vrti pa stigne još jedan snapshot.
  const handEnd =
    isHandEnd(state.phase) &&
    (t.prevGamePhase === "playing" || t.beat?.final === true);

  // Pauza ili prekid usred beat-a: prekini, snap na stvarni sto. Natpis ide sa
  // njim — nema smisla da nadživi ruku u kojoj je potez odigran.
  if (state.phase !== "playing" && !handEnd) return cut;

  const next = decideBeat(t.prevTable, state);
  if (!next) return handEnd ? cut : { ...t, version, prevTable, prevSig, prevGamePhase };
  if (next.moveId === t.handled) {
    // Kraj ruke čiji je potez već odigran a beat ugašen: nema šta da se čeka.
    return handEnd && !t.beat?.final
      ? cut
      : { ...t, version, prevTable, prevSig, prevGamePhase };
  }
  return {
    version, prevTable, prevSig, prevGamePhase,
    beat: next,
    phase: "land",
    caption: {
      moveId: next.moveId,
      seatId: next.seatId,
      kind: next.kind,
      jackSweep: next.jackSweep,
      isAutoPlay: next.isAutoPlay,
      leaving: false,
    },
    handled: next.moveId,
  };
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
    prevGamePhase: state.phase,
    beat: null,
    phase: "idle",
    caption: null,
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

    const finalTail = beat.final ? FINAL_TAIL_MS : 0;
    // Nastavak zadnjeg poteza ruke: ostatak stola ide onome ko je zadnji kupio.
    const rest = beat.rest;
    const runRest = () => {
      if (!rest) return end();
      setTracked((t) =>
        t.beat === beat
          ? {
              ...t,
              phase: "rest",
              // Novi ključ → sat natpisa kreće ispočetka, uz sjedište primaoca.
              caption: {
                moveId: beat.moveId + ":rest",
                seatId: rest.seatId,
                kind: "rest",
                jackSweep: false,
                isAutoPlay: false,
                leaving: false,
              },
            }
          : t,
      );
      timers.push(
        setTimeout(() => {
          const container = document.querySelector<HTMLElement>("[data-table-drop]");
          const flyMs = collectCardsToSeat(container, rest.seatId);
          handlersRef.current.onCollect?.({
            kind: "capture",
            byMe: rest.byMe,
            jackSweep: false,
          });
          to("restCollect");
          timers.push(setTimeout(end, (flyMs > 0 ? flyMs : TAIL_MS) + FINAL_TAIL_MS));
        }, REST_HOLD_MS),
      );
    };

    if (beat.kind === "trail") {
      timers.push(
        setTimeout(rest ? runRest : end, landMs + holdMs + (rest ? 0 : TAIL_MS + finalTail)),
      );
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
          timers.push(
            setTimeout(
              rest ? runRest : end,
              (flyMs > 0 ? flyMs : TAIL_MS) + (rest ? 0 : finalTail),
            ),
          );
        }, landMs + holdMs),
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [beat]);

  /*
   * Sat natpisa. ODVOJEN efekt, i keyed na `moveId` a NE na sam objekat:
   *
   *  - da živi u efektu sata beat-a, cleanup bi mu pukao čim beat završi
   *    (`beat` je tamo zavisnost i pada na `null`), pa natpis nikad ne bi nestao;
   *  - da je keyed na objekat, postavljanje `leaving` bi napravilo novi objekat,
   *    efekt bi se ponovo pokrenuo i tajmeri bi se vrtjeli u krug.
   *
   * Novi potez donosi novi `moveId` → stari tajmeri otkazani, natpis se odmah
   * prebaci na novi potez umjesto da lebdi preko njega.
   */
  const captionId = tracked.caption?.moveId ?? null;
  useEffect(() => {
    if (!captionId) return;
    const still = (t: Tracked) => t.caption !== null && t.caption.moveId === captionId;
    const fade = setTimeout(
      () => setTracked((t) => (still(t) ? { ...t, caption: { ...t.caption!, leaving: true } } : t)),
      CAPTION_MS - CAPTION_FADE_MS,
    );
    const done = setTimeout(
      () => setTracked((t) => (still(t) ? { ...t, caption: null } : t)),
      CAPTION_MS,
    );
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [captionId]);

  const holding = beat !== null && beat.hold && (phase === "land" || phase === "hold");
  // Ostatak na kraju ruke: stoji od trenutka kad pokupljene odlete do vlastitog
  // leta; sjaj i sidro `data-collect-card` dobija tek u fazi `rest`.
  const resting =
    beat !== null && beat.hold && beat.rest !== null && (phase === "collect" || phase === "rest");

  return {
    phase,
    cards: holding ? beat.heldTable : resting ? beat.rest!.cards : state.table,
    // Kod traila je karta u samoj mreži (`heldTable`), ne pluta iznad nje.
    playedCard: holding && beat.kind === "capture" ? beat.playedCard : null,
    takenIds: holding
      ? beat.takenIds
      : resting && phase === "rest"
        ? beat.rest!.cards.map((c) => c.id)
        : [],
    seatId: phase === "idle" ? null : (beat?.seatId ?? null),
    caption: tracked.caption,
    finishing: beat !== null && beat.final,
  };
}
