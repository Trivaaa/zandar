"use client";

import { useEffect, useRef } from "react";
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
export function useGameEvents(
  state: PrivateGameStateView,
  onEvent: (event: GameEvent) => void,
): void {
  const prevRef = useRef<PrivateGameStateView | null>(null);

  useEffect(() => {
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
      onEvent({ type: "deal" });
    }
    prevRef.current = state;
  }, [state, onEvent]);
}
