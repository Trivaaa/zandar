/**
 * Zvuk i vibracija za igre sa štihovima (Raub, Bela) — čisto, bez DOM-a.
 *
 * Ekran svaki put napravi mali snimak stola (`TrickTableSnap`), a
 * `trickTableCues(prev, next)` kaže šta treba zazvučati na prelazu. Isti
 * rječnik kao Žandar i poker: dijeljenje → `deal`, karta na sto → `place`,
 * štih odnesen → `capture` (kad karte krenu ka pobjedniku), moj red → `turn`,
 * kraj meča → `win`/`lose`. Prvo crtanje (otvaranje stola, reconnect,
 * hidracija) ne zvoni.
 */

import { HAPTIC } from "./haptics";
import type { SfxName } from "./sound";

export type TrickTableSnap = {
  dealNo: number;
  phase: string;
  myTurn: boolean;
  /** Broj odigranih karata u štihovima ove ruke. */
  plays: number;
  /** Broj završenih štihova u ovoj ruci. */
  doneTricks: number;
  /** Pobjednik zadnjeg završenog štiha. */
  lastWinnerId: string | null;
  /** Ko je uzeo kartu s talona (samo Raub). */
  talonTakenBy?: string | null;
  /** Moje mjesto na kraju meča (1 = pobjeda). */
  myPlace: number | null;
};

export type TrickCue = {
  sfx: SfxName;
  haptic?: number | readonly number[];
  /** Kašnjenje u ms (štih ostaje vidljiv prije kupljenja). */
  delayMs?: number;
};

export type TrickCueOptions = {
  /** Da li je štih „moj" (Bela: moj tim) — samo tada vibracija. */
  mine: (playerId: string) => boolean;
  /** Koliko pun štih stoji na stolu prije nego krene ka pobjedniku. */
  holdMs: number;
};

export function trickTableCues(
  prev: TrickTableSnap | undefined,
  next: TrickTableSnap,
  opts: TrickCueOptions,
): TrickCue[] {
  if (!prev) return [];
  const cues: TrickCue[] = [];

  const newDeal =
    next.phase === "playing" &&
    (next.dealNo !== prev.dealNo || (prev.phase !== "playing" && prev.phase !== "abandoned"));
  if (newDeal) cues.push({ sfx: "deal" });

  const sameDeal = next.dealNo === prev.dealNo;
  if (sameDeal && next.plays > prev.plays) cues.push({ sfx: "place" });

  if (sameDeal && next.talonTakenBy && next.talonTakenBy !== prev.talonTakenBy) {
    cues.push({ sfx: "place" });
  }

  if (sameDeal && next.doneTricks > prev.doneTricks && next.lastWinnerId) {
    const cue: TrickCue = { sfx: "capture", delayMs: opts.holdMs };
    if (opts.mine(next.lastWinnerId)) cue.haptic = HAPTIC.capture;
    cues.push(cue);
  }

  if (next.myTurn && !prev.myTurn) cues.push({ sfx: "turn", haptic: HAPTIC.turn });

  if (next.phase === "match_finished" && prev.phase !== "match_finished" && next.myPlace !== null) {
    // Poslije zadnjeg štiha: kraj meča se čuje tek kad se štih pokupi.
    cues.push({ sfx: next.myPlace === 1 ? "win" : "lose", delayMs: opts.holdMs });
  }

  return cues;
}

/** Snimak stola iz polja koja Raub i Bela pogled dijele. */
export function trickSnapOf(
  view: {
    dealNo: number;
    phase: string;
    tricks: ReadonlyArray<{ plays: ReadonlyArray<unknown>; winnerId: string | null }>;
    placements: ReadonlyArray<{ playerId: string; place: number }>;
    myPlayerId: string;
  },
  myTurn: boolean,
  talonTakenBy?: string | null,
): TrickTableSnap {
  let plays = 0;
  let doneTricks = 0;
  let lastWinnerId: string | null = null;
  for (const t of view.tricks) {
    plays += t.plays.length;
    if (t.winnerId !== null) {
      doneTricks += 1;
      lastWinnerId = t.winnerId;
    }
  }
  const snap: TrickTableSnap = {
    dealNo: view.dealNo,
    phase: view.phase,
    myTurn,
    plays,
    doneTricks,
    lastWinnerId,
    myPlace: view.placements.find((p) => p.playerId === view.myPlayerId)?.place ?? null,
  };
  if (talonTakenBy !== undefined) snap.talonTakenBy = talonTakenBy;
  return snap;
}
