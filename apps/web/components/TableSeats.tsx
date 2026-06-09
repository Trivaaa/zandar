"use client";

import type { ReactNode } from "react";
import type { PublicPlayer } from "@zandar/shared-types";
import { GameTable } from "@/components/GameTable";
import { SeatChip } from "@/components/SeatChip";
import { arrangeSeats } from "@/lib/seating";

/**
 * TableSeats — popunjava pozicijski grid SeatChip-ovima (DS §1.1, B2).
 *
 * Spaja public game state sa GameTable grid-om: protivnici idu u
 * partner/oppL/oppR po broju igrača (vidi `arrangeSeats`), bočni čipovi u 4P
 * su uža (compact) varijanta. `table` i `hand` su slot-ovi koje popunjava
 * Faza B (B3+); ako nisu dati, GameTable renderuje svoje placeholdere.
 *
 * Bot-agnostičan: prima samo PublicPlayer (bez isBot) — SeatChip renderuje
 * svakog igrača identično.
 */

type TableSeatsProps = {
  players: PublicPlayer[];
  myPlayerId: string;
  currentPlayerId: string;
  /** key = playerId */
  handCounts: Record<string, number>;
  /** key = playerId (2P/3P) ili "team-N" (4P) — per-igrač samo u 2P/3P */
  capturedCounts: Record<string, number>;
  table?: ReactNode;
  hand?: ReactNode;
};

export function TableSeats({
  players,
  myPlayerId,
  currentPlayerId,
  handCounts,
  capturedCounts,
  table,
  hand,
}: TableSeatsProps) {
  const { playerCount, partner, oppL, oppR } = arrangeSeats(players, myPlayerId);

  // 4P bočni protivnici su compact (uža varijanta, DS §1.4); ostalo full.
  const sideVariant = playerCount === 4 ? "compact" : "full";

  function chip(
    p: PublicPlayer | undefined,
    variant: "full" | "compact",
  ): ReactNode {
    if (!p) return undefined; // prazno → GameTable placeholder
    return (
      <SeatChip
        displayName={p.displayName}
        cardCount={handCounts[p.id] ?? 0}
        capturedCount={capturedCounts[p.id]}
        isCurrentTurn={currentPlayerId === p.id}
        connectionStatus={p.connectionStatus}
        teamId={p.teamId}
        variant={variant}
      />
    );
  }

  return (
    <GameTable
      playerCount={playerCount}
      partner={chip(partner, "full")}
      oppL={chip(oppL, sideVariant)}
      oppR={chip(oppR, sideVariant)}
      table={table}
      hand={hand}
    />
  );
}
