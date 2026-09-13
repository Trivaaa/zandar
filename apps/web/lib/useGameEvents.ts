"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { deriveGameEvents, type GameEvent } from "@zandar/game-core";
import type { PrivateGameStateView } from "@zandar/shared-types";

/**
 * Pokreće feedback sloj (PRD §50.6): poredi uzastopne `game:state` snapshote i
 * fire-uje `onEvent` za svaki detektovani događaj (capture/trail/deal/yourTurn/…).
 *
 * `PrivateGameStateView` strukturno zadovoljava `EventSnapshot` iz game-core-a,
 * pa se prosljeđuje direktno. `onEvent` neka bude stabilan (`useCallback`); guard
 * po `stateVersion` čini re-run bez promjene jeftinim no-op-om.
 */
/**
 * Događaji se javljaju PRIJE crtanja (`useLayoutEffect`), jer neki od njih
 * mijenjaju ono što se crta: `deal` zadržava ruku i špil na pred-deal stanju
 * dok se karte ne podijele. Iz običnog efekta to stiže tek POSLIJE prvog
 * paint-a, pa puna ruka bljesne jedan frejm prije nego što je zadržavanje
 * sakrije — izmjereno, ne pretpostavljeno. Isti razlog zbog kojeg `useTableBeat`
 * odluku donosi pri renderu.
 *
 * Na serveru layout-efekta nema (React bi upozorio), a nema ni šta da se crta.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useGameEvents(
  state: PrivateGameStateView,
  onEvent: (event: GameEvent) => void,
): void {
  const prevRef = useRef<PrivateGameStateView | null>(null);

  useIsomorphicLayoutEffect(() => {
    const prev = prevRef.current;
    if (prev) {
      if (prev.stateVersion !== state.stateVersion) {
        for (const event of deriveGameEvents(prev, state, state.myPlayerId)) {
          onEvent(event);
        }
      }
    } else if (
      // Prvi snapshot (nema prev): ako partija TEK počinje — faza "playing" i još
      // nijedno kupljenje u meču — sintetizuj `deal` da se vidi dijeljenje na
      // startu (inače prvi state nikad ne okine deal jer nema s čim da se poredi).
      // Capturecount > 0 ⇒ uskačemo u partiju koja traje (reconnect) → bez deal-a.
      state.phase === "playing" &&
      Object.values(state.capturedCounts).every((n) => (n ?? 0) === 0)
    ) {
      // Nema `prev` iz kojeg bi se izveo obim dijeljenja, pa ga čitamo iz samog
      // snapshota: sve karte koje sada stoje u rukama i na stolu upravo su
      // podijeljene (kupljenja još nema — to je uslov iznad).
      onEvent({
        type: "deal",
        perSeat: Math.max(0, ...Object.values(state.handCounts).map((n) => n ?? 0)),
        toTable: state.table.length,
      });
    }
    prevRef.current = state;
  }, [state, onEvent]);
}
