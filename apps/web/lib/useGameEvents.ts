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
    if (prev && prev.stateVersion !== state.stateVersion) {
      for (const event of deriveGameEvents(prev, state, state.myPlayerId)) {
        onEvent(event);
      }
    }
    prevRef.current = state;
  }, [state, onEvent]);
}
