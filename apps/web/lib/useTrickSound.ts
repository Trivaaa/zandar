"use client";

import { useEffect, useRef } from "react";

import { vibrate } from "./haptics";
import { playSfx } from "./sound";
import { trickTableCues, type TrickCueOptions, type TrickTableSnap } from "./trickSound";

/**
 * Pušta zvuk i vibraciju na prelaz stanja Raub/Bela stola (`trickTableCues`).
 * Poštuje prekidače zvuka i vibracije (`playSfx`/`vibrate` ih čitaju sami).
 */
export function useTrickSound(snap: TrickTableSnap, opts: TrickCueOptions): void {
  const prev = useRef<TrickTableSnap | undefined>(undefined);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Bez niza zavisnosti: poređenje je po vrijednostima snimka, pa render bez
  // promjene stola ne daje nijedan znak.
  useEffect(() => {
    const cues = trickTableCues(prev.current, snap, opts);
    prev.current = snap;
    for (const cue of cues) {
      const fire = () => {
        playSfx(cue.sfx);
        if (cue.haptic !== undefined) vibrate(cue.haptic);
      };
      if (!cue.delayMs) {
        fire();
        continue;
      }
      const t = setTimeout(() => {
        timers.current.delete(t);
        fire();
      }, cue.delayMs);
      timers.current.add(t);
    }
  });

  useEffect(() => {
    const set = timers.current;
    return () => {
      for (const t of set) clearTimeout(t);
      set.clear();
    };
  }, []);
}
